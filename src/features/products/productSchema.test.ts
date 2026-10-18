import { describe, expect, it } from 'vitest';
import { emptyProduct, productSchema, toProductPayload } from './productSchema';

const base = { ...emptyProduct, name: 'Amul Butter', price: '56', mrp: '58', initialStock: '10' };

describe('product form', () => {
  it('validates price vs MRP and discount rules', () => {
    expect(productSchema.safeParse(base).success).toBe(true);
    expect(productSchema.safeParse({ ...base, mrp: '50' }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, discount_type: 'percentage', discount_value: '120' }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, discount_type: 'fixed', discount_value: '60' }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, discount_type: 'fixed', discount_value: '6' }).success).toBe(true);
  });
  it('sends stock only on create so edits never overwrite live stock', () => {
    expect(toProductPayload(base, true).stock).toBe(10);
    expect('stock' in toProductPayload(base, false)).toBe(false);
  });
  it('never sends a client-generated SKU', () => {
    expect('sku' in toProductPayload(base, true)).toBe(false);
  });
});
