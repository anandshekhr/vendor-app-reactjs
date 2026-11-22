import { db } from '@/services/offline/db';
import { chatApi } from '@/features/chat/api';
import { usePrintSummaryQuery } from '@/features/printing/api';
import { config } from '@/constants/config';
import { useListServerNotificationsQuery } from '@/features/notifications/api';
import { DEVICE_ONLY } from '@/features/notifications/notificationsSlice';
import { useCapabilities } from './useCapabilities';
import { useAppSelector } from './store';
import { useLiveQuery } from './useLiveQuery';

export function useNavBadges(): Partial<Record<'orders' | 'bookings' | 'chat' | 'notifications' | 'offlineSales' | 'printing', number>> {
  const { can } = useCapabilities();
  const print = usePrintSummaryQuery(undefined, { skip: !can('printing'), pollingInterval: config.pollIntervalMs, skipPollingIfUnfocused: true });
  const items = useAppSelector((s) => s.notifications.items);
  // The server's notification centre; checked about once a minute (pushes and new-order polls refresh it sooner).
  const server = useListServerNotificationsQuery({ page: 1 }, { pollingInterval: 60_000, skipPollingIfUnfocused: true });
  const threads = useAppSelector(chatApi.endpoints.listThreads.select()).data;
  const shopId = useAppSelector((s) => s.auth.business?.shopId ?? null);
  const offlineSales = useLiveQuery(
    () => db.sales.where('status').anyOf('pending', 'syncing', 'unknown', 'conflict').filter((s) => s.shopId === shopId).count(),
    [shopId],
    0,
  );
  let orders = 0;
  let bookings = 0;
  let chat = (threads ?? []).reduce((n, t) => n + (t.unread_count || 0), 0);
  let unread = 0;
  const serverFeed = server.data;
  for (const n of items) {
    if (n.read) continue;
    // With the server feed available, new orders/bookings are counted from it (no double counting).
    if (serverFeed && !DEVICE_ONLY.includes(n.category)) continue;
    unread += 1;
    if (n.category === 'new_order') orders += 1;
    if (n.category === 'new_booking') bookings += 1;
  }
  if (serverFeed) {
    unread += serverFeed.unread_count;
    orders += serverFeed.unread_by_type.new_order ?? 0;
    bookings += serverFeed.unread_by_type.new_booking ?? 0;
  }
  // New requests and quotes waiting on the vendor, plus deliveries that need a partner again.
  const printing = print.data ? print.data.new + print.data.delivery_attention : 0;
  return { orders, bookings, chat, notifications: unread, offlineSales, printing };
}
