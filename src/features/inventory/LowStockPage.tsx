import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { EmptyState } from '@/components/feedback/EmptyState';
import { downloadCsv } from '@/utils/csv';
import { formatNumber } from '@/utils/format';
import { useListProductsQuery } from '@/features/products/api';
import { StockAdjustDialog, type AdjustTarget } from './StockAdjustDialog';

/** Uses each product's own `low_stock_threshold` (scoped products endpoint, status=low_stock). */
export function LowStockPage() {
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdjustTarget | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useListProductsQuery({ status: 'low_stock', page });
  return (
    <>
      <PageHeader
        backTo="/inventory"
        title="Low stock"
        description="Products at or below their own low-stock threshold."
        actions={
          <Button
            variant="outline"
            disabled={!data?.results.length}
            onClick={() =>
              downloadCsv(`low-stock-page-${page}.csv`, data?.results ?? [], [
                { header: 'Product', value: (p) => p.name },
                { header: 'SKU', value: (p) => p.sku },
                { header: 'Stock', value: (p) => p.stock },
                { header: 'Threshold', value: (p) => p.low_stock_threshold },
              ])
            }
          >
            Export CSV
          </Button>
        }
      />
      <Card>
        <CardHeader title="Reorder list" description={data ? `${data.count} product(s)` : undefined} />
        <DataTable
          rows={data?.results}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(p) => p.id}
          empty={<EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="No low-stock products" description="Everything is above its threshold." />}
          columns={[
            { key: 'name', header: 'Product', cell: (p) => <span className="font-medium">{p.name}</span> },
            { key: 'sku', header: 'SKU', cell: (p) => p.sku, hideOnMobile: true },
            { key: 'stock', header: 'Stock', align: 'right', cell: (p) => <span className={p.stock === 0 ? 'font-semibold text-red-600' : 'font-semibold text-amber-600'}>{formatNumber(p.stock)}</span> },
            { key: 'thr', header: 'Threshold', align: 'right', cell: (p) => p.low_stock_threshold, hideOnMobile: true },
            {
              key: 'act',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              cell: (p) => (
                <Button size="sm" onClick={() => setTarget({ id: p.id, name: p.name, sku: p.sku, stock: p.stock })}>
                  Restock
                </Button>
              ),
            },
          ]}
        />
        {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      </Card>
      <StockAdjustDialog target={target} onClose={() => setTarget(null)} defaultType="restock" />
    </>
  );
}
