import { config } from '@/constants/config';
import { db, getMeta, META_CATALOGUE_SYNCED_AT, type OfflineSale, type PosDatabase } from '@/services/offline/db';
import { uuid } from '@/utils/id';
import type { PosPaymentMethod } from '@/types/api';
import type { CartLine } from './posSlice';

export class OfflinePolicyError extends Error {}

export function isOfflinePaymentAllowed(method: PosPaymentMethod, allowed: readonly string[] = config.offlinePaymentMethods): boolean {
  return allowed.includes(method);
}

export function isCatalogueStale(syncedAt: number | null | undefined, now = Date.now(), maxMinutes = config.posStaleCatalogueMinutes): boolean {
  if (!syncedAt) return true;
  return now - syncedAt > maxMinutes * 60_000;
}

/**
 * Records a sale locally while offline. It is queued with a fresh idempotency key and marked pending until the server
 * confirms it — it is never treated as synced or as a final tax invoice before that.
 */
export async function createOfflineSale(
  input: { shopId: number; lines: CartLine[]; paymentMethod: PosPaymentMethod; customerName: string; customerPhone: string },
  opts: { database?: PosDatabase; allowedMethods?: readonly string[]; now?: number } = {},
): Promise<OfflineSale> {
  const database = opts.database ?? db;
  if (input.lines.length === 0) throw new OfflinePolicyError('The cart is empty.');
  if (!isOfflinePaymentAllowed(input.paymentMethod, opts.allowedMethods)) {
    throw new OfflinePolicyError(`${input.paymentMethod.toUpperCase()} cannot be completed offline: it needs confirmation from the payment provider.`);
  }
  const items = input.lines.map((l) => ({
    productId: l.product.id,
    name: l.product.name,
    sku: l.product.sku,
    barcode: l.product.barcode,
    unitPrice: String(l.product.final_price),
    quantity: l.quantity,
  }));
  const total = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const sale: OfflineSale = {
    clientReference: uuid(),
    shopId: input.shopId,
    createdAt: opts.now ?? Date.now(),
    items,
    paymentMethod: input.paymentMethod,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    provisionalTotal: total.toFixed(2),
    status: 'pending',
    attempts: 0,
    catalogueSyncedAt: (await getMeta<number>(META_CATALOGUE_SYNCED_AT, database)) ?? null,
  };
  await database.sales.add(sale);
  return sale;
}
