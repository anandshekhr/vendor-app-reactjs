import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useAppDispatch } from '@/hooks/store';
import { ordersApi } from '@/features/orders/api';
import { toApiError } from '@/services/api/errors';
import { formatCurrency, formatDateTime, initials } from '@/utils/format';
import type { OrderListItem } from '@/types/api';
import { aggregateCustomers } from './aggregate';

const PAGES_PER_LOAD = 5;

export function CustomersPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState('');

  const loadMore = async () => {
    if (nextPage === null) return;
    setLoading(true);
    setError(null);
    try {
      let page = nextPage;
      const collected: OrderListItem[] = [];
      for (let i = 0; i < PAGES_PER_LOAD; i++) {
        const res = await dispatch(ordersApi.endpoints.listOrders.initiate({ page }, { subscribe: false })).unwrap();
        collected.push(...res.results);
        setTotal(res.count);
        if (!res.next) {
          page = -1;
          break;
        }
        page += 1;
      }
      setOrders((prev) => [...prev, ...collected]);
      setNextPage(page === -1 ? null : page);
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customers = useMemo(() => aggregateCustomers(orders), [orders]);
  const term = search.trim().toLowerCase();
  const rows = term ? customers.filter((c) => c.name.toLowerCase().includes(term) || c.phone.includes(term)) : customers;

  return (
    <>
      <PageHeader title="Customers" description="People who ordered from your shop." />
      <BackendGap className="mb-5" gap="G-12" title="Built from your own orders">
        There is no customer API yet, so this directory groups your recent orders by phone number. Addresses, notes and chat history per customer are not available.
      </BackendGap>
      <Card>
        <CardHeader title="Directory" description={`Based on ${orders.length} of ${total} orders`} actions={nextPage !== null ? <Button size="sm" variant="outline" onClick={loadMore} loading={loading}>Load older orders</Button> : undefined} />
        <div className="border-b border-line p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Name or phone" label="Search customers" />
        </div>
        {error && orders.length === 0 ? (
          <ErrorState error={error} onRetry={loadMore} />
        ) : (
          <DataTable
            rows={loading && orders.length === 0 ? undefined : rows}
            loading={loading}
            rowKey={(c) => c.key}
            onRowClick={(c) => navigate(c.phone ? `/orders?q=${c.phone}` : `/orders/${c.lastOrderId}`)}
            empty={<EmptyState icon={<Users className="h-5 w-5" />} title="No customers yet" />}
            columns={[
              {
                key: 'name',
                header: 'Customer',
                cell: (c) => (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-xs font-semibold">{initials(c.name)}</span>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-ink-subtle">{c.phone || 'No phone'}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'orders', header: 'Orders', align: 'center', cell: (c) => c.orders },
              { key: 'spend', header: 'Spend', align: 'right', cell: (c) => formatCurrency(c.completedSpend) },
              { key: 'last', header: 'Last order', cell: (c) => formatDateTime(c.lastOrderAt), hideOnMobile: true },
            ]}
          />
        )}
      </Card>
    </>
  );
}
