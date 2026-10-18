import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { clearOfflineData } from '@/services/offline/db';
import { useAppDispatch } from '@/hooks/store';
import { resetNotifications } from '@/features/notifications/notificationsSlice';
import { cartCleared } from '@/features/pos/posSlice';
import { useLogoutMutation } from './api';
import { signedOut } from './authSlice';

export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  return useCallback(async () => {
    // Best effort: the server only clears its Django session (JWTs are not blacklisted — API_MAPPING G-1).
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
