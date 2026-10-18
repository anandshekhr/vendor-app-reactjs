import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '@/services/api';
import { onSessionExpired } from '@/services/api/client';
import authReducer, { signedOut } from '@/features/auth/authSlice';
import uiReducer from './uiSlice';
import posReducer from '@/features/pos/posSlice';
import notificationsReducer from '@/features/notifications/notificationsSlice';

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  auth: authReducer,
  ui: uiReducer,
  pos: posReducer,
  notifications: notificationsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
    middleware: (getDefault) => getDefault({ serializableCheck: { ignoredActions: ['api/executeMutation/pending'] } }).concat(api.middleware),
  });
  setupListeners(store.dispatch);
  return store;
}

export const store = makeStore();

onSessionExpired(() => {
  if (store.getState().auth.status !== 'anonymous') {
    store.dispatch(signedOut('Your session has expired. Please sign in again.'));
    store.dispatch(api.util.resetApiState());
  }
});

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
