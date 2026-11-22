import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Repeat, Users, Wallet } from 'lucide-react';
import { Card, CardHeader, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatCard } from '@/components/layout/StatCard';
import { useDebounce } from '@/hooks/useDebounce';
import { useCapabilities } from '@/hooks/useCapabilities';
import { formatCurrency, formatDateTime, formatNumber, initials } from '@/utils/format';
import type { CustomerRow } from '@/types/api';
import { useListCustomersQuery, type CustomerOrdering } from './api';

const ORDERINGS: { value: CustomerOrdering; label: string }[] = [
  { value: '-last_activity', label: 'Most recent' },
  { value: '-spend', label: 'Highest spend' },
  { value: '-orders', label: 'Most visits' },
  { value: 'name', label: 'Name A–Z' },
];

/** Everyone who ordered or booked at this shop, from the server (orders, POS sales and bookings). */
export function CustomersPage() {
  const navigate = useNavigate();
  const { can } = useCapabilities();
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 300);
  const [ordering, setOrdering] = useState<CustomerOrdering>('-last_activity');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useListCustomersQuery({ q, ordering, page });
  const showOrders = can('orders');
  const showBookings = can('bookings');

  return (
    <>
      <PageHeader title="Customers" description="People who ordered or booked at your shop." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Customers" value={formatNumber(data?.totals.customers)} icon={<Users className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Repeat customers" value={formatNumber(data?.totals.repeat_customers)} icon={<Repeat className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Total spend" value={formatCurrency(data?.totals.total_spend)} icon={<Wallet className="h-4 w-4" />} loading={isLoading} hint="Delivered orders and completed bookings" />
      </div>
      <Card>
        <CardHeader title="Directory" />
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Name or phone"
            label="Search customers"
          />
          <Select
            aria-label="Sort customers"
            className="sm:w-48"
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value as CustomerOrdering);
              setPage(1);
            }}
          >
            {ORDERINGS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          rows={data?.results}
          loading={isLoading || (isFetching && !data)}
          error={error}
          onRetry={refetch}
          rowKey={(c) => c.key}
          onRowClick={(c) => navigate(`/customers/${encodeURIComponent(c.key)}`)}
          empty={<EmptyState icon={<Users className="h-5 w-5" />} title={q ? 'No matching customers' : 'No customers yet'} />}
          columns={[
            {
              key: 'name',
              header: 'Customer',
              cell: (c) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-xs font-semibold">{initials(c.name)}</span>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-subtle">
                      {c.contact_masked && <Lock className="h-3 w-3" aria-label="Contact hidden" />}
                      {c.phone || 'No phone'}
                    </p>
                  </div>
                </div>
              ),
            },
            ...(showOrders ? [{ key: 'orders', header: 'Orders', align: 'center' as const, cell: (c: CustomerRow) => c.orders_count }] : []),
            ...(showBookings ? [{ key: 'bookings', header: 'Bookings', align: 'center' as const, cell: (c: CustomerRow) => c.bookings_count }] : []),
            { key: 'spend', header: 'Spend', align: 'right', cell: (c) => formatCurrency(c.total_spend) },
            { key: 'last', header: 'Last visit', cell: (c) => (c.last_activity_at ? formatDateTime(c.last_activity_at) : '—'), hideOnMobile: true },
          ]}
        />
        {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
        <p className="px-4 pb-3 text-xs text-ink-subtle">
          A customer&apos;s phone is shown while one of their orders or bookings is open or recently finished; after that it is hidden.
        </p>
      </Card>
    </>
  );
}
