import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useListWithdrawalsQuery } from '@/features/wallet/api';
import { NewWithdrawalDialog } from './NewWithdrawalDialog';

export function WithdrawalsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const open = params.get('new') === '1';
  const { data, isLoading, isFetching, error, refetch } = useListWithdrawalsQuery({ page });
  return (
    <>
      <PageHeader
        backTo="/wallet"
        title="Withdrawals"
        description="Payout requests and their status."
        actions={
          <Button leftIcon={<ArrowDownToLine className="h-4 w-4" />} onClick={() => setParams({ new: '1' })}>
            New withdrawal
          </Button>
        }
      />
      <Card>
        <DataTable
          rows={data?.results}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(w) => w.id}
          onRowClick={(w) => navigate(`/wallet/withdrawals/${w.id}`)}
          empty={<EmptyState icon={<ArrowDownToLine className="h-5 w-5" />} title="No withdrawals yet" />}
          columns={[
            { key: 'id', header: 'Request', cell: (w) => <span className="font-medium">#{w.id}</span> },
            { key: 'date', header: 'Requested', cell: (w) => formatDateTime(w.created_at) },
            { key: 'amount', header: 'Amount', align: 'right', cell: (w) => formatCurrency(w.amount) },
            { key: 'bank', header: 'Account', cell: (w) => `${w.bank_name ?? '—'} ${w.account_masked}`, hideOnMobile: true },
            { key: 'status', header: 'Status', cell: (w) => <StatusBadge status={w.status} label={w.status_display} /> },
            { key: 'ref', header: 'Reference', cell: (w) => w.transaction_id || '—', hideOnMobile: true },
          ]}
        />
        {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      </Card>
      <NewWithdrawalDialog open={open} onClose={() => setParams({})} />
    </>
  );
}
