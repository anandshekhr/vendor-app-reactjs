/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VENDOR_API_BASE_URL?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_OFFLINE_PAYMENT_METHODS?: string;
  readonly VITE_POS_STALE_CATALOGUE_MINUTES?: string;
  readonly VITE_POS_SERVER_IDEMPOTENCY?: string;
  readonly VITE_POLL_INTERVAL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
