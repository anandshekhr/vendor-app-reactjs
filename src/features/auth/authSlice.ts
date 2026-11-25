import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { BusinessSnapshot } from './businessCache';
import { loadBusinessSnapshot, saveBusinessSnapshot } from './businessCache';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthState {
  status: AuthStatus;
  userId: number | null;
  vendorId: number | null;
  phone: string;
  business: BusinessSnapshot | null;
  /** Message shown on the login screen after an involuntary sign-out. */
  signOutReason: string | null;
}

function initialState(): AuthState {
  const session = tokenStorage.getSession();
  const hasRefresh = Boolean(tokenStorage.getRefresh());
  return {
    status: session && hasRefresh ? 'checking' : 'anonymous',
    userId: session?.userId ?? null,
    vendorId: session?.vendorId ?? null,
    phone: session?.phone ?? '',
    business: session && hasRefresh ? loadBusinessSnapshot() : null,
    signOutReason: null,
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, action: PayloadAction<{ userId: number; vendorId: number | null; phone: string }>) {
      state.status = 'checking';
      state.userId = action.payload.userId;
      state.vendorId = action.payload.vendorId;
      state.phone = action.payload.phone;
      state.signOutReason = null;
    },
    businessLoaded(state, action: PayloadAction<BusinessSnapshot>) {
      state.business = action.payload;
      state.status = 'authenticated';
      saveBusinessSnapshot(action.payload);
    },
    /** The shop's categories changed what it offers (product / service / hybrid): the menu follows at once. */
    businessTypeChanged(state, action: PayloadAction<BusinessSnapshot['businessType']>) {
      if (!state.business) return;
      state.business = { ...state.business, businessType: action.payload };
      saveBusinessSnapshot(state.business);
    },
    /** The shop gained (or lost) its print shop profile, e.g. after adding the printing category. */
    printShopChanged(state, action: PayloadAction<boolean>) {
      if (!state.business || Boolean(state.business.isPrintShop) === action.payload) return;
      state.business = { ...state.business, isPrintShop: action.payload };
      saveBusinessSnapshot(state.business);
    },
    /** Network unavailable but a cached business snapshot exists: allow offline use (POS). */
    offlineSessionResumed(state) {
      if (state.business) state.status = 'authenticated';
    },
    signedOut(state, action: PayloadAction<string | null | undefined>) {
      tokenStorage.clear();
      saveBusinessSnapshot(null);
      state.status = 'anonymous';
      state.userId = null;
      state.vendorId = null;
      state.phone = '';
      state.business = null;
      state.signOutReason = action.payload ?? null;
    },
  },
});

export const { signedIn, businessLoaded, businessTypeChanged, printShopChanged, offlineSessionResumed, signedOut } = authSlice.actions;
export default authSlice.reducer;
