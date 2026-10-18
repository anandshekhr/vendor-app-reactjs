import { History } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db, type StockJournalEntry } from '@/services/offline/db';
import { downloadCsv } from '@/utils/csv';
import { formatDateTime, titleCase } from '@/utils/format';

export function MovementsPage() {
  const rows = useLiveQuery<StockJournalEntry[] | undefined>(() => db.stockJournal.orderBy('at').reverse().limit(500).toArray(), [], undefined);
  return (
    <>
      <PageHeader
        backTo="/inventory"
        title="Stock adjustment log"
        description="Adjustments made from this browser, with the server's before/after quantities."
        actions={
          <Button
            variant="outline"
            disabled={!rows?.length}
            onClick={() =>
              downloadCsv('stock-adjustments.csv', rows ?? [], [
                { header: 'Time', value: (r) => new Date(r.at).toISOString() },
                { header: 'Product', value: (r) => r.productName },
                { header: 'Product ID', value: (r) => r.productId },
                { header: 'Type', value: (r) => r.movementType },
                { header: 'Operation', value: (r) => r.operation },
                { header: 'Quantity', value: (r) => r.quantity },
                { header: 'Previous', value: (r) => r.previousStock },
                { header: 'New', value: (r) => r.newStock },
                { header: 'Reason', value: (r) => r.reason },
                { header: 'Reference', value: (r) => r.reference },
              ])
            }
          >
            Export CSV
          </Button>
        }
      />
      <BackendGap className="mb-5" gap="G-8" title="This is not an audit ledger">
        The server does not keep stock movement history. This log only covers this browser, is cleared on sign-out, and excludes sales and changes made elsewhere.
      </BackendGap>
      <Card>
        <CardHeader title="Recent adjustments" />
        <DataTable
          rows={rows}
          loading={rows === undefined}
          rowKey={(r) => r.id ?? r.at}
          empty={<EmptyState icon={<History className="h-5 w-5" />} title="No adjustments recorded on this device" />}
          columns={[
            { key: 'at', header: 'Time', cell: (r) => formatDateTime(r.at) },
            { key: 'product', header: 'Product', cell: (r) => <span className="font-medium">{r.productName}</span> },
            { key: 'type', header: 'Type', cell: (r) => titleCase(r.movementType) },
            { key: 'qty', header: 'Qty', align: 'right', cell: (r) => (r.operation === 'set' ? `= ${r.quantity}` : r.operation === 'add' ? `+${r.quantity}` : `−${r.quantity}`) },
            { key: 'change', header: 'Before → after', align: 'right', cell: (r) => `${r.previousStock} → ${r.newStock}`, hideOnMobile: true },
            { key: 'reason', header: 'Reason', cell: (r) => r.reason || '—', hideOnMobile: true },
            { key: 'ref', header: 'Reference', cell: (r) => r.reference || '—', hideOnMobile: true },
          ]}
        />
      </Card>
    </>
  );
}
