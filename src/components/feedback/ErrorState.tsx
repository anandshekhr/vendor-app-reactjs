import { AlertTriangle, RefreshCw, ShieldOff, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui';
import { errorMessage, isApiError } from '@/services/api/errors';

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const apiErr = isApiError(error) ? error : null;
  const forbidden = apiErr?.status === 403;
  const offline = apiErr?.isNetworkError;
  const Icon = forbidden ? ShieldOff : offline ? WifiOff : AlertTriangle;
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/30">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-ink">
        {title ?? (forbidden ? 'Access denied' : offline ? 'Connection problem' : 'Could not load data')}
      </h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{errorMessage(error)}</p>
      {onRetry && !forbidden && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Try again
        </Button>
      )}
    </div>
  );
}
