import { describe, expect, it } from 'vitest';
import { deliveryStage } from '@/features/delivery/state';
import { allowedActions } from './transitions';

describe('order transitions (mirrors backend VENDOR_ORDER_TRANSITIONS)', () => {
  it('offers accept/reject/cancel for new orders', () => {
    expect(allowedActions('created').map((a) => a.action)).toEqual(['accept', 'reject', 'cancel']);
  });
  it('never offers delivery-driven transitions to vendors', () => {
    expect(allowedActions('ready-for-pickup').map((a) => a.action)).toEqual(['cancel']);
    expect(allowedActions('out-for-delivery')).toEqual([]);
    expect(allowedActions('delivered')).toEqual([]);
    expect(allowedActions('cancelled')).toEqual([]);
  });
  it('requires a reason for reject and cancel', () => {
    const specs = allowedActions('created');
    expect(specs.find((s) => s.action === 'reject')?.requiresNote).toBe(true);
    expect(specs.find((s) => s.action === 'cancel')?.requiresNote).toBe(true);
    expect(specs.find((s) => s.action === 'accept')?.requiresNote).toBeFalsy();
  });
});

describe('delivery stage', () => {
  it('maps order status to delivery stage without inventing data', () => {
    expect(deliveryStage('preparing').stage).toBe('not_ready');
    expect(deliveryStage('ready-for-pickup').stage).toBe('awaiting_pickup');
    expect(deliveryStage('out-for-delivery').stage).toBe('in_transit');
    expect(deliveryStage('delivered').stage).toBe('delivered');
    expect(deliveryStage('rejected').stage).toBe('cancelled');
    expect(deliveryStage('delivered', 'pos').stage).toBe('in_store');
  });
});
