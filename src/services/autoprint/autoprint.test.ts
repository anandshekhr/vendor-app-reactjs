import { beforeEach, describe, expect, it } from 'vitest';
import type { OrderDetail } from '@/types/api';
import { columnsFor, itemLines, layoutText, orderSlip, pairLines, type PrintDocument } from './document';
import { encodeEscPos, toAscii } from './escpos';
import { renderHtml } from './html';
import { claimPrintJob } from './printer';
import { DEFAULT_PRINTER_SETTINGS, loadPrinterSettings, resetPrinterSettingsCache, updatePrinterSettings } from './settings';

const order: OrderDetail = {
  id: 1093,
  external_id: 'TNBS-1093',
  customer_name: 'Priya Sharma',
  customer_phone: '+919812345678',
  total_amount: '245.00',
  status: 'created',
  status_display: 'Created',
  is_paid: false,
  rejection_reason: '',
  created_at: '2026-11-14T10:00:00Z',
  delivered_at: null,
  history: [],
  item_total: '225.00',
  shipping_amount: '20.00',
  customer_address: { address_line1: '12 MG Road', city: 'Bengaluru', pincode: '560001' },
  items: [
    { id: 1, order: 1093, product: 5, product_snapshot: { name: 'Amul Taaza Milk 500ml' }, quantity: 3, unit_price: '27.00', line_total: '81.00' },
    { id: 2, order: 1093, product: 6, product_snapshot: { name: 'Britannia Good Day Cashew Cookies Family Pack 600g' }, quantity: 1, unit_price: '144.00', line_total: '144.00' },
  ],
};

describe('print layout', () => {
  it('fits every line to the paper width', () => {
    for (const paper of ['58mm', '80mm'] as const) {
      const width = columnsFor(paper);
      for (const line of layoutText(orderSlip(order, null), paper)) {
        expect(line.text.length).toBeLessThanOrEqual(line.large ? width / 2 : width);
      }
    }
  });
  it('right-aligns amounts and wraps long item names', () => {
    const lines = itemLines('Britannia Good Day Cashew Cookies Family Pack 600g', 1, 'Rs 144.00', 32);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.at(-1)!.endsWith('Rs 144.00')).toBe(true);
    expect(lines.at(-1)!.length).toBe(32);
    expect(pairLines('TOTAL', 'Rs 245.00', 32)[0]).toBe(`TOTAL${' '.repeat(18)}Rs 245.00`);
  });
  it('order slip has items, address, total and payment state', () => {
    const text = layoutText(orderSlip(order, null), '80mm').map((l) => l.text).join('\n');
    expect(text).toContain('NEW ORDER #1093');
    expect(text).toContain('3 x Amul Taaza Milk 500ml');
    expect(text).toContain('12 MG Road, Bengaluru, 560001');
    expect(text).toMatch(/TOTAL\s+Rs 245.00/);
    expect(text).toContain('NOT PAID');
  });
  it('leaves out a masked phone number', () => {
    const text = layoutText(orderSlip({ ...order, contact_masked: true }, null), '80mm').map((l) => l.text).join('\n');
    expect(text).not.toContain('9812345678');
  });
});

describe('ESC/POS', () => {
  const doc: PrintDocument = { title: 't', lines: [{ kind: 'text', text: 'Hi ₹5', bold: true, align: 'center' }] };
  it('starts with reset, sets alignment and bold, ends with a cut', () => {
    const bytes = Array.from(encodeEscPos(doc, '58mm'));
    expect(bytes.slice(0, 2)).toEqual([0x1b, 0x40]);
    expect(bytes).toEqual(expect.arrayContaining([0x1b, 0x61, 1, 0x1b, 0x45, 1]));
    expect(bytes.slice(-4)).toEqual([0x1d, 0x56, 66, 0]);
    expect(String.fromCharCode(...bytes)).toContain('Hi Rs5');
  });
  it('can skip the cut', () => {
    expect(Array.from(encodeEscPos(doc, '58mm', { cut: false })).slice(-4)).not.toEqual([0x1d, 0x56, 66, 0]);
  });
  it('sends only printable ASCII', () => {
    expect(toAscii('Café – “ok” ₹')).toBe('Cafe - "ok" Rs');
    expect(toAscii('नमस्ते')).toMatch(/^\?+$/);
  });
});

describe('HTML print page', () => {
  it('sizes the page for the roll and repeats copies', () => {
    const html = renderHtml({ title: 'Order <1>', lines: [{ kind: 'text', text: 'A & B' }] }, '58mm', 2);
    expect(html).toContain('size: 58mm auto');
    expect(html).toContain('Order &lt;1&gt;');
    expect(html).toContain('A &amp; B');
    expect(html.match(/class="slip"/g)).toHaveLength(2);
  });
});

describe('settings and dedupe', () => {
  beforeEach(() => {
    localStorage.clear();
    resetPrinterSettingsCache();
  });
  it('defaults to off and keeps changes', () => {
    expect(loadPrinterSettings()).toEqual(DEFAULT_PRINTER_SETTINGS);
    updatePrinterSettings({ autoPrint: true, copies: 9, events: { ...DEFAULT_PRINTER_SETTINGS.events, newBooking: true } });
    resetPrinterSettingsCache();
    const s = loadPrinterSettings();
    expect(s.autoPrint).toBe(true);
    expect(s.copies).toBe(3);
    expect(s.events.newBooking).toBe(true);
    expect(s.events.newOrder).toBe(true);
  });
  it('claims each job once per device, until the claim expires', () => {
    const now = Date.now();
    expect(claimPrintJob('order:1:new', now)).toBe(true);
    expect(claimPrintJob('order:1:new', now + 1000)).toBe(false);
    expect(claimPrintJob('order:2:new', now)).toBe(true);
    expect(claimPrintJob('order:1:new', now + 8 * 24 * 3600_000)).toBe(true);
  });
});
