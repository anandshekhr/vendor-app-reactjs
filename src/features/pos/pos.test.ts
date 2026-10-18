import { describe, expect, it } from 'vitest';
import { PosDatabase } from '@/services/offline/db';
import type { PosProduct } from '@/types/api';
import reducer, { cartCleared, estimateTotal, itemCount, productAdded, quantitySet } from './posSlice';
import { createOfflineSale, isCatalogueStale, isOfflinePaymentAllowed, OfflinePolicyError } from './offlineSale';

const milk: PosProduct = { id: 1, name: 'Milk', sku: 'S1', barcode: '111', category_name: 'Dairy', price: '30.00', mrp: '30.00', final_price: '27.00', stock: 5, image: null };
const bread: PosProduct = { ...milk, id: 2, name: 'Bread', barcode: '222', final_price: '45.00' };

describe('POS cart', () => {
  it('increments quantity when the same product is scanned again', () => {
    let s = reducer(undefined, productAdded(milk));
    s = reducer(s, productAdded(milk));
    s = reducer(s, productAdded(bread));
    expect(s.lines).toHaveLength(2);
    expect(s.lines[0].quantity).toBe(2);
    expect(itemCount(s.lines)).toBe(3);
    expect(estimateTotal(s.lines)).toBe(99);
  });

  it('removes a line when quantity is set to zero and clears', () => {
    let s = reducer(undefined, productAdded(milk));
    s = reducer(s, quantitySet({ productId: 1, quantity: 0 }));
    expect(s.lines).toHaveLength(0);
    s = reducer(reducer(s, productAdded(bread)), cartCleared());
    expect(s.lines).toHaveLength(0);
  });
});

describe('offline sale policy', () => {
  it('allows only configured payment methods offline', () => {
    expect(isOfflinePaymentAllowed('cash', ['cash'])).toBe(true);
    expect(isOfflinePaymentAllowed('upi', ['cash'])).toBe(false);
    expect(isOfflinePaymentAllowed('card', ['cash'])).toBe(false);
  });

  it('flags a missing or old catalogue as stale', () => {
    const now = 10_000_000;
    expect(isCatalogueStale(null, now, 60)).toBe(true);
    expect(isCatalogueStale(now - 30 * 60_000, now, 60)).toBe(false);
    expect(isCatalogueStale(now - 90 * 60_000, now, 60)).toBe(true);
  });

  it('creates a pending sale with a unique idempotency key and provisional total', async () => {
    const database = new PosDatabase(`pos-${Math.random()}`);
    const lines = [{ product: milk, quantity: 2 }];
    const a = await createOfflineSale({ shopId: 4, lines, paymentMethod: 'cash', customerName: ' Asha ', customerPhone: '' }, { database, allowedMethods: ['cash'] });
    const b = await createOfflineSale({ shopId: 4, lines, paymentMethod: 'cash', customerName: '', customerPhone: '' }, { database, allowedMethods: ['cash'] });
    expect(a.status).toBe('pending');
    expect(a.provisionalTotal).toBe('54.00');
    expect(a.customerName).toBe('Asha');
    expect(a.shopId).toBe(4);
    expect(a.clientReference).not.toBe(b.clientReference);
    expect(await database.sales.count()).toBe(2);
  });

  it('refuses UPI/card offline and empty carts', async () => {
    const database = new PosDatabase(`pos-${Math.random()}`);
    await expect(createOfflineSale({ shopId: 1, lines: [{ product: milk, quantity: 1 }], paymentMethod: 'upi', customerName: '', customerPhone: '' }, { database, allowedMethods: ['cash'] })).rejects.toBeInstanceOf(OfflinePolicyError);
    await expect(createOfflineSale({ shopId: 1, lines: [], paymentMethod: 'cash', customerName: '', customerPhone: '' }, { database, allowedMethods: ['cash'] })).rejects.toThrow('empty');
    expect(await database.sales.count()).toBe(0);
  });
});
