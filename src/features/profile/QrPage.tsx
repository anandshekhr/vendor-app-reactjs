import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Download, ExternalLink, Plus, Printer, QrCode } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Dialog, Field, Input, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useAppSelector } from '@/hooks/store';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/services/api/errors';
import { formatDateTime, formatRelative } from '@/utils/format';
import type { ShopQrCode } from '@/types/api';
import { useCreateShopQrMutation, useGetShopQrQuery } from './api';
import { QrSticker } from './QrSticker';

function downloadDataUri(uri: string, filename: string) {
  const a = document.createElement('a');
  a.href = uri;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function QrPage() {
  const toast = useToast();
  const business = useAppSelector((s) => s.auth.business);
  const { data, isLoading, error, refetch } = useGetShopQrQuery();
  const [create, createState] = useCreateShopQrMutation();
  const [newOpen, setNewOpen] = useState(false);
  const [table, setTable] = useState('');
  const shopName = data?.shop.name ?? business?.shopName ?? '';

  const createCode = async (tableNumber = '') => {
    try {
      await create({ table_number: tableNumber.trim() || undefined }).unwrap();
      toast.success('QR code created', tableNumber ? `For table ${tableNumber}` : 'Print it and place it at your counter.');
      setNewOpen(false);
      setTable('');
    } catch (err) {
      toast.error('Could not create QR code', err);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  if (error) {
    if (isApiError(error) && error.status === 404) {
      return (
        <>
          <PageHeader title="Shop QR code" />
          <BackendGap gap="QR" title="Your API server does not have the shop QR endpoint yet">
            Deploy the api-services vendor-portal update (<span className="font-mono">/vendor/dashboard/api/store/qr/</span>) to create and print QR codes here.
          </BackendGap>
        </>
      );
    }
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const codes = data?.codes ?? [];
  const atLimit = data ? codes.length >= data.max_codes : false;

  return (
    <>
      <PageHeader
        title="Shop QR code"
        description="Customers scan it to open your shop on TheNearByShop and order. Print it for your counter, door or tables."
        actions={
          codes.length > 0 ? (
            <>
              <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)} disabled={atLimit}>
                Add a QR (e.g. per table)
              </Button>
              <Link to="/profile/qr/print">
                <Button leftIcon={<Printer className="h-4 w-4" />}>Print all</Button>
              </Link>
            </>
          ) : undefined
        }
      />
      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : codes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<QrCode className="h-5 w-5" />}
            title="You don't have a shop QR code yet"
            description="Create one in a click. It points to your shop page and keeps working even if your shop link changes."
            action={
              <Button onClick={() => createCode()} loading={createState.isLoading} leftIcon={<QrCode className="h-4 w-4" />}>
                Create my shop QR code
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {codes.map((c: ShopQrCode) => (
            <Card key={c.code}>
              <CardHeader
                title={c.table_number ? `Table ${c.table_number}` : 'Shop QR'}
                description={`Code ${c.code}`}
                actions={<Badge tone={c.scan_count ? 'success' : 'neutral'}>{c.scan_count} scan{c.scan_count === 1 ? '' : 's'}</Badge>}
              />
              <CardBody className="space-y-4">
                <div className="flex justify-center rounded-lg bg-ink/[0.03] p-4">
                  <QrSticker shopName={shopName} qrSvg={c.qr_svg} code={c.code} tableNumber={c.table_number} size="small" />
                </div>
                <dl className="space-y-1 text-xs text-ink-muted">
                  <div className="flex justify-between gap-2">
                    <dt>Created</dt>
                    <dd>{formatDateTime(c.assigned_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Last scanned</dt>
                    <dd>{c.last_scanned_at ? formatRelative(c.last_scanned_at) : 'Never'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Scan link</dt>
                    <dd className="truncate font-mono">{c.scan_url}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/profile/qr/print?code=${c.code}`}>
                    <Button size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />}>
                      Print
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadDataUri(c.qr_svg, `${shopName || 'shop'}-${c.code}.svg`)}>
                    Download SVG
                  </Button>
                  <Button size="sm" variant="ghost" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(c.scan_url)}>
                    Copy link
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      {data?.shop_url && (
        <p className="mt-4 flex items-center gap-1 text-sm text-ink-muted">
          Scans open your shop page:
          <a href={data.shop_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
            {data.shop_url.split('?')[0]} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </p>
      )}
      {atLimit && <p className="mt-2 text-xs text-ink-subtle">You have reached the limit of {data?.max_codes} QR codes.</p>}
      <Dialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Add a QR code"
        description="Use a separate code per table or counter. Orders scanned from it carry the table number."
        footer={
          <>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createCode(table)} loading={createState.isLoading}>
              Create QR code
            </Button>
          </>
        }
      >
        <Field label="Table or counter number (optional)" hint="Up to 10 characters, e.g. 4 or T12.">
          <Input value={table} maxLength={10} onChange={(e) => setTable(e.target.value)} data-autofocus />
        </Field>
      </Dialog>
    </>
  );
}
