import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Checkbox, SkeletonRows } from '@/components/ui';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  /** Hide below the `md` breakpoint to keep tables readable on phones. */
  hideOnMobile?: boolean;
  align?: 'left' | 'right' | 'center';
}

export type SortState = { key: string; direction: 'asc' | 'desc' } | null;

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  selectable?: boolean;
  selected?: Set<string | number>;
  onSelectedChange?: (next: Set<string | number>) => void;
  caption?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  empty,
  onRowClick,
  sort,
  onSortChange,
  selectable,
  selected,
  onSelectedChange,
  caption,
}: DataTableProps<T>) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !rows) return <SkeletonRows cols={Math.min(columns.length, 5)} />;
  if (!rows || rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

  const allKeys = rows.map(rowKey);
  const allSelected = selectable && selected && allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (!sort || sort.key !== key) onSortChange({ key, direction: 'asc' });
    else if (sort.direction === 'asc') onSortChange({ key, direction: 'desc' });
    else onSortChange(null);
  };

  const alignClass = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
      <table className="min-w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-ink/[0.02] text-xs uppercase tracking-wide text-ink-subtle">
            {selectable && (
              <th scope="col" className="w-10 px-3 py-2.5">
                <Checkbox
                  aria-label="Select all rows"
                  checked={Boolean(allSelected)}
                  onChange={(e) => onSelectedChange?.(e.target.checked ? new Set(allKeys) : new Set())}
                />
              </th>
            )}
            {columns.map((col) => {
              const sorted = sort?.key === col.key ? sort.direction : null;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('whitespace-nowrap px-3 py-2.5 font-medium', alignClass(col.align), col.hideOnMobile && 'hidden md:table-cell', col.headerClassName)}
                >
                  {col.sortable && onSortChange ? (
                    <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 uppercase hover:text-ink">
                      {col.header}
                      {sorted === 'asc' ? <ArrowUp className="h-3 w-3" /> : sorted === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-ink/[0.03]', selected?.has(key) && 'bg-brand-50/50 dark:bg-brand-900/10')}
              >
                {selectable && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select row ${key}`}
                      checked={selected?.has(key) ?? false}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(key);
                        else next.delete(key);
                        onSelectedChange?.(next);
                      }}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-3 py-2.5 align-middle', alignClass(col.align), col.hideOnMobile && 'hidden md:table-cell', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
