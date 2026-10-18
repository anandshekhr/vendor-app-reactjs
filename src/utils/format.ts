const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('en-IN');

/** Parses DRF decimal strings ("123.40") and numbers. Returns null for missing/invalid values. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(value: unknown): string {
  const n = toNumber(value);
  return n === null ? '—' : inr.format(n);
}

export function formatNumber(value: unknown): string {
  const n = toNumber(value);
  return n === null ? '—' : integer.format(n);
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  return d
    ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
}

export function formatTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
}

export function formatRelative(value: string | number | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return '—';
  const diffSec = Math.round((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  return formatDate(d);
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Masks all but the last 4 characters, e.g. bank account numbers. */
export function maskTail(value: string | null | undefined, visible = 4): string {
  const v = (value ?? '').replace(/\s+/g, '');
  if (!v) return '';
  if (v.length <= visible) return v;
  return '•'.repeat(Math.min(8, v.length - visible)) + v.slice(-visible);
}

export function maskPhone(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length < 6) return value ?? '';
  return `${digits.slice(0, 2)}••••${digits.slice(-4)}`;
}

export function titleCase(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
