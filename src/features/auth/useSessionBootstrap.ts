import { useEffect } from 'react';
import { profileApi } from '@/features/profile/api';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { isApiError } from '@/services/api/errors';
import { businessLoaded, offlineSessionResumed, signedOut } from './authSlice';
import { businessTypeFromShop } from './capabilities';

/**
 * Resolves the vendor's shop and business type after login or on reload. When the network is unavailable and a
 * cached business snapshot exists, the session resumes in offline mode (so the POS keeps working).
 */
export function useSessionBootstrap() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const cached = useAppSelector((s) => s.auth.business);
  const phone = useAppSelector((s) => s.auth.phone);

  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    (async () => {
      const shopReq = dispatch(profileApi.endpoints.getShopProfile.initiate(undefined, { forceRefetch: true }));
      const meReq = dispatch(profileApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }));
      try {
        const [shop, me] = await Promise.all([shopReq.unwrap(), meReq.unwrap()]);
        if (cancelled) return;
        const type = businessTypeFromShop(shop);
        const loc = me.shop?.location;
        const doc = me.shop?.documents?.[0];
        dispatch(
          businessLoaded({
            shopId: shop.id,
            shopName: shop.name,
            businessName: me.business_name || shop.name,
            businessType: type ?? 'product',
            address: me.shop?.address ?? '',
            phone: me.user?.phone_number || phone,
            gstin: doc?.gstin ?? '',
            isVerified: Boolean(me.is_verified),
            latitude: loc?.latitude != null ? Number(loc.latitude) : null,
            longitude: loc?.longitude != null ? Number(loc.longitude) : null,
            cachedAt: Date.now(),
          }),
        );
      } catch (error) {
        if (cancelled) return;
        if (isApiError(error) && error.isNetworkError && cached) {
          dispatch(offlineSessionResumed());
        } else if (isApiError(error) && error.status === 403) {
          dispatch(signedOut('This account is not registered as a vendor with an active shop. Complete onboarding or contact support.'));
        } else if (isApiError(error) && error.status === 401) {
          dispatch(signedOut('Your session has expired. Please sign in again.'));
        } else if (cached) {
          dispatch(offlineSessionResumed());
        } else {
          dispatch(signedOut(isApiError(error) ? error.message : 'Could not load your vendor profile.'));
        }
      } finally {
        shopReq.unsubscribe();
        meReq.unsubscribe();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, dispatch, cached, phone]);
}
