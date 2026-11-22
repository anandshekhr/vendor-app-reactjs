import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, ShoppingBag } from 'lucide-react';
import { Card, CardBody, CardHeader, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { CustomerContact } from '@/components/feedback/CustomerContact';
import { useCapabilities } from '@/hooks/useCapabilities';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useGetCustomerQuery } from './api';

export function CustomerDetailPage() {
  const { key = '' } = useParams();
  const { can } = useCapabilities();
  const { data: c, isLoading, error, refetch } = useGetCustomerQuery(key, { skip: !key });
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !c) return <Skeleton className="h-80 w-full" />;

  return (
    <>
      <PageHeader
        backTo="/customers"
        title={c.name}
        description={`${c.orders_count} order(s) · ${c.bookings_count} booking(s) · ${formatCurrency(c.total_spend)} spent${c.last_activity_at ? ` · last visit ${formatDateTime(c.last_activity_at)}` : ''}`}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Contact" />
          <CardBody className="text-sm">
            <CustomerContact phone={c.phone} masked={c.contact_masked} />
          </CardBody>
        </Card>
        <div className="space-y-5 lg:col-span-2">
          {can('orders') && (
            <Card>
              <CardHeader title="Orders" />
              {c.orders.length === 0 ? (
                <EmptyState icon={<ShoppingBag className="h-5 w-5" />} title="No orders" />
              ) : (
                <ul className="divide-y divide-line">
                  {c.orders.map((o) => (
                    <li key={o.id}>
                      <Link to={o.source === 'pos' ? `/pos/sales/${o.id}` : `/orders/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-ink/[0.03]">
                        <span>
                          <span className="font-medium">#{o.id}</span> <span className="text-ink-muted">· {o.source === 'pos' ? 'In store' : 'Online'} · {formatDateTime(o.created_at)}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <StatusBadge status={o.status} />
                          <span className="tabular">{formatCurrency(o.total_amount)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {can('bookings') && (
            <Card>
              <CardHeader title="Bookings" />
              {c.bookings.length === 0 ? (
                <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No bookings" />
              ) : (
                <ul className="divide-y divide-line">
                  {c.bookings.map((b) => (
                    <li key={b.id}>
                      <Link to={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-ink/[0.03]">
                        <span>
                          <span className="font-medium">{b.service_name}</span> <span className="text-ink-muted">· {formatDateTime(b.start_time)}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <StatusBadge status={b.status} />
                          <span className="tabular">{formatCurrency(b.total_amount)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
