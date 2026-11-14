import type { OrderListItem } from '@/types/api';
import { isMaskedContact } from '@/utils/contactPrivacy';

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
    const raw = o.customer_phone || '';
    const name = (o.customer_name || '').trim();
    const masked = isMaskedContact(raw);
    const digits = raw.replace(/\D/g, '');
    // A masked number keeps only its last digits: key it by those plus the name, and merge it into the matching
    // full-number customer below, so one customer isn't split between their recent and older orders.
    const phone = masked ? raw : digits.slice(-10);
    const key = masked ? `masked:${digits.slice(-3)}:${name.toLowerCase()}` : phone || (name ? `name:${name.toLowerCase()}` : 'walk-in');
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
  for (const [key, group] of [...map.entries()]) {
    if (!key.startsWith('masked:')) continue;
    const [, tail, lowerName] = key.split(':');
    const match = [...map.values()].find(
      (c) => !c.key.startsWith('masked:') && /^\d{10}$/.test(c.phone) && c.phone.endsWith(tail) && c.name.toLowerCase() === lowerName,
    );
    if (!match) continue;
    match.orders += group.orders;
    match.completedSpend += group.completedSpend;
    if (new Date(group.lastOrderAt) > new Date(match.lastOrderAt)) {
      match.lastOrderAt = group.lastOrderAt;
      match.lastOrderId = group.lastOrderId;
    }
    map.delete(key);
  }
  return [...map.values()].sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());
}
