import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, PackagePlus, ScanBarcode } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Badge, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/hooks/useToast';
import { useCapabilities } from '@/hooks/useCapabilities';
import { isApiError, type ApiError } from '@/services/api/errors';
import { formatCurrency, formatNumber, formatTime } from '@/utils/format';
import type { ScannedProduct } from '@/types/api';
import { useLazyScanBarcodeQuery } from '@/features/products/api';
import { StockAdjustDialog } from '@/features/inventory/StockAdjustDialog';
import { BarcodeScanner } from './BarcodeScanner';

type ScanState = { kind: 'idle' } | { kind: 'loading'; code: string } | { kind: 'found'; code: string; product: ScannedProduct } | { kind: 'unknown'; code: string } | { kind: 'error'; code: string; error: ApiError };

interface HistoryEntry {
  code: string;
  at: number;
  result: string;
}

export function ScannerPage() {
  const toast = useToast();
  const { can } = useCapabilities();
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [adjusting, setAdjusting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lookup] = useLazyScanBarcodeQuery();

  const log = (code: string, result: string) => setHistory((h) => [{ code, at: Date.now(), result }, ...h].slice(0, 15));

  const handleScan = async (code: string) => {
    if (adjusting) {
      toast.info('Finish the current adjustment first', `Ignored scan ${code}`);
      return;
    }
    if (state.kind === 'found' && state.code === code) {
      // Duplicate scan of the product already on screen: open the adjustment instead of re-querying.
      setAdjusting(true);
      return;
    }
    setState({ kind: 'loading', code });
    const res = await lookup(code);
    if (res.data) {
      setState({ kind: 'found', code, product: res.data });
      log(code, res.data.name);
    } else if (isApiError(res.error) && res.error.status === 404) {
      setState({ kind: 'unknown', code });
      log(code, 'Unknown barcode');
    } else {
      setState({ kind: 'error', code, error: res.error as ApiError });
      log(code, 'Lookup failed');
    }
  };

  return (
    <>
      <PageHeader title="Scan stock" description="Scan a product to receive stock, write off damaged units or correct a count." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Scanner" />
          <CardBody>
            <BarcodeScanner onScan={handleScan} disabled={adjusting} />
          </CardBody>
        </Card>
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Scanned product" />
            <CardBody>
              {state.kind === 'idle' && <EmptyState icon={<ScanBarcode className="h-5 w-5" />} title="Waiting for a scan" />}
              {state.kind === 'loading' && (
                <div className="flex items-center gap-3 py-6">
                  <Spinner /> <span className="text-sm text-ink-muted">Looking up {state.code}…</span>
                </div>
              )}
              {state.kind === 'error' && <ErrorState error={state.error} onRetry={() => handleScan(state.code)} title={`Lookup failed for ${state.code}`} />}
              {state.kind === 'unknown' && (
                <EmptyState
                  icon={<CircleHelp className="h-5 w-5" />}
                  title="Unknown barcode"
                  description={`${state.code} is not linked to any product in your shop.`}
                  action={
                    can('products') ? (
                      <Link to={`/products/new?barcode=${encodeURIComponent(state.code)}`}>
                        <Button leftIcon={<PackagePlus className="h-4 w-4" />}>Create product with this barcode</Button>
                      </Link>
                    ) : undefined
                  }
                />
              )}
              {state.kind === 'found' && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    {state.product.image && <img src={state.product.image} alt="" className="h-16 w-16 rounded-md border border-line object-cover" />}
                    <div className="min-w-0">
                      <p className="font-semibold">{state.product.name}</p>
                      <p className="text-xs text-ink-subtle">
                        SKU {state.product.sku} · {state.product.barcode}
                      </p>
                      <p className="mt-1 text-sm">{formatCurrency(state.product.final_price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-ink/[0.03] p-3">
                    <span className="text-sm text-ink-muted">Stock on server</span>
                    <span className="text-xl font-semibold tabular">{formatNumber(state.product.stock)}</span>
                  </div>
                  <Button className="w-full" onClick={() => setAdjusting(true)}>
                    Adjust stock
                  </Button>
                  <p className="text-xs text-ink-subtle">Scanning the same barcode again also opens the adjustment.</p>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="This session" />
            {history.length === 0 ? (
              <CardBody>
                <p className="text-sm text-ink-muted">No scans yet.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-line">
                {history.map((h) => (
                  <li key={`${h.code}-${h.at}`} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                    <span className="font-mono text-xs">{h.code}</span>
                    <span className="truncate text-ink-muted">{h.result}</span>
                    <Badge>{formatTime(h.at)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <StockAdjustDialog
        target={adjusting && state.kind === 'found' ? { id: state.product.id, name: state.product.name, sku: state.product.sku, barcode: state.product.barcode, stock: state.product.stock } : null}
        onClose={() => setAdjusting(false)}
        onDone={(res) => state.kind === 'found' && setState({ ...state, product: { ...state.product, stock: res.new_stock } })}
      />
    </>
  );
}
