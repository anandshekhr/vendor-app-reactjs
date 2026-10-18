import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, MapPin, MessageSquare, Phone, Truck } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Field, Skeleton, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useToast } from '@/hooks/useToast';
import { useCapabilities } from '@/hooks/useCapabilities';
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format';
import type { VendorOrderFull } from '@/types/api';
import { AssignPartnerDialog } from '@/features/delivery/AssignPartnerDialog';
import { DeliveryProgress } from '@/features/delivery/DeliveryProgress';
import { useGetOrderFullQuery, useGetOrderQuery, useOrderActionMutation } from './api';
import { allowedActions, type ActionSpec } from './transitions';

function formatAddress(address: VendorOrderFull['customer_address']): string | null {
  if (!address || typeof address !== 'object') return null;
  const a = address as Record<string, unknown>;
  const parts = [a.address_line1 ?? a.line1 ?? a.address, a.address_line2 ?? a.line2, a.landmark, a.city, a.state, a.pincode ?? a.zip_code]
    .filter((p) => typeof p === 'string' && p.trim())
    .map(String);
  return parts.length ? parts.join(', ') : null;
}

export function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const toast = useToast();
  const { can } = useCapabilities();
  const { data: order, isLoading, error, refetch } = useGetOrderQuery(orderId, { skip: !orderId });
  // Only fetch the unscoped v2 detail once the shop-scoped endpoint confirmed this order belongs to us.
  const full = useGetOrderFullQuery(orderId, { skip: !order });
  const [doAction, actionState] = useOrderActionMutation();
  const [pending, setPending] = useState<ActionSpec | null>(null);
  const [note, setNote] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const actions = allowedActions(order.status);
  const details = full.data;
  const address = formatAddress(details?.customer_address ?? null);

  const run = async (spec: ActionSpec, actionNote = '') => {
    try {
      await doAction({ id: order.id, action: spec.action, note: actionNote }).unwrap();
      toast.success(`Order #${order.id} updated`, `Now: ${titleCase(spec.to)}`);
      setPending(null);
      setNote('');
    } catch (err) {
      toast.error('Status change rejected by server', err);
    }
  };

  const onActionClick = (spec: ActionSpec) => {
    if (spec.confirm) setPending(spec);
    else void run(spec);
  };

  return (
    <>
      <PageHeader
        backTo="/orders"
        title={
          <span className="flex items-center gap-3">
            Order #{order.id} <StatusBadge status={order.status} />
          </span>
        }
        description={`Placed ${formatDateTime(order.created_at)}${order.external_id ? ` · Ref ${order.external_id}` : ''}${details?.source === 'pos' ? ' · In-store POS sale' : ''}`}
        actions={
          <>
            {details?.invoice_url && (
              <a href={details.invoice_url} target="_blank" rel="noreferrer">
                <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />}>
                  Invoice
                </Button>
              </a>
            )}
            {actions.map((a) => (
              <Button key={a.action} variant={a.tone} onClick={() => onActionClick(a)} loading={actionState.isLoading && actionState.originalArgs?.action === a.action}>
                {a.label}
              </Button>
            ))}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Items" description={details ? `${details.items?.length ?? 0} line(s)` : undefined} />
            {full.isLoading ? (
              <CardBody>
                <Skeleton className="h-24 w-full" />
              </CardBody>
            ) : full.error ? (
              <ErrorState error={full.error} onRetry={full.refetch} title="Could not load order items" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle">
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 text-right font-medium">Qty</th>
                      <th className="px-4 py-2 text-right font-medium">Unit price</th>
                      <th className="px-4 py-2 text-right font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(details?.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{item.product_snapshot?.name ?? `Product #${item.product}`}</p>
                          {item.product_snapshot?.sku && <p className="text-xs text-ink-subtle">SKU {item.product_snapshot.sku}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right tabular">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2.5 text-right tabular">{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <dl className="ml-auto max-w-xs space-y-1 border-t border-line px-4 py-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Items total</dt>
                    <dd className="tabular">{formatCurrency(details?.item_total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Discount</dt>
                    <dd className="tabular">− {formatCurrency(details?.discount_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Tax</dt>
                    <dd className="tabular">{formatCurrency(details?.tax_amount)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1 font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular">{formatCurrency(order.total_amount)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Delivery"
              actions={
                can('delivery') && order.status === 'ready-for-pickup' && details?.source !== 'pos' ? (
                  <Button size="sm" variant="outline" leftIcon={<Truck className="h-4 w-4" />} onClick={() => setAssignOpen(true)}>
                    Assign partner
                  </Button>
                ) : undefined
              }
            />
            <CardBody className="space-y-4">
              <DeliveryProgress status={order.status} source={details?.source} />
              {details?.source !== 'pos' && (
                <BackendGap gap="G-6" title="Partner details, ETA and live location are not exposed to vendors yet">
                  Status above comes from the order itself. The delivery system has no vendor-readable tracking endpoint.
                </BackendGap>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              {order.history.length === 0 ? (
                <p className="text-sm text-ink-muted">No status changes recorded yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-line pl-5">
                  {[...order.history]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((h) => (
                      <li key={h.id}>
                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-surface bg-brand-600" aria-hidden />
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <StatusBadge status={h.to_status} />
                          {h.from_status && <span className="text-xs text-ink-subtle">from {titleCase(h.from_status)}</span>}
                          <span className="text-xs text-ink-subtle">{formatDateTime(h.created_at)}</span>
                        </div>
                        {h.note && <p className="mt-1 text-sm text-ink-muted">{h.note}</p>}
                      </li>
                    ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-3 text-sm">
              <p className="font-medium">{order.customer_name || 'Walk-in / unknown'}</p>
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-brand-700 hover:underline">
                  <Phone className="h-4 w-4" /> {order.customer_phone}
                </a>
              )}
              {address && (
                <p className="flex gap-2 text-ink-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {address}
                </p>
              )}
              {can('chat') && (
                <Link to="/chat" className="inline-flex">
                  <Button size="sm" variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />}>
                    Message customer
                  </Button>
                </Link>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Payment" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Status</span>
                {order.is_paid ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Not paid</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Amount</span>
                <span className="font-semibold tabular">{formatCurrency(order.total_amount)}</span>
              </div>
              {order.delivered_at && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Delivered</span>
                  <span>{formatDateTime(order.delivered_at)}</span>
                </div>
              )}
            </CardBody>
          </Card>
          {(order.status === 'rejected' || order.status === 'cancelled') && (
            <Card>
              <CardHeader title={order.status === 'rejected' ? 'Rejection' : 'Cancellation'} />
              <CardBody className="text-sm text-ink-muted">{order.rejection_reason || 'No reason recorded.'}</CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => {
          setPending(null);
          setNote('');
        }}
        onConfirm={() => pending && run(pending, note.trim())}
        loading={actionState.isLoading}
        title={pending ? `${pending.label}?` : ''}
        description={pending ? `Order #${order.id} will move to “${titleCase(pending.to)}”. The customer will see this change.` : undefined}
        tone={pending?.tone === 'danger' ? 'danger' : 'primary'}
        confirmLabel={pending?.label}
        confirmDisabled={Boolean(pending?.requiresNote) && note.trim().length < 3}
      >
        {pending?.requiresNote && (
          <Field label="Reason" required hint="Shared with the customer and support.">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} data-autofocus />
          </Field>
        )}
      </ConfirmDialog>
      <AssignPartnerDialog open={assignOpen} onClose={() => setAssignOpen(false)} vendorOrderId={order.id} />
    </>
  );
}
