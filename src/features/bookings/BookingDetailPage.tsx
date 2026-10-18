import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageSquare, Phone } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, ConfirmDialog, Dialog, Field, Input, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format';
import type { BookingAction } from '@/types/api';
import { useBookingActionMutation, useGetBookingQuery } from './api';
import { allowedBookingActions, BOOKING_ACTION_LABELS, rescheduleWindow } from './transitions';

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export function BookingDetailPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const toast = useToast();
  const { data: b, isLoading, error, refetch } = useGetBookingQuery(bookingId, { skip: !bookingId });
  const [act, actState] = useBookingActionMutation();
  const [confirm, setConfirm] = useState<BookingAction | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !b) return <Skeleton className="h-96 w-full" />;

  const actions = allowedBookingActions(b.status, b.payment_status);
  const durationMin = b.service_detail?.estimated_duration_minutes ?? Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000);

  const run = async (action: BookingAction, extra: { start_time?: string; end_time?: string } = {}) => {
    try {
      await act({ id: b.id, action, ...extra }).unwrap();
      toast.success('Booking updated', BOOKING_ACTION_LABELS[action]);
      setConfirm(null);
      setRescheduleOpen(false);
    } catch (err) {
      toast.error('Action rejected by server', err);
    }
  };

  return (
    <>
      <PageHeader
        backTo="/bookings"
        title={
          <span className="flex items-center gap-3">
            Booking #{b.id} <StatusBadge status={b.status} label={b.status_display} />
          </span>
        }
        description={`${b.service_name} · ${formatDateTime(b.start_time)} – ${formatDateTime(b.end_time).split(', ').pop()}`}
        actions={actions.map((a) => (
          <Button
            key={a}
            variant={a === 'cancel' ? 'danger' : a === 'reschedule' || a === 'collect_balance' ? 'outline' : 'primary'}
            onClick={() => {
              if (a === 'reschedule') {
                const local = toLocalInput(b.start_time);
                setDate(local.date);
                setTime(local.time);
                setRescheduleOpen(true);
              } else setConfirm(a);
            }}
          >
            {BOOKING_ACTION_LABELS[a]}
          </Button>
        ))}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Service" />
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-ink-subtle">Service</p>
                <p className="font-medium">{b.service_name}</p>
              </div>
              <div>
                <p className="text-ink-subtle">Category</p>
                <p>{b.service_detail?.category_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-ink-subtle">Type / pricing</p>
                <p>
                  {titleCase(b.service_detail?.service_type)} · {titleCase(b.service_detail?.pricing_type)}
                </p>
              </div>
              <div>
                <p className="text-ink-subtle">Assigned staff</p>
                <p>{b.staff ?? 'Unassigned'}</p>
              </div>
            </CardBody>
          </Card>
          <BackendGap gap="G-10" title="Accept/reject, employee assignment and slot-conflict checks are not exposed to vendors">
            Rescheduling sends the new time directly; the server does not yet verify staff availability, so check your calendar first.
          </BackendGap>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-medium">{b.customer_name}</p>
              <a href={`tel:${b.customer_phone}`} className="flex items-center gap-2 text-brand-700 hover:underline">
                <Phone className="h-4 w-4" /> {b.customer_phone}
              </a>
              <Link to="/chat">
                <Button size="sm" variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />}>
                  Message customer
                </Button>
              </Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Payment" />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Status</span>
                <StatusBadge status={b.payment_status} label={b.payment_status_display} />
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Total</span>
                <span className="tabular">{formatCurrency(b.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Paid</span>
                <span className="tabular">{formatCurrency(b.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Due</span>
                <span className="tabular">{formatCurrency(b.amount_due)}</span>
              </div>
              {b.payment_detail && (
                <p className="text-xs text-ink-subtle">
                  {b.payment_detail.payment_gateway} · {b.payment_detail.status} · {b.payment_detail.payment_id}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && run(confirm)}
        loading={actState.isLoading}
        tone={confirm === 'cancel' ? 'danger' : 'primary'}
        title={confirm ? `${BOOKING_ACTION_LABELS[confirm]}?` : ''}
        description={
          confirm === 'collect_balance'
            ? `Confirm you collected ${formatCurrency(b.amount_due)} from the customer. This marks the booking as fully paid.`
            : confirm === 'cancel'
              ? 'The customer will see the booking as cancelled.'
              : undefined
        }
        confirmLabel={confirm ? BOOKING_ACTION_LABELS[confirm] : undefined}
      />
      <Dialog
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reschedule booking"
        description={`Duration kept at ${durationMin} minutes.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={actState.isLoading}
              disabled={!date || !time}
              onClick={() => {
                try {
                  const win = rescheduleWindow(date, time, durationMin);
                  if (new Date(win.start_time).getTime() < Date.now()) {
                    toast.error('Choose a time in the future');
                    return;
                  }
                  void run('reschedule', win);
                } catch {
                  toast.error('Invalid date or time');
                }
              }}
            >
              Save new time
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Start time" required>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </>
  );
}
