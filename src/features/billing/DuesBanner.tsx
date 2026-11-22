import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { useGetBillingQuery } from './api';

/** Across the portal: the shop has stopped taking orders because subscription dues are overdue. */
export function DuesBanner() {
  const { pathname } = useLocation();
  const { data } = useGetBillingQuery(undefined, { pollingInterval: 10 * 60_000, skipPollingIfUnfocused: true });
  if (!data?.paused || pathname.startsWith('/billing')) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm text-white">
      <AlertTriangle className="h-4 w-4" />
      Your shop is not taking orders: {formatCurrency(data.due)} subscription is overdue.
      <Link to="/billing" className="font-semibold underline">
        Pay now
      </Link>
    </div>
  );
}
