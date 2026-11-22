import { describe, expect, it } from 'vitest';
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
});
