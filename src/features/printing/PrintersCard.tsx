import { useState } from 'react';
import { KeyRound, Pencil, Plus, Printer, Trash2, Unplug } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, Dialog, Field, Input, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/hooks/useToast';
import { formatRelative, formatTime } from '@/utils/format';
import type { PrintStation, PrintStationInput } from '@/types/api';
import {
  useDeletePrintStationMutation,
  useListPrintStationsQuery,
  useSavePrintStationMutation,
  useStationPairingCodeMutation,
  useUnpairPrintStationMutation,
} from './api';
import { stationSummary } from './printOrderView';

const SIZES = ['A4', 'A3', 'A5', 'LEGAL', 'LETTER'] as const;
const EMPTY: PrintStationInput = { name: '', supports_color: false, supports_duplex: false, paper_sizes: ['A4'], is_active: true, auto_print_orders: false };

/**
 * Shop printers driven by the TNBS Print Agent: add one, pair the agent on the PC beside it, and choose whether it
 * prints accepted delivery/pickup orders by itself.
 */
export function PrintersCard() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useListPrintStationsQuery(undefined, { pollingInterval: 30_000 });
  const [save, saveState] = useSavePrintStationMutation();
  const [remove, removeState] = useDeletePrintStationMutation();
  const [getCode, codeState] = useStationPairingCodeMutation();
  const [unpair, unpairState] = useUnpairPrintStationMutation();
  const [editing, setEditing] = useState<(PrintStationInput & { id?: number }) | null>(null);
  const [deleting, setDeleting] = useState<PrintStation | null>(null);
  const [unpairing, setUnpairing] = useState<PrintStation | null>(null);
  const [pairing, setPairing] = useState<{ station: PrintStation; code: string; expires_at: string } | null>(null);

  const toggleAuto = async (st: PrintStation, on: boolean) => {
    try {
      await save({ id: st.id, auto_print_orders: on }).unwrap();
      toast.success(on ? `${st.name} prints accepted orders automatically` : `${st.name}: automatic printing off`);
    } catch (err) {
      toast.error('Could not change the printer', err);
    }
  };

  const submit = async () => {
    if (!editing) return;
    try {
      await save({ ...editing, name: editing.name.trim() }).unwrap();
      toast.success(editing.id ? 'Printer saved' : 'Printer added', editing.id ? undefined : 'Now pair the print agent on the PC beside it.');
      setEditing(null);
    } catch (err) {
      toast.error('Could not save the printer', err);
    }
  };

  const pair = async (st: PrintStation) => {
    try {
      const res = await getCode(st.id).unwrap();
      setPairing({ station: st, code: res.pairing_code, expires_at: res.expires_at });
    } catch (err) {
      toast.error('Could not create a pairing code', err);
    }
  };

  const toggleSize = (size: string) =>
    editing && setEditing({ ...editing, paper_sizes: editing.paper_sizes.includes(size) ? editing.paper_sizes.filter((s) => s !== size) : [...editing.paper_sizes, size] });

  return (
    <Card>
      <CardHeader
        title="Printers"
        description="Printers run by the TNBS Print Agent on a Windows PC beside them. They print self-service orders and, if you turn it on, every accepted order by themselves."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...EMPTY })}>
            Add printer
          </Button>
        }
      />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={refetch} />
        </CardBody>
      ) : isLoading || !data ? (
        <CardBody>
          <Skeleton className="h-24 w-full" />
        </CardBody>
      ) : data.length === 0 ? (
        <CardBody>
          <EmptyState
            icon={<Printer className="h-5 w-5" />}
            title="No printers yet"
            description="Add the printer at your counter, then pair the TNBS Print Agent on the PC it's connected to. Ask the TheNearByShop team for the agent installer."
          />
        </CardBody>
      ) : (
        <ul className="divide-y divide-line">
          {data.map((st) => (
            <li key={st.id} className="space-y-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{st.name}</span>
                {!st.is_paired ? (
                  <Badge tone="warning">Not paired</Badge>
                ) : st.online ? (
                  <Badge tone="success">Online</Badge>
                ) : (
                  <Badge tone="neutral">Offline{st.last_seen_at ? ` · seen ${formatRelative(st.last_seen_at)}` : ''}</Badge>
                )}
                {!st.is_active && <Badge tone="neutral">Switched off</Badge>}
                <span className="ml-auto flex gap-1">
                  <Button size="sm" variant="outline" leftIcon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => pair(st)} loading={codeState.isLoading && codeState.originalArgs === st.id}>
                    {st.is_paired ? 'Pair again' : 'Pair agent'}
                  </Button>
                  {st.is_paired && (
                    <Button size="sm" variant="ghost" onClick={() => setUnpairing(st)} aria-label={`Unpair ${st.name}`}>
                      <Unplug className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing({ id: st.id, name: st.name, supports_color: st.supports_color, supports_duplex: st.supports_duplex, paper_sizes: st.paper_sizes, is_active: st.is_active, auto_print_orders: st.auto_print_orders })}
                    aria-label={`Edit ${st.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(st)} aria-label={`Delete ${st.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {stationSummary(st)}
                {st.printer_name && ` · Windows printer: ${st.printer_name}`}
                {st.agent_status && ` · ${st.agent_status}`}
              </p>
              <label className="flex items-start gap-3">
                <Checkbox checked={st.auto_print_orders} onChange={(e) => toggleAuto(st, e.target.checked)} disabled={saveState.isLoading} className="mt-0.5" aria-label={`Print accepted orders automatically on ${st.name}`} />
                <span>
                  <span className="block font-medium">Print accepted orders automatically</span>
                  <span className="block text-xs text-ink-muted">
                    Delivery and pickup orders print here as soon as they're accepted (PDF and image files this printer can do). Check them, then mark the order ready. Word and other files you print by hand.
                    {st.auto_print_orders && !st.is_paired && ' Pair the agent first: nothing prints until it is.'}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit printer' : 'Add printer'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saveState.isLoading} disabled={!editing?.name.trim() || !editing?.paper_sizes.length}>
              Save printer
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Name" required hint="Customers see it at self-service, e.g. Counter printer.">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={60} data-autofocus />
            </Field>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox checked={editing.supports_color} onChange={(e) => setEditing({ ...editing, supports_color: e.target.checked })} /> Prints in colour
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={editing.supports_duplex} onChange={(e) => setEditing({ ...editing, supports_duplex: e.target.checked })} /> Prints double-sided
              </label>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Paper loaded</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {SIZES.map((size) => (
                  <label key={size} className="flex items-center gap-1.5">
                    <Checkbox checked={editing.paper_sizes.includes(size)} onChange={() => toggleSize(size)} /> {size}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox checked={editing.auto_print_orders} onChange={(e) => setEditing({ ...editing, auto_print_orders: e.target.checked })} /> Print accepted orders automatically
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> In use
              </label>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={Boolean(pairing)} onClose={() => setPairing(null)} title={pairing ? `Pair ${pairing.station.name}` : ''}>
        {pairing && (
          <div className="space-y-4 text-sm">
            <p className="text-center font-mono text-3xl font-semibold tracking-widest" aria-label="Pairing code">
              {pairing.code}
            </p>
            <p className="text-center text-xs text-ink-muted">Valid until {formatTime(pairing.expires_at)} (15 minutes), once.</p>
            <ol className="list-decimal space-y-1 pl-5 text-ink-muted">
              <li>On the Windows PC connected to this printer, install and open the TNBS Print Agent.</li>
              <li>Choose the printer and type this code.</li>
              <li>This page shows the printer as Online within a minute.</li>
            </ol>
            {pairing.station.is_paired && <p className="text-xs text-amber-700">Pairing again disconnects the agent that is paired now.</p>}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(unpairing)}
        onClose={() => setUnpairing(null)}
        onConfirm={async () => {
          if (!unpairing) return;
          try {
            await unpair(unpairing.id).unwrap();
            toast.success('Printer unpaired');
            setUnpairing(null);
          } catch (err) {
            toast.error('Could not unpair the printer', err);
          }
        }}
        loading={unpairState.isLoading}
        title={`Unpair ${unpairing?.name ?? ''}?`}
        description="Its print agent stops printing straight away. Jobs already sent to it wait until you pair it again or print them by hand."
        confirmLabel="Unpair"
        tone="danger"
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove(deleting.id).unwrap();
            toast.success('Printer deleted');
            setDeleting(null);
          } catch (err) {
            toast.error('Could not delete the printer', err);
          }
        }}
        loading={removeState.isLoading}
        title={`Delete ${deleting?.name ?? ''}?`}
        description="Its QR code stops working and its agent is disconnected."
        confirmLabel="Delete"
        tone="danger"
      />
    </Card>
  );
}
