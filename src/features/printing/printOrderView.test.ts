import { describe, expect, it } from 'vitest';
import { FULFILMENT_STEPS, formatBytes, parsePickupInput, jobStationText, printOptionsSummary, selectedPages, stationSummary, stepIndex } from './printOrderView';

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

describe('selectedPages (matches the server pricing)', () => {
  const list = (r: string, n: number) => [...selectedPages(r, n)].sort((a, b) => a - b);
  it('reads ranges and single pages, clipped to the document', () => {
    expect(list('1-3, 5,9-20', 10)).toEqual([1, 2, 3, 5, 9, 10]);
    expect(list('1-5,8', 2)).toEqual([1, 2]);
  });
  it('blank, unreadable or empty selections mean every page', () => {
    expect(list('', 3)).toEqual([1, 2, 3]);
    expect(list('a-b', 3)).toEqual([1, 2, 3]);
    expect(list('7-9', 3)).toEqual([1, 2, 3]);
  });
});

describe('print station helpers', () => {
  it('says where an auto-printed job is', () => {
    expect(jobStationText({ station_name: 'Counter printer', status: 'QUEUED' })).toBe('Waiting for Counter printer');
    expect(jobStationText({ station_name: 'Counter printer', status: 'FAILED' })).toBe('Failed on Counter printer');
  });
  it('summarises what a printer can do', () => {
    expect(stationSummary({ supports_color: false, supports_duplex: true, paper_sizes: ['A4', 'A3'] })).toBe('Black & white only · double-sided · A4, A3');
  });
});
