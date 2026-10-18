import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { config } from '@/constants/config';
import { tokenStorage } from '@/services/auth/tokenStorage';

export type ApiTarget = 'main' | 'vendor';

type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();

/** The store subscribes here so the API layer stays free of Redux imports. */
export function onSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function emitSessionExpired() {
  sessionExpiredListeners.forEach((l) => l());
}

const REFRESH_PATH = '/api/v2/token/refresh/';

let refreshInFlight: Promise<string | null> | null = null;

/** Single-flight refresh: concurrent 401s share one refresh request. */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return Promise.resolve(null);
  refreshInFlight = axios
    .post<{ access: string; refresh?: string }>(`${config.apiBaseUrl}${REFRESH_PATH}`, { refresh }, { timeout: 15000, adapter: mockAdapter ?? undefined })
    .then((res) => {
      tokenStorage.setAccess(res.data.access);
      if (res.data.refresh) tokenStorage.setRefresh(res.data.refresh);
      return res.data.access;
    })
    .catch((error: unknown) => {
      // Only a definitive rejection of the refresh token ends the session; network errors keep it (offline POS).
      if (error instanceof AxiosError && error.response && [400, 401, 403].includes(error.response.status)) {
        tokenStorage.clear();
        emitSessionExpired();
      }
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
  skipAuth?: boolean;
}

// Set by the mock module when VITE_USE_MOCK_API=true (development only).
let mockAdapter: ((config: InternalAxiosRequestConfig) => Promise<any>) | null = null;
export function installMockAdapter(adapter: typeof mockAdapter) {
  mockAdapter = adapter;
  clients.main.defaults.adapter = adapter ?? undefined;
  clients.vendor.defaults.adapter = adapter ?? undefined;
}

function createClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: { Accept: 'application/json' },
  });

  instance.interceptors.request.use(async (req: RetriableConfig) => {
    if (req.skipAuth) return req;
    let token = tokenStorage.getAccess();
    if (!token && tokenStorage.getRefresh() && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      token = await refreshAccessToken();
    }
    if (token) req.headers.set('Authorization', `Bearer ${token}`);
    return req;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      const status = error.response?.status;
      const data = error.response?.data as { code?: string; detail?: string } | undefined;
      const tokenProblem = status === 401 || (status === 403 && data?.code === 'token_not_valid');
      if (original && tokenProblem && !original._retried && !original.skipAuth) {
        original._retried = true;
        const token = await refreshAccessToken();
        if (token) {
          original.headers.set('Authorization', `Bearer ${token}`);
          return instance.request(original);
        }
        if (!tokenStorage.getRefresh()) emitSessionExpired();
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

export const clients: Record<ApiTarget, AxiosInstance> = {
  main: createClient(config.apiBaseUrl),
  vendor: createClient(config.vendorApiBaseUrl),
};

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}
