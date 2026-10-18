import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950">
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      You are offline. Data shown may be out of date. POS can record cash sales for later sync.
    </div>
  );
}
