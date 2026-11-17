/* Firebase Cloud Messaging service worker for the vendor portal.
 *
 * Registered by src/services/push/fcm.ts with the (public) Firebase web config in its query string, under the
 * scope /firebase-cloud-messaging-push-scope so it never controls the app's own pages.
 *
 * - Pushes with a `notification` block (what api-services sends for new orders and bookings) are shown by the
 *   Firebase SDK itself; clicking opens their `webpush.fcm_options.link`.
 * - Data-only pushes are shown here; clicking opens `data.link` (same-origin paths only).
 */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  firebase.messaging().onBackgroundMessage((payload) => {
    if (payload.notification) return; // shown by the SDK
    const data = payload.data || {};
    return self.registration.showNotification(data.title || 'TheNearByShop', {
      body: data.message || data.body || '',
      icon: '/favicon.svg',
      tag: data.type && (data.vendor_order_id || data.booking_id) ? `${data.type}-${data.vendor_order_id || data.booking_id}` : undefined,
      data: { link: data.link || '/notifications' },
    });
  });
}

/** Only ever navigate within the portal: an absolute link to another site is reduced to its path. */
function safePath(link) {
  try {
    const url = new URL(link || '/notifications', self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search : url.pathname;
  } catch (e) {
    return '/notifications';
  }
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  if (data.FCM_MSG) return; // the SDK handles clicks on notifications it showed
  event.notification.close();
  const path = safePath(data.link);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if (new URL(win.url).origin === self.location.origin && 'focus' in win) {
          win.navigate(path);
          return win.focus();
        }
      }
      return self.clients.openWindow(path);
    }),
  );
});
