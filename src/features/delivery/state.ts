import type { VendorOrderStatus } from '@/types/api';

export type DeliveryStage = 'not_ready' | 'awaiting_pickup' | 'in_transit' | 'delivered' | 'cancelled' | 'in_store';

export interface DeliveryStageInfo {
  stage: DeliveryStage;
  label: string;
  description: string;
}

/**
 * Derives the delivery stage from the vendor order status — the only delivery signal the backend exposes to vendors
 * today (API_MAPPING G-6). Partner identity, assignment acceptance, ETA and live location are not derivable and are
 * never guessed.
 */
export function deliveryStage(status: VendorOrderStatus, source?: 'online' | 'pos'): DeliveryStageInfo {
  if (source === 'pos') return { stage: 'in_store', label: 'In-store sale', description: 'Handed over at the counter.' };
  switch (status) {
    case 'created':
    case 'accepted':
    case 'preparing':
    case 'processing':
      return { stage: 'not_ready', label: 'Preparing', description: 'Mark the order ready for pickup to request a delivery partner.' };
    case 'ready-for-pickup':
      return { stage: 'awaiting_pickup', label: 'Awaiting pickup', description: 'Waiting for a delivery partner to collect the order.' };
    case 'out-for-delivery':
      return { stage: 'in_transit', label: 'In transit', description: 'A delivery partner has picked up the order.' };
    case 'delivered':
      return { stage: 'delivered', label: 'Delivered', description: 'The order was delivered to the customer.' };
    case 'rejected':
    case 'cancelled':
    default:
      return { stage: 'cancelled', label: 'Cancelled', description: 'No delivery will take place.' };
  }
}

export const DELIVERY_STEPS: { stage: DeliveryStage; label: string }[] = [
  { stage: 'not_ready', label: 'Preparing' },
  { stage: 'awaiting_pickup', label: 'Awaiting pickup' },
  { stage: 'in_transit', label: 'In transit' },
  { stage: 'delivered', label: 'Delivered' },
];
