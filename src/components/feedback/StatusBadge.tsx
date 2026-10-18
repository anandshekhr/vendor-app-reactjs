import { Badge, type BadgeTone } from '@/components/ui';
import { titleCase } from '@/utils/format';

const TONES: Record<string, BadgeTone> = {
  // vendor orders
  created: 'warning',
  accepted: 'info',
  preparing: 'purple',
  processing: 'purple',
  'ready-for-pickup': 'brand',
  'out-for-delivery': 'info',
  delivered: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  // bookings
  scheduled: 'info',
  in_progress: 'purple',
  completed: 'success',
  // payments
  paid: 'success',
  pending: 'warning',
  partially_paid: 'warning',
  refunded: 'neutral',
  failed: 'danger',
  unpaid: 'warning',
  // withdrawals
  // (pending / processing / completed / rejected covered above)
  // availability
  active: 'success',
  inactive: 'neutral',
  verified: 'success',
  unverified: 'warning',
  // offline sales
  synced: 'success',
  syncing: 'info',
  conflict: 'danger',
  unknown: 'warning',
};

const LABELS: Record<string, string> = {
  created: 'Pending confirmation',
  'ready-for-pickup': 'Ready for pickup',
  'out-for-delivery': 'Out for delivery',
  unknown: 'Needs review',
  pending_sync: 'Pending sync',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase();
  return (
    <Badge tone={TONES[key] ?? 'neutral'} dot>
      {label ?? LABELS[key] ?? titleCase(status)}
    </Badge>
  );
}
