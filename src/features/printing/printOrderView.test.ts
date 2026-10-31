import { describe, expect, it } from 'vitest';
import { FULFILMENT_STEPS, formatBytes, parsePickupInput, printOptionsSummary, stepIndex } from './printOrderView';

describe('printing order view helpers', () => {
  it('follows separate steps for pickup and delivery', () => {
    expect(FULFILMENT_STEPS.PICKUP.map((s) => s.status)).toContain('PICKUP_VERIFIED');
    expect(FULFILMENT_STEPS.PICKUP.map((s) => s.status)).not.toContain('OUT_FOR_DELIVERY');
    expect(FULFILMENT_STEPS.DELIVERY.map((s) => s.status)).toEqual([
      'RECEIVED', 'PRINTING', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'PARTNER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED',
    ]);
    expect(stepIndex('PICKUP', 'READY_FOR_PICKUP')).toBe(3);
    expect(stepIndex('DELIVERY', 'NEW_REQUEST')).toBe(-1);
    expect(stepIndex('DELIVERY', 'CANCELLED')).toBeNull();
  });

  it('tells a QR payload from a typed code', () => {
    const uuid = '00000000-0000-4000-8000-000000000004';
    expect(parsePickupInput(`TNBS-PRINT:${uuid}:246810`)).toEqual({ qr_payload: `TNBS-PRINT:${uuid}:246810` });
    expect(parsePickupInput(' 246 810 ')).toEqual({ code: '246810' });
    expect(parsePickupInput('12345')).toBeNull();
    expect(parsePickupInput('https://example.com')).toBeNull();
  });

  it('summarises print options and sizes', () => {
    expect(printOptionsSummary({ color_mode: 'COLOR', paper_size: 'A3', sided: 'DOUBLE', page_range: '1-5,8', binding: 'SPIRAL' })).toBe(
      'Colour · A3 · Double-sided · Pages 1-5,8 · Spiral binding',
    );
    expect(printOptionsSummary({ color_mode: 'BW', paper_size: 'A4', sided: 'SINGLE', page_range: '', binding: 'NONE' })).toBe('B&W · A4 · Single-sided · All pages');
    expect(formatBytes(245_000)).toBe('239 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
