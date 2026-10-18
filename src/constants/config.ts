const env = import.meta.env;

function trimSlash(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const apiBaseUrl = trimSlash(env.VITE_API_BASE_URL);

export const config = {
  apiBaseUrl,
  vendorApiBaseUrl: trimSlash(env.VITE_VENDOR_API_BASE_URL) || apiBaseUrl,
  useMockApi: env.VITE_USE_MOCK_API === 'true',
  googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  offlinePaymentMethods: (env.VITE_OFFLINE_PAYMENT_METHODS ?? 'cash')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean),
  posStaleCatalogueMinutes: num(env.VITE_POS_STALE_CATALOGUE_MINUTES, 60),
  posServerIdempotency: env.VITE_POS_SERVER_IDEMPOTENCY === 'true',
  pollIntervalMs: num(env.VITE_POLL_INTERVAL_MS, 20000),
} as const;

export type AppConfig = typeof config;
