import type { OrderDetail, VendorOrderFull, VendorOrderItem } from '@/types/api';

export interface OrderView {
  items: VendorOrderItem[] | undefined;
  itemTotal: string | number | undefined;
  discount: string | number | undefined;
  tax: string | number | undefined;
  /** Delivery charge, or null when the server does not report it (older api-services). */
  shipping: string | number | null;
  total: string | number;
  source: 'online' | 'pos' | undefined;
  invoiceUrl: string | null | undefined;
  address: Record<string, unknown> | null;
  addressText: string | null;
}

export function formatAddress(address: Record<string, unknown> | null | undefined): string | null {
  if (!address || typeof address !== 'object') return null;
  const a = address;
  const parts = [a.full_name ?? a.name, a.address_line1 ?? a.line1 ?? a.address, a.address_line2 ?? a.line2, a.landmark, a.city, a.state, a.pincode ?? a.zip_code ?? a.postal_code]
    .filter((p) => typeof p === 'string' && p.trim())
    .map(String);
  return parts.length ? parts.join(', ') : null;
}

/**
 * Merges the shop-scoped detail (preferred; includes the delivery charge) with the legacy v2 detail used as a
 * fallback on servers that predate the vendor-portal update.
 */
export function orderView(order: OrderDetail, legacy?: VendorOrderFull): OrderView {
  const scoped = order.items !== undefined;
  const src = scoped ? order : legacy;
  const address = (src?.customer_address as Record<string, unknown> | null | undefined) ?? null;
  return {
    items: src?.items,
    itemTotal: src?.item_total,
    discount: src?.discount_amount,
    tax: src?.tax_amount,
    shipping: src?.shipping_amount ?? null,
    total: order.total_amount,
    source: src?.source,
    invoiceUrl: src?.invoice_url,
    address,
    addressText: formatAddress(address),
  };
}
