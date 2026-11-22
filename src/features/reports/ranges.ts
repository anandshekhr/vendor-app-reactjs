/** Date-range presets for reports. Dates are local calendar days as YYYY-MM-DD. */
export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
];

export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function presetRange(preset: Exclude<RangePreset, 'custom'>, now = new Date()): { from: string; to: string } {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const minus = (n: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate() - n);
  switch (preset) {
    case 'today':
      return { from: isoDay(day), to: isoDay(day) };
    case 'yesterday':
      return { from: isoDay(minus(1)), to: isoDay(minus(1)) };
    case '7d':
      return { from: isoDay(minus(6)), to: isoDay(day) };
    case '30d':
      return { from: isoDay(minus(29)), to: isoDay(day) };
    case 'this_month':
      return { from: isoDay(new Date(day.getFullYear(), day.getMonth(), 1)), to: isoDay(day) };
    case 'last_month':
      return { from: isoDay(new Date(day.getFullYear(), day.getMonth() - 1, 1)), to: isoDay(new Date(day.getFullYear(), day.getMonth(), 0)) };
  }
}

/** Change against the previous period, e.g. +12.5 (null when there is nothing to compare with). */
export function growth(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
