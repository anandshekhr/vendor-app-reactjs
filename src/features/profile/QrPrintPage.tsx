import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { cn } from '@/utils/cn';
import { useGetShopQrQuery } from './api';
import { QrSticker, type StickerSize } from './QrSticker';

type Layout = 'poster' | 'cards' | 'stickers';

const LAYOUTS: { value: Layout; label: string; hint: string; size: StickerSize }[] = [
  { value: 'poster', label: 'A4 poster', hint: 'One large QR per page — for the counter or door', size: 'poster' },
  { value: 'cards', label: 'A4 · 4 cards', hint: 'Four 9 cm cards per page — for tables', size: 'card' },
  { value: 'stickers', label: 'A4 · 8 stickers', hint: 'Eight small stickers per page', size: 'small' },
];

/** Full-page print layout for the shop's QR code(s). */
export function QrPrintPage() {
  const [params] = useSearchParams();
  const only = params.get('code');
  const [layout, setLayout] = useState<Layout>('poster');
  const [copies, setCopies] = useState(1);
  const { data, isLoading, error, refetch } = useGetShopQrQuery();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '@page { size: A4; margin: 10mm; }';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !data) return <Skeleton className="m-6 h-96" />;
  const codes = data.codes.filter((c) => !only || c.code === only);
  const spec = LAYOUTS.find((l) => l.value === layout)!;
  const items = codes.flatMap((c) => Array.from({ length: copies }, (_, i) => ({ c, key: `${c.code}-${i}` })));

  return (
    <div className="min-h-full bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-[210mm] space-y-3 px-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/profile/qr">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <Button onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />} disabled={!items.length}>
            Print
          </Button>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Print layout">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={layout === l.value}
              onClick={() => setLayout(l.value)}
              className={cn('rounded-md border px-3 py-2 text-left text-sm', layout === l.value ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line bg-surface')}
            >
              <span className="block font-medium">{l.label}</span>
              <span className="block text-xs text-ink-muted">{l.hint}</span>
            </button>
          ))}
          <label className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm">
            Copies
            <input type="number" min={1} max={40} value={copies} onChange={(e) => setCopies(Math.min(40, Math.max(1, Number(e.target.value) || 1)))} className="w-14 rounded border border-line bg-surface px-1 py-1" />
          </label>
        </div>
        <p className="text-xs text-ink-subtle">In the print dialog choose Scale: 100% and turn off headers/footers for exact sizes.</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No QR codes to print" />
      ) : (
        <div
          className={cn(
            'print-area print-a4 mx-auto max-w-[210mm] bg-white p-4 print:max-w-none print:p-0',
            layout === 'poster' && 'flex flex-col items-center gap-8 print:gap-0',
            layout === 'cards' && 'grid grid-cols-2 justify-items-center gap-6',
            layout === 'stickers' && 'grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 print:grid-cols-3',
          )}
        >
          {items.map(({ c, key }) => (
            <div key={key} className={cn(layout === 'poster' && 'flex min-h-[260mm] items-center justify-center [break-after:page] last:[break-after:auto]')}>
              <QrSticker shopName={data.shop.name} qrSvg={c.qr_svg} code={c.code} tableNumber={c.table_number} size={spec.size} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
