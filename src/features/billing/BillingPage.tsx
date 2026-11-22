import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Receipt, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { DataTable } from '@/components/tables/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/services/api/errors';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import type { BillingCharge } from '@/types/api';
import { useGetBillingQuery, useSettleBillingMutation } from './api';

const PER = { daily: 'day', weekly: 'week', monthly: 'month' } as const;
const TONE: Record<BillingCharge['status'], 'success' | 'warning' | 'danger' | 'neutral'> = { paid: 'success', pending: 'warning', failed: 'danger', waived: 'neutral' };

/** Category subscriptions: what they cost, what was charged from the wallet, and paying any dues. */
export function BillingPage() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetBillingQuery();
  const [settle, settleState] = useSettleBillingMutation();

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  const due = Number(data.due);
  const canPay = due > 0 && Number(data.wallet_balance) > 0;

  const pay = async () => {
    try {
      const res = await settle().unwrap();
      toast.success('Dues paid', `${formatCurrency(res.paid_amount)} taken from your wallet${res.shop_reopened ? ' — your shop is open again' : ''}.`);
    } catch (err) {
      const detail = isApiError(err) && err.status === 409 ? 'Your wallet balance is too low for the oldest due charge. Add money to your wallet first.' : undefined;
      toast.error('Could not pay dues', detail ?? err);
    }
  };

  return (
    <>
      <PageHeader title="Subscription & billing" description="Each of your categories may have a subscription, charged from your wallet every morning." />
      {data.paused && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-900/20 dark:text-red-200">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Your shop is not taking orders since {data.paused_at ? formatDateTime(data.paused_at) : 'recently'} because {formatCurrency(data.due)} is overdue. It reopens as soon as the dues are paid.
          </span>
          <Button size="sm" onClick={pay} loading={settleState.isLoading} disabled={!canPay}>
            Pay {formatCurrency(data.due)} now
          </Button>
        </div>
      )}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monthly estimate" value={formatCurrency(data.monthly_estimate)} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Amount due" value={formatCurrency(data.due)} icon={<Receipt className="h-4 w-4" />} tone={due > 0 ? 'danger' : 'neutral'} hint={data.oldest_unpaid ? `since ${formatDate(data.oldest_unpaid)}` : 'All paid'} />
        <StatCard label="Wallet balance" value={formatCurrency(data.wallet_balance)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Categories with a plan" value={String(data.plans.length)} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Your plans"
            actions={
              <Link to="/profile">
                <Button size="sm" variant="outline">
                  Change categories
                </Button>
              </Link>
            }
          />
          {data.plans.length === 0 ? (
            <CardBody>
              <EmptyState title="No paid categories" description="None of your categories has a subscription." />
            </CardBody>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.plans.map((p) => (
                <li key={p.category_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block font-medium">{p.category}</span>
                    <span className="text-xs text-ink-muted">{p.grace_days}-day grace if unpaid</span>
                  </span>
                  <span className="tabular font-medium">
                    {formatCurrency(p.cost)} / {PER[p.frequency]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {due > 0 && !data.paused && (
            <CardBody className="border-t border-line">
              <Button className="w-full" onClick={pay} loading={settleState.isLoading} disabled={!canPay}>
                Pay {formatCurrency(data.due)} from wallet
              </Button>
              <p className="mt-2 text-xs text-ink-muted">Unpaid charges are retried every morning and right after money reaches your wallet.</p>
            </CardBody>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Charges" description="The last 60" />
          <DataTable
            rows={data.charges}
            rowKey={(c) => c.id}
            empty={<EmptyState icon={<Receipt className="h-5 w-5" />} title="No charges yet" />}
            columns={[
              { key: 'period', header: 'Period', cell: (c) => `${formatDate(c.period_start)} · ${c.frequency}` },
              { key: 'category', header: 'Category', cell: (c) => c.category },
              { key: 'amount', header: 'Amount', align: 'right', cell: (c) => formatCurrency(c.amount) },
              { key: 'status', header: 'Status', cell: (c) => <Badge tone={TONE[c.status]}>{c.status_display}</Badge> },
              {
                key: 'detail',
                header: '',
                hideOnMobile: true,
                cell: (c) => <span className="text-xs text-ink-muted">{c.paid_at ? `Paid ${formatDateTime(c.paid_at)}` : c.note || c.last_error || (c.attempts ? `${c.attempts} attempt(s)` : '')}</span>,
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
