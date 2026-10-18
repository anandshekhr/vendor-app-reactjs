import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Card, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/tables/Pagination';
import { downloadCsv } from '@/utils/csv';
import { useListTransactionsQuery } from './api';
import { TransactionsTable } from './TransactionsTable';

export function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, isFetching, error, refetch } = useListTransactionsQuery({ page });
  const rows = (data?.results ?? []).filter((t) => {
    if (type && t.transaction_type.toLowerCase() !== type) return false;
    const day = t.timestamp.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  return (
    <>
      <PageHeader
        backTo="/wallet"
        title="Transactions"
        description="Wallet credits and debits recorded by the server."
        actions={
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(`wallet-transactions-p${page}.csv`, rows, [
                { header: 'ID', value: (t) => t.id },
                { header: 'Timestamp', value: (t) => t.timestamp },
                { header: 'Type', value: (t) => t.transaction_type },
                { header: 'Amount', value: (t) => t.amount },
                { header: 'Description', value: (t) => t.description },
                { header: 'Reference', value: (t) => t.reference_id },
                { header: 'Balance after', value: (t) => t.balance_after },
              ])
            }
          >
            Export page
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <Select aria-label="Transaction type" value={type} onChange={(e) => setType(e.target.value)} className="w-40">
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="upi">UPI</option>
            <option value="net-banking">Net banking</option>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2" />
          </label>
          <p className="w-full text-xs text-ink-subtle">Filters apply to the current page (the server endpoint has no filter parameters).</p>
        </div>
        <TransactionsTable rows={data ? rows : undefined} loading={isLoading || isFetching} error={error} onRetry={refetch} />
        {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      </Card>
    </>
  );
}
