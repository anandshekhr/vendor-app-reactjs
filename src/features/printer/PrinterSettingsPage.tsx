import { useState } from 'react';
import { CheckCircle2, Printer, RotateCcw, Usb, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Field, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useAppSelector } from '@/hooks/store';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { testDocument, type PaperSize } from '@/services/autoprint/document';
import { printDocument, runPrintJob, usePrintLog } from '@/services/autoprint/printer';
import { updatePrinterSettings, usePrinterSettings, type AutoPrintEvents, type PrinterConnection } from '@/services/autoprint/settings';
import { connectSerial, connectUsb, supportsSerial, supportsUsb } from '@/services/autoprint/transports';

const CONNECTIONS: { value: PrinterConnection; title: string; body: string; supported: () => boolean }[] = [
  {
    value: 'browser',
    title: 'Any printer (print dialog)',
    body: 'Uses the printers installed on this computer. The browser shows its print dialog each time — start Chrome/Edge with --kiosk-printing to print straight to the default printer.',
    supported: () => true,
  },
  {
    value: 'usb',
    title: 'USB thermal printer',
    body: 'Prints receipts and order slips directly, without a dialog. Chrome or Edge on a computer, or Chrome on Android with a USB-OTG cable.',
    supported: supportsUsb,
  },
  {
    value: 'serial',
    title: 'Serial / Bluetooth thermal printer',
    body: 'For printers on a COM port, including Bluetooth printers paired with the computer. Chrome or Edge on a computer.',
    supported: supportsSerial,
  },
];

const EVENTS: { key: keyof AutoPrintEvents; label: string; hint: string; needs: 'orders' | 'pos' | 'bookings' }[] = [
  { key: 'newOrder', label: 'New online order', hint: 'An order slip to start packing, as soon as the order arrives.', needs: 'orders' },
  { key: 'acceptedOrder', label: 'Order accepted', hint: 'An order slip when you accept an order.', needs: 'orders' },
  { key: 'posSale', label: 'POS sale completed', hint: 'The customer receipt, right after checkout.', needs: 'pos' },
  { key: 'newBooking', label: 'New booking', hint: 'A booking slip for the front desk.', needs: 'bookings' },
];

