import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { Card, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useAppDispatch } from '@/hooks/store';
import { markCategoryRead } from '@/features/notifications/notificationsSlice';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useListBookingsQuery } from './api';
import { BOOKING_TABS } from './transitions';

export function BookingsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const { data, isLoading, isFetching, error, refetch } = useListBookingsQuery({ status, q, page });

  useEffect(() => {
    dispatch(markCategoryRead(['new_booking']));
  }, [dispatch]);

  return (
    <>
      <PageHeader title="Bookings" description="Appointments booked by customers." />
      <Card>
        <div className="border-b border-line p-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Customer name or phone" label="Search bookings" />
        </div>
        <Tabs
          label="Booking status"
          className="px-2"
          items={BOOKING_TABS}
          value={status}
          onChange={(v) => {
            setParams(v === 'all' ? {} : { status: v });
            setPage(1);
          }}
        />
        <DataTable
          rows={data?.results}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(b) => b.id}
          onRowClick={(b) => navigate(`/bookings/${b.id}`)}
          empty={<EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No bookings found" />}
          columns={[
            { key: 'id', header: 'Booking', cell: (b) => <span className="font-medium">#{b.id}</span> },
            {
              key: 'customer',
              header: 'Customer',
              cell: (b) => (
                <div>
                  <p className="font-medium">{b.customer_name}</p>
                  <p className="text-xs text-ink-subtle">{b.customer_phone}</p>
                </div>
              ),
            },
            { key: 'service', header: 'Service', cell: (b) => b.service_name, hideOnMobile: true },
            { key: 'when', header: 'Date & slot', cell: (b) => formatDateTime(b.start_time) },
            { key: 'staff', header: 'Staff', cell: (b) => b.staff ?? <span className="text-ink-subtle">Unassigned</span>, hideOnMobile: true },
            { key: 'amount', header: 'Price', align: 'right', cell: (b) => formatCurrency(b.total_amount), hideOnMobile: true },
            { key: 'payment', header: 'Payment', cell: (b) => <StatusBadge status={b.payment_status} label={b.payment_status_display} />, hideOnMobile: true },
            { key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} label={b.status_display} /> },
          ]}
        />
        {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      </Card>
    </>
  );
}
