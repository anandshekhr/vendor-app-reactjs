import type { BadgeTone } from '@/components/ui';
import type { PrintDeliveryState, PrintFulfilmentType, PrintOrderFile, PrintOrderStatus } from '@/types/api';

/** The steps each fulfilment type goes through after the order is confirmed (mirrors the API's status machine). */
export const FULFILMENT_STEPS: Record<PrintFulfilmentType, { status: PrintOrderStatus; label: string }[]> = {
  PICKUP: [
    { status: 'RECEIVED', label: 'Confirmed' },
    { status: 'PRINTING', label: 'Printing' },
    { status: 'QUALITY_CHECK', label: 'Quality check' },
    { status: 'READY_FOR_PICKUP', label: 'Ready for pickup' },
    { status: 'PICKUP_VERIFIED', label: 'OTP verified' },
    { status: 'PICKED_UP', label: 'Picked up' },
    { status: 'COMPLETED', label: 'Completed' },
  ],
  DELIVERY: [
    { status: 'RECEIVED', label: 'Confirmed' },
    { status: 'PRINTING', label: 'Printing' },
    { status: 'QUALITY_CHECK', label: 'Quality check' },
    { status: 'READY_FOR_DELIVERY', label: 'Ready for delivery' },
    { status: 'PARTNER_ASSIGNED', label: 'Partner assigned' },
    { status: 'PICKED_UP', label: 'Picked up' },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
    { status: 'DELIVERED', label: 'Delivered' },
  ],
};

const BEFORE_CONFIRMATION: PrintOrderStatus[] = ['CREATED', 'QUOTATION_PENDING', 'AWAITING_APPROVAL', 'PAYMENT_PENDING', 'NEW_REQUEST'];

/** Index of the current step in FULFILMENT_STEPS, -1 before confirmation, null when the order was stopped. */
export function stepIndex(fulfilment: PrintFulfilmentType, status: PrintOrderStatus): number | null {
  if (status === 'REJECTED' || status === 'CANCELLED') return null;
  if (BEFORE_CONFIRMATION.includes(status)) return -1;
  return FULFILMENT_STEPS[fulfilment].findIndex((s) => s.status === status);
}

export const PRINT_STATUS_TONE: Record<PrintOrderStatus, BadgeTone> = {
  CREATED: 'neutral',
  QUOTATION_PENDING: 'warning',
  AWAITING_APPROVAL: 'info',
  PAYMENT_PENDING: 'neutral',
  NEW_REQUEST: 'warning',
  RECEIVED: 'info',
  PRINTING: 'purple',
  QUALITY_CHECK: 'purple',
  READY_FOR_PICKUP: 'brand',
  PICKUP_VERIFIED: 'brand',
  READY_FOR_DELIVERY: 'brand',
  PARTNER_ASSIGNED: 'info',
  PICKED_UP: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export const DELIVERY_STATE_TEXT: Record<PrintDeliveryState, { label: string; tone: BadgeTone; hint: string }> = {
  not_requested: { label: 'Not requested', tone: 'neutral', hint: 'A delivery partner is requested when you mark the order ready.' },
  searching: { label: 'Finding a partner', tone: 'warning', hint: 'Looking for a nearby delivery partner.' },
  not_found: { label: 'No partner yet', tone: 'warning', hint: 'Nobody nearby has accepted yet. The search keeps retrying for a while.' },
  assigned: { label: 'Partner assigned', tone: 'info', hint: 'The partner is on the way to your shop. Keep the documents packed at the counter.' },
  picked_up: { label: 'Picked up', tone: 'info', hint: 'The partner has the documents.' },
  delivered: { label: 'Delivered', tone: 'success', hint: 'Delivered to the customer.' },
  cancelled: { label: 'Cancelled', tone: 'danger', hint: 'The delivery was cancelled. Request a delivery partner again.' },
  error: { label: "Couldn't request", tone: 'danger', hint: 'The delivery service could not be reached. Request again.' },
};

export const FULFILMENT_TEXT: Record<PrintFulfilmentType, { label: string; short: string }> = {
  DELIVERY: { label: 'Home delivery', short: 'Delivery' },
  PICKUP: { label: 'Self pickup', short: 'Pickup' },
};

/** What a scanner or keyboard produced at the pickup counter: a QR payload, a bare 6-digit code, or nothing usable. */
export function parsePickupInput(raw: string): { qr_payload: string } | { code: string } | null {
  const value = raw.trim();
  if (/^TNBS-PRINT:[0-9a-f-]{36}:\d{6}$/i.test(value)) return { qr_payload: value };
  const digits = value.replace(/\s/g, '');
  if (/^\d{6}$/.test(digits)) return { code: digits };
  return null;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SIZE_LABEL: Record<string, string> = { A4: 'A4', A3: 'A3', A5: 'A5', LEGAL: 'Legal', LETTER: 'Letter' };
const BINDING_LABEL: Record<string, string> = { NONE: '', STAPLED: 'Stapled', SPIRAL: 'Spiral binding', HARDBOUND: 'Hard binding' };

/** "B&W · A4 · Double-sided · Pages 1-5 · Spiral binding" */
export function printOptionsSummary(f: Pick<PrintOrderFile, 'color_mode' | 'paper_size' | 'sided' | 'page_range' | 'binding'>): string {
  return [
    f.color_mode === 'COLOR' ? 'Colour' : 'B&W',
    SIZE_LABEL[f.paper_size] ?? f.paper_size,
    f.sided === 'DOUBLE' ? 'Double-sided' : 'Single-sided',
    f.page_range ? `Pages ${f.page_range}` : 'All pages',
    BINDING_LABEL[f.binding] ?? f.binding,
  ]
    .filter(Boolean)
    .join(' · ');
}