/** Per-device printer setup and automatic printing. */
export function PrinterSettingsPage() {
  const toast = useToast();
  const settings = usePrinterSettings();
  const business = useAppSelector((s) => s.auth.business);
  const { can } = useCapabilities();
  const log = usePrintLog();
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  const connect = async () => {
    setConnecting(true);
    try {
      const label = settings.connection === 'usb' ? await connectUsb() : await connectSerial(settings.baudRate);
      updatePrinterSettings({ deviceLabel: label });
      toast.success('Printer connected', label);
    } catch (err) {
      // Closing the browser's device picker is not an error worth shouting about.
      if (err instanceof Error && err.name === 'NotFoundError') return;
      toast.error('Could not connect the printer', err);
    } finally {
      setConnecting(false);
    }
  };

  const test = async () => {
    setTesting(true);
    const ok = await runPrintJob(`test:${Date.now()}`, () => testDocument(business, settings.paper), { auto: false });
    setTesting(false);
    if (ok) toast.success('Test page sent to the printer');
    else toast.error('Test print failed', 'See the print log below.');
  };

  const events = EVENTS.filter((e) => can(e.needs));

  return (
    <>
      <PageHeader
        backTo="/settings"
        title="Printer"
        description="Set up this device's printer and choose what prints automatically. Each counter or computer keeps its own setup."
        actions={
          <Button leftIcon={<Printer className="h-4 w-4" />} loading={testing} onClick={test}>
            Print test page
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Printer connection" />
          <CardBody className="space-y-3">
            <div role="radiogroup" aria-label="Printer connection" className="space-y-2">
              {CONNECTIONS.map((c) => {
                const supported = c.supported();
                const active = settings.connection === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!supported}
                    onClick={() => updatePrinterSettings({ connection: c.value, deviceLabel: undefined })}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      active ? 'border-brand bg-brand-50 dark:bg-brand-900/20' : 'border-line hover:bg-ink/[0.03]',
                      !supported && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 font-medium">
                      {c.title}
                      {!supported && <Badge>Not supported in this browser</Badge>}
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">{c.body}</span>
                  </button>
                );
              })}
            </div>
            {settings.connection !== 'browser' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-ink/[0.03] p-3 text-sm">
                <span>
                  {settings.deviceLabel ? (
                    <>
                      Connected: <span className="font-medium">{settings.deviceLabel}</span>
                    </>
                  ) : (
                    'No printer connected yet.'
                  )}
                </span>
                <Button size="sm" variant="outline" leftIcon={<Usb className="h-4 w-4" />} loading={connecting} onClick={connect}>
                  {settings.deviceLabel ? 'Change printer' : 'Connect printer'}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Paper and copies" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Paper" hint="Most receipt printers are 80 mm; small handheld ones are 58 mm.">
              <Select value={settings.paper} onChange={(e) => updatePrinterSettings({ paper: e.target.value as PaperSize })}>
                <option value="58mm">58 mm roll (32 characters)</option>
                <option value="80mm">80 mm roll (48 characters)</option>
                <option value="a4" disabled={settings.connection !== 'browser'}>
                  A4 sheet (print dialog only)
                </option>
              </Select>
            </Field>
            <Field label="Copies of each slip">
              <Select value={settings.copies} onChange={(e) => updatePrinterSettings({ copies: Number(e.target.value) })}>
                <option value={1}>1</option>
                <option value={2}>2 (e.g. one for the packer, one for the rider)</option>
                <option value={3}>3</option>
              </Select>
            </Field>
            {settings.connection === 'serial' && (
              <Field label="Baud rate" hint="Check the printer's self-test page if unsure.">
                <Select value={settings.baudRate} onChange={(e) => updatePrinterSettings({ baudRate: Number(e.target.value) })}>
                  {[9600, 19200, 38400, 57600, 115200].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {settings.connection !== 'browser' && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={settings.cut} onChange={(e) => updatePrinterSettings({ cut: e.target.checked })} />
                Cut the paper after each slip
              </label>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Automatic printing"
            description="Prints by itself while the portal is open on this device (also in a background tab). Each order prints once, even with several tabs open."
          />
          <CardBody className="space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={settings.autoPrint}
                onChange={(e) => updatePrinterSettings({ autoPrint: e.target.checked })}
                aria-describedby="autoprint-hint"
              />
              Print automatically on this device
            </label>
            <p id="autoprint-hint" className="text-xs text-ink-muted">
              {settings.connection === 'browser'
                ? 'With the print dialog, someone has to press Print each time unless Chrome runs with --kiosk-printing. A USB or serial thermal printer prints without any click.'
                : 'Thermal printing needs no clicks. Keep this tab open (it can be in the background).'}
            </p>
            <div className={cn('grid gap-3 sm:grid-cols-2', !settings.autoPrint && 'opacity-60')}>
              {events.map((e) => (
                <label key={e.key} className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    disabled={!settings.autoPrint}
                    checked={settings.events[e.key]}
                    onChange={(ev) => updatePrinterSettings({ events: { ...settings.events, [e.key]: ev.target.checked } })}
                  />
                  <span>
                    <span className="block font-medium">{e.label}</span>
                    <span className="text-xs text-ink-muted">{e.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Print log" description="The last 50 prints on this device." />
          <CardBody className="p-0">
            {log.length === 0 ? (
              <EmptyState icon={<Printer className="h-5 w-5" />} title="Nothing printed yet" description="Print a test page to check the setup." />
            ) : (
              <ul className="divide-y divide-line">
                {log.map((entry) => (
                  <li key={`${entry.key}-${entry.at}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      {entry.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Printed" /> : <XCircle className="h-4 w-4 text-red-600" aria-label="Failed" />}
                      <span className="font-medium">{entry.title}</span>
                      {entry.auto && <Badge>Auto</Badge>}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-ink-muted">
                      {entry.error && <span className="text-red-600">{entry.error}</span>}
                      {formatDateTime(entry.at)}
                      {entry.doc && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                          onClick={async () => {
                            try {
                              await printDocument(entry.doc!);
                              toast.success('Sent to the printer', entry.title);
                            } catch (err) {
                              toast.error('Could not print', err);
                            }
                          }}
                        >
                          Reprint
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
