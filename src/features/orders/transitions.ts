import type { OrderAction, VendorOrderStatus } from '@/types/api';

/**
 * Mirrors VENDOR_ORDER_TRANSITIONS in api-services/src/orders/services/order_service.py.
 * Used only to decide which buttons to show; the server validates every transition.
 */
export const VENDOR_ORDER_TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  created: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['processing', 'ready-for-pickup', 'cancelled'],
  processing: ['ready-for-pickup', 'cancelled'],
  'ready-for-pickup': ['cancelled'],
  'out-for-delivery': [],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export interface ActionSpec {
  action: OrderAction;
  to: VendorOrderStatus;
  label: string;
  tone: 'primary' | 'outline' | 'danger';
  /** Destructive / customer-visible actions require confirmation. */
  confirm: boolean;
  requiresNote?: boolean;
}

const ACTIONS: Record<VendorOrderStatus, ActionSpec | undefined> = {
  accepted: { action: 'accept', to: 'accepted', label: 'Accept order', tone: 'primary', confirm: true },
  rejected: { action: 'reject', to: 'rejected', label: 'Reject', tone: 'danger', confirm: true, requiresNote: true },
  preparing: { action: 'mark_preparing', to: 'preparing', label: 'Start preparing', tone: 'primary', confirm: false },
  processing: { action: 'mark_processing', to: 'processing', label: 'Mark processing', tone: 'outline', confirm: false },
  'ready-for-pickup': { action: 'mark_ready', to: 'ready-for-pickup', label: 'Ready for pickup', tone: 'primary', confirm: true },
  cancelled: { action: 'cancel', to: 'cancelled', label: 'Cancel order', tone: 'danger', confirm: true, requiresNote: true },
  created: undefined,
  'out-for-delivery': undefined,
  delivered: undefined,
};

export function allowedActions(status: VendorOrderStatus): ActionSpec[] {
  return (VENDOR_ORDER_TRANSITIONS[status] ?? []).map((to) => ACTIONS[to]).filter((a): a is ActionSpec => Boolean(a));
}

export const ORDER_STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'created', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready-for-pickup', label: 'Ready' },
  { value: 'out-for-delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];
