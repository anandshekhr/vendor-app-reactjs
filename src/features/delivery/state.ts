import type { DeliveryState, VendorOrderStatus } from '@/types/api';

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

/** Labels/tones for the delivery-platform rider-search state (api-services vendor_delivery.VendorDeliveryState). */
export const DELIVERY_STATE_INFO: Record<DeliveryState, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'purple'; description: string }> = {
  not_requested: { label: 'Not requested', tone: 'neutral', description: 'A rider is requested when the order is marked ready for pickup.' },
  starting: { label: 'Requesting rider', tone: 'info', description: 'The delivery request is being created.' },
  searching: { label: 'Searching for rider', tone: 'info', description: 'Looking for an available rider near your shop.' },
  not_found: { label: 'No rider found', tone: 'warning', description: 'Nobody eligible is nearby right now. You can search again.' },
  rider_found: { label: 'Rider found', tone: 'purple', description: 'A rider was offered the delivery and has not accepted yet.' },
  assigned: { label: 'Rider assigned', tone: 'success', description: 'The rider accepted and is heading to your shop.' },
  picked_up: { label: 'Picked up', tone: 'success', description: 'The rider has the order and is on the way to the customer.' },
  delivered: { label: 'Delivered', tone: 'success', description: 'Delivered to the customer.' },
  stopped: { label: 'Search stopped', tone: 'neutral', description: 'You stopped the rider search. The order stays ready for pickup.' },
  cancelled: { label: 'Cancelled by delivery service', tone: 'danger', description: 'The delivery was cancelled on the delivery platform.' },
  failed: { label: 'Delivery failed', tone: 'danger', description: 'The delivery failed after pickup.' },
  error: { label: 'Delivery service unreachable', tone: 'danger', description: 'The delivery request could not be created. Try searching again.' },
};
