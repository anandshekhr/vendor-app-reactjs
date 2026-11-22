import { describe, expect, it } from 'vitest';
import { growth, presetRange } from './ranges';

describe('report ranges', () => {
  const now = new Date(2026, 10, 22, 15, 0); // 22 Nov 2026
  it('computes presets on local calendar days', () => {
    expect(presetRange('today', now)).toEqual({ from: '2026-11-22', to: '2026-11-22' });
    expect(presetRange('yesterday', now)).toEqual({ from: '2026-11-21', to: '2026-11-21' });
    expect(presetRange('7d', now)).toEqual({ from: '2026-11-16', to: '2026-11-22' });
    expect(presetRange('30d', now)).toEqual({ from: '2026-10-24', to: '2026-11-22' });
    expect(presetRange('this_month', now)).toEqual({ from: '2026-11-01', to: '2026-11-22' });
    expect(presetRange('last_month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(presetRange('last_month', new Date(2026, 0, 10))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });
  it('reports growth against the previous period', () => {
    expect(growth(120, 100)).toBe(20);
    expect(growth(50, 200)).toBe(-75);
    expect(growth(10, 0)).toBeNull();
  });
});
