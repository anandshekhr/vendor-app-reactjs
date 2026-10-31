import { Store, Truck } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { PrintFulfilmentType, PrintOrderStatus } from '@/types/api';
import { FULFILMENT_TEXT, PRINT_STATUS_TONE } from './printOrderView';

export function PrintStatusBadge({ status, label }: { status: PrintOrderStatus; label: string }) {
  return (
    <Badge tone={PRINT_STATUS_TONE[status] ?? 'neutral'} dot>
      {label}
    </Badge>
  );
}

/** Delivery vs pickup, always shown with an icon so it's recognisable at a glance in the queue. */
export function FulfilmentBadge({ type }: { type: PrintFulfilmentType }) {
  const Icon = type === 'DELIVERY' ? Truck : Store;
  return (
    <Badge tone={type === 'DELIVERY' ? 'info' : 'purple'}>
      <Icon className="h-3 w-3" aria-hidden /> {FULFILMENT_TEXT[type].label}
    </Badge>
  );
}
