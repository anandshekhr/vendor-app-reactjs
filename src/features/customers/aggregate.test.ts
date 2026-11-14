import { describe, expect, it } from 'vitest';
import type { OrderListItem } from '@/types/api';
import { isMaskedContact } from '@/utils/contactPrivacy';
import { aggregateCustomers } from './aggregate';

const order = (id: number, name: string, phone: string, at: string, status = 'delivered') =>
  ({ id, customer_name: name, customer_phone: phone, total_amount: '100.00', status, created_at: at }) as OrderListItem;

describe('customer directory with masked contacts', () => {
  it('detects masked values', () => {
    expect(isMaskedContact('+91•••••••678')).toBe(true);
    expect(isMaskedContact('+919812345678')).toBe(false);
    expect(isMaskedContact(null)).toBe(false);
  });

  it('merges a customer’s older (masked) orders into their recent ones, without merging strangers', () => {
    const rows = aggregateCustomers([
      order(1, 'Asha', '+919812345678', '2026-11-10T10:00:00Z'),
      order(2, 'Asha', '+91•••••••678', '2026-11-01T10:00:00Z'),
      order(3, 'Ravi', '+91•••••••678', '2026-11-02T10:00:00Z'), // same last digits, different person
    ]);
    const asha = rows.find((r) => r.name === 'Asha')!;
    expect(asha.orders).toBe(2);
    expect(asha.phone).toBe('9812345678');
    const ravi = rows.find((r) => r.name === 'Ravi')!;
    expect(ravi.orders).toBe(1);
    expect(isMaskedContact(ravi.phone)).toBe(true);
  });
});
