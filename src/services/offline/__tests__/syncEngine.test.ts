import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PosDatabase, type OfflineSale } from '../db';
import {
  classifyError,
  findCandidateMatches,
  markReconciled,
  recoverInterruptedSales,
  requeueSale,
  syncPendingSales,
  updateConflictedItems,
  voidSale,
} from '../syncEngine';

let db: PosDatabase;
let seq = 0;

function sale(overrides: Partial<OfflineSale> = {}): OfflineSale {
  seq += 1;
  return {
    clientReference: `ref-${seq}`,
    shopId: 1,
    createdAt: 1_000 + seq,
    items: [{ productId: 7, name: 'Milk', sku: 'S7', barcode: '111', unitPrice: '27.00', quantity: 2 }],
    paymentMethod: 'cash',
    customerName: '',
    customerPhone: '',
    provisionalTotal: '54.00',
    status: 'pending',
    attempts: 0,
    catalogueSyncedAt: null,
    ...overrides,
  };
}

function httpError(status: number, data: unknown = {}) {
  const config = { headers: new AxiosHeaders() } as never;
  return new AxiosError('x', String(status), config, null, { status, statusText: '', data, headers: {}, config });
}

function networkError(code = 'ERR_NETWORK') {
  return new AxiosError('Network Error', code, { headers: new AxiosHeaders() } as never);
}

beforeEach(async () => {
  db = new PosDatabase(`test-${Math.random()}`);
  await db.open();
});

describe('syncPendingSales', () => {
  it('marks a sale synced only after the server returns the created order', async () => {
    const s = sale();
    await db.sales.add(s);
    const checkout = vi.fn().mockResolvedValue({ id: 501, total_amount: '54.00' });
    const report = await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true });
    expect(report).toMatchObject({ attempted: 1, synced: 1 });
    expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ client_reference: s.clientReference, payment_method: 'cash' }), s.clientReference);
    const stored = await db.sales.get(s.clientReference);
    expect(stored).toMatchObject({ status: 'synced', serverOrderId: 501, attempts: 1 });
  });

  it('never sends the same sale twice, even across repeated or concurrent runs', async () => {
    await db.sales.add(sale());
    let resolve!: (v: unknown) => void;
    const checkout = vi.fn().mockImplementation(() => new Promise((r) => (resolve = r)));
    const deps = { db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true };
    const first = syncPendingSales(deps);
    await vi.waitFor(() => expect(checkout).toHaveBeenCalledTimes(1));
    const second = await syncPendingSales(deps); // runs while the first request is in flight
    expect(second.stoppedReason).toBe('locked');
    resolve({ id: 1, total_amount: '54.00' });
    await first;
    await syncPendingSales(deps); // already synced: nothing to do
    expect(checkout).toHaveBeenCalledTimes(1);
  });

  it('marks ambiguous failures as unknown and does not retry them automatically', async () => {
    const s = sale();
    await db.sales.add(s);
    const checkout = vi.fn().mockRejectedValue(networkError('ECONNABORTED'));
    const report = await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true });
    expect(report.unknown).toBe(1);
    expect((await db.sales.get(s.clientReference))?.status).toBe('unknown');
    await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true });
    expect(checkout).toHaveBeenCalledTimes(1);
  });

  it('retries unknown sales only when the server is idempotent', async () => {
    const s = sale({ status: 'unknown' });
    await db.sales.add(s);
    const checkout = vi.fn().mockResolvedValue({ id: 9, total_amount: '54.00' });
    await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true });
    expect(checkout).not.toHaveBeenCalled();
    await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: true, isOnline: () => true });
    expect(checkout).toHaveBeenCalledWith(expect.anything(), s.clientReference);
    expect((await db.sales.get(s.clientReference))?.status).toBe('synced');
  });

  it('records insufficient-stock rejections as conflicts without touching other sales', async () => {
    const a = sale();
    const b = sale();
    await db.sales.bulkAdd([a, b]);
    const checkout = vi
      .fn()
      .mockRejectedValueOnce(httpError(400, { items: 'Insufficient stock for "Milk" (available: 1).' }))
      .mockResolvedValueOnce({ id: 2, total_amount: '54.00' });
    const report = await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true });
    expect(report).toMatchObject({ conflicts: 1, synced: 1 });
    const conflicted = await db.sales.get(a.clientReference);
    expect(conflicted?.status).toBe('conflict');
    expect(conflicted?.lastError).toContain('Insufficient stock');
  });

  it('returns sales to the queue and stops when offline or unauthorised', async () => {
    const s = sale();
    await db.sales.add(s);
    const checkout = vi.fn().mockRejectedValue(httpError(401));
    const report = await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true });
    expect(report.stoppedReason).toBe('auth');
    expect((await db.sales.get(s.clientReference))?.status).toBe('pending');

    const offline = await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => false });
    expect(offline.stoppedReason).toBe('offline');
  });

  it('only syncs sales recorded by the signed-in shop', async () => {
    const mine = sale({ shopId: 1 });
    const theirs = sale({ shopId: 2 });
    await db.sales.bulkAdd([mine, theirs]);
    const checkout = vi.fn().mockResolvedValue({ id: 3, total_amount: '54.00' });
    await syncPendingSales({ db, shopId: 1, checkout, serverIdempotent: false, isOnline: () => true });
    expect(checkout).toHaveBeenCalledTimes(1);
    expect((await db.sales.get(theirs.clientReference))?.status).toBe('pending');
  });
});

