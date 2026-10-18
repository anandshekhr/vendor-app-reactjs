import { describe, expect, it } from 'vitest';
import { allowedBookingActions, rescheduleWindow } from './transitions';

describe('booking actions', () => {
  it('follows a sensible lifecycle', () => {
    expect(allowedBookingActions('SCHEDULED', 'PARTIALLY_PAID')).toEqual(['start', 'reschedule', 'cancel', 'collect_balance']);
    expect(allowedBookingActions('IN_PROGRESS', 'PAID')).toEqual(['complete']);
    expect(allowedBookingActions('COMPLETED', 'PAID')).toEqual([]);
    expect(allowedBookingActions('CANCELLED', 'PENDING')).toEqual([]);
  });
  it('keeps the booking duration when rescheduling', () => {
    const w = rescheduleWindow('2026-11-02', '10:30', 45);
    expect(new Date(w.end_time).getTime() - new Date(w.start_time).getTime()).toBe(45 * 60_000);
    expect(() => rescheduleWindow('bad', '10:00', 30)).toThrow();
  });
});
