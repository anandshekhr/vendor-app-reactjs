import type { BusinessSnapshot } from '@/features/auth/businessCache';
import { ordersApi } from '@/features/orders/api';
import type { ReceiptData } from '@/services/printing/Receipt';
import type { AppDispatch } from '@/app/store';
import type { BookingListItem, OrderDetail } from '@/types/api';
import { bookingSlip, orderSlip, receiptDocument } from './document';
import { runPrintJob } from './printer';
import { loadPrinterSettings, type AutoPrintEvents } from './settings';

/** True when auto-print is on for this kind of event on this device. */
export function autoPrintEnabled(event: keyof AutoPrintEvents): boolean {
  const s = loadPrinterSettings();
  return s.autoPrint && s.events[event];
}

/** New online orders found by polling: print an order slip for each (once per device). */
export async function autoPrintNewOrders(dispatch: AppDispatch, orderIds: number[], business: BusinessSnapshot | null) {
  if (!autoPrintEnabled('newOrder')) return;
  // Oldest first, so slips come out in the order customers placed them.
  for (const id of [...orderIds].sort((a, b) => a - b)) {
    await runPrintJob(
      `order:${id}:new`,
      async () => {
        const order = await dispatch(ordersApi.endpoints.getOrder.initiate(id, { subscribe: false })).unwrap();
        return orderSlip(order, business, 'NEW ORDER');
      },
      { auto: true },
    );
  }
}

export function autoPrintAcceptedOrder(order: OrderDetail, business: BusinessSnapshot | null) {
  if (!autoPrintEnabled('acceptedOrder')) return Promise.resolve(false);
  return runPrintJob(`order:${order.id}:accepted`, () => orderSlip(order, business, 'ORDER ACCEPTED'), { auto: true });
}

export function autoPrintPosReceipt(data: ReceiptData, business: BusinessSnapshot | null) {
  if (!autoPrintEnabled('posSale')) return Promise.resolve(false);
  const key = data.orderId !== null ? `pos:${data.orderId}` : `pos:offline:${data.clientReference}`;
  return runPrintJob(key, () => receiptDocument(data, business), { auto: true });
}

export async function autoPrintNewBookings(bookings: BookingListItem[], business: BusinessSnapshot | null) {
  if (!autoPrintEnabled('newBooking')) return;
  for (const b of [...bookings].sort((a, z) => a.id - z.id)) {
    await runPrintJob(`booking:${b.id}:new`, () => bookingSlip(b, business), { auto: true });
  }
}
