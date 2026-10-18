import { render } from '@testing-library/react';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { makeStore } from '@/app/store';
import { routes } from '@/app/router';
import { installMockAdapter } from '@/services/api/client';
import { createMockAdapter } from '@/services/api/mock';
import { createMockDb, type MockDb } from '@/services/api/mock/data';
import { tokenStorage } from '@/services/auth/tokenStorage';

export interface RenderOptions {
  authenticated?: boolean;
  businessType?: 'product' | 'service';
  /** Override individual mock responses: return undefined to fall through to the mock. */
  adapterOverride?: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> | undefined;
}

export function renderApp(path: string, opts: RenderOptions = {}) {
  if (opts.businessType === 'service') localStorage.setItem('tnbs.mock.type', 'service');
  const db: MockDb = createMockDb();
  const base = createMockAdapter(db);
  installMockAdapter(opts.adapterOverride ? (cfg) => opts.adapterOverride!(cfg) ?? base(cfg) : base);
  if (opts.authenticated) {
    tokenStorage.setRefresh('test-refresh');
    tokenStorage.setSession({ userId: 1, vendorId: 1, phone: '9876500000' });
  } else {
    tokenStorage.clear();
  }
  const store = makeStore();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <AppProviders store={store}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, store, router, db };
}
