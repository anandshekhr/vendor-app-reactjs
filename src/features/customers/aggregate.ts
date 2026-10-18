import type { OrderListItem } from '@/types/api';

export interface CustomerSummary {
  key: string;
  name: string;
  phone: string;
  orders: number;
  completedSpend: number;
  lastOrderAt: string;
  lastOrderId: number;
}

const EXCLUDED = new Set(['rejected', 'cancelled']);

/**
 * Groups this vendor's own orders into a customer directory (there is no vendor customer API — API_MAPPING G-12).
 * Spend counts non-cancelled orders only. Orders without phone/name are grouped as walk-ins.
 */
export function aggregateCustomers(orders: OrderListItem[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  for (const o of orders) {
    const phone = (o.customer_phone || '').replace(/\D/g, '').slice(-10);
    const name = (o.customer_name || '').trim();
    const key = phone || (name ? `name:${name.toLowerCase()}` : 'walk-in');
    const existing = map.get(key);
    const spend = EXCLUDED.has(o.status) ? 0 : Number(o.total_amount) || 0;
    if (!existing) {
      map.set(key, {
        key,
        name: name || (key === 'walk-in' ? 'Walk-in customers' : 'Unnamed customer'),
        phone,
        orders: 1,
        completedSpend: spend,
        lastOrderAt: o.created_at,
        lastOrderId: o.id,
      });
    } else {
      existing.orders += 1;
      existing.completedSpend += spend;
      if (new Date(o.created_at) > new Date(existing.lastOrderAt)) {
        existing.lastOrderAt = o.created_at;
        existing.lastOrderId = o.id;
        if (name) existing.name = name;
      }
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());
}
