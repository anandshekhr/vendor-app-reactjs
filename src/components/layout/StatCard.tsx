import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { cn } from '@/utils/cn';

export function StatCard({
  label,
  value,
  icon,
  hint,
  loading,
  to,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  to?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}) {
  const body = (
    <div
      className={cn(
        'h-full rounded-lg border border-line bg-surface p-4 shadow-card transition-colors',
        to && 'hover:border-brand-300',
        tone === 'warning' && 'border-l-4 border-l-amber-500',
        tone === 'danger' && 'border-l-4 border-l-red-500',
        tone === 'success' && 'border-l-4 border-l-emerald-500',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
        {icon && <span className="text-ink-subtle">{icon}</span>}
      </div>
      <div className="mt-2 text-xl font-semibold text-ink tabular">{loading ? <Skeleton className="h-6 w-24" /> : value}</div>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}
