import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Tabs } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { useAppDispatch } from '@/hooks/store';
import { markCategoryRead } from '@/features/notifications/notificationsSlice';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useListOrdersQuery } from './api';
import { ORDER_STATUS_TABS } from './transitions';

export function OrdersPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const page = Number(params.get('page') ?? 1) || 1;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounce(search.trim());

  useEffect(() => {
    dispatch(markCategoryRead(['new_order']));
  }, [dispatch]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (q) next.set('q', q);
    else next.delete('q');
    if (q !== (params.get('q') ?? '')) next.delete('page');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const { data, isFetching, isLoading, error, refetch } = useListOrdersQuery({ status, q, page });

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '' || (key === 'status' && value === 'all')) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Orders" description="Online marketplace and in-store orders for your shop." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Order ID, customer name or phone" label="Search orders" />
        </div>
        <Tabs label="Order status" className="px-2" items={ORDER_STATUS_TABS} value={status} onChange={(v) => update('status', v)} />
        <DataTable
          caption="Orders"
          rows={data?.results}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
          empty={<EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No orders found" description={q ? 'Try a different search.' : 'Orders will appear here as customers place them.'} />}
          columns={[
            { key: 'id', header: 'Order', cell: (o) => <span className="font-medium">#{o.id}</span> },
            { key: 'date', header: 'Date & time', cell: (o) => formatDateTime(o.created_at), hideOnMobile: true },
            {
              key: 'customer',
              header: 'Customer',
              cell: (o) => (
                <div>
                  <p className="font-medium">{o.customer_name || 'Walk-in / unknown'}</p>
                  <p className="text-xs text-ink-subtle">{o.customer_phone}</p>
                </div>
              ),
            },
            { key: 'items', header: 'Items', cell: (o) => o.items_count, align: 'center', hideOnMobile: true },
            { key: 'total', header: 'Total', cell: (o) => <span className="tabular">{formatCurrency(o.total_amount)}</span>, align: 'right' },
            {
              key: 'paid',
              header: 'Payment',
              cell: (o) => (o.is_paid ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Unpaid</Badge>),
              hideOnMobile: true,
            },
            { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
          ]}
        />
        {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={(p) => update('page', String(p))} />}
      </Card>
    </>
  );
}
