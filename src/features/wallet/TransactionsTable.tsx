import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { DataTable } from '@/components/tables/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format';
import type { WalletTransaction } from '@/types/api';

export function isDebit(t: WalletTransaction): boolean {
  return t.transaction_type.toLowerCase() === 'debit';
}

export function TransactionsTable({ rows, loading, error, onRetry }: { rows: WalletTransaction[] | undefined; loading?: boolean; error?: unknown; onRetry?: () => void }) {
  return (
    <DataTable
      rows={rows}
      loading={loading}
      error={error}
      onRetry={onRetry}
      rowKey={(t) => t.id}
      empty={<EmptyState icon={<Receipt className="h-5 w-5" />} title="No transactions yet" />}
      columns={[
        { key: 'id', header: 'Txn', cell: (t) => <span className="font-mono text-xs">#{t.id}</span>, hideOnMobile: true },
        { key: 'date', header: 'Date', cell: (t) => formatDateTime(t.timestamp) },
        {
          key: 'desc',
          header: 'Description',
          cell: (t) => (
            <div>
              <p>{t.description || titleCase(t.transaction_type)}</p>
              {t.reference_id && <p className="text-xs text-ink-subtle">Ref {t.reference_id}</p>}
            </div>
          ),
        },
        { key: 'type', header: 'Type', cell: (t) => titleCase(t.transaction_type), hideOnMobile: true },
        {
          key: 'amount',
          header: 'Amount',
          align: 'right',
          cell: (t) => (
            <span className={`inline-flex items-center gap-1 font-medium tabular ${isDebit(t) ? 'text-red-600' : 'text-emerald-700'}`}>
              {isDebit(t) ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden />}
              <span className="sr-only">{isDebit(t) ? 'Debit' : 'Credit'}</span>
              {isDebit(t) ? '−' : '+'}
              {formatCurrency(t.amount)}
            </span>
          ),
        },
        { key: 'bal', header: 'Balance after', align: 'right', cell: (t) => (t.balance_after != null ? formatCurrency(t.balance_after) : '—'), hideOnMobile: true },
      ]}
    />
  );
}
