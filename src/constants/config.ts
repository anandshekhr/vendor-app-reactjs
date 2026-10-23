const env = import.meta.env;

function trimSlash(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const apiBaseUrl = trimSlash(env.VITE_API_BASE_URL);

/** ws(s) origin for Django Channels; defaults to the API origin with the scheme swapped. */
function wsBase(): string {
  const explicit = trimSlash(env.VITE_WS_BASE_URL);
  if (explicit) return explicit;
  if (/^https?:\/\//.test(apiBaseUrl)) return apiBaseUrl.replace(/^http/, 'ws');
  return '';
}

export const config = {
  apiBaseUrl,
  /** POS and all vendor endpoints are served by api-services; override only for a split deployment. */
  vendorApiBaseUrl: trimSlash(env.VITE_VENDOR_API_BASE_URL) || apiBaseUrl,
  wsBaseUrl: env.VITE_USE_MOCK_API === 'true' ? '' : wsBase(),
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
