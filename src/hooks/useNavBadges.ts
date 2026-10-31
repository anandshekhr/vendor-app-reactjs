import { db } from '@/services/offline/db';
import { chatApi } from '@/features/chat/api';
import { usePrintSummaryQuery } from '@/features/printing/api';
import { config } from '@/constants/config';
import { useCapabilities } from './useCapabilities';
import { useAppSelector } from './store';
import { useLiveQuery } from './useLiveQuery';

export function useNavBadges(): Partial<Record<'orders' | 'bookings' | 'chat' | 'notifications' | 'offlineSales' | 'printing', number>> {
  const { can } = useCapabilities();
  const print = usePrintSummaryQuery(undefined, { skip: !can('printing'), pollingInterval: config.pollIntervalMs, skipPollingIfUnfocused: true });
  const items = useAppSelector((s) => s.notifications.items);
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
  for (const n of items) {
    if (n.read) continue;
    unread += 1;
    if (n.category === 'new_order') orders += 1;
    if (n.category === 'new_booking') bookings += 1;
  }
  // New requests and quotes waiting on the vendor, plus deliveries that need a partner again.
  const printing = print.data ? print.data.new + print.data.delivery_attention : 0;
  return { orders, bookings, chat, notifications: unread, offlineSales, printing };
}
