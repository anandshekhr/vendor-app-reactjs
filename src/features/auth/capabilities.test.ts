import { describe, expect, it } from 'vitest';
import { navGroupsFor } from '@/constants/navigation';
import { businessTypeFromShop, capabilitiesFor } from './capabilities';

const labels = (type: 'product' | 'service' | 'hybrid') => {
  const caps = capabilitiesFor(type);
  return navGroupsFor((c) => caps.has(c)).flatMap((g) => g.items.map((i) => i.label));
};

describe('vendor-type navigation', () => {
  it('derives business type from the shop flag', () => {
    expect(businessTypeFromShop({ is_service_provider: true })).toBe('service');
    expect(businessTypeFromShop({ is_service_provider: false })).toBe('product');
    expect(businessTypeFromShop(null)).toBeNull();
  });
  it('shows product features only to product vendors', () => {
    const product = labels('product');
    expect(product).toEqual(expect.arrayContaining(['Point of Sale', 'Products', 'Inventory', 'Orders']));
    expect(product).not.toContain('Bookings');
  });
  it('hides product features from service providers', () => {
    const service = labels('service');
    expect(service).toEqual(expect.arrayContaining(['Bookings', 'Services', 'Employees', 'Wallet']));
    expect(service).not.toContain('Point of Sale');
    expect(service).not.toContain('Inventory');
  });
  it('supports hybrid vendors', () => {
    expect(labels('hybrid')).toEqual(expect.arrayContaining(['Point of Sale', 'Bookings']));
  });
});
