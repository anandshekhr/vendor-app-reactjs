import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Boxes, History, IndianRupee, PackageX, ScanBarcode } from 'lucide-react';
import { Button, Card, CardHeader, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatNumber } from '@/utils/format';
import { useGetProductQuery } from '@/features/products/api';
import { useGetStockSummaryQuery, useListStockQuery } from './api';
import { StockAdjustDialog, type AdjustTarget } from './StockAdjustDialog';

const PAGE_SIZE = 20;

export function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdjustTarget | null>(null);
  const summary = useGetStockSummaryQuery();
  const list = useListStockQuery({ search: q, filter, page, pageSize: PAGE_SIZE });

  // Deep link from a product page: /inventory?product=<id>
  const deepLinkId = Number(params.get('product')) || 0;
  const deepLinked = useGetProductQuery(deepLinkId, { skip: !deepLinkId });
  useEffect(() => {
    if (deepLinked.data) {
      setTarget({ id: deepLinked.data.id, name: deepLinked.data.name, sku: deepLinked.data.sku, stock: deepLinked.data.stock });
      const next = new URLSearchParams(params);
      next.delete('product');
      setParams(next, { replace: true });
    }
  }, [deepLinked.data, params, setParams]);

  const s = summary.data?.summary;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock levels are read from and written to the server; every change is validated there."
        actions={
          <>
            <Link to="/inventory/movements">
              <Button variant="outline" leftIcon={<History className="h-4 w-4" />}>
                Adjustment log
              </Button>
            </Link>
            <Link to="/scanner">
              <Button leftIcon={<ScanBarcode className="h-4 w-4" />}>Scan stock</Button>
            </Link>
          </>
        }
      />
      {summary.error ? (
        <ErrorState error={summary.error} onRetry={summary.refetch} />
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Products" value={formatNumber(s?.total_products)} icon={<Boxes className="h-4 w-4" />} loading={summary.isLoading} />
          <StatCard label="Stock value" value={formatCurrency(s?.total_stock_value)} icon={<IndianRupee className="h-4 w-4" />} loading={summary.isLoading} hint="Stock × selling price" />
          <StatCard
            label="Low stock (≤10)"
            value={formatNumber(s?.low_stock_count)}
            icon={<AlertTriangle className="h-4 w-4" />}
            loading={summary.isLoading}
            to="/inventory/low-stock"
            tone={s?.low_stock_count ? 'warning' : 'neutral'}
          />
          <StatCard label="Out of stock" value={formatNumber(s?.out_of_stock_count)} icon={<PackageX className="h-4 w-4" />} loading={summary.isLoading} tone={s?.out_of_stock_count ? 'danger' : 'neutral'} />
        </div>
      )}
      <BackendGap className="mb-5" gap="G-8" title="No server-side stock ledger yet">
        Adjustments are applied by the server, but it does not record movement type, reason, user or history. This browser keeps its own adjustment log meanwhile.
        Expiry tracking and transfers between locations are not supported by the data model.
      </BackendGap>
      <Card>
        <CardHeader title="Stock levels" />
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name, SKU or barcode" label="Search stock" />
        </div>
        <Tabs
          label="Stock filter"
          className="px-2"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          items={[
            { value: 'all', label: 'All' },
            { value: 'low', label: 'Low stock' },
            { value: 'out', label: 'Out of stock' },
          ]}
        />
        <DataTable
          rows={list.data?.results}
          loading={list.isLoading || list.isFetching}
          error={list.error}
          onRetry={list.refetch}
          rowKey={(p) => p.id}
          empty={<EmptyState icon={<Boxes className="h-5 w-5" />} title="No products match" />}
          columns={[
            {
              key: 'name',
              header: 'Product',
              cell: (p) => (
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-ink-subtle">
                    SKU {p.sku || '—'}
                    {p.barcode ? ` · ${p.barcode}` : ''}
                  </p>
                </div>
              ),
            },
            { key: 'category', header: 'Category', cell: (p) => p.category ?? '—', hideOnMobile: true },
            { key: 'price', header: 'Price', cell: (p) => formatCurrency(p.price), align: 'right', hideOnMobile: true },
            {
              key: 'stock',
              header: 'Stock',
              align: 'right',
              cell: (p) => (
                <span className={p.is_out_of_stock ? 'font-semibold text-red-600' : p.is_low_stock ? 'font-semibold text-amber-600' : 'tabular'}>{formatNumber(p.stock)}</span>
              ),
            },
            {
              key: 'act',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              cell: (p) => (
                <Button size="sm" variant="outline" onClick={() => setTarget({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, stock: p.stock })}>
                  Adjust
                </Button>
              ),
            },
          ]}
        />
        {list.data && <Pagination page={page} count={list.data.count} pageSize={PAGE_SIZE} hasNext={Boolean(list.data.next)} onPageChange={setPage} />}
      </Card>
      <StockAdjustDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}
