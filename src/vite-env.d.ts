/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VENDOR_API_BASE_URL?: string;
  readonly VITE_WS_BASE_URL?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_OFFLINE_PAYMENT_METHODS?: string;
  readonly VITE_POS_STALE_CATALOGUE_MINUTES?: string;
  readonly VITE_POS_SERVER_IDEMPOTENCY?: string;
  readonly VITE_POLL_INTERVAL_MS?: string;
  /** Firebase web config for push notifications (public, not secret). Push is off when unset. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Web Push certificate key pair (Firebase console → Cloud Messaging → Web configuration). */
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  /** Vendor support contact on the Help page (optional; each is hidden when unset). */
  readonly VITE_SUPPORT_PHONE?: string;
  readonly VITE_SUPPORT_WHATSAPP?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  /** e.g. "Mon–Sat, 9 AM – 7 PM". */
  readonly VITE_SUPPORT_HOURS?: string;
  /** Release version, set by the Docker build (Jenkins). */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
