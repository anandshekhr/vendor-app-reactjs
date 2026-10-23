import { Bike, Phone, RefreshCw, Square } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { formatRelative, titleCase } from '@/utils/format';
import type { DeliverySummary } from '@/types/api';
import { useRetryRiderSearchMutation, useStopRiderSearchMutation } from './api';
import { DELIVERY_STATE_INFO } from './state';

/** Live rider-search state for one vendor order, with the retry/stop actions the server allows. */
export function DeliveryStatusCard({ vendorOrderId, delivery }: { vendorOrderId: number; delivery: DeliverySummary }) {
  const toast = useToast();
  const [retry, retryState] = useRetryRiderSearchMutation();
  const [stop, stopState] = useStopRiderSearchMutation();
  const info = DELIVERY_STATE_INFO[delivery.state] ?? DELIVERY_STATE_INFO.searching;

  const run = async (fn: typeof retry, label: string) => {
    try {
      const res = await fn(vendorOrderId).unwrap();
      toast.success(label, DELIVERY_STATE_INFO[res.delivery.state]?.label);
    } catch (err) {
      toast.error(`${label} failed`, err);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone={info.tone} dot>
            {info.label}
          </Badge>
          {delivery.platform_status && <span className="text-xs text-ink-subtle">({titleCase(delivery.platform_status)})</span>}
        </div>
        {delivery.updated_at && <span className="text-xs text-ink-subtle">Updated {formatRelative(delivery.updated_at)}</span>}
      </div>
      <p className="text-sm text-ink-muted">{info.description}</p>
      {delivery.rider && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-ink/[0.03] p-2 text-sm">
          <Bike className="h-4 w-4 text-ink-subtle" aria-hidden />
          <span className="font-medium">{delivery.rider.name}</span>
          {delivery.rider.vehicle_type && <span className="text-ink-muted">{titleCase(delivery.rider.vehicle_type)}</span>}
          {delivery.rider.phone && (
            <a href={`tel:${delivery.rider.phone}`} className="ml-auto inline-flex items-center gap-1 text-brand-700 hover:underline">
              <Phone className="h-3.5 w-3.5" /> {delivery.rider.phone}
            </a>
          )}
        </div>
      )}
      {(delivery.can_retry || delivery.can_stop) && (
        <div className="flex flex-wrap gap-2">
          {delivery.can_retry && (
            <Button size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={retryState.isLoading} onClick={() => run(retry, 'Rider search restarted')}>
              Search for a rider again
            </Button>
          )}
          {delivery.can_stop && (
            <Button size="sm" variant="outline" leftIcon={<Square className="h-3.5 w-3.5" />} loading={stopState.isLoading} onClick={() => run(stop, 'Rider search stopped')}>
              Stop searching
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
