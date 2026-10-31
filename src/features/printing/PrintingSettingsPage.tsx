import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, Dialog, Field, Input, Select, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/utils/format';
import type { PrintRateCard, PrintShopSettings } from '@/types/api';
import { useDeleteRateCardMutation, useGetPrintSettingsQuery, useListRateCardsQuery, useSaveRateCardMutation, useUpdatePrintSettingsMutation } from './api';

const COLOR = { BW: 'Black & white', COLOR: 'Colour' } as const;
const SIDED = { SINGLE: 'Single-sided', DOUBLE: 'Double-sided' } as const;
const BINDING = { NONE: 'No binding', STAPLED: 'Stapled', SPIRAL: 'Spiral binding', HARDBOUND: 'Hard binding' } as const;
const SIZES = ['A4', 'A3', 'A5', 'LEGAL', 'LETTER'] as const;

export function PrintingSettingsPage() {
  return (
    <>
      <PageHeader backTo="/printing" title="Printing prices & settings" description="What customers can order from you, and how it's priced." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <SettingsCard />
        <RateCardsCard />
      </div>
    </>
  );
}

function SettingsCard() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetPrintSettingsQuery();
  const [save, state] = useUpdatePrintSettingsMutation();
  const [form, setForm] = useState<PrintShopSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !form) return <Skeleton className="h-96 w-full" />;
  const set = <K extends keyof PrintShopSettings>(key: K, value: PrintShopSettings[K]) => setForm({ ...form, [key]: value });
  const invalid = !form.supports_pickup && !form.supports_delivery;

  const submit = async () => {
    try {
      await save({
        is_accepting_orders: form.is_accepting_orders,
        auto_accept_orders: form.auto_accept_orders,
        supports_pickup: form.supports_pickup,
        supports_delivery: form.supports_delivery,
        accepts_cash: form.accepts_cash,
        pickup_instructions: form.pickup_instructions,
        service_radius_km: Number(form.service_radius_km),
        turnaround_minutes_min: Number(form.turnaround_minutes_min),
        turnaround_minutes_max: Number(form.turnaround_minutes_max),
      }).unwrap();
      toast.success('Printing settings saved');
    } catch (err) {
      toast.error('Could not save settings', err);
    }
  };

  const toggle = (key: 'is_accepting_orders' | 'auto_accept_orders' | 'supports_pickup' | 'supports_delivery' | 'accepts_cash', label: string, hint: string) => (
    <label className="flex items-start gap-3 py-2">
      <Checkbox checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <Card>
      <CardHeader title="Order options" />
      <CardBody className="space-y-2">
        {toggle('is_accepting_orders', 'Accepting printing orders', 'Turn off to stop new orders, e.g. when the printer is down.')}
        {toggle('supports_pickup', 'Self pickup', 'Customers collect from your shop with a pickup code. No delivery charge.')}
        {toggle('supports_delivery', 'Home delivery', 'A TheNearByShop delivery partner collects and delivers. The customer pays the delivery charge.')}
        {toggle('accepts_cash', 'Accept cash', 'Customers may pay in cash at pickup, or to the delivery partner.')}
        {toggle('auto_accept_orders', 'Accept fully priced orders automatically', 'Quoted orders always wait for your price.')}
        {invalid && <p className="text-sm text-red-600">Offer at least one of self pickup or home delivery.</p>}
        <div className="grid gap-3 pt-2 sm:grid-cols-3">
          <Field label="Delivery radius (km)">
            <Input inputMode="numeric" value={String(form.service_radius_km)} onChange={(e) => set('service_radius_km', Number(e.target.value.replace(/\D/g, '')) || 0)} />
          </Field>
          <Field label="Ready in, from (min)">
            <Input inputMode="numeric" value={String(form.turnaround_minutes_min)} onChange={(e) => set('turnaround_minutes_min', Number(e.target.value.replace(/\D/g, '')) || 0)} />
          </Field>
          <Field label="to (min)">
            <Input inputMode="numeric" value={String(form.turnaround_minutes_max)} onChange={(e) => set('turnaround_minutes_max', Number(e.target.value.replace(/\D/g, '')) || 0)} />
          </Field>
          <Field label="Pickup instructions" className="sm:col-span-3" hint="Shown to customers collecting from your shop.">
            <Input value={form.pickup_instructions} maxLength={255} onChange={(e) => set('pickup_instructions', e.target.value)} placeholder="e.g. Counter 2, next to the stationery shelf" />
          </Field>
        </div>
        <p className="text-xs text-ink-subtle">
          Customers can upload up to {form.max_files_per_order} files of {form.max_file_size_mb} MB each.
        </p>
        <Button onClick={submit} loading={state.isLoading} disabled={invalid || form.turnaround_minutes_min > form.turnaround_minutes_max}>
          Save settings
        </Button>
      </CardBody>
    </Card>
  );
}

