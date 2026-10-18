import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Truck, Timer, RefreshCw } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/ui';
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
      <BackendGap className="mb-5" gap="G-6" title="Live partner location, ETA and failed-delivery details are unavailable">
        The backend does not yet expose delivery assignments to vendors, so the map and partner contact are disabled rather than estimated.
      </BackendGap>
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
              key: 'act',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              cell: (o) =>
                o.status === 'ready-for-pickup' ? (
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
