import { describe, expect, it } from 'vitest';
import reducer, { businessLoaded, printShopChanged } from './authSlice';
import type { BusinessSnapshot } from './businessCache';

describe('printShopChanged', () => {
  it('turns printing on for the signed-in shop without a new sign-in', () => {
    const shop = { shopId: 1, shopName: 'Sharma', businessType: 'product', isPrintShop: false } as BusinessSnapshot;
    let state = reducer(undefined, businessLoaded(shop));
    state = reducer(state, printShopChanged(true));
    expect(state.business?.isPrintShop).toBe(true);
    expect(state.business?.businessType).toBe('product');
  });

  it('does nothing when signed out', () => {
    const state = reducer(undefined, printShopChanged(true));
    expect(state.business ?? null).toBeNull();
  });
});
