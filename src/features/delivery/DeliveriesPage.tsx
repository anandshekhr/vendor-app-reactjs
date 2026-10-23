import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Truck, Timer, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { Tabs } from '@/components/ui';
import { config } from '@/constants/config';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useListOrdersQuery } from '@/features/orders/api';
import { AssignPartnerDialog } from './AssignPartnerDialog';
import { DELIVERY_STATE_INFO } from './state';
import { DeliveryStatusCard } from './DeliveryStatusCard';

const TABS = [
  { value: 'ready-for-pickup', label: 'Awaiting pickup' },
  { value: 'out-for-delivery', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
] as const;

type Tab = (typeof TABS)[number]['value'];

export function DeliveriesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('ready-for-pickup');
  const [page, setPage] = useState(1);
  const [assignFor, setAssignFor] = useState<number | null>(null);
  // Configurable polling keeps the board in sync with the delivery system (no push channel exists).
  const poll = { pollingInterval: config.pollIntervalMs, skipPollingIfUnfocused: true };
  const awaiting = useListOrdersQuery({ status: 'ready-for-pickup', page: 1 }, poll);
  const transit = useListOrdersQuery({ status: 'out-for-delivery', page: 1 }, poll);
  const delivered = useListOrdersQuery({ status: 'delivered', page: 1 }, poll);
  const list = useListOrdersQuery({ status: tab, page }, poll);
  const needsAttention = (awaiting.data?.results ?? []).filter((o) => o.delivery && (o.delivery.can_retry || o.delivery.state === 'not_found'));

  return (
    <>
      <PageHeader
        title="Deliveries"
        description="Orders handed to TheNearByShop delivery partners."
        actions={
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => list.refetch()} loading={list.isFetching}>
            Refresh
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Awaiting pickup" value={awaiting.data?.count ?? '—'} icon={<Timer className="h-4 w-4" />} loading={awaiting.isLoading} tone={awaiting.data?.count ? 'warning' : 'neutral'} />
        <StatCard label="In transit" value={transit.data?.count ?? '—'} icon={<Truck className="h-4 w-4" />} loading={transit.isLoading} />
        <StatCard label="Delivered (all time)" value={delivered.data?.count ?? '—'} icon={<PackageCheck className="h-4 w-4" />} loading={delivered.isLoading} />
      </div>
      {list.data && list.data.results.length > 0 && list.data.results[0].delivery === undefined ? (
        <BackendGap className="mb-5" gap="G-6" title="Rider details need the api-services vendor-portal update">
          Until it is deployed, only the order status is shown here.
        </BackendGap>
      ) : (
        <BackendGap className="mb-5" gap="G-6" title="Live rider location and ETA are not exposed to vendors yet">
          Rider search state, the assigned rider and their phone number are shown once available.
        </BackendGap>
      )}
      {needsAttention.length > 0 && (
        <Card className="mb-5">
          <CardHeader title="Needs your attention" description="No rider found, search stopped, or the delivery service was unreachable." />
          <div className="space-y-3 p-4">
            {needsAttention.map((o) => (
              <div key={o.id}>
                <p className="mb-1 text-sm font-medium">
                  Order #{o.id} · {o.customer_name || 'Customer'}
                </p>
                <DeliveryStatusCard vendorOrderId={o.id} delivery={o.delivery!} />
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <CardHeader title="Delivery queue" />
        <Tabs
          label="Delivery stage"
          className="px-2"
          items={TABS.map((t) => ({ ...t }))}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
        />
        <DataTable
          rows={list.data?.results}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          rowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
          empty={<EmptyState icon={<Truck className="h-5 w-5" />} title="Nothing in this stage" />}
          columns={[
            { key: 'id', header: 'Order', cell: (o) => <span className="font-medium">#{o.id}</span> },
            { key: 'customer', header: 'Customer', cell: (o) => o.customer_name || '—' },
            { key: 'placed', header: 'Placed', cell: (o) => formatDateTime(o.created_at), hideOnMobile: true },
            { key: 'total', header: 'Total', cell: (o) => formatCurrency(o.total_amount), align: 'right', hideOnMobile: true },
            { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
            {
              key: 'rider',
              header: 'Rider',
              cell: (o) =>
                o.delivery && o.delivery.state !== 'not_requested' ? (
                  <div>
                    <Badge tone={DELIVERY_STATE_INFO[o.delivery.state]?.tone ?? 'neutral'}>{DELIVERY_STATE_INFO[o.delivery.state]?.label ?? o.delivery.state}</Badge>
                    {o.delivery.rider && (
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {o.delivery.rider.name}
                        {o.delivery.rider.phone && (
                          <>
                            {' · '}
                            <a href={`tel:${o.delivery.rider.phone}`} onClick={(e) => e.stopPropagation()} className="text-brand-700 hover:underline">
                              {o.delivery.rider.phone}
                            </a>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-ink-subtle">—</span>
                ),
            },
            {
              key: 'act',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              cell: (o) =>
                o.status === 'ready-for-pickup' && !o.delivery ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignFor(o.id);
                    }}
                  >
                    Assign partner
                  </Button>
                ) : null,
            },
          ]}
        />
        {list.data && <Pagination page={page} count={list.data.count} hasNext={Boolean(list.data.next)} onPageChange={setPage} />}
      </Card>
      {assignFor !== null && <AssignPartnerDialog open onClose={() => setAssignFor(null)} vendorOrderId={assignFor} />}
    </>
  );
}
