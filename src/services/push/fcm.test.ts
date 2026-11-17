import { beforeEach, describe, expect, it, vi } from 'vitest';

const posts: { url: string; body: unknown }[] = [];
vi.mock('@/services/api/client', () => ({
  clients: { main: { post: vi.fn(async (url: string, body: unknown) => posts.push({ url, body })) } },
}));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
const deleteToken = vi.fn(async () => true);
vi.mock('firebase/messaging', () => ({
  isSupported: vi.fn(async () => true),
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(async () => 'fcm-token-1'),
  deleteToken: (...args: unknown[]) => deleteToken(...(args as [])),
  onMessage: vi.fn(() => () => undefined),
}));

function stubBrowser(permission: NotificationPermission, answer: NotificationPermission = permission) {
  vi.stubGlobal('Notification', Object.assign(function () {}, { permission, requestPermission: vi.fn(async () => answer) }));
  vi.stubGlobal('PushManager', function () {});
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: vi.fn(async () => ({})) } });
}

async function load(configured = true) {
  vi.resetModules();
  for (const [k, v] of Object.entries({
    VITE_FIREBASE_API_KEY: 'k',
    VITE_FIREBASE_PROJECT_ID: 'p',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '1',
    VITE_FIREBASE_APP_ID: 'a',
    VITE_FIREBASE_VAPID_KEY: 'v',
  })) vi.stubEnv(k, configured ? v : '');
  return import('./fcm');
}

describe('push notifications', () => {
  beforeEach(() => {
    posts.length = 0;
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('is unavailable without the Firebase config', async () => {
    stubBrowser('default');
    const fcm = await load(false);
    expect(await fcm.refreshPushStatus()).toBe('unconfigured');
    expect(await fcm.enablePush()).toBe('unconfigured');
    expect(posts).toHaveLength(0);
  });

  it('asks for permission, then registers this browser as a vendor web device', async () => {
    stubBrowser('default', 'granted');
    const fcm = await load();
    expect(await fcm.enablePush()).toBe('on');
    expect(posts[0].url).toBe('/api/v2/notifications/device/register/');
    expect(posts[0].body).toMatchObject({ fcm_token: 'fcm-token-1', app_type: 'web', role: 'vendor', device_id: fcm.deviceId() });
    expect(fcm.deviceId()).toMatch(/^web-/);
  });

  it('stays off when the user blocks notifications', async () => {
    stubBrowser('default', 'denied');
    const fcm = await load();
    expect(await fcm.enablePush()).toBe('denied');
    expect(posts).toHaveLength(0);
  });

  it('re-registers on start only when switched on, and sign-out keeps the choice', async () => {
    stubBrowser('granted');
    const fcm = await load();
    await fcm.syncPush();
    expect(posts).toHaveLength(0); // never switched on here
    await fcm.enablePush();
    posts.length = 0;
    await fcm.syncPush();
    expect(posts.map((p) => p.url)).toEqual(['/api/v2/notifications/device/register/']);
    await fcm.deactivateOnSignOut();
    expect(posts.at(-1)!.url).toBe('/api/v2/notifications/device/deactivate/');
    expect(deleteToken).not.toHaveBeenCalled();
    expect(await fcm.refreshPushStatus()).toBe('on');
  });

  it('turning it off deactivates the device and deletes the token', async () => {
    stubBrowser('granted');
    const fcm = await load();
    await fcm.enablePush();
    await fcm.disablePush();
    expect(posts.at(-1)!.body).toMatchObject({ app_type: 'web', role: 'vendor' });
    expect(deleteToken).toHaveBeenCalled();
    expect(await fcm.refreshPushStatus()).toBe('off');
  });
});
