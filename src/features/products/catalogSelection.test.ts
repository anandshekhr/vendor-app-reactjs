import { describe, expect, it } from 'vitest';
import type { MasterCatalogItem, OrderDetail, ProductListItem } from '@/types/api';
import { rupeesInWords } from '@/utils/amountInWords';
import { orderView } from '@/features/orders/orderView';
import { draftFor, ignoredOverrides, toBulkItems, validateDraft } from './catalogSelection';

const item: MasterCatalogItem = { id: 1, name: 'Salt', sku: 'S', image: null, category_name: null, unit_name: null, brand_name: null, selling_price: '28.00', max_retail_price: '30.00', is_active: true, already_added: false };

describe('catalogue selection', () => {
  it('defaults to catalogue price and zero stock', () => {
    expect(draftFor(item)).toMatchObject({ price: '28.00', stock: '0' });
  });
  it('validates price against MRP and stock as a whole number', () => {
    expect(validateDraft({ item, price: '31', stock: '1' }).price).toMatch(/Above MRP/);
    expect(validateDraft({ item, price: 'abc', stock: '1' }).price).toBeDefined();
    expect(validateDraft({ item, price: '29', stock: '1.5' }).stock).toBeDefined();
    expect(validateDraft({ item, price: '30', stock: '0' })).toEqual({});
  });
  it('builds the bulk-add payload', () => {
    expect(toBulkItems([{ item, price: '29', stock: '7' }])).toEqual([{ master_product_id: 1, price: '29.00', stock: 7 }]);
  });
  it('detects servers that ignored the requested price/stock', () => {
    const created = [{ name: 'Salt', price: '28.00', stock: 0 } as ProductListItem];
    expect(ignoredOverrides([{ item, price: '29', stock: '7' }], created)).toEqual(['Salt']);
    expect(ignoredOverrides([{ item, price: '28', stock: '0' }], created)).toEqual([]);
  });
});

describe('invoice helpers', () => {
  it('writes amounts in Indian words', () => {
    expect(rupeesInWords(215)).toBe('Rupees Two Hundred Fifteen Only');
    expect(rupeesInWords('1234567.5')).toBe('Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Fifty Paise Only');
    expect(rupeesInWords(0)).toBe('Rupees Zero Only');
  });
  it('prefers the scoped order detail and reports a missing delivery charge as unknown', () => {
    const base = { id: 1, external_id: null, customer_name: '', customer_phone: '', total_amount: '125.00', status: 'delivered', status_display: '', is_paid: true, rejection_reason: '', created_at: '', delivered_at: null, history: [] as never[] } satisfies Partial<OrderDetail> as OrderDetail;
    const scoped = orderView({ ...base, items: [], item_total: '100.00', shipping_amount: '25.00', customer_address: { address_line1: '12 MG Road', city: 'Pune' } });
    expect(scoped).toMatchObject({ shipping: '25.00', itemTotal: '100.00', addressText: '12 MG Road, Pune' });
    const legacy = orderView({ ...base }, { item_total: '100.00', items: [] } as never);
    expect(legacy.shipping).toBeNull();
  });
});
