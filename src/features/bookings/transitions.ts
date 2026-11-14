import type { BookingAction, BookingStatus, PaymentStatus } from '@/types/api';

/**
 * The server decides what can happen next and returns it as `allowed_actions` (apps.services.booking_flow).
 * This fallback mirrors those rules for older servers that don't send the list.
 */
export function allowedBookingActions(status: BookingStatus, payment: PaymentStatus, confirmed = true): BookingAction[] {
  const actions: BookingAction[] = [];
  if (status === 'SCHEDULED') {
    if (!confirmed) actions.push('accept', 'reject');
    actions.push('start', 'reschedule');
  }
  if (status === 'SCHEDULED' || status === 'IN_PROGRESS') actions.push('complete', 'cancel', 'assign');
  if (status !== 'CANCELLED' && payment !== 'PAID' && payment !== 'REFUNDED') actions.push('collect_balance');
  return actions;
}

/** The actions to offer: the server's list when it sends one, otherwise the local fallback. */
export function bookingActionsFor(b: { status: BookingStatus; payment_status: PaymentStatus; vendor_confirmed_at?: string | null; allowed_actions?: BookingAction[] }): BookingAction[] {
  return b.allowed_actions ?? allowedBookingActions(b.status, b.payment_status, b.vendor_confirmed_at !== null);
}

/** Actions that need the shop to give the customer a reason. */
export const REASON_ACTIONS: BookingAction[] = ['reject', 'cancel'];

export const BOOKING_ACTION_LABELS: Record<BookingAction, string> = {
  accept: 'Accept booking',
  reject: 'Reject',
  start: 'Mark in progress',
  complete: 'Mark completed',
  cancel: 'Cancel booking',
  assign: 'Assign staff',
  reschedule: 'Reschedule',
  collect_balance: 'Record balance collected',
};

export const BOOKING_TABS = [
  { value: 'all', label: 'All' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** Builds ISO start/end for a reschedule, keeping the original duration. */
export function rescheduleWindow(date: string, time: string, durationMinutes: number): { start_time: string; end_time: string } {
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid date or time');
  const end = new Date(start.getTime() + Math.max(15, durationMinutes) * 60_000);
  return { start_time: start.toISOString(), end_time: end.toISOString() };
}
