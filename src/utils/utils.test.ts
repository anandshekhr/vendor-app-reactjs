import { describe, expect, it } from 'vitest';
import { aggregateCustomers } from '@/features/customers/aggregate';
import { createScanGate } from '@/services/scanner/dedupe';
import { toCsv } from './csv';
import { maskTail, formatCurrency } from './format';
import { isValidIndianMobile, normalizeIndianMobile } from './phone';

describe('utils', () => {
  it('masks account numbers', () => {
    expect(maskTail('123456789012')).toBe('••••••••9012');
  });
  it('escapes CSV and neutralises formulas', () => {
    expect(toCsv([{ a: '=SUM(A1)', b: 'x,"y"' }], [{ header: 'A', value: (r) => r.a }, { header: 'B', value: (r) => r.b }])).toBe('A,B\r\n\'=SUM(A1),"x,""y"""');
  });
  it('validates Indian mobile numbers', () => {
    expect(normalizeIndianMobile('+91 98765 43210')).toBe('9876543210');
    expect(isValidIndianMobile('5876543210')).toBe(false);
  });
  it('formats currency and tolerates missing values', () => {
    expect(formatCurrency('1234.5')).toContain('1,234.5');
    expect(formatCurrency(null)).toBe('—');
  });
  it('suppresses duplicate camera reads within the window', () => {
    let t = 0;
    const gate = createScanGate(1000, () => t);
    expect(gate('A')).toBe(true);
    t = 300;
    expect(gate('A')).toBe(false);
    expect(gate('B')).toBe(true);
    t = 2000;
    expect(gate('B')).toBe(true);
  });
  it('builds a customer directory from orders, excluding cancelled spend', () => {
    const rows = aggregateCustomers([
      { id: 1, customer_name: 'Asha', customer_phone: '+919876543210', items_count: 1, total_amount: '100', status: 'delivered', status_display: '', is_paid: true, created_at: '2026-10-01T10:00:00Z' },
      { id: 2, customer_name: 'Asha', customer_phone: '9876543210', items_count: 1, total_amount: '50', status: 'cancelled', status_display: '', is_paid: false, created_at: '2026-10-02T10:00:00Z' },
      { id: 3, customer_name: '', customer_phone: '', items_count: 1, total_amount: '20', status: 'delivered', status_display: '', is_paid: true, created_at: '2026-10-03T10:00:00Z' },
    ]);
    expect(rows).toHaveLength(2);
    const asha = rows.find((r) => r.phone === '9876543210')!;
    expect(asha).toMatchObject({ orders: 2, completedSpend: 100, lastOrderId: 2 });
  });
});
