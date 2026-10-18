import { isApiError, toApiError, type ApiError } from '@/services/api/errors';
import type { PosCheckoutRequest } from '@/types/api';
import { db as defaultDb, type OfflineSale, type PosDatabase } from './db';

export interface CheckoutResult {
  id: number;
  total_amount: string | number;
}

export type CheckoutFn = (request: PosCheckoutRequest, idempotencyKey: string) => Promise<CheckoutResult>;

export interface SyncDeps {
  db?: PosDatabase;
  /** Only sales recorded by this shop are sent. */
  shopId: number;
  checkout: CheckoutFn;
  /** True only when the server deduplicates on the idempotency key (API_MAPPING G-9). */
  serverIdempotent: boolean;
  isOnline?: () => boolean;
  now?: () => number;
}

export interface SyncReport {
  attempted: number;
  synced: number;
  conflicts: number;
  unknown: number;
  stoppedReason?: 'offline' | 'auth' | 'locked';
}

export function toCheckoutRequest(sale: OfflineSale): PosCheckoutRequest {
  return {
    items: sale.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    payment_method: sale.paymentMethod,
    customer_name: sale.customerName,
    customer_phone: sale.customerPhone,
    client_reference: sale.clientReference,
  };
}

/**
 * Atomically moves a sale from an eligible status to `syncing`. IndexedDB serialises read-write transactions, so two
 * tabs racing on the same sale cannot both claim it.
 */
async function claim(database: PosDatabase, ref: string, eligible: OfflineSale['status'][], now: number): Promise<OfflineSale | null> {
  return database.transaction('rw', database.sales, async () => {
    const sale = await database.sales.get(ref);
    if (!sale || !eligible.includes(sale.status)) return null;
    const claimed: OfflineSale = { ...sale, status: 'syncing', attempts: sale.attempts + 1, lastAttemptAt: now, lastError: undefined };
    await database.sales.put(claimed);
    return claimed;
  });
}

type Outcome = { kind: 'synced'; result: CheckoutResult } | { kind: 'conflict' | 'unknown' | 'retry-later' | 'auth'; error: ApiError };

export function classifyError(error: unknown): Exclude<Outcome, { kind: 'synced' }> {
  const err = isApiError(error) ? error : toApiError(error);
  if (err.status === null) {
    // No response. If the device knew it was offline the request never left; otherwise it may have been processed.
    return { kind: err.isAmbiguous ? 'unknown' : 'retry-later', error: err };
  }
  if (err.status === 401 || err.status === 403) return { kind: 'auth', error: err };
  if (err.status === 408 || err.status === 429) return { kind: 'retry-later', error: err };
  if (err.status >= 400 && err.status < 500) return { kind: 'conflict', error: err };
  return { kind: 'unknown', error: err };
}

let memoryLock = false;

async function withSyncLock<T>(fn: () => Promise<T>): Promise<T | null> {
  const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (locks?.request) {
    return locks.request('tnbs-pos-sync', { ifAvailable: true }, async (lock) => (lock ? fn() : null)) as Promise<T | null>;
  }
  if (memoryLock) return null;
  memoryLock = true;
  try {
    return await fn();
  } finally {
    memoryLock = false;
  }
}

/** On start-up, a sale still marked `syncing` was interrupted mid-request: its outcome is unknown. */
export async function recoverInterruptedSales(database: PosDatabase = defaultDb, serverIdempotent = false): Promise<number> {
  return database.transaction('rw', database.sales, async () => {
    const stuck = await database.sales.where('status').equals('syncing').toArray();
    for (const sale of stuck) {
      await database.sales.put({
        ...sale,
        status: serverIdempotent ? 'pending' : 'unknown',
        lastError: 'Sync was interrupted before the server responded.',
      });
    }
    return stuck.length;
  });
}

/**
 * Sends queued offline sales one at a time, oldest first.
 * - A sale is marked `synced` only after the server returns the created order.
 * - Ambiguous failures become `unknown` and are never retried automatically unless the server is idempotent.
 * - Definitive rejections become `conflict`; server inventory is never overwritten.
 */
