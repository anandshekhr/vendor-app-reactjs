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
  | 'profile'
  /** Printing & photocopy orders: the shop has a print-shop profile (any business type). */
  | 'printing';

const COMMON: Capability[] = ['dashboard', 'customers', 'chat', 'wallet', 'reports', 'notifications', 'profile'];
const PRODUCT: Capability[] = ['products', 'inventory', 'scanner', 'pos', 'orders', 'delivery'];
const SERVICE: Capability[] = ['services', 'bookings', 'employees', 'availability'];

/**
 * The shop's `business_type` (product / service / hybrid) follows its categories on the server. Older servers only
 * send `is_service_provider`, which can't express hybrid.
 */
export function businessTypeFromShop(shop: Pick<ShopProfile, 'is_service_provider' | 'business_type'> | null | undefined): BusinessType | null {
  if (!shop) return null;
  if (shop.business_type) return shop.business_type;
  return shop.is_service_provider ? 'service' : 'product';
}

export function capabilitiesFor(type: BusinessType | null): Set<Capability> {
  if (!type) return new Set(['profile', 'notifications']);
  const caps = [...COMMON];
  if (type === 'product' || type === 'hybrid') caps.push(...PRODUCT);
  if (type === 'service' || type === 'hybrid') caps.push(...SERVICE);
  return new Set(caps);
}
