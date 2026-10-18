import type { BusinessType } from './capabilities';

/**
 * Non-sensitive business snapshot persisted so the portal (notably offline POS and receipts) can start without
 * network access. Contains no tokens, bank or customer data.
 */
export interface BusinessSnapshot {
  shopId: number;
  shopName: string;
  businessName: string;
  businessType: BusinessType;
  address: string;
  phone: string;
  gstin: string;
  isVerified: boolean;
  latitude: number | null;
  longitude: number | null;
  cachedAt: number;
}

const KEY = 'tnbs.vendor.business';

export function loadBusinessSnapshot(): BusinessSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BusinessSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveBusinessSnapshot(snapshot: BusinessSnapshot | null): void {
  try {
    if (snapshot) localStorage.setItem(KEY, JSON.stringify(snapshot));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
}
