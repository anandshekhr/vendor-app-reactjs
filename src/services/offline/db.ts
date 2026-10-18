import Dexie, { type Table } from 'dexie';
import type { PosPaymentMethod, PosProduct, StockOperation } from '@/types/api';

export interface CachedProduct extends PosProduct {
  /** Lower-cased name/sku/barcode for offline search. */
  searchText: string;
  syncedAt: number;
}

export type OfflineSaleStatus =
  /** Recorded offline, waiting to be sent. */
  | 'pending'
  /** Request in flight. Persisted before sending so a crash cannot silently resend it. */
  | 'syncing'
  /** Server confirmed (serverOrderId set). */
  | 'synced'
  /** Server definitively rejected the sale (e.g. insufficient stock). Nothing was created server-side. */
  | 'conflict'
  /** Request may or may not have been processed. Needs reconciliation before any retry. */
  | 'unknown'
  /** Abandoned by the cashier after a conflict; must be settled manually (e.g. refund the customer). */
  | 'voided';

export interface OfflineSaleItem {
  productId: number;
  name: string;
  sku: string;
  barcode: string | null;
  /** Cached `final_price` at sale time. Provisional — the server re-prices on sync. */
  unitPrice: string;
  quantity: number;
}

export interface OfflineSale {
  clientReference: string;
  /** Shop that recorded the sale. Only that shop's session may sync it (a device can be shared). */
  shopId: number;
  createdAt: number;
  items: OfflineSaleItem[];
  paymentMethod: PosPaymentMethod;
  customerName: string;
  customerPhone: string;
  provisionalTotal: string;
  status: OfflineSaleStatus;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
  serverOrderId?: number;
  serverTotal?: string;
  syncedAt?: number;
  reconciledManually?: boolean;
  voidReason?: string;
  /** Age of the catalogue snapshot the sale was priced from. */
  catalogueSyncedAt: number | null;
}

export interface StockJournalEntry {
  id?: number;
  productId: number;
  productName: string;
  movementType: string;
  operation: StockOperation;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference: string;
  at: number;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class PosDatabase extends Dexie {
  products!: Table<CachedProduct, number>;
  sales!: Table<OfflineSale, string>;
  stockJournal!: Table<StockJournalEntry, number>;
  meta!: Table<MetaEntry, string>;

  constructor(name = 'tnbs-pos') {
    super(name);
    this.version(1).stores({
      products: 'id, barcode, sku, searchText',
      sales: 'clientReference, status, createdAt, shopId',
      stockJournal: '++id, productId, at',
      meta: 'key',
    });
  }
}

export const db = new PosDatabase();

export async function getMeta<T>(key: string, database: PosDatabase = db): Promise<T | undefined> {
  return (await database.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown, database: PosDatabase = db): Promise<void> {
  await database.meta.put({ key, value });
}

export const META_CATALOGUE_SYNCED_AT = 'catalogueSyncedAt';

/** Wipes all device data — called on sign-out so another vendor on this device cannot see it. */
export async function clearOfflineData(database: PosDatabase = db, { keepUnsyncedSales = true } = {}): Promise<number> {
  const unsynced = await database.sales.where('status').anyOf('pending', 'syncing', 'unknown', 'conflict').count();
  await database.transaction('rw', database.products, database.stockJournal, database.meta, database.sales, async () => {
    await database.products.clear();
    await database.stockJournal.clear();
    await database.meta.clear();
    if (!keepUnsyncedSales || unsynced === 0) await database.sales.clear();
  });
  return unsynced;
}
