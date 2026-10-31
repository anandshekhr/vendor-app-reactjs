import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Printer, Settings2 } from 'lucide-react';
import { Badge, Button, Card, Dialog, Select, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { config } from '@/constants/config';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { PrintFulfilmentType } from '@/types/api';
import { useListPrintOrdersQuery, usePrintSummaryQuery, type PrintBucket } from './api';
import { FulfilmentBadge, PrintStatusBadge } from './PrintBadges';
import { PickupVerifyPanel } from './PickupVerifyPanel';
import { DELIVERY_STATE_TEXT } from './printOrderView';

const BUCKETS: { value: PrintBucket | 'all'; label: string; countKey?: PrintBucket }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New', countKey: 'new' },
  { value: 'quotes', label: 'Quotes', countKey: 'quotes' },
  { value: 'in_progress', label: 'Printing', countKey: 'in_progress' },
  { value: 'ready', label: 'Ready', countKey: 'ready' },
  { value: 'out', label: 'Out', countKey: 'out' },
  { value: 'done', label: 'Completed' },
  { value: 'closed', label: 'Cancelled' },
];

export function PrintingOrdersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const bucket = (params.get('bucket') ?? 'all') as PrintBucket | 'all';
  const fulfilment = (params.get('fulfilment') ?? '') as PrintFulfilmentType | '';
  const page = Number(params.get('page') ?? 1) || 1;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounce(search.trim());
  const [counterOpen, setCounterOpen] = useState(false);

  const poll = { pollingInterval: config.pollIntervalMs, skipPollingIfUnfocused: true };
  const summary = usePrintSummaryQuery(undefined, poll);
  const { data, isLoading, isFetching, error, refetch } = useListPrintOrdersQuery(
    { bucket: bucket === 'all' ? '' : bucket, fulfilment_type: fulfilment, q, page },
    poll,
  );

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value || (key === 'bucket' && value === 'all')) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    if (q !== (params.get('q') ?? '')) update('q', q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <PageHeader
        title="Printing orders"
        description="Documents customers sent for printing, by delivery or self pickup."
        actions={
          <>
            <Link to="/printing/settings">
              <Button variant="outline" leftIcon={<Settings2 className="h-4 w-4" />}>
                Prices & settings
              </Button>
            </Link>
            <Button leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => setCounterOpen(true)}>
              Verify pickup
            </Button>
          </>
        }
      />
      {summary.data && (summary.data.awaiting_pickup > 0 || summary.data.delivery_attention > 0) && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {summary.data.awaiting_pickup > 0 && <Badge tone="brand">{summary.data.awaiting_pickup} waiting for customer pickup</Badge>}
          {summary.data.delivery_attention > 0 && <Badge tone="danger">{summary.data.delivery_attention} need a delivery partner</Badge>}
        </div>
      )}
      <Card>
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Order number, customer name or phone" label="Search printing orders" />
          <Select aria-label="Delivery or pickup" className="sm:w-48" value={fulfilment} onChange={(e) => update('fulfilment', e.target.value)}>
            <option value="">Delivery & pickup</option>
            <option value="DELIVERY">Home delivery</option>
            <option value="PICKUP">Self pickup</option>
          </Select>
        </div>
        <Tabs
          label="Printing order stage"
          className="px-2"
          items={BUCKETS.map((b) => ({ value: b.value, label: b.label, count: b.countKey ? summary.data?.[b.countKey] || undefined : undefined }))}
          value={bucket}
          onChange={(v) => update('bucket', v)}
        />
        <DataTable
          caption="Printing orders"
          rows={data?.results}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/printing/${o.id}`)}
          empty={<EmptyState icon={<Printer className="h-5 w-5" />} title="No printing orders" description={q ? 'Try a different search.' : 'New printing orders appear here.'} />}
          columns={[
            {
              key: 'order',
              header: 'Order',
              cell: (o) => (
                <div>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-xs text-ink-subtle">{formatDateTime(o.created_at)}</p>
                </div>
              ),
            },
            { key: 'customer', header: 'Customer', cell: (o) => o.customer_name, hideOnMobile: true },
            { key: 'fulfilment', header: 'Fulfilment', cell: (o) => <FulfilmentBadge type={o.fulfilment_type} /> },
            {
              key: 'pages',
              header: 'Pages',
              cell: (o) => (
                <span className="tabular">
                  {o.total_pages || '—'}
                  <span className="text-xs text-ink-subtle"> · {o.file_count} file{o.file_count === 1 ? '' : 's'}</span>
                </span>
              ),
              hideOnMobile: true,
            },
            {
              key: 'amount',
              header: 'Amount',
              cell: (o) => (
                <div className="text-right">
                  <p className="tabular">{o.quotation_required && o.status === 'QUOTATION_PENDING' ? 'To quote' : formatCurrency(o.total_amount)}</p>
                  <p className="text-xs text-ink-subtle">{o.payment_method === 'COD' ? 'Cash' : o.payment_status === 'PAID' ? 'Paid' : 'Online'}</p>
                </div>
              ),
              align: 'right',
            },
            {
              key: 'status',
              header: 'Status',
              cell: (o) => (
                <div className="space-y-1">
                  <PrintStatusBadge status={o.status} label={o.status_display} />
                  {o.delivery_state && o.delivery_state !== 'not_requested' && (
                    <p className="text-xs text-ink-subtle">{DELIVERY_STATE_TEXT[o.delivery_state].label}</p>
                  )}
                </div>
              ),
            },
          ]}
        />
        {data && <Pagination page={page} count={data.count} pageSize={20} hasNext={Boolean(data.next)} onPageChange={(p) => update('page', String(p))} />}
      </Card>

      <Dialog open={counterOpen} onClose={() => setCounterOpen(false)} title="Verify a pickup" description="Ask the customer for the pickup code or QR code in their app.">
        <PickupVerifyPanel
          onVerified={(order) => {
            setCounterOpen(false);
            toast.success(`Pickup verified for ${order.order_number}`, 'Hand over the documents and confirm it on the order.');
            navigate(`/printing/${order.id}`);
          }}
        />
      </Dialog>
    </>
  );
}
