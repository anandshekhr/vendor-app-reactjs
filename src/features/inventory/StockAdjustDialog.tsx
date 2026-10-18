import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, Dialog, Field, Input, Select } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { formatNumber } from '@/utils/format';
import type { StockUpdateResponse } from '@/types/api';
import { useUpdateStockMutation } from './api';
import { MOVEMENT_TYPES, movementSpec, recordJournal, validateAdjustment, type MovementType } from './movementTypes';

export interface AdjustTarget {
  id: number;
  name: string;
  sku?: string;
  barcode?: string | null;
  stock: number | null;
}

export function StockAdjustDialog({
  target,
  onClose,
  onDone,
  defaultType = 'restock',
}: {
  target: AdjustTarget | null;
  onClose: () => void;
  onDone?: (res: StockUpdateResponse) => void;
  defaultType?: MovementType;
}) {
  const toast = useToast();
  const [type, setType] = useState<MovementType>(defaultType);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StockUpdateResponse | null>(null);
  const [update, { isLoading }] = useUpdateStockMutation();

  const targetId = target?.id ?? null;
  useEffect(() => {
    if (targetId !== null) {
      setType(defaultType);
      setQuantity('');
      setReason('');
      setReference('');
      setError(null);
      setResult(null);
    }
  }, [targetId, defaultType]);

  if (!target) return null;
  const spec = movementSpec(type);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(quantity);
    const problem = validateAdjustment(spec, q, target.stock);
    if (problem) return setError(problem);
    if (spec.reasonRequired && reason.trim().length < 3) return setError('Add a short reason for this adjustment.');
    setError(null);
    try {
      const res = await update({ product_id: target.id, quantity: q, operation: spec.operation }).unwrap();
      await recordJournal(res, spec, q, reason.trim(), reference.trim()).catch(() => undefined);
      setResult(res);
      onDone?.(res);
      toast.success('Stock updated', `${res.product_name}: ${res.previous_stock} → ${res.new_stock}`);
    } catch (err) {
      toast.error('Stock update rejected', err);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={result ? 'Stock updated' : 'Adjust stock'}
      description={`${target.name}${target.sku ? ` · SKU ${target.sku}` : ''}${target.barcode ? ` · ${target.barcode}` : ''}`}
      footer={
        result ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="stock-adjust-form" loading={isLoading}>
              Confirm adjustment
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 text-center" role="status">
          <p className="text-sm text-ink-muted">Authoritative quantity from the server</p>
          <div className="flex items-center justify-center gap-4 text-2xl font-semibold tabular">
            <span className="text-ink-subtle">{formatNumber(result.previous_stock)}</span>
            <ArrowRight className="h-5 w-5 text-ink-subtle" aria-hidden />
            <span>{formatNumber(result.new_stock)}</span>
          </div>
          <p className="text-sm">
            Change: <span className="font-medium">{result.change > 0 ? `+${result.change}` : result.change}</span>
          </p>
        </div>
      ) : (
        <form id="stock-adjust-form" onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm">
            Current stock (last loaded): <span className="font-semibold">{target.stock === null ? 'unknown' : formatNumber(target.stock)}</span>
          </p>
          <Field label="Movement type" hint={spec.description}>
            <Select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
              {MOVEMENT_TYPES.map((m) => (
                <option key={m.type} value={m.type}>
                  {m.label}
                </option>
              ))}
              <option disabled>Transfer between locations — not supported</option>
            </Select>
          </Field>
          <Field label={spec.operation === 'set' ? 'Counted quantity' : 'Quantity'} required>
            <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} data-autofocus />
          </Field>
          <Field label="Reason" required={spec.reasonRequired} hint="Stored on this device only until the server keeps a stock ledger.">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          </Field>
          <Field label="Reference (invoice / batch no.)">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      )}
    </Dialog>
  );
}
