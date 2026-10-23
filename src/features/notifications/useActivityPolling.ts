import { useEffect, useRef } from 'react';
import { config } from '@/constants/config';
import { bookingsApi } from '@/features/bookings/api';
import { ordersApi } from '@/features/orders/api';
import { chatApi } from '@/features/chat/api';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useCapabilities } from '@/hooks/useCapabilities';
import { formatCurrency } from '@/utils/format';
import { bookingBaselineSet, notificationsAdded, orderBaselineSet, persistNotifications } from './notificationsSlice';

/**
 * Polls the backend's real "since" endpoints for new orders/bookings (no push/WebSocket exists — API_MAPPING G-14).
 * The first run only records a baseline from page 1 so historical records do not flood the feed. Polling pauses
 * while the tab is hidden or the device is offline.
 */
export function useActivityPolling() {
  const dispatch = useAppDispatch();
  const { can } = useCapabilities();
  const state = useAppSelector((s) => s.notifications);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    persistNotifications(state);
  }, [state]);

  useEffect(() => {
    const wantOrders = can('orders');
    const wantBookings = can('bookings');
    const wantChat = can('chat');
    if (!wantOrders && !wantBookings && !wantChat) return;
    let stopped = false;

    async function tick() {
      if (stopped || document.hidden || !navigator.onLine) return;
      const { lastOrderId, lastBookingId } = stateRef.current;
      if (wantOrders) {
        try {
          if (lastOrderId === null) {
            const page = await dispatch(ordersApi.endpoints.listOrders.initiate({ page: 1 }, { subscribe: false })).unwrap();
            dispatch(orderBaselineSet(page.results[0]?.id ?? 0));
          } else {
            const res = await dispatch(ordersApi.endpoints.pollOrders.initiate(lastOrderId, { subscribe: false, forceRefetch: true })).unwrap();
            if (res.orders.length > 0) {
              dispatch(
                notificationsAdded(
                  res.orders.map((o) => ({
                    id: `order-${o.id}`,
                    category: 'new_order' as const,
                    title: `New order #${o.id}`,
                    body: `${o.customer_name || 'Customer'} · ${o.items_count} item(s) · ${formatCurrency(o.total_amount)}`,
                    link: `/orders/${o.id}`,
                    createdAt: new Date(o.created_at).getTime() || Date.now(),
                  })),
                ),
              );
              dispatch(orderBaselineSet(res.latest_id));
              dispatch(ordersApi.util.invalidateTags([{ type: 'Orders', id: 'LIST' }, 'Dashboard']));
            }
          }
        } catch {
          /* transient — retried on next tick */
        }
      }
      if (wantChat) {
        // Keeps unread counts in the sidebar current; conversations themselves update over WebSocket.
        dispatch(chatApi.endpoints.listThreads.initiate(undefined, { subscribe: false, forceRefetch: true }));
      }
      if (wantBookings) {
        try {
          if (lastBookingId === null) {
            const page = await dispatch(bookingsApi.endpoints.listBookings.initiate({ page: 1 }, { subscribe: false })).unwrap();
            dispatch(bookingBaselineSet(page.results[0]?.id ?? 0));
          } else {
            const res = await dispatch(bookingsApi.endpoints.pollBookings.initiate(lastBookingId, { subscribe: false, forceRefetch: true })).unwrap();
            if (res.bookings.length > 0) {
              dispatch(
                notificationsAdded(
                  res.bookings.map((b) => ({
                    id: `booking-${b.id}`,
                    category: 'new_booking' as const,
                    title: `New booking #${b.id}`,
                    body: `${b.customer_name || 'Customer'} · ${b.service_name}`,
                    link: `/bookings/${b.id}`,
                    createdAt: Date.now(),
                  })),
                ),
              );
              dispatch(bookingBaselineSet(res.latest_id));
              dispatch(bookingsApi.util.invalidateTags([{ type: 'Bookings', id: 'LIST' }, 'ServiceDashboard']));
            }
          }
        } catch {
          /* transient */
        }
      }
    }

    tick();
    const id = window.setInterval(tick, config.pollIntervalMs);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', tick);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', tick);
    };
  }, [can, dispatch]);
}