const emptyCard: Partial<PrintRateCard> = { color_mode: 'BW', paper_size: 'A4', sided: 'SINGLE', binding: 'NONE', price_per_page: '', binding_fee: '0', is_active: true };

function RateCardsCard() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useListRateCardsQuery();
  const [saveCard, saveState] = useSaveRateCardMutation();
  const [deleteCard, deleteState] = useDeleteRateCardMutation();
  const [editing, setEditing] = useState<Partial<PrintRateCard> | null>(null);
  const [removing, setRemoving] = useState<PrintRateCard | null>(null);

  const priceValid = (v: unknown) => /^\d+(\.\d{1,2})?$/.test(String(v ?? '').trim());
  const canSave = editing && priceValid(editing.price_per_page) && Number(editing.price_per_page) > 0 && (editing.binding === 'NONE' || priceValid(editing.binding_fee));

  const submit = async () => {
    if (!editing) return;
    try {
      await saveCard({ ...editing, binding_fee: editing.binding === 'NONE' ? '0' : editing.binding_fee }).unwrap();
      toast.success('Price saved');
      setEditing(null);
    } catch (err) {
      toast.error('Could not save the price', err);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Per-page prices"
        description="Orders whose options all have a price here are priced instantly. Anything else comes to you for a quotation."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...emptyCard })}>
            Add price
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <CardBody>
          <Skeleton className="h-40 w-full" />
        </CardBody>
      ) : !data?.length ? (
        <EmptyState title="No prices yet" description="Add at least black & white A4 so simple orders can be priced automatically." />
      ) : (
        <ul className="divide-y divide-line" aria-label="Per-page prices">
          {data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {COLOR[c.color_mode]} · {c.paper_size} · {SIDED[c.sided]}
                </p>
                <p className="text-xs text-ink-subtle">
                  {BINDING[c.binding]}
                  {c.binding !== 'NONE' && ` (+${formatCurrency(c.binding_fee)} per copy)`}
                </p>
              </div>
              <span className="font-semibold tabular">{formatCurrency(c.price_per_page)}/page</span>
              {!c.is_active && <Badge tone="neutral">Off</Badge>}
              <Button size="icon" variant="ghost" aria-label={`Edit ${COLOR[c.color_mode]} ${c.paper_size} ${SIDED[c.sided]}`} onClick={() => setEditing({ ...c })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label={`Delete ${COLOR[c.color_mode]} ${c.paper_size} ${SIDED[c.sided]}`} onClick={() => setRemoving(c)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit price' : 'Add price'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saveState.isLoading} disabled={!canSave}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Print">
              <Select value={editing.color_mode} onChange={(e) => setEditing({ ...editing, color_mode: e.target.value as PrintRateCard['color_mode'] })}>
                {Object.entries(COLOR).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Paper size">
              <Select value={editing.paper_size} onChange={(e) => setEditing({ ...editing, paper_size: e.target.value as PrintRateCard['paper_size'] })}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sides">
              <Select value={editing.sided} onChange={(e) => setEditing({ ...editing, sided: e.target.value as PrintRateCard['sided'] })}>
                {Object.entries(SIDED).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Binding">
              <Select value={editing.binding} onChange={(e) => setEditing({ ...editing, binding: e.target.value as PrintRateCard['binding'] })}>
                {Object.entries(BINDING).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Price per page (₹)" required>
              <Input inputMode="decimal" value={String(editing.price_per_page ?? '')} onChange={(e) => setEditing({ ...editing, price_per_page: e.target.value })} data-autofocus />
            </Field>
            {editing.binding !== 'NONE' && (
              <Field label="Binding charge per copy (₹)">
                <Input inputMode="decimal" value={String(editing.binding_fee ?? '')} onChange={(e) => setEditing({ ...editing, binding_fee: e.target.value })} />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Available to customers
            </label>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await deleteCard(removing.id).unwrap();
            setRemoving(null);
          } catch (err) {
            toast.error('Could not delete the price', err);
          }
        }}
        loading={deleteState.isLoading}
        tone="danger"
        title="Delete this price?"
        description="Orders needing these options will come to you for a quotation instead."
        confirmLabel="Delete"
      />
    </Card>
  );
}
