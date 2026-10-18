import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  Ban,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  IndianRupee,
  MessageSquare,
  Package,
  PackagePlus,
  ScanBarcode,
  ShoppingCart,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { BarsChart, TrendChart } from '@/components/charts/Charts';
import { DataTable } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { notificationsAdded } from '@/features/notifications/notificationsSlice';
import type { Capability } from '@/features/auth/capabilities';
import { useListOrdersQuery } from '@/features/orders/api';
import { useListBookingsQuery } from '@/features/bookings/api';
import { formatCurrency, formatDateTime, formatNumber, formatTime } from '@/utils/format';
import { useGetDashboardQuery, useGetServiceDashboardQuery } from './api';
import { sliceDailySales, sumSeries, RANGE_OPTIONS, type RangeKey } from './range';

interface QuickAction {
  label: string;
  to: string;
  icon: LucideIcon;
  capability: Capability;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Open POS', to: '/pos', icon: ShoppingCart, capability: 'pos' },
  { label: 'Add product', to: '/products/new', icon: PackagePlus, capability: 'products' },
  { label: 'Scan stock', to: '/scanner', icon: ScanBarcode, capability: 'scanner' },
  { label: 'View orders', to: '/orders', icon: ClipboardList, capability: 'orders' },
  { label: 'Manage bookings', to: '/bookings', icon: CalendarClock, capability: 'bookings' },
  { label: 'Add service', to: '/services/new', icon: Wrench, capability: 'services' },
  { label: 'View wallet', to: '/wallet', icon: Wallet, capability: 'wallet' },
  { label: 'Withdraw funds', to: '/wallet/withdrawals?new=1', icon: ArrowDownToLine, capability: 'wallet' },
  { label: 'Customer chat', to: '/chat', icon: MessageSquare, capability: 'chat' },
];

