import { db } from '@/services/offline/db';
import { useAppSelector } from './store';
import { useLiveQuery } from './useLiveQuery';

export function useNavBadges(): Partial<Record<'orders' | 'bookings' | 'chat' | 'notifications' | 'offlineSales', number>> {
  const items = useAppSelector((s) => s.notifications.items);
  const shopId = useAppSelector((s) => s.auth.business?.shopId ?? null);
  const offlineSales = useLiveQuery(
    () => db.sales.where('status').anyOf('pending', 'syncing', 'unknown', 'conflict').filter((s) => s.shopId === shopId).count(),
    [shopId],
    0,
  );
  let orders = 0;
  let bookings = 0;
  let chat = 0;
  let unread = 0;
  for (const n of items) {
    if (n.read) continue;
    unread += 1;
    if (n.category === 'new_order') orders += 1;
    if (n.category === 'new_booking') bookings += 1;
    if (n.category === 'message') chat += 1;
  }
  return { orders, bookings, chat, notifications: unread, offlineSales };
}
