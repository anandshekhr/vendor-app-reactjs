import type { BookingAction, BookingStatus, PaymentStatus } from '@/types/api';

/**
 * The backend performs no transition validation for booking actions (API_MAPPING G-10), so the portal restricts the
 * offered actions to a sensible lifecycle. This is a UX safeguard, not an authorisation control.
 */
export function allowedBookingActions(status: BookingStatus, payment: PaymentStatus): BookingAction[] {
  const actions: BookingAction[] = [];
  if (status === 'SCHEDULED') actions.push('start', 'reschedule', 'cancel');
  if (status === 'IN_PROGRESS') actions.push('complete');
  if (status !== 'CANCELLED' && payment !== 'PAID' && payment !== 'REFUNDED') actions.push('collect_balance');
  return actions;
}

export const BOOKING_ACTION_LABELS: Record<BookingAction, string> = {
  start: 'Mark in progress',
  complete: 'Mark completed',
  cancel: 'Cancel booking',
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