function QuickActions() {
  const { can } = useCapabilities();
  return (
    <Card>
      <CardHeader title="Quick actions" />
      <CardBody className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {QUICK_ACTIONS.filter((a) => can(a.capability)).map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/10"
          >
            <a.icon className="h-4 w-4 text-brand-600" aria-hidden />
            {a.label}
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}

function RangePicker({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Chart date range">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={!opt.supported}
          title={opt.supported ? undefined : 'Requires a date-range analytics endpoint (API_MAPPING G-4)'}
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            value === opt.key ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-ink/5'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ProductDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>('14d');
  const { data, isLoading, error, refetch } = useGetDashboardQuery();
  const orders = useListOrdersQuery({ page: 1 });
  const stats = data?.stats;
  const series = useMemo(() => sliceDailySales(data?.daily_sales ?? [], range), [data, range]);
  const seriesTotal = sumSeries(series);
  const dispatch = useAppDispatch();
  const lowStock = stats?.low_stock_products ?? 0;
  useEffect(() => {
    if (lowStock > 0) {
      const day = new Date().toISOString().slice(0, 10);
      dispatch(
        notificationsAdded([
          { id: `low-stock-${day}`, category: 'low_stock', title: `${lowStock} product(s) low on stock`, body: 'At or below their low-stock threshold.', link: '/inventory/low-stock', createdAt: Date.now() },
        ]),
      );
    }
  }, [lowStock, dispatch]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Revenue today" value={formatCurrency(stats?.revenue_today)} icon={<IndianRupee className="h-4 w-4" />} loading={isLoading} hint="Delivered orders" />
        <StatCard label="Revenue this month" value={formatCurrency(stats?.revenue_month)} icon={<IndianRupee className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Total orders" value={formatNumber(stats?.total_orders)} icon={<ClipboardList className="h-4 w-4" />} loading={isLoading} to="/orders" />
        <StatCard
          label="Pending orders"
          value={formatNumber(stats?.pending_orders)}
          icon={<Clock className="h-4 w-4" />}
          loading={isLoading}
          to="/orders?status=created"
          tone={stats && stats.pending_orders > 0 ? 'warning' : 'neutral'}
          hint="All active statuses"
        />
        <StatCard label="Completed" value={formatNumber(stats?.completed_orders)} icon={<CheckCircle2 className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Cancelled / rejected" value={formatNumber(stats?.cancelled_orders)} icon={<Ban className="h-4 w-4" />} loading={isLoading} />
        <StatCard label="Wallet balance" value={formatCurrency(stats?.wallet_balance)} icon={<Wallet className="h-4 w-4" />} loading={isLoading} to="/wallet" />
        <StatCard label="Pending payout" value={formatCurrency(stats?.pending_payout)} icon={<ArrowDownToLine className="h-4 w-4" />} loading={isLoading} to="/wallet/withdrawals" hint="Withdrawals in progress" />
        <StatCard label="Products" value={formatNumber(stats?.total_products)} icon={<Package className="h-4 w-4" />} loading={isLoading} to="/products" />
        <StatCard
          label="Low stock"
          value={formatNumber(stats?.low_stock_products)}
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={isLoading}
          to="/inventory/low-stock"
          tone={stats && stats.low_stock_products > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <QuickActions />

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue trend"
            description={`Delivered order revenue · ${formatCurrency(seriesTotal)} in range`}
            actions={<RangePicker value={range} onChange={setRange} />}
          />
          <CardBody>{isLoading ? <div className="h-[240px] animate-pulse rounded bg-ink/5" /> : <TrendChart data={series} xKey="label" yKey="total" />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Orders by category" description="Top categories, all time" />
          <CardBody>
            {data && data.orders_by_category.length > 0 ? (
              <BarsChart data={data.orders_by_category} xKey="name" yKey="count" horizontal />
            ) : (
              <EmptyState title="No category data yet" description="Appears once orders contain categorised products." />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent orders"
            actions={
              <Link to="/orders">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <DataTable
            rows={orders.data?.results.slice(0, 6)}
            loading={orders.isLoading}
            error={orders.error}
            onRetry={orders.refetch}
            rowKey={(o) => o.id}
            onRowClick={(o) => navigate(`/orders/${o.id}`)}
            empty={<EmptyState title="No orders yet" />}
            columns={[
              { key: 'id', header: 'Order', cell: (o) => <span className="font-medium">#{o.id}</span> },
              { key: 'customer', header: 'Customer', cell: (o) => o.customer_name || '—' },
              { key: 'time', header: 'Placed', cell: (o) => formatDateTime(o.created_at), hideOnMobile: true },
              { key: 'total', header: 'Total', cell: (o) => formatCurrency(o.total_amount), align: 'right' },
              { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Not yet available" />
          <CardBody className="space-y-2">
            <BackendGap gap="G-4" title="Best sellers & payment methods">
              Needs a date-range reports endpoint.
            </BackendGap>
            <BackendGap gap="G-13" title="Unread customer messages">
              Chat has no unread counts yet.
            </BackendGap>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ServiceDashboard() {
  const navigate = useNavigate();
  const svc = useGetServiceDashboardQuery();
  const main = useGetDashboardQuery();
  const upcoming = useListBookingsQuery({ status: 'SCHEDULED', page: 1 });
  const d = svc.data;

  if (svc.error) return <ErrorState error={svc.error} onRetry={svc.refetch} />;

  const now = Date.now();
  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(24, 0, 0, 0);
  const todays = (upcoming.data?.results ?? []).filter((b) => {
    const t = new Date(b.start_time).getTime();
    return t >= now - 6 * 3600_000 && t < startOfTomorrow.getTime();
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today's bookings" value={upcoming.isLoading ? '…' : formatNumber(todays.length)} icon={<CalendarCheck className="h-4 w-4" />} loading={upcoming.isLoading} hint="From the first page of scheduled bookings" />
        <StatCard
          label="Scheduled"
          value={formatNumber(d?.scheduled_service_bookings)}
          icon={<CalendarClock className="h-4 w-4" />}
          loading={svc.isLoading}
          to="/bookings?status=SCHEDULED"
        />
        <StatCard label="Completed" value={formatNumber(d?.completed_service_bookings)} icon={<CheckCircle2 className="h-4 w-4" />} loading={svc.isLoading} />
        <StatCard label="Active services" value={formatNumber(d?.active_shop_services)} icon={<Wrench className="h-4 w-4" />} loading={svc.isLoading} to="/services" />
        <StatCard
          label="Staff available"
          value={d ? `${d.active_service_providers} / ${d.total_service_providers}` : '—'}
          icon={<Users className="h-4 w-4" />}
          loading={svc.isLoading}
          to="/employees"
        />
        <StatCard label="Wallet balance" value={formatCurrency(d?.wallet_balance)} icon={<Wallet className="h-4 w-4" />} loading={svc.isLoading} to="/wallet" />
        <StatCard label="Pending payout" value={formatCurrency(main.data?.stats.pending_payout)} icon={<ArrowDownToLine className="h-4 w-4" />} loading={main.isLoading} to="/wallet/withdrawals" />
        <StatCard label="Revenue this month" value={formatCurrency(main.data?.stats.revenue_month)} icon={<IndianRupee className="h-4 w-4" />} loading={main.isLoading} hint="Delivered orders only" />
      </div>

      <QuickActions />

      <Card>
        <CardHeader
          title="Upcoming appointments"
          actions={
            <Link to="/bookings">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          }
        />
        <DataTable
          rows={upcoming.data?.results}
          loading={upcoming.isLoading}
          error={upcoming.error}
          onRetry={upcoming.refetch}
          rowKey={(b) => b.id}
          onRowClick={(b) => navigate(`/bookings/${b.id}`)}
          empty={<EmptyState title="No scheduled bookings" />}
          columns={[
            { key: 'when', header: 'When', cell: (b) => `${formatDateTime(b.start_time).split(',')[0]} · ${formatTime(b.start_time)}` },
            { key: 'customer', header: 'Customer', cell: (b) => b.customer_name },
            { key: 'service', header: 'Service', cell: (b) => b.service_name, hideOnMobile: true },
            { key: 'staff', header: 'Staff', cell: (b) => b.staff ?? <span className="text-ink-subtle">Unassigned</span>, hideOnMobile: true },
            { key: 'status', header: 'Payment', cell: (b) => <StatusBadge status={b.payment_status} label={b.payment_status_display} /> },
          ]}
        />
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const { businessType } = useCapabilities();
  const business = useAppSelector((s) => s.auth.business);
  return (
    <>
      <PageHeader title={`Welcome back${business?.businessName ? `, ${business.businessName}` : ''}`} description="Live figures from TheNearByShop." />
      {businessType === 'service' ? (
        <ServiceDashboard />
      ) : businessType === 'hybrid' ? (
        <div className="space-y-8">
          <ProductDashboard />
          <ServiceDashboard />
        </div>
      ) : (
        <ProductDashboard />
      )}
    </>
  );
}
