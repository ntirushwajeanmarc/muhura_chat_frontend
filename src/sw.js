import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Required for vite-plugin-pwa "Update now" — without this the prompt loops forever
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const denylist = [/^\/api/, /^\/socket\.io/, /^\/uploads/];
const handler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(handler, { denylist }));

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  let data = { title: 'EganirA', body: 'New notification', type: 'message' };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    /* ignore malformed payload */
  }

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const hasHiddenClient = clients.some((client) => client.visibilityState === 'hidden');
  const isCall = data.type === 'call';

  for (const client of clients) {
    client.postMessage({
      type: 'eganira_alert',
      playSound: isCall,
      alertType: data.type,
      roomId: data.roomId,
      callId: data.callId,
    });
  }

  // Show OS notification when app is closed, backgrounded, or for incoming calls
  if (clients.length === 0 || hasHiddenClient || isCall) {
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: isCall ? `call-${data.callId}` : `room-${data.roomId}`,
      data: {
        type: data.type,
        roomId: data.roomId,
        callId: data.callId,
        fromUserId: data.fromUserId,
        url: data.url || '/',
      },
      silent: !isCall,
      renotify: isCall,
    };

    if (isCall) {
      options.requireInteraction = true;
      options.vibrate = data.vibrate || [300, 100, 300, 100, 300, 100, 600];
    }

    await self.registration.showNotification(data.title, options);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'eganira_notification', ...data });
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
