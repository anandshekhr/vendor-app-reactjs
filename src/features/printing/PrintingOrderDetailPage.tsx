import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Check, Download, Eye, FileText, MapPin, MessageCircleQuestion, Phone, Printer, RotateCcw, Truck, X } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, Dialog, Field, Input, Skeleton, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDateTime } from '@/utils/format';
import type { PrintJob, PrintOrderDetail, PrintOrderFile, PrintOrderStatus } from '@/types/api';
import {
  useAcceptPrintOrderMutation,
  useCancelPrintOrderMutation,
  useGetPrintOrderQuery,
  useHandOverPrintOrderMutation,
  useMarkPrintReadyMutation,
  usePrintDocumentLinkMutation,
  usePrintJobActionMutation,
  useQuotePrintOrderMutation,
  useRejectPrintOrderMutation,
  useRequestPrintClarificationMutation,
  useRequestPrintDeliveryMutation,
  useSetPrintStatusMutation,
} from './api';
import { FulfilmentBadge, PrintStatusBadge } from './PrintBadges';
import { CustomerContact } from '@/components/feedback/CustomerContact';
import { PickupVerifyPanel } from './PickupVerifyPanel';
import { DELIVERY_STATE_TEXT, FULFILMENT_STEPS, formatBytes, printOptionsSummary, stepIndex } from './printOrderView';

type ReasonKind = 'reject' | 'cancel' | 'clarify' | null;

