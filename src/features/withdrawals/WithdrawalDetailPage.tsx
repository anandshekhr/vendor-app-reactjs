import { useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useGetWithdrawalQuery } from '@/features/wallet/api';

const STEPS = ['pending', 'processing', 'completed'] as const;

export function WithdrawalDetailPage() {
  const { id } = useParams();
  const { data: w, isLoading, error, refetch } = useGetWithdrawalQuery(Number(id), { skip: !Number(id) });
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !w) return <Skeleton className="h-64 w-full" />;
  const idx = STEPS.indexOf(w.status as (typeof STEPS)[number]);
  return (
    <>
      <PageHeader
        backTo="/wallet/withdrawals"
        title={
          <span className="flex items-center gap-3">
            Withdrawal #{w.id} <StatusBadge status={w.status} label={w.status_display} />
          </span>
        }
        description={`Requested ${formatDateTime(w.created_at)}`}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                ['Amount', formatCurrency(w.amount)],
                ['Bank', `${w.bank_name ?? '—'} ${w.account_masked}`],
                ['Payment reference', w.transaction_id || 'Not yet issued'],
                ['Processed', w.processed_at ? formatDateTime(w.processed_at) : '—'],
                ['Your note', w.notes || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Progress" />
          <CardBody>
            {w.status === 'rejected' ? (
              <p className="text-sm text-red-700">This request was rejected. The amount remains in your wallet. Contact support for the reason.</p>
            ) : (
              <ol className="space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className={`h-3 w-3 rounded-full ${i <= idx ? 'bg-emerald-600' : 'bg-line'}`} aria-hidden />
                    <span className={i <= idx ? 'font-medium' : 'text-ink-subtle'}>{s[0].toUpperCase() + s.slice(1)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
