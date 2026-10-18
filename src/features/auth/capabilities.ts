import type { ShopProfile } from '@/types/api';

export type BusinessType = 'product' | 'service' | 'hybrid';

export type Capability =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'scanner'
  | 'pos'
  | 'orders'
  | 'delivery'
  | 'services'
  | 'bookings'
  | 'employees'
  | 'availability'
  | 'customers'
  | 'chat'
  | 'wallet'
  | 'reports'
  | 'notifications'
  | 'profile';

const COMMON: Capability[] = ['dashboard', 'customers', 'chat', 'wallet', 'reports', 'notifications', 'profile'];
const PRODUCT: Capability[] = ['products', 'inventory', 'scanner', 'pos', 'orders', 'delivery'];
const SERVICE: Capability[] = ['services', 'bookings', 'employees', 'availability'];

/**
 * The backend models business type as a single `Shop.is_service_provider` boolean (API_MAPPING §2, gap G-2),
 * so `hybrid` is supported by the capability model but is never inferred from the current API.
 */
export function businessTypeFromShop(shop: Pick<ShopProfile, 'is_service_provider'> | null | undefined): BusinessType | null {
  if (!shop) return null;
  return shop.is_service_provider ? 'service' : 'product';
}

export function capabilitiesFor(type: BusinessType | null): Set<Capability> {
  if (!type) return new Set(['profile', 'notifications']);
  const caps = [...COMMON];
  if (type === 'product' || type === 'hybrid') caps.push(...PRODUCT);
  if (type === 'service' || type === 'hybrid') caps.push(...SERVICE);
  return new Set(caps);
}