export function PrintingOrderDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { data: order, isLoading, error, refetch } = useGetPrintOrderQuery(id, { skip: !id });
  const [accept, acceptState] = useAcceptPrintOrderMutation();
  const [reject, rejectState] = useRejectPrintOrderMutation();
  const [cancel, cancelState] = useCancelPrintOrderMutation();
  const [clarify, clarifyState] = useRequestPrintClarificationMutation();
  const [setStatus, statusState] = useSetPrintStatusMutation();
  const [markReady, readyState] = useMarkPrintReadyMutation();
  const [requestDelivery, deliveryState] = useRequestPrintDeliveryMutation();
  const [reasonKind, setReasonKind] = useState<ReasonKind>(null);
  const [reason, setReason] = useState('');
  const [readyOpen, setReadyOpen] = useState(false);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const can = (a: PrintOrderDetail['allowed_actions'][number]) => order.allowed_actions.includes(a);
  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      return true;
    } catch (err) {
      toast.error('The server refused this action', err);
      return false;
    }
  };
  const status = (to: PrintOrderStatus, label: string) => run(() => setStatus({ id, status: to }).unwrap(), label);
  const isPickup = order.fulfilment_type === 'PICKUP';
  // At the counter (or while a rider is involved) the pickup/delivery panel is what matters: on phones show it first.
  const handoverStage = ['READY_FOR_PICKUP', 'PICKUP_VERIFIED', 'READY_FOR_DELIVERY', 'PARTNER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status);

  const submitReason = async () => {
    const text = reason.trim();
    const ok =
      reasonKind === 'reject'
        ? await run(() => reject({ id, reason: text }).unwrap(), 'Order rejected')
        : reasonKind === 'cancel'
          ? await run(() => cancel({ id, reason: text }).unwrap(), 'Order cancelled')
          : await run(() => clarify({ id, message: text }).unwrap(), 'Question sent to the customer');
    if (ok) {
      setReasonKind(null);
      setReason('');
    }
  };

  return (
    <>
      <PageHeader
        backTo="/printing"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {order.order_number} <PrintStatusBadge status={order.status} label={order.status_display} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <FulfilmentBadge type={order.fulfilment_type} /> Placed {formatDateTime(order.created_at)} · {order.total_pages} pages
          </span>
        }
        actions={
          <>
            {can('accept') && (
              <Button onClick={() => run(() => accept({ id }).unwrap(), 'Order accepted')} loading={acceptState.isLoading} leftIcon={<Check className="h-4 w-4" />}>
                Accept
              </Button>
            )}
            {can('start_printing') && (
              <Button onClick={() => status('PRINTING', 'Printing started')} loading={statusState.isLoading} leftIcon={<Printer className="h-4 w-4" />}>
                Start printing
              </Button>
            )}
            {can('quality_check') && (
              <Button onClick={() => status('QUALITY_CHECK', 'Moved to quality check')} loading={statusState.isLoading}>
                Printed — quality check
              </Button>
            )}
            {can('back_to_printing') && (
              <Button variant="outline" onClick={() => status('PRINTING', 'Back to printing')} loading={statusState.isLoading} leftIcon={<RotateCcw className="h-4 w-4" />}>
                Reprint
              </Button>
            )}
            {can('mark_ready') && (
              <Button onClick={() => setReadyOpen(true)} leftIcon={isPickup ? <Check className="h-4 w-4" /> : <Truck className="h-4 w-4" />}>
                {isPickup ? 'Ready for pickup' : 'Ready for delivery'}
              </Button>
            )}
            {can('request_clarification') && (
              <Button variant="ghost" onClick={() => setReasonKind('clarify')} leftIcon={<MessageCircleQuestion className="h-4 w-4" />}>
                Ask customer
              </Button>
            )}
            {can('reject') && (
              <Button variant="danger" onClick={() => setReasonKind('reject')}>
                Reject
              </Button>
            )}
            {can('cancel') && !can('reject') && (
              <Button variant="ghost" onClick={() => setReasonKind('cancel')} leftIcon={<X className="h-4 w-4" />}>
                Cancel order
              </Button>
            )}
          </>
        }
      />

      <ProgressSteps order={order} />

      {order.clarification_request && order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && (
        <p className="mb-4 flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
          <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0" /> You asked: “{order.clarification_request}” ({formatDateTime(order.clarification_requested_at)})
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {(can('quote') || can('revise_quote') || order.quotation) && <QuotationCard order={order} />}
          <DocumentsCard order={order} />
          {order.print_jobs.length > 0 && <PrintJobsCard order={order} />}
          <TimelineCard order={order} />
        </div>
        <div className={cn('space-y-5', handoverStage && 'order-first xl:order-none')}>
          {isPickup ? <PickupCard order={order} /> : <DeliveryCard order={order} onRequest={() => run(() => requestDelivery({ id }).unwrap(), 'Delivery partner requested')} requesting={deliveryState.isLoading} />}
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <CustomerContact phone={order.customer.phone} masked={order.contact_masked} visibleUntil={order.contact_visible_until} />
              {order.special_instructions && <p className="rounded-md bg-ink/[0.03] p-2 text-ink-muted">“{order.special_instructions}”</p>}
            </CardBody>
          </Card>
          <PaymentCard order={order} />
        </div>
      </div>

      <ConfirmDialog
        open={readyOpen}
        onClose={() => setReadyOpen(false)}
        onConfirm={async () => {
          if (await run(() => markReady({ id }).unwrap(), isPickup ? 'Customer notified: ready for pickup' : 'Delivery partner requested')) setReadyOpen(false);
        }}
        loading={readyState.isLoading}
        title={isPickup ? 'Ready for pickup?' : 'Ready for delivery?'}
        description={
          isPickup
            ? 'The customer gets a notification and a pickup code. Hand the documents over only after verifying that code.'
            : 'Pack the documents. A nearby delivery partner will be requested to collect them from your shop.'
        }
        confirmLabel={isPickup ? 'Mark ready for pickup' : 'Request delivery partner'}
      />

      <ConfirmDialog
        open={reasonKind !== null}
        onClose={() => {
          setReasonKind(null);
          setReason('');
        }}
        onConfirm={submitReason}
        loading={rejectState.isLoading || cancelState.isLoading || clarifyState.isLoading}
        tone={reasonKind === 'clarify' ? 'primary' : 'danger'}
        title={reasonKind === 'reject' ? 'Reject this order?' : reasonKind === 'cancel' ? 'Cancel this order?' : 'Ask the customer'}
        description={
          reasonKind === 'clarify'
            ? 'The customer gets your question as a notification. The order stays where it is.'
            : order.payment_status === 'PAID'
              ? 'The customer is refunded in full.'
              : 'The customer is told why.'
        }
        confirmLabel={reasonKind === 'reject' ? 'Reject order' : reasonKind === 'cancel' ? 'Cancel order' : 'Send question'}
        confirmDisabled={reason.trim().length < 3}
      >
        <Field label={reasonKind === 'clarify' ? 'Question' : 'Reason'} required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} data-autofocus />
        </Field>
      </ConfirmDialog>
    </>
  );
}

