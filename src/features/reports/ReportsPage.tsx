import { useState } from 'react';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { BarsChart, DonutChart, TrendChart } from '@/components/charts/Charts';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useCapabilities } from '@/hooks/useCapabilities';
import { downloadCsv } from '@/utils/csv';
import { formatCurrency, formatNumber } from '@/utils/format';
import { useGetStockSummaryQuery } from '@/features/inventory/api';
import { useListWithdrawalsQuery } from '@/features/wallet/api';
import type { ReportSummary } from '@/types/api';
import { useGetReportSummaryQuery } from './api';
import { growth, presetRange, RANGE_PRESETS, type RangePreset } from './ranges';

function Growth({ current, previous }: { current: number; previous: number }) {
  const g = growth(current, previous);
  if (g === null) return <span className="text-ink-subtle">no earlier data</span>;
  return <span className={g >= 0 ? 'text-emerald-700' : 'text-red-600'}>{`${g >= 0 ? '+' : ''}${g}% vs previous period`}</span>;
}

function SalesReport({ r, loading }: { r?: ReportSummary; loading: boolean }) {
  const o = r?.orders;
  const series = (r?.daily ?? []).map((d) => ({ label: d.date.slice(5), total: Number(d.order_revenue), orders: d.orders }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Order revenue"
          value={formatCurrency(o?.revenue)}
          loading={loading}
          hint={r ? <Growth current={Number(r.orders.revenue)} previous={Number(r.previous.orders.revenue)} /> : undefined}
        />
        <StatCard label="Delivered orders" value={formatNumber(o?.delivered)} loading={loading} hint={o ? `of ${o.count} placed` : undefined} />
        <StatCard label="Average order" value={formatCurrency(o?.average_order_value)} loading={loading} />
        <StatCard label="Cancelled / rejected" value={formatNumber(o?.cancelled)} loading={loading} />
      </div>
      <Card>
        <CardHeader
          title="Daily delivered revenue"
          actions={
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              disabled={!r?.daily.length}
              onClick={() =>
                downloadCsv(`daily-sales-${r!.range.from}-to-${r!.range.to}.csv`, r!.daily, [
                  { header: 'Date', value: (d) => d.date },
                  { header: 'Orders', value: (d) => d.orders },
                  { header: 'Order revenue', value: (d) => d.order_revenue },
                  { header: 'Bookings', value: (d) => d.bookings },
                  { header: 'Booking revenue', value: (d) => d.booking_revenue },
                ])
              }
            >
              CSV
            </Button>
          }
        />
        <CardBody>{series.some((d) => d.total > 0) ? <TrendChart data={series} xKey="label" yKey="total" /> : <EmptyState title="No sales in this period" />}</CardBody>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="POS vs online" />
          <CardBody>
            {o && o.count ? (
              <DonutChart
                data={[
                  { name: `In store (${formatCurrency(o.pos.revenue)})`, value: o.pos.count },
                  { name: `Online (${formatCurrency(o.online.revenue)})`, value: o.online.count },
                ].filter((x) => x.value > 0)}
              />
            ) : (
              <EmptyState title="No orders in this period" />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Payment methods" description="Delivered orders" />
          <CardBody>
            {r?.payment_methods.length ? (
              <DonutChart data={r.payment_methods.map((m) => ({ name: `${m.method.toUpperCase()} (${formatCurrency(m.amount)})`, value: m.count }))} />
            ) : (
              <EmptyState title="No payments in this period" />
            )}
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="Best sellers"
          description="By revenue, delivered orders"
          actions={
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              disabled={!r?.top_products.length}
              onClick={() =>
                downloadCsv('best-sellers.csv', r!.top_products, [
                  { header: 'Product', value: (p) => p.name },
                  { header: 'Quantity', value: (p) => p.quantity },
                  { header: 'Revenue', value: (p) => p.revenue },
                ])
              }
            >
              CSV
            </Button>
          }
        />
        {r?.top_products.length ? (
          <ul className="divide-y divide-line text-sm">
            {r.top_products.map((p, i) => (
              <li key={`${p.product_id}-${p.name}`} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="mr-2 text-ink-subtle">{i + 1}.</span>
                  {p.name}
                </span>
                <span className="tabular text-ink-muted">
                  {formatNumber(p.quantity)} sold · <span className="font-medium text-ink">{formatCurrency(p.revenue)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <CardBody>
            <EmptyState title="No sales in this period" />
          </CardBody>
        )}
      </Card>
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
      <p className="text-sm">
        <Link to="/inventory/movements" className="font-medium text-brand-700 hover:underline">
          Open stock history
        </Link>{' '}
        <span className="text-ink-muted">for every restock, adjustment and sale.</span>
      </p>
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
      </CardBody>
    </Card>
  );
}

function BookingReport({ r, loading }: { r?: ReportSummary; loading: boolean }) {
  const b = r?.bookings;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Booking revenue"
          value={formatCurrency(b?.revenue)}
          loading={loading}
          hint={r ? <Growth current={Number(r.bookings.revenue)} previous={Number(r.previous.bookings.revenue)} /> : undefined}
        />
        <StatCard label="Bookings" value={formatNumber(b?.count)} loading={loading} />
        <StatCard label="Completed" value={formatNumber(b?.completed)} loading={loading} />
        <StatCard label="Cancelled" value={formatNumber(b?.cancelled)} loading={loading} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top services" description="Completed bookings" />
          <CardBody>
            {r?.top_services.length ? <BarsChart data={r.top_services.map((t) => ({ name: t.name, revenue: Number(t.revenue) }))} xKey="name" yKey="revenue" horizontal /> : <EmptyState title="No completed bookings" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Staff performance"
            actions={
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                disabled={!r?.staff.length}
                onClick={() =>
                  downloadCsv('staff-performance.csv', r!.staff, [
                    { header: 'Staff', value: (x) => x.name },
                    { header: 'Bookings', value: (x) => x.bookings },
                    { header: 'Completed', value: (x) => x.completed },
                    { header: 'Revenue', value: (x) => x.revenue },
                  ])
                }
              >
                CSV
              </Button>
            }
          />
          {r?.staff.length ? (
            <ul className="divide-y divide-line text-sm">
              {r.staff.map((x) => (
                <li key={x.provider_id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="font-medium">{x.name}</span>
                  <span className="tabular text-ink-muted">
                    {x.completed}/{x.bookings} completed · <span className="font-medium text-ink">{formatCurrency(x.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <EmptyState title="No assigned bookings in this period" />
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { can } = useCapabilities();
  const tabs = [
    ...(can('orders') ? [{ value: 'sales', label: 'Sales' }] : []),
    ...(can('bookings') ? [{ value: 'bookings', label: 'Bookings & staff' }] : []),
    ...(can('inventory') ? [{ value: 'stock', label: 'Stock' }] : []),
    { value: 'finance', label: 'Payouts' },
  ];
  const [tab, setTab] = useState(tabs[0].value);
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [custom, setCustom] = useState(() => presetRange('30d'));
  const range = preset === 'custom' ? custom : presetRange(preset);
  const valid = Boolean(range.from && range.to && range.from <= range.to);
  const report = useGetReportSummaryQuery(range, { skip: !valid || (tab !== 'sales' && tab !== 'bookings') });
  const usesRange = tab === 'sales' || tab === 'bookings';

  return (
    <>
      <PageHeader title="Reports" description="Figures from the server for your shop only. CSV exports contain the data shown." />
      <Tabs label="Report" items={tabs} value={tab} onChange={setTab} className="mb-4" />
      {usesRange && (
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <Field label="Period" className="w-48">
            <Select
              value={preset}
              onChange={(e) => {
                const next = e.target.value as RangePreset;
                if (next === 'custom') setCustom(range);
                setPreset(next);
              }}
            >
              {RANGE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          {preset === 'custom' && (
            <>
              <Field label="From">
                <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
              </Field>
              <Field label="To">
                <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
              </Field>
            </>
          )}
          {report.data && (
            <p className="pb-2 text-xs text-ink-muted">
              {report.data.range.from} to {report.data.range.to} ({report.data.range.days} day{report.data.range.days === 1 ? '' : 's'}) · compared with{' '}
              {report.data.previous.from} to {report.data.previous.to}
            </p>
          )}
        </div>
      )}
      {usesRange && report.error ? (
        <ErrorState error={report.error} onRetry={report.refetch} />
      ) : (
        <>
          {tab === 'sales' && <SalesReport r={report.data} loading={report.isFetching} />}
          {tab === 'bookings' && <BookingReport r={report.data} loading={report.isFetching} />}
        </>
      )}
      {tab === 'stock' && <StockReport />}
      {tab === 'finance' && <FinanceReport />}
    </>
  );
}
