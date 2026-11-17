import { useSyncExternalStore } from 'react';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type MessagePayload, type Messaging } from 'firebase/messaging';
import { clients } from '@/services/api/client';

/**
 * Push notifications (Firebase Cloud Messaging) for the vendor portal.
 *
 * The browser's FCM token is registered with api-services (`POST /api/v2/notifications/device/register/`,
 * app_type `web`, role `vendor`), which already pushes to every active token of a vendor when a new order or
 * booking arrives. The token is re-registered on every app start (tokens rotate, and a different vendor may sign
 * in on the same browser) and deactivated on sign-out.
 *
 * The Firebase web config is public (it identifies the project, it is not a secret); it comes from VITE_FIREBASE_*
 * at build time. Without it push is simply unavailable.
 */
const env = import.meta.env;
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};
const vapidKey = env.VITE_FIREBASE_VAPID_KEY ?? '';

export const pushConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey);

export const SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const ENABLED_KEY = 'tnbs.push.enabled';
const DEVICE_KEY = 'tnbs.push.deviceId';
const APP_TYPE = 'web';
const ROLE = 'vendor';

export type PushStatus = 'unconfigured' | 'unsupported' | 'denied' | 'off' | 'on' | 'working';

function storage(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
  return null;
}

/** A stable id for this browser, so the server can switch this device off on sign-out. */
export function deviceId(): string {
  let id = storage(DEVICE_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    storage(DEVICE_KEY, id);
  }
  return id;
}

// ─── Status store (for the Settings toggle) ─────────────────────────────────

let status: PushStatus = 'off';
const listeners = new Set<() => void>();
function setStatus(next: PushStatus) {
  status = next;
  listeners.forEach((l) => l());
}
export function usePushStatus(): PushStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

async function browserSupportsPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/** Works out the current state without prompting the user. */
export async function refreshPushStatus(): Promise<PushStatus> {
  if (!pushConfigured()) setStatus('unconfigured');
  else if (!(await browserSupportsPush())) setStatus('unsupported');
  else if (Notification.permission === 'denied') setStatus('denied');
  else setStatus(storage(ENABLED_KEY) === '1' && Notification.permission === 'granted' ? 'on' : 'off');
  return status;
}

// ─── Firebase plumbing ──────────────────────────────────────────────────────

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let unsubscribeForeground: (() => void) | null = null;

function getMessagingInstance(): Messaging {
  if (!app) app = initializeApp(firebaseConfig, 'vendor-push');
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

async function serviceWorker(): Promise<ServiceWorkerRegistration> {
  const query = new URLSearchParams(firebaseConfig).toString();
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`, { scope: SW_SCOPE });
}

async function currentToken(): Promise<string> {
  const registration = await serviceWorker();
  return getToken(getMessagingInstance(), { vapidKey, serviceWorkerRegistration: registration });
}

async function registerWithServer(token: string) {
  await clients.main.post('/api/v2/notifications/device/register/', { fcm_token: token, app_type: APP_TYPE, role: ROLE, device_id: deviceId() });
}

/** Push messages that arrive while the portal is open and focused (the browser shows nothing for those). */
export type ForegroundHandler = (payload: MessagePayload) => void;
let foregroundHandler: ForegroundHandler | null = null;
export function setForegroundHandler(handler: ForegroundHandler | null) {
  foregroundHandler = handler;
}

function listenInForeground() {
  if (unsubscribeForeground) return;
  unsubscribeForeground = onMessage(getMessagingInstance(), (payload) => foregroundHandler?.(payload));
}

/** Asks for permission (needs a user click), then registers this browser. */
export async function enablePush(): Promise<PushStatus> {
  if ((await refreshPushStatus()) === 'unconfigured' || status === 'unsupported') return status;
  setStatus('working');
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'off');
      return status;
    }
    await registerWithServer(await currentToken());
    storage(ENABLED_KEY, '1');
    listenInForeground();
    setStatus('on');
  } catch (err) {
    setStatus('off');
    throw err;
  }
  return status;
}

/** On app start (signed in): if push was switched on here, register the current token for this vendor again. */
export async function syncPush(): Promise<void> {
  if ((await refreshPushStatus()) !== 'on') return;
  try {
    await registerWithServer(await currentToken());
    listenInForeground();
  } catch {
    /* retried on the next start; the toggle still shows the preference */
  }
}

/** Switches push off on this device: tells the server, then drops the token. */
export async function disablePush(opts: { keepPreference?: boolean } = {}): Promise<void> {
  if (!opts.keepPreference) storage(ENABLED_KEY, null);
  try {
    await clients.main.post('/api/v2/notifications/device/deactivate/', { app_type: APP_TYPE, role: ROLE, device_id: deviceId() });
  } catch {
    /* not registered, or offline: the token is removed below anyway */
  }
  if (!opts.keepPreference && messaging) {
    await deleteToken(messaging).catch(() => false);
    unsubscribeForeground?.();
    unsubscribeForeground = null;
  }
  await refreshPushStatus();
}

/** Called on sign-out: stop pushes for this vendor on this device, but remember the device's choice. */
export async function deactivateOnSignOut(): Promise<void> {
  if (!pushConfigured() || storage(ENABLED_KEY) !== '1') return;
  await disablePush({ keepPreference: true });
}