export async function syncPendingSales(deps: SyncDeps): Promise<SyncReport> {
  const database = deps.db ?? defaultDb;
  const now = deps.now ?? Date.now;
  const isOnline = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const report: SyncReport = { attempted: 0, synced: 0, conflicts: 0, unknown: 0 };

  const result = await withSyncLock(async () => {
    const eligible: OfflineSale['status'][] = deps.serverIdempotent ? ['pending', 'unknown'] : ['pending'];
    const queue = (await database.sales.where('status').anyOf(eligible).sortBy('createdAt')).filter((s) => s.shopId === deps.shopId);

    for (const queued of queue) {
      if (!isOnline()) {
        report.stoppedReason = 'offline';
        break;
      }
      const sale = await claim(database, queued.clientReference, eligible, now());
      if (!sale) continue; // claimed by another tab or changed meanwhile
      report.attempted += 1;

      let outcome: Outcome;
      try {
        outcome = { kind: 'synced', result: await deps.checkout(toCheckoutRequest(sale), sale.clientReference) };
      } catch (error) {
        outcome = classifyError(error);
      }

      if (outcome.kind === 'synced') {
        await database.sales.put({
          ...sale,
          status: 'synced',
          serverOrderId: outcome.result.id,
          serverTotal: String(outcome.result.total_amount),
          syncedAt: now(),
        });
        report.synced += 1;
        continue;
      }

      const { error } = outcome;
      if (outcome.kind === 'conflict') {
        await database.sales.put({ ...sale, status: 'conflict', lastError: error.message });
        report.conflicts += 1;
        continue;
      }
      if (outcome.kind === 'unknown') {
        await database.sales.put({ ...sale, status: deps.serverIdempotent ? 'pending' : 'unknown', lastError: error.message });
        report.unknown += 1;
        if (deps.serverIdempotent) break;
        continue;
      }
      // retry-later / auth: the request was not processed — return the sale to the queue and stop this run.
      await database.sales.put({ ...sale, status: 'pending', lastError: error.message });
      report.stoppedReason = outcome.kind === 'auth' ? 'auth' : 'offline';
      break;
    }
    return report;
  });

  return result ?? { ...report, stoppedReason: 'locked' };
}

/** Cashier confirmed the sale exists on the server (matched to an order in POS sales history). */
export async function markReconciled(ref: string, serverOrderId: number, serverTotal: string, database: PosDatabase = defaultDb, now = Date.now()) {
  await database.transaction('rw', database.sales, async () => {
    const sale = await database.sales.get(ref);
    if (!sale || sale.status !== 'unknown') throw new Error('Only sales needing review can be reconciled.');
    await database.sales.put({ ...sale, status: 'synced', serverOrderId, serverTotal, syncedAt: now, reconciledManually: true });
  });
}

/** Cashier confirmed the sale is NOT on the server; it may be sent again. */
export async function requeueSale(ref: string, database: PosDatabase = defaultDb) {
  await database.transaction('rw', database.sales, async () => {
    const sale = await database.sales.get(ref);
    if (!sale || !['unknown', 'conflict'].includes(sale.status)) throw new Error('This sale cannot be re-queued.');
    await database.sales.put({ ...sale, status: 'pending', lastError: undefined });
  });
}

/** Adjust quantities of a conflicted sale (e.g. drop an out-of-stock item) before re-queueing. */
export async function updateConflictedItems(ref: string, items: OfflineSale['items'], database: PosDatabase = defaultDb) {
  await database.transaction('rw', database.sales, async () => {
    const sale = await database.sales.get(ref);
    if (!sale || sale.status !== 'conflict') throw new Error('Only conflicted sales can be edited.');
    const kept = items.filter((i) => i.quantity > 0);
    if (kept.length === 0) throw new Error('A sale needs at least one item. Void it instead.');
    const total = kept.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
    await database.sales.put({ ...sale, items: kept, provisionalTotal: total.toFixed(2), status: 'pending', lastError: undefined });
  });
}

export async function voidSale(ref: string, reason: string, database: PosDatabase = defaultDb) {
  await database.transaction('rw', database.sales, async () => {
    const sale = await database.sales.get(ref);
    if (!sale || sale.status !== 'conflict') throw new Error('Only conflicted sales can be voided.');
    await database.sales.put({ ...sale, status: 'voided', voidReason: reason });
  });
}

export interface ServerPosOrder {
  id: number;
  created_at: string;
  total_amount: string | number;
  customer_phone: string;
  source?: string;
  items_count?: number;
}

/**
 * Suggests server POS orders that could correspond to a sale needing review. Purely advisory — the cashier decides.
 */
export function findCandidateMatches(sale: OfflineSale, orders: ServerPosOrder[]): ServerPosOrder[] {
  const attemptAt = sale.lastAttemptAt ?? sale.createdAt;
  const from = attemptAt - 2 * 60_000;
  const to = attemptAt + 15 * 60_000;
  return orders.filter((o) => {
    if (o.source && o.source !== 'pos') return false;
    const t = new Date(o.created_at).getTime();
    if (Number.isNaN(t) || t < from || t > to) return false;
    if (sale.customerPhone && o.customer_phone && o.customer_phone !== sale.customerPhone) return false;
    return true;
  });
}
