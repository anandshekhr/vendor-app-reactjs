import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { clearOfflineData } from '@/services/offline/db';
import { useAppDispatch } from '@/hooks/store';
import { resetNotifications } from '@/features/notifications/notificationsSlice';
import { cartCleared } from '@/features/pos/posSlice';
import { deactivateOnSignOut } from '@/services/push/fcm';
import { useLogoutMutation } from './api';
import { signedOut } from './authSlice';

export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  return useCallback(async () => {
    // While still signed in: stop this device getting this vendor's pushes (the next person may be someone else).
    await deactivateOnSignOut().catch(() => undefined);
    // Best effort: the server ends its session and revokes the refresh token; local sign-out proceeds regardless.
    try {
      await logout().unwrap();
    } catch {
      /* ignore — local sign-out proceeds regardless */
    }
    // Catalogue/journal are wiped; unsynced sales are kept so money is never lost (they re-appear for the next login).
    await clearOfflineData().catch(() => 0);
    dispatch(cartCleared());
    dispatch(resetNotifications());
    dispatch(signedOut(null));
    dispatch(api.util.resetApiState());
    navigate('/login', { replace: true });
  }, [dispatch, logout, navigate]);
}
