import { describe, expect, it } from 'vitest';
import { emptyProduct, productSchema, toFormData, toProductPayload } from './productSchema';

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

describe('photo upload form data', () => {
  const file = new File(['x'], 'kettle.jpg', { type: 'image/jpeg' });

  it('sends the photo with the product fields', () => {
    const fd = toFormData({ name: 'Kettle', is_active: true, discount_type: null }, file);
    expect(fd.get('name')).toBe('Kettle');
    expect(fd.get('is_active')).toBe('true');
    expect(fd.has('discount_type')).toBe(false);
    expect((fd.get('image') as File).name).toBe('kettle.jpg');
    expect(fd.has('remove_background')).toBe(false);
  });

  it('asks the server to remove the background only when ticked', () => {
    expect(toFormData({}, file, { removeBackground: true }).get('remove_background')).toBe('true');
    expect(toFormData({}, file, { removeBackground: false }).has('remove_background')).toBe(false);
  });
});
