import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { BarsChart, DonutChart, TrendChart } from '@/components/charts/Charts';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useCapabilities } from '@/hooks/useCapabilities';
import { downloadCsv } from '@/utils/csv';
import { formatCurrency, formatNumber } from '@/utils/format';
import { useGetDashboardQuery, useGetServiceDashboardQuery } from '@/features/dashboard/api';
import { sliceDailySales } from '@/features/dashboard/range';
import { useGetStockSummaryQuery } from '@/features/inventory/api';
import { useListVendorOrdersV2Query } from '@/features/orders/api';
import { useListWithdrawalsQuery } from '@/features/wallet/api';
import { useListBookingsQuery } from '@/features/bookings/api';

function SalesReport() {
  const dash = useGetDashboardQuery();
  const recent = useListVendorOrdersV2Query({ page: 1 });
  if (dash.error) return <ErrorState error={dash.error} onRetry={dash.refetch} />;
  const s = dash.data?.stats;
  const series = sliceDailySales(dash.data?.daily_sales ?? [], '14d');
  const recentRows = recent.data?.results ?? [];
  const pos = recentRows.filter((o) => o.source === 'pos');
  const online = recentRows.filter((o) => o.source !== 'pos');
  const sum = (rows: typeof recentRows) => rows.reduce((t, o) => t + Number(o.total_amount || 0), 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={formatCurrency(s?.revenue_month)} loading={dash.isLoading} />
        <StatCard label="Revenue today" value={formatCurrency(s?.revenue_today)} loading={dash.isLoading} />
        <StatCard label="Completed orders" value={formatNumber(s?.completed_orders)} loading={dash.isLoading} />
        <StatCard label="Cancelled / rejected" value={formatNumber(s?.cancelled_orders)} loading={dash.isLoading} />
      </div>
      <Card>
        <CardHeader
          title="Daily delivered revenue (14 days)"
          actions={
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              disabled={!series.length}
              onClick={() => downloadCsv('daily-sales.csv', series, [{ header: 'Date', value: (r) => r.date }, { header: 'Revenue', value: (r) => r.total }])}
            >
              CSV
            </Button>
          }
        />
        <CardBody>{series.length ? <TrendChart data={series} xKey="label" yKey="total" /> : <EmptyState title="No sales yet" />}</CardBody>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Orders by category" />
          <CardBody>
            {dash.data?.orders_by_category.length ? <BarsChart data={dash.data.orders_by_category} xKey="name" yKey="count" horizontal /> : <EmptyState title="No data" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="POS vs online" description={`Latest ${recentRows.length} orders`} />
          <CardBody>
            {recentRows.length ? (
              <DonutChart
                data={[
                  { name: `POS (${formatCurrency(sum(pos))})`, value: pos.length },
                  { name: `Online (${formatCurrency(sum(online))})`, value: online.length },
                ]}
              />
            ) : (
              <EmptyState title="No orders yet" />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StockReport() {
  const { data, isLoading, error, refetch } = useGetStockSummaryQuery();
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const s = data?.summary;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Products" value={formatNumber(s?.total_products)} loading={isLoading} />
        <StatCard label="Stock value" value={formatCurrency(s?.total_stock_value)} loading={isLoading} />
        <StatCard label="Low stock" value={formatNumber(s?.low_stock_count)} loading={isLoading} />
        <StatCard label="Out of stock" value={formatNumber(s?.out_of_stock_count)} loading={isLoading} />
      </div>
      <Card>
        <CardHeader
          title="Lowest stock"
          actions={
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              disabled={!data?.low_stock_products.length}
              onClick={() =>
                downloadCsv('low-stock.csv', data?.low_stock_products ?? [], [
                  { header: 'Product', value: (r) => r.name },
                  { header: 'Barcode', value: (r) => r.barcode },
                  { header: 'Stock', value: (r) => r.stock },
                ])
              }
            >
              CSV
            </Button>
          }
        />
        <CardBody>{data?.low_stock_products.length ? <BarsChart data={data.low_stock_products} xKey="name" yKey="stock" horizontal height={300} /> : <EmptyState title="No low-stock products" />}</CardBody>
      </Card>
      <BackendGap gap="G-8" title="Stock movement report requires a server-side stock ledger" />
    </div>
  );
}

function FinanceReport() {
  const { data, isLoading, error, refetch } = useListWithdrawalsQuery({ page: 1 });
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const rows = data?.results ?? [];
  return (
    <Card>
      <CardHeader
        title="Recent payouts"
        description={data ? `${data.count} withdrawal request(s) in total` : undefined}
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            disabled={!rows.length}
            onClick={() =>
              downloadCsv('payouts.csv', rows, [
                { header: 'ID', value: (r) => r.id },
                { header: 'Requested', value: (r) => r.created_at },
                { header: 'Amount', value: (r) => r.amount },
                { header: 'Status', value: (r) => r.status },
                { header: 'Reference', value: (r) => r.transaction_id },
                { header: 'Processed', value: (r) => r.processed_at },
              ])
            }
          >
            CSV
          </Button>
        }
      />
      <CardBody>
        {isLoading ? null : rows.length ? (
          <BarsChart data={rows.map((r) => ({ label: `#${r.id}`, amount: Number(r.amount) }))} xKey="label" yKey="amount" />
        ) : (
          <EmptyState title="No payouts yet" />
        )}
        <BackendGap className="mt-4" gap="G-4" title="Earnings and settlement summaries by date range need a reports endpoint" />
      </CardBody>
    </Card>
  );
}

function BookingReport() {
  const svc = useGetServiceDashboardQuery();
  const cancelled = useListBookingsQuery({ status: 'CANCELLED', page: 1 });
  if (svc.error) return <ErrorState error={svc.error} onRetry={svc.refetch} />;
  const d = svc.data;
  const cancelledCount = cancelled.data?.count ?? 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total bookings" value={formatNumber(d?.total_service_bookings)} loading={svc.isLoading} />
        <StatCard label="Scheduled" value={formatNumber(d?.scheduled_service_bookings)} loading={svc.isLoading} />
        <StatCard label="Completed" value={formatNumber(d?.completed_service_bookings)} loading={svc.isLoading} />
        <StatCard label="Cancelled" value={formatNumber(cancelledCount)} loading={cancelled.isLoading} />
      </div>
      {d && (
        <Card>
          <CardHeader title="Booking outcomes" />
          <CardBody>
            <DonutChart
              data={[
                { name: 'Scheduled', value: d.scheduled_service_bookings },
                { name: 'Completed', value: d.completed_service_bookings },
                { name: 'Cancelled', value: cancelledCount },
              ].filter((x) => x.value > 0)}
            />
          </CardBody>
        </Card>
      )}
      <BackendGap gap="G-4" title="Service and employee performance reports need a reports endpoint" />
    </div>
  );
}

export function ReportsPage() {
  const { can } = useCapabilities();
  const tabs = [
    ...(can('orders') ? [{ value: 'sales', label: 'Sales' }] : []),
    ...(can('inventory') ? [{ value: 'stock', label: 'Stock' }] : []),
    ...(can('bookings') ? [{ value: 'bookings', label: 'Bookings' }] : []),
    { value: 'finance', label: 'Payouts' },
  ];
  const [tab, setTab] = useState(tabs[0].value);
  return (
    <>
      <PageHeader title="Reports" description="Figures from the server for your shop only. CSV exports contain the data shown." />
      <Tabs label="Report" items={tabs} value={tab} onChange={setTab} className="mb-5" />
      {tab === 'sales' && <SalesReport />}
      {tab === 'stock' && <StockReport />}
      {tab === 'bookings' && <BookingReport />}
      {tab === 'finance' && <FinanceReport />}
    </>
  );
}
