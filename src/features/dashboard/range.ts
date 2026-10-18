export type RangeKey = 'today' | 'yesterday' | '7d' | '14d' | '30d' | 'custom';

/**
 * The dashboard endpoint returns a fixed 14-day `daily_sales` series. Ranges inside that window are sliced from it
 * (real server data); longer/custom ranges need a reports endpoint (API_MAPPING G-4) and are disabled.
 */
export const RANGE_OPTIONS: { key: RangeKey; label: string; supported: boolean }[] = [
  { key: 'today', label: 'Today', supported: true },
  { key: 'yesterday', label: 'Yesterday', supported: true },
  { key: '7d', label: '7 days', supported: true },
  { key: '14d', label: '14 days', supported: true },
  { key: '30d', label: '30 days', supported: false },
  { key: 'custom', label: 'Custom', supported: false },
];

export interface SeriesPoint {
  date: string;
  label: string;
  total: number;
}

export function sliceDailySales(series: { date: string; total: number }[], range: RangeKey): SeriesPoint[] {
  const points = series.map((p) => ({
    date: p.date,
    total: Number(p.total) || 0,
    label: new Date(`${p.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));
  switch (range) {
    case 'today':
      return points.slice(-1);
    case 'yesterday':
      return points.slice(-2, -1);
    case '7d':
      return points.slice(-7);
    default:
      return points;
  }
}

export function sumSeries(points: SeriesPoint[]): number {
  return points.reduce((s, p) => s + p.total, 0);
}
