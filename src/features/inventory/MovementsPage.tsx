import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Button, Card, Field, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { downloadCsv } from '@/utils/csv';
import { formatDateTime } from '@/utils/format';
import type { StockMovement, StockMovementType } from '@/types/api';
import { useListStockMovementsQuery } from './api';
import { SERVER_MOVEMENT_LABELS } from './movementTypes';

const PAGE_SIZE = 25;

function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

/** The server's stock history: every adjustment and POS sale, with who made it and why. */
export function MovementsPage() {
  const [type, setType] = useState<StockMovementType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useListStockMovementsQuery({ type, from, to, page, pageSize: PAGE_SIZE });
  const rows = data?.results;

  return (
    <>
      <PageHeader
        backTo="/inventory"
        title="Stock history"
        description="Every stock change in your shop — restocks, adjustments and POS sales — with who made it and why."
        actions={
          <Button
            variant="outline"
            disabled={!rows?.length}
            onClick={() =>
              downloadCsv('stock-history.csv', rows ?? [], [
                { header: 'Time', value: (r: StockMovement) => r.created_at },
                { header: 'Product', value: (r) => r.product_name },
                { header: 'Product ID', value: (r) => r.product_id },
                { header: 'Type', value: (r) => SERVER_MOVEMENT_LABELS[r.movement_type] ?? r.movement_type },
                { header: 'Change', value: (r) => r.delta },
                { header: 'Before', value: (r) => r.quantity_before },
                { header: 'After', value: (r) => r.quantity_after },
                { header: 'Reason', value: (r) => r.reason },
                { header: 'Reference', value: (r) => r.reference },
                { header: 'By', value: (r) => r.actor_name },
              ])
            }
          >
            Export this page
          </Button>
        }
      />
      <Card>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => { setType(e.target.value as StockMovementType | ''); setPage(1); }}>
              <option value="">All changes</option>
              {(Object.keys(SERVER_MOVEMENT_LABELS) as StockMovementType[]).map((t) => (
                <option key={t} value={t}>{SERVER_MOVEMENT_LABELS[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </Field>
        </div>
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <DataTable
            rows={rows}
            loading={isLoading || (isFetching && !rows)}
            rowKey={(r) => r.id}
            empty={<EmptyState icon={<History className="h-5 w-5" />} title="No stock changes" description="Restocks, adjustments and POS sales appear here." />}
            columns={[
              { key: 'at', header: 'Time', cell: (r) => formatDateTime(r.created_at) },
              { key: 'product', header: 'Product', cell: (r) => <span className="font-medium">{r.product_name}</span> },
              {
                key: 'type',
                header: 'Type',
                cell: (r) =>
                  r.vendor_order_id ? (
                    <Link className="text-brand hover:underline" to={`/pos/sales/${r.vendor_order_id}`}>
                      {SERVER_MOVEMENT_LABELS[r.movement_type] ?? r.movement_type}
                    </Link>
                  ) : (
                    SERVER_MOVEMENT_LABELS[r.movement_type] ?? r.movement_type
                  ),
              },
              { key: 'delta', header: 'Change', align: 'right', cell: (r) => <span className={r.delta < 0 ? 'font-medium tabular text-red-600' : 'font-medium tabular text-emerald-700'}>{signed(r.delta)}</span> },
              { key: 'level', header: 'Before → after', align: 'right', cell: (r) => `${r.quantity_before} → ${r.quantity_after}`, hideOnMobile: true },
              { key: 'reason', header: 'Reason', cell: (r) => r.reason || r.reference || '—', hideOnMobile: true },
              { key: 'by', header: 'By', cell: (r) => r.actor_name || '—', hideOnMobile: true },
            ]}
          />
        )}
        {data && <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      </Card>
    </>
  );
}
