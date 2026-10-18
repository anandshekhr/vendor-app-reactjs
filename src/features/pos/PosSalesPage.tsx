import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CloudUpload, Receipt as ReceiptIcon } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Dialog, Field, Input, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { EmptyState } from '@/components/feedback/EmptyState';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { BackendGap } from '@/components/feedback/BackendGap';
import { config } from '@/constants/config';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/useToast';
import { useAppSelector } from '@/hooks/store';
import { db, type OfflineSale } from '@/services/offline/db';
import { findCandidateMatches, markReconciled, requeueSale, updateConflictedItems, voidSale } from '@/services/offline/syncEngine';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useListVendorOrdersV2Query } from '@/features/orders/api';
import { runSync } from '@/features/offline-sync/useOfflineSync';

function ServerSales() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useListVendorOrdersV2Query({ page });
  const posRows = (data?.results ?? []).filter((o) => o.source === 'pos');
  return (
    <>
      <DataTable
        rows={data ? posRows : undefined}
        loading={isLoading || isFetching}
        error={error}
        onRetry={refetch}
        rowKey={(o) => o.id}
        onRowClick={(o) => navigate(`/pos/sales/${o.id}`)}
        empty={<EmptyState icon={<ReceiptIcon className="h-5 w-5" />} title="No POS sales on this page" description="Online orders on this page are hidden; use the pager to see older sales." />}
        columns={[
          { key: 'id', header: 'Receipt', cell: (o) => <span className="font-medium">#{o.id}</span> },
          { key: 'time', header: 'Date & time', cell: (o) => formatDateTime(o.created_at) },
          { key: 'customer', header: 'Customer', cell: (o) => o.customer_name || 'Walk-in', hideOnMobile: true },
          { key: 'total', header: 'Total', align: 'right', cell: (o) => formatCurrency(o.total_amount) },
          { key: 'paid', header: 'Payment', cell: (o) => (o.is_paid ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Unpaid</Badge>), hideOnMobile: true },
        ]}
      />
      {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      <p className="px-4 pb-3 text-xs text-ink-subtle">The server has no POS-only filter yet (API_MAPPING G-9), so each page shows the POS sales among the latest orders.</p>
    </>
  );
}

function ReconcileDialog({ sale, onClose }: { sale: OfflineSale; onClose: () => void }) {
  const toast = useToast();
  const { data, isLoading } = useListVendorOrdersV2Query({ page: 1 });
  const candidates = useMemo(
    () =>
      findCandidateMatches(
        sale,
        (data?.results ?? []).map((o) => ({ id: o.id, created_at: o.created_at, total_amount: o.total_amount, customer_phone: o.customer_phone, source: o.source })),
      ),
    [data, sale],
  );
  const [manualId, setManualId] = useState('');

  const match = async (id: number, total: string) => {
    try {
      await markReconciled(sale.clientReference, id, total);
      toast.success('Marked as synced', `Matched to server sale #${id}`);
      onClose();
    } catch (err) {
      toast.error('Could not reconcile', err instanceof Error ? err.message : err);
    }
  };

  const retry = async () => {
    try {
      await requeueSale(sale.clientReference);
      toast.info('Sale re-queued', 'It will be sent on the next sync.');
      onClose();
    } catch (err) {
      toast.error('Could not re-queue', err instanceof Error ? err.message : err);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Review sale with unknown outcome"
      description="The server may already have recorded this sale. Find it below before sending it again, to avoid a duplicate."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Decide later
          </Button>
          <Button variant="danger" onClick={retry}>
            Not on server — send again
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-md bg-ink/[0.03] p-3">
          <p>
            Recorded {formatDateTime(sale.createdAt)} · last attempt {formatDateTime(sale.lastAttemptAt)} · {sale.items.length} item(s) · estimated {formatCurrency(sale.provisionalTotal)}
          </p>
          <p className="text-ink-muted">{sale.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
        </div>
        <div>
          <p className="mb-2 font-medium">Possible matches on the server</p>
          {isLoading ? (
            <p className="text-ink-muted">Loading recent sales…</p>
          ) : candidates.length === 0 ? (
            <p className="text-ink-muted">No POS sale found near the attempt time on the latest page.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>
                    #{c.id} · {formatDateTime(c.created_at)} · {formatCurrency(c.total_amount)}
                  </span>
                  <Button size="sm" onClick={() => match(c.id, String(c.total_amount))}>
                    This is it
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(manualId);
            if (id > 0) void match(id, sale.provisionalTotal);
          }}
        >
          <Field label="Or enter the server receipt number" className="flex-1">
            <Input inputMode="numeric" value={manualId} onChange={(e) => setManualId(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Button type="submit" variant="outline" disabled={!manualId}>
            Match
          </Button>
        </form>
      </div>
    </Dialog>
  );
}

function ConflictDialog({ sale, onClose }: { sale: OfflineSale; onClose: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState(sale.items);
  const [reason, setReason] = useState('');
  const save = async () => {
    try {
      await updateConflictedItems(sale.clientReference, items);
      toast.info('Sale updated and re-queued');
      onClose();
    } catch (err) {
      toast.error('Could not update sale', err instanceof Error ? err.message : err);
    }
  };
  const doVoid = async () => {
    try {
      await voidSale(sale.clientReference, reason.trim());
      toast.warning('Sale voided', 'Settle it with the customer manually (e.g. refund).');
      onClose();
    } catch (err) {
      toast.error('Could not void sale', err instanceof Error ? err.message : err);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Sale rejected by server"
      description={sale.lastError}
      footer={
        <>
          <Button variant="danger" onClick={doVoid} disabled={reason.trim().length < 3}>
            Void sale
          </Button>
          <Button onClick={save}>Save quantities & retry</Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-muted">The server's stock was not changed. Reduce quantities to what is actually available, or void the sale and settle it with the customer.</p>
      <ul className="divide-y divide-line rounded-md border border-line">
        {items.map((it, idx) => (
          <li key={it.productId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{it.name}</span>
            <Input
              aria-label={`Quantity of ${it.name}`}
              className="h-8 w-20 text-center"
              inputMode="numeric"
              value={it.quantity}
              onChange={(e) => {
                const q = Number(e.target.value.replace(/\D/g, '')) || 0;
                setItems(items.map((x, i) => (i === idx ? { ...x, quantity: q } : x)));
              }}
            />
          </li>
        ))}
      </ul>
      <Field label="Reason for voiding (required to void)" className="mt-4">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
      </Field>
    </Dialog>
  );
}

function OfflineQueue() {
  const toast = useToast();
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [review, setReview] = useState<OfflineSale | null>(null);
  const shopId = useAppSelector((s) => s.auth.business?.shopId ?? null);
  const all = useLiveQuery<OfflineSale[] | undefined>(() => db.sales.orderBy('createdAt').reverse().toArray(), [], undefined);
  const sales = all?.filter((s) => s.shopId === shopId);
  const otherAccounts = (all ?? []).filter((s) => s.shopId !== shopId && !['synced', 'voided'].includes(s.status)).length;
  const pending = (sales ?? []).filter((s) => s.status === 'pending').length;

  const syncNow = async () => {
    setSyncing(true);
    try {
      if (shopId === null) return;
      const r = await runSync(shopId);
      toast.info('Sync finished', `${r.synced} synced · ${r.conflicts} rejected · ${r.unknown} need review${r.stoppedReason === 'locked' ? ' · another tab is syncing' : ''}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
        <p className="text-sm text-ink-muted">Sales recorded on this device while offline. A sale is marked synced only after the server confirms it.</p>
        <Button size="sm" onClick={syncNow} loading={syncing} disabled={!online || pending === 0} leftIcon={<CloudUpload className="h-4 w-4" />}>
          Sync {pending || ''} now
        </Button>
      </div>
      {otherAccounts > 0 && (
        <p className="m-3 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200" role="note">
          {otherAccounts} unsynced sale(s) on this device belong to another vendor account. They will sync when that account signs in here.
        </p>
      )}
      {!config.posServerIdempotency && (
        <BackendGap className="m-3" gap="G-9" title="Checkout is not idempotent on the server">
          If a sync request gets no response, the sale is marked “Needs review” instead of being resent automatically, so it is never recorded twice.
        </BackendGap>
      )}
      <DataTable
        rows={sales}
        loading={sales === undefined}
        rowKey={(s) => s.clientReference}
        empty={<EmptyState title="No offline sales on this device" />}
        columns={[
          { key: 'ref', header: 'Reference', cell: (s) => <span className="font-mono text-xs">P-{s.clientReference.slice(0, 8).toUpperCase()}</span> },
          { key: 'time', header: 'Recorded', cell: (s) => formatDateTime(s.createdAt) },
          { key: 'items', header: 'Items', align: 'center', cell: (s) => s.items.reduce((n, i) => n + i.quantity, 0), hideOnMobile: true },
          {
            key: 'total',
            header: 'Total',
            align: 'right',
            cell: (s) => (
              <div className="tabular">
                <p>{formatCurrency(s.serverTotal ?? s.provisionalTotal)}</p>
                {s.serverTotal && Number(s.serverTotal) !== Number(s.provisionalTotal) && <p className="text-xs text-amber-700">est. {formatCurrency(s.provisionalTotal)}</p>}
              </div>
            ),
          },
          { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} label={s.status === 'pending' ? 'Pending sync' : undefined} /> },
          {
            key: 'detail',
            header: 'Details',
            hideOnMobile: true,
            cell: (s) =>
              s.status === 'synced' ? (
                <span className="text-xs">Server #{s.serverOrderId}{s.reconciledManually ? ' (matched manually)' : ''}</span>
              ) : s.status === 'voided' ? (
                <span className="text-xs text-ink-muted">{s.voidReason}</span>
              ) : (
                <span className="text-xs text-ink-muted">{s.lastError ?? `${s.attempts} attempt(s)`}</span>
              ),
          },
          {
            key: 'act',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            cell: (s) =>
              s.status === 'unknown' ? (
                <Button size="sm" variant="outline" onClick={() => setReview(s)}>
                  Review
                </Button>
              ) : s.status === 'conflict' ? (
                <Button size="sm" variant="outline" onClick={() => setReview(s)}>
                  Resolve
                </Button>
              ) : null,
          },
        ]}
      />
      {review?.status === 'unknown' && <ReconcileDialog sale={review} onClose={() => setReview(null)} />}
      {review?.status === 'conflict' && <ConflictDialog sale={review} onClose={() => setReview(null)} />}
    </>
  );
}

export function PosSalesPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'offline' ? 'offline' : 'server';
  return (
    <>
      <PageHeader backTo="/pos" title="POS sales" description="In-store sales recorded on the server, and this device's offline queue." />
      <Card>
        <CardHeader title="Sales" />
        <Tabs
          label="Sales source"
          className="px-2"
          value={tab}
          onChange={(v) => setParams(v === 'offline' ? { tab: 'offline' } : {})}
          items={[
            { value: 'server', label: 'Server sales' },
            { value: 'offline', label: 'Offline queue' },
          ]}
        />
        {tab === 'server' ? <ServerSales /> : <OfflineQueue />}
      </Card>
    </>
  );
}