function ProgressSteps({ order }: { order: PrintOrderDetail }) {
  const steps = FULFILMENT_STEPS[order.fulfilment_type];
  const current = stepIndex(order.fulfilment_type, order.status);
  if (current === null) {
    return (
      <p className="mb-4 rounded-md bg-ink/[0.04] p-3 text-sm text-ink-muted">
        {order.status === 'REJECTED' ? `Rejected: ${order.rejection_reason || 'no reason given'}` : `Cancelled: ${order.cancellation_reason || 'no reason given'}`}
        {order.refund_status !== 'NONE' && ` · Refund ${order.refund_status.toLowerCase()} (${formatCurrency(order.refund_amount)})`}
      </p>
    );
  }
  return (
    <ol className="mb-5 flex gap-1 overflow-x-auto pb-1" aria-label="Order progress">
      {steps.map((s, i) => {
        const done = i < current || order.status === 'COMPLETED' || order.status === 'DELIVERED';
        const active = i === current;
        return (
          <li key={s.status} aria-current={active ? 'step' : undefined} className="min-w-[96px] flex-1">
            <div className={cn('h-1.5 rounded-full', done ? 'bg-emerald-500' : active ? 'bg-brand-600' : 'bg-ink/10')} />
            <p className={cn('mt-1 text-xs', active ? 'font-semibold text-ink' : done ? 'text-ink-muted' : 'text-ink-subtle')}>{s.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

function QuotationCard({ order }: { order: PrintOrderDetail }) {
  const toast = useToast();
  const [quote, state] = useQuotePrintOrderMutation();
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [minutes, setMinutes] = useState('');
  const editable = order.allowed_actions.includes('quote') || order.allowed_actions.includes('revise_quote');
  const valid = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0;
  const latest = order.quotation;

  const submit = async () => {
    try {
      await quote({ id: order.id, quoted_amount: Number(amount).toFixed(2), details: details.trim(), estimated_completion_minutes: minutes ? Number(minutes) : null }).unwrap();
      toast.success('Quotation sent', 'The customer is asked to approve it.');
      setAmount('');
      setDetails('');
      setMinutes('');
    } catch (err) {
      toast.error('Could not send the quotation', err);
    }
  };

  return (
    <Card>
      <CardHeader title="Quotation" description={order.status === 'QUOTATION_PENDING' ? 'This order needs your price before the customer can pay.' : undefined} />
      <CardBody className="space-y-4 text-sm">
        {latest && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-3">
            <div>
              <p className="font-semibold tabular">{formatCurrency(latest.quoted_amount)}</p>
              {latest.details && <p className="text-ink-muted">{latest.details}</p>}
              {latest.estimated_completion_minutes && <p className="text-xs text-ink-subtle">Ready in about {latest.estimated_completion_minutes} min</p>}
            </div>
            <Badge tone={latest.status === 'ACCEPTED' ? 'success' : latest.status === 'DECLINED' ? 'danger' : 'warning'}>
              {latest.status === 'PENDING' ? 'Waiting for customer' : latest.status.toLowerCase()}
            </Badge>
          </div>
        )}
        {editable && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={latest ? 'Revised amount (₹)' : 'Printing amount (₹)'} hint="Excludes delivery charges" required>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={amount && !valid ? true : undefined} />
            </Field>
            <Field label="Ready in (minutes)">
              <Input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="Details for the customer" className="sm:col-span-3">
              <Textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} placeholder="e.g. 42 colour pages on A4 + spiral binding" />
            </Field>
            <div className="sm:col-span-3">
              <Button onClick={submit} loading={state.isLoading} disabled={!valid}>
                {latest ? 'Send revised quotation' : 'Send quotation'}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function DocumentsCard({ order }: { order: PrintOrderDetail }) {
  const toast = useToast();
  const [link, linkState] = usePrintDocumentLinkMutation();
  const [preview, setPreview] = useState<{ file: PrintOrderFile; url: string } | null>(null);

  const open = async (file: PrintOrderFile, disposition: 'inline' | 'attachment') => {
    try {
      const res = await link({ id: order.id, fileId: file.id, disposition }).unwrap();
      if (res.disposition === 'inline') setPreview({ file, url: res.url });
      else window.location.assign(res.url);
    } catch (err) {
      toast.error('Could not open the document', err);
    }
  };

  return (
    <Card>
      <CardHeader title="Documents" description="Links are private, expire in 5 minutes and every open is logged." />
      <ul className="divide-y divide-line">
        {order.files.map((f) => (
          <li key={f.id} className="flex flex-wrap items-start gap-3 px-4 py-3 text-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink/5 text-xs font-semibold uppercase text-ink-muted">{f.file_type || <FileText className="h-4 w-4" />}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{f.original_filename}</p>
              <p className="text-xs text-ink-muted">{printOptionsSummary(f)}</p>
              <p className="text-xs text-ink-subtle">
                {f.total_pages ?? '?'} pages × {f.copies} {f.copies === 1 ? 'copy' : 'copies'} · {formatBytes(f.file_size)}
                {Number(f.computed_price) > 0 && ` · ${formatCurrency(f.computed_price)}`}
              </p>
              {f.special_instructions && <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">“{f.special_instructions}”</p>}
            </div>
            {f.is_deleted ? (
              <Badge tone="neutral">Deleted</Badge>
            ) : (
              <div className="flex gap-1">
                {f.previewable && (
                  <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => open(f, 'inline')} loading={linkState.isLoading && linkState.originalArgs?.fileId === f.id && linkState.originalArgs.disposition === 'inline'} aria-label={`Preview ${f.original_filename}`}>
                    Preview
                  </Button>
                )}
                <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={() => open(f, 'attachment')} aria-label={`Download ${f.original_filename}`}>
                  Download
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.file.original_filename ?? ''} size="xl">
        {preview && (
          // sandbox: no scripts or navigation from the customer's file; the server also sends a sandbox CSP.
          <iframe title={`Preview of ${preview.file.original_filename}`} src={preview.url} sandbox="" className="h-[70vh] w-full rounded-md border border-line bg-white" />
        )}
      </Dialog>
    </Card>
  );
}

function PrintJobsCard({ order }: { order: PrintOrderDetail }) {
  const toast = useToast();
  const [jobAction, state] = usePrintJobActionMutation();
  const [reprintJob, setReprintJob] = useState<PrintJob | null>(null);
  const [reason, setReason] = useState('');
  const working = ['RECEIVED', 'PRINTING', 'QUALITY_CHECK'].includes(order.status);

  const act = async (job: PrintJob, action: 'printed' | 'failed' | 'reprint', extra: { reason?: string; error?: string } = {}) => {
    try {
      await jobAction({ id: order.id, jobId: job.id, action, ...extra }).unwrap();
      return true;
    } catch (err) {
      toast.error('Could not update the print job', err);
      return false;
    }
  };

  return (
    <Card>
      <CardHeader title="Print jobs" description="One per document. Mark each one printed as you go." />
      <ul className="divide-y divide-line">
        {order.print_jobs.map((job) => (
          <li key={job.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate">{job.file_name}</span>
            <Badge tone={job.status === 'PRINTED' ? 'success' : job.status === 'FAILED' ? 'danger' : 'neutral'}>
              {job.status.toLowerCase()}
              {job.retry_count > 0 && ` · reprint ${job.retry_count}`}
            </Badge>
            {working && job.status !== 'PRINTED' && (
              <>
                <Button size="sm" onClick={() => act(job, 'printed')} loading={state.isLoading && state.originalArgs?.jobId === job.id}>
                  Mark printed
                </Button>
                {job.status !== 'FAILED' && (
                  <Button size="sm" variant="ghost" onClick={() => act(job, 'failed', { error: 'Printer error' })}>
                    Failed
                  </Button>
                )}
              </>
            )}
            {job.status === 'PRINTED' && ['PRINTING', 'QUALITY_CHECK'].includes(order.status) && (
              <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setReprintJob(job)}>
                Reprint
              </Button>
            )}
            {job.last_error && job.status === 'FAILED' && <p className="w-full text-xs text-red-600">{job.last_error}</p>}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(reprintJob)}
        onClose={() => {
          setReprintJob(null);
          setReason('');
        }}
        onConfirm={async () => {
          if (reprintJob && (await act(reprintJob, 'reprint', { reason: reason.trim() }))) {
            setReprintJob(null);
            setReason('');
          }
        }}
        loading={state.isLoading}
        title="Reprint this document?"
        description="Reprints are logged with your reason."
        confirmLabel="Reprint"
        confirmDisabled={reason.trim().length < 3}
      >
        <Field label="Reason" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. smudged page 3" data-autofocus />
        </Field>
      </ConfirmDialog>
    </Card>
  );
}

function PickupCard({ order }: { order: PrintOrderDetail }) {
  const toast = useToast();
  const [handOver, state] = useHandOverPrintOrderMutation();
  const [cash, setCash] = useState(false);
  const pickup = order.pickup;
  const cashDue = order.payment_method === 'COD' && order.payment_status !== 'PAID';

  return (
    <Card>
      <CardHeader title="Self pickup" description="No delivery charge. The customer collects from your shop." />
      <CardBody className="space-y-3 text-sm">
        {order.status === 'READY_FOR_PICKUP' && pickup && (
          <>
            <p className="text-ink-muted">Waiting for the customer. Verify their pickup code before handing over the documents.</p>
            {pickup.locked ? (
              <p role="alert" className="flex gap-2 rounded-md bg-red-50 p-2 text-red-700 dark:bg-red-900/20 dark:text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Locked after 5 wrong codes. Ask the customer to reopen the code in their app.
              </p>
            ) : (
              pickup.failed_attempts > 0 && <p className="text-amber-700">{pickup.failed_attempts} wrong attempt(s) so far.</p>
            )}
            <PickupVerifyPanel orderId={order.id} onVerified={() => toast.success('Pickup code verified', 'Hand over the documents, then confirm below.')} />
            {pickup.code_expires_at && <p className="text-xs text-ink-subtle">Code valid until {formatDateTime(pickup.code_expires_at)}</p>}
          </>
        )}
        {order.status === 'PICKUP_VERIFIED' && (
          <>
            <Badge tone="success">
              <Check className="h-3 w-3" /> Code verified {pickup?.verified_at && formatDateTime(pickup.verified_at)}
            </Badge>
            {cashDue && (
              <label className="flex items-start gap-2 rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
                <Checkbox checked={cash} onChange={(e) => setCash(e.target.checked)} className="mt-0.5" />
                I collected {formatCurrency(order.total_amount)} in cash
              </label>
            )}
            <Button
              className="w-full"
              disabled={cashDue && !cash}
              loading={state.isLoading}
              onClick={async () => {
                try {
                  await handOver({ id: order.id, cash_collected: cash }).unwrap();
                  toast.success('Order completed', 'Documents handed over.');
                } catch (err) {
                  toast.error('Could not complete the handover', err);
                }
              }}
            >
              Documents handed over
            </Button>
          </>
        )}
        {(order.status === 'PICKED_UP' || order.status === 'COMPLETED') && (
          <p className="flex items-center gap-2 text-emerald-700">
            <Check className="h-4 w-4" /> Picked up {order.picked_up_at && formatDateTime(order.picked_up_at)}
          </p>
        )}
        {!['READY_FOR_PICKUP', 'PICKUP_VERIFIED', 'PICKED_UP', 'COMPLETED'].includes(order.status) && (
          <p className="text-ink-muted">The customer gets a pickup code when you mark the order ready.</p>
        )}
      </CardBody>
    </Card>
  );
}

function DeliveryCard({ order, onRequest, requesting }: { order: PrintOrderDetail; onRequest: () => void; requesting: boolean }) {
  const delivery = order.delivery;
  const address = order.delivery_address_detail;
  const stateInfo = delivery ? DELIVERY_STATE_TEXT[delivery.state] : null;
  return (
    <Card>
      <CardHeader title="Home delivery" />
      <CardBody className="space-y-3 text-sm">
        {address && (
          <p className="flex gap-2 text-ink-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {[address.address_line, address.city, address.state, address.zip_code].filter(Boolean).join(', ')}
              {address.phone_number && <span className="block text-xs">Contact: {address.phone_number}</span>}
            </span>
          </p>
        )}
        <dl className="grid grid-cols-2 gap-y-1">
          <dt className="text-ink-muted">Delivery charge</dt>
          <dd className="text-right tabular">{formatCurrency(order.delivery_fee)}</dd>
          {delivery?.distance_km != null && (
            <>
              <dt className="text-ink-muted">Distance</dt>
              <dd className="text-right tabular">{Number(delivery.distance_km).toFixed(1)} km</dd>
            </>
          )}
        </dl>
        {delivery && stateInfo && (
          <div className="space-y-2 rounded-md border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Delivery partner</span>
              <Badge tone={stateInfo.tone}>{stateInfo.label}</Badge>
            </div>
            <p className="text-xs text-ink-muted">{stateInfo.hint}</p>
            {delivery.rider && (
              <div>
                <p className="font-medium">{delivery.rider.name}</p>
                {delivery.rider.vehicle_type && <p className="text-xs text-ink-subtle">{delivery.rider.vehicle_type}</p>}
                {delivery.rider.phone && (
                  <a href={`tel:${delivery.rider.phone}`} className="flex items-center gap-2 text-brand-700 hover:underline">
                    <Phone className="h-4 w-4" /> {delivery.rider.phone}
                  </a>
                )}
              </div>
            )}
            {delivery.can_request && (
              <Button className="w-full" size="sm" leftIcon={<Truck className="h-4 w-4" />} onClick={onRequest} loading={requesting}>
                {delivery.attempts > 0 ? 'Request delivery partner again' : 'Request delivery partner'}
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function PaymentCard({ order }: { order: PrintOrderDetail }) {
  return (
    <Card>
      <CardHeader title="Payment" />
      <CardBody className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">Method</span>
          <span>{order.payment_method === 'COD' ? (order.fulfilment_type === 'PICKUP' ? 'Cash at pickup' : 'Cash on delivery') : 'Online'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">Status</span>
          <Badge tone={order.payment_status === 'PAID' ? 'success' : order.payment_status === 'REFUNDED' ? 'neutral' : 'warning'}>{order.payment_status.toLowerCase()}</Badge>
        </div>
        <div className="flex justify-between pt-2">
          <span className="text-ink-muted">{order.quoted_amount ? 'Quoted printing' : 'Printing'}</span>
          <span className="tabular">{formatCurrency(order.subtotal_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">Delivery charge</span>
          <span className="tabular">{order.fulfilment_type === 'PICKUP' ? 'None (pickup)' : formatCurrency(order.delivery_fee)}</span>
        </div>
        <div className="flex justify-between border-t border-line pt-1 font-semibold">
          <span>Total</span>
          <span className="tabular">{formatCurrency(order.total_amount)}</span>
        </div>
        {order.refund_status !== 'NONE' && (
          <p className="pt-1 text-xs text-ink-muted">
            Refund {order.refund_status.toLowerCase()}: {formatCurrency(order.refund_amount)}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function TimelineCard({ order }: { order: PrintOrderDetail }) {
  return (
    <Card>
      <CardHeader title="Timeline" />
      <CardBody>
        <ol className="space-y-3">
          {order.history.map((h, i) => (
            <li key={i} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{h.to_status_display}</span>
                {h.is_override && <Badge tone="danger">Admin override</Badge>}
                <span className="text-xs text-ink-subtle">{formatDateTime(h.created_at)}</span>
              </div>
              {h.note && <p className="text-ink-muted">{h.note}</p>}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
