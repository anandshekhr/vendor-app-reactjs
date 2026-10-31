import { useState } from 'react';
import { KeyRound, ScanLine } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';
import { BarcodeScanner } from '@/features/scanner/BarcodeScanner';
import { isApiError } from '@/services/api/errors';
import type { PrintOrderDetail } from '@/types/api';
import { useVerifyAnyPickupMutation, useVerifyPrintPickupMutation } from './api';
import { parsePickupInput } from './printOrderView';

interface Props {
  /** Verify this order only; omit for counter mode (finds the order from the code or QR). */
  orderId?: string;
  onVerified: (order: PrintOrderDetail) => void;
  autoStartCamera?: boolean;
}

/**
 * The customer shows a 6-digit code or a QR code from their app. Typed codes, camera scans and USB/Bluetooth
 * scanners all end up here; the server checks the code, so nothing is matched in the browser.
 */
export function PickupVerifyPanel({ orderId, onVerified, autoStartCamera = false }: Props) {
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(autoStartCamera);
  const [error, setError] = useState<string>();
  const [verifyOne, oneState] = useVerifyPrintPickupMutation();
  const [verifyAny, anyState] = useVerifyAnyPickupMutation();
  const loading = oneState.isLoading || anyState.isLoading;

  const submit = async (raw: string) => {
    const parsed = parsePickupInput(raw);
    if (!parsed) {
      setError('Enter the 6-digit pickup code, or scan the QR code in the customer’s app.');
      return;
    }
    setError(undefined);
    try {
      const order = orderId ? await verifyOne({ id: orderId, ...parsed }).unwrap() : await verifyAny(parsed).unwrap();
      setCode('');
      setScanning(false);
      onVerified(order);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not verify the code.');
    }
  };

  return (
    <div className="space-y-3">
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <Field label="Pickup code" className="flex-1" hint="6 digits, shown in the customer’s app">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center text-lg tracking-[0.4em] tabular"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <Button type="submit" loading={loading} disabled={code.length !== 6} leftIcon={<KeyRound className="h-4 w-4" />}>
          Verify
        </Button>
      </form>
      <Button variant="outline" size="sm" leftIcon={<ScanLine className="h-4 w-4" />} onClick={() => setScanning((s) => !s)}>
        {scanning ? 'Hide QR scanner' : 'Scan pickup QR'}
      </Button>
      {scanning && <BarcodeScanner compact autoStartCamera onScan={(value) => void submit(value)} disabled={loading} />}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
