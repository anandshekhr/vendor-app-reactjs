import { describe, expect, it } from 'vitest';
import { allowedBookingActions, bookingActionsFor, rescheduleWindow } from './transitions';

describe('booking actions', () => {
  it('follows a sensible lifecycle', () => {
    expect(allowedBookingActions('SCHEDULED', 'PARTIALLY_PAID', false)).toEqual(['accept', 'reject', 'start', 'reschedule', 'complete', 'cancel', 'assign', 'collect_balance']);
    expect(allowedBookingActions('SCHEDULED', 'PAID')).toEqual(['start', 'reschedule', 'complete', 'cancel', 'assign']);
    expect(allowedBookingActions('IN_PROGRESS', 'PAID')).toEqual(['complete', 'cancel', 'assign']);
    expect(allowedBookingActions('COMPLETED', 'PAID')).toEqual([]);
    expect(allowedBookingActions('CANCELLED', 'PENDING')).toEqual([]);
  });
  it('prefers the server\'s list of actions', () => {
    expect(bookingActionsFor({ status: 'SCHEDULED', payment_status: 'PAID', allowed_actions: ['complete'] })).toEqual(['complete']);
    expect(bookingActionsFor({ status: 'SCHEDULED', payment_status: 'PAID', vendor_confirmed_at: null })[0]).toBe('accept');
  });
  it('keeps the booking duration when rescheduling', () => {
    const w = rescheduleWindow('2026-11-02', '10:30', 45);
    expect(new Date(w.end_time).getTime() - new Date(w.start_time).getTime()).toBe(45 * 60_000);
    expect(() => rescheduleWindow('bad', '10:00', 30)).toThrow();
  });
});