describe('recovery and reconciliation', () => {
  it('treats a sale interrupted mid-request as unknown', async () => {
    const s = sale({ status: 'syncing' });
    await db.sales.add(s);
    expect(await recoverInterruptedSales(db, false)).toBe(1);
    expect((await db.sales.get(s.clientReference))?.status).toBe('unknown');
  });

  it('reconciles an unknown sale to a server order, or re-queues it', async () => {
    const a = sale({ status: 'unknown' });
    const b = sale({ status: 'unknown' });
    await db.sales.bulkAdd([a, b]);
    await markReconciled(a.clientReference, 77, '54.00', db);
    expect(await db.sales.get(a.clientReference)).toMatchObject({ status: 'synced', serverOrderId: 77, reconciledManually: true });
    await requeueSale(b.clientReference, db);
    expect((await db.sales.get(b.clientReference))?.status).toBe('pending');
    await expect(markReconciled(a.clientReference, 1, '1', db)).rejects.toThrow();
  });

  it('lets a conflicted sale be edited (re-queued) or voided', async () => {
    const a = sale({ status: 'conflict' });
    const b = sale({ status: 'conflict' });
    await db.sales.bulkAdd([a, b]);
    await updateConflictedItems(a.clientReference, [{ ...a.items[0], quantity: 1 }], db);
    expect(await db.sales.get(a.clientReference)).toMatchObject({ status: 'pending', provisionalTotal: '27.00' });
    await expect(updateConflictedItems(b.clientReference, [{ ...b.items[0], quantity: 0 }], db)).rejects.toThrow();
    await voidSale(b.clientReference, 'Customer refunded', db);
    expect((await db.sales.get(b.clientReference))?.status).toBe('voided');
  });

  it('suggests server orders near the attempt time as candidate matches', () => {
    const s = sale({ lastAttemptAt: Date.parse('2026-10-18T10:00:00Z') });
    const matches = findCandidateMatches(s, [
      { id: 1, created_at: '2026-10-18T10:00:05Z', total_amount: '54.00', customer_phone: '', source: 'pos' },
      { id: 2, created_at: '2026-10-18T12:00:00Z', total_amount: '54.00', customer_phone: '', source: 'pos' },
      { id: 3, created_at: '2026-10-18T10:00:05Z', total_amount: '54.00', customer_phone: '', source: 'online' },
    ]);
    expect(matches.map((m) => m.id)).toEqual([1]);
  });
});

describe('classifyError', () => {
  it('distinguishes definitive, ambiguous and retryable failures', () => {
    expect(classifyError(httpError(400)).kind).toBe('conflict');
    expect(classifyError(httpError(502)).kind).toBe('unknown');
    expect(classifyError(httpError(429)).kind).toBe('retry-later');
    expect(classifyError(httpError(403)).kind).toBe('auth');
    expect(classifyError(networkError()).kind).toBe('unknown');
  });
});
