import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, Clock, Landmark, Wallet } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useGetBalanceBreakdownQuery, useGetWalletQuery } from './api';
import { TransactionsTable } from './TransactionsTable';

export function WalletPage() {
  const navigate = useNavigate();
  const breakdown = useGetBalanceBreakdownQuery();
  const wallet = useGetWalletQuery();
  const b = breakdown.data;
  return (
    <>
      <PageHeader
        title="Wallet"
        description="Balances are maintained by TheNearByShop. The portal never changes them directly."
        actions={
          <>
            <Link to="/bank-accounts">
              <Button variant="outline" leftIcon={<Landmark className="h-4 w-4" />}>
                Bank accounts
              </Button>
            </Link>
            <Button leftIcon={<ArrowDownToLine className="h-4 w-4" />} onClick={() => navigate('/wallet/withdrawals?new=1')}>
              Withdraw
            </Button>
          </>
        }
      />
      {breakdown.error ? (
        <ErrorState error={breakdown.error} onRetry={breakdown.refetch} />
      ) : (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Wallet balance" value={b ? `₹${Number(b.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'} icon={<Wallet className="h-4 w-4" />} loading={breakdown.isLoading} hint="Net amount credited to you" />
          <StatCard
            label="Available to withdraw"
            value={b ? `₹${Number(b.available_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
            icon={<ArrowDownToLine className="h-4 w-4" />}
            loading={breakdown.isLoading}
            tone="success"
            hint="Balance minus withdrawals in progress"
          />
          <StatCard
            label="Withdrawals in progress"
            value={b ? `₹${Number(b.pending_withdrawals).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
            icon={<Clock className="h-4 w-4" />}
            loading={breakdown.isLoading}
            to="/wallet/withdrawals"
          />
        </div>
      )}
      <BackendGap className="mb-5" gap="G-4" title="Total earnings, total withdrawn and refund/adjustment totals are not provided by the server">
        They are not computed in the browser from partial lists, to avoid showing inaccurate financial figures.
      </BackendGap>
      <Card>
        <CardHeader
          title="Recent transactions"
          actions={
            <Link to="/wallet/transactions">
              <Button variant="ghost" size="sm">
                Full history
              </Button>
            </Link>
          }
        />
        <TransactionsTable rows={wallet.data?.transactions.slice(0, 10)} loading={wallet.isLoading} error={wallet.error} onRetry={wallet.refetch} />
      </Card>
    </>
  );
}
