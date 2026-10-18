import { useCallback, useEffect, useRef } from 'react';
import { config } from '@/constants/config';
import { api } from '@/services/api';
import { clients } from '@/services/api/client';
import { db } from '@/services/offline/db';
import { recoverInterruptedSales, syncPendingSales, type SyncReport } from '@/services/offline/syncEngine';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useCapabilities } from '@/hooks/useCapabilities';
import { pushToast } from '@/app/uiSlice';
import { notificationsAdded } from '@/features/notifications/notificationsSlice';
import type { PosCheckoutRequest, VendorOrderFull } from '@/types/api';
import { refreshCatalogue } from './catalogue';

export async function checkoutRequest(request: PosCheckoutRequest, idempotencyKey: string): Promise<VendorOrderFull> {
  const res = await clients.vendor.post<VendorOrderFull>('/api/v2/vendors/pos/checkout/', request, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return res.data;
}

export async function runSync(shopId: number): Promise<SyncReport> {
  return syncPendingSales({ shopId, checkout: checkoutRequest, serverIdempotent: config.posServerIdempotency });
}

/** Mounted once in the app shell: recovers interrupted syncs and drains the offline queue when online. */
export function useOfflineSync() {
  const dispatch = useAppDispatch();
  const { can } = useCapabilities();
  const authenticated = useAppSelector((s) => s.auth.status === 'authenticated');
  const shopId = useAppSelector((s) => s.auth.business?.shopId ?? null);
  const running = useRef(false);

  const sync = useCallback(async () => {
    if (running.current || !navigator.onLine || shopId === null) return;
    running.current = true;
    try {
      const pending = await db.sales.where({ status: 'pending', shopId }).count();
      if (pending === 0 && !config.posServerIdempotency) return;
      const report = await runSync(shopId);
      if (report.attempted === 0) return;
      const notes = [];
      if (report.synced) notes.push(`${report.synced} synced`);
      if (report.conflicts) notes.push(`${report.conflicts} rejected by server`);
      if (report.unknown) notes.push(`${report.unknown} need review`);
      dispatch(
        pushToast({
          tone: report.conflicts || report.unknown ? 'warning' : 'success',
          title: 'Offline sales sync',
          description: notes.join(' · '),
        }),
      );
      if (report.conflicts || report.unknown) {
        dispatch(
          notificationsAdded([
            {
              id: `sync-${Date.now()}`,
              category: 'sync',
              title: 'Offline sales need attention',
              body: notes.join(' · '),
              link: '/pos/sales?tab=offline',
              createdAt: Date.now(),
            },
          ]),
        );
      }
      if (report.synced) {
        dispatch(api.util.invalidateTags(['Stock', 'Dashboard', { type: 'PosSales', id: 'LIST' }, { type: 'Products', id: 'LIST' }]));
        // Authoritative stock and prices after the queue drained.
        await refreshCatalogue().catch(() => undefined);
      }
    } finally {
      running.current = false;
    }
  }, [dispatch, shopId]);

  useEffect(() => {
    if (!authenticated || !can('pos')) return;
    recoverInterruptedSales(db, config.posServerIdempotency).then(() => sync());
    const id = window.setInterval(sync, Math.max(30000, config.pollIntervalMs));
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
    };
  }, [authenticated, can, sync]);

  return sync;
}
