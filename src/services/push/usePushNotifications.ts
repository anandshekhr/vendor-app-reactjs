import { useEffect } from 'react';
import { api } from '@/services/api';
import { useAppDispatch } from '@/hooks/store';
import { useToast } from '@/hooks/useToast';
import { setForegroundHandler, syncPush } from './fcm';

/**
 * Keeps this device's push registration current for the signed-in vendor, and handles pushes that arrive while the
 * portal is open (the browser shows nothing for those): a toast, and fresh order/booking lists.
 */
export function usePushNotifications() {
  const dispatch = useAppDispatch();
  const toast = useToast();

  useEffect(() => {
    setForegroundHandler((payload) => {
      const title = payload.notification?.title ?? payload.data?.title ?? 'New notification';
      const body = payload.notification?.body ?? payload.data?.message ?? payload.data?.body;
      toast.info(title, body);
      const type = payload.data?.type;
      dispatch(api.util.invalidateTags(['Notifications']));
      if (type === 'new_order') dispatch(api.util.invalidateTags([{ type: 'Orders', id: 'LIST' }, 'Dashboard']));
      if (type === 'new_booking') dispatch(api.util.invalidateTags([{ type: 'Bookings', id: 'LIST' }, 'ServiceDashboard']));
    });
    void syncPush();
    return () => setForegroundHandler(null);
  }, [dispatch, toast]);
}
