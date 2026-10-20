/* Remont BT Service Worker — 20261020-client-chat-orders-v3
 * Network-first for navigation and static assets; cache is only an offline fallback.
 * Only this app's own caches are cleaned. API and user-specific requests are never cached.
 */
const RELEASE = '20261020-client-chat-orders-v3';
const CACHE_NAME = `remont-bt-miniapp-${RELEASE}`;
const CACHE_PREFIX = 'remont-bt-miniapp-';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/advertiser-config.js',
  './js/common.js',
  './js/client.js',
  './js/master.js',
  './js/advertiser.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(STATIC_ASSETS.map(async path => {
      try {
        const url = new URL(path, self.registration.scope);
        url.searchParams.set('__rb_release', RELEASE);
        const response = await fetch(url.href, { cache: 'no-store' });
        if (response.ok) {
          const key = new URL(path, self.registration.scope);
          key.search = '';
          await cache.put(key.href, response);
        }
      } catch (error) {
        // Keep installation possible during temporary CDN/network failures.
        console.warn('[Remont BT SW] Precache skipped:', path, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_APP_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key)));
      if (event.source && event.source.postMessage) event.source.postMessage({type: 'APP_CACHE_CLEARED'});
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* REMONT_BT_ADVERTISER_CONFIG_NETWORK_FIRST */
  if (request.method === 'GET' && new URL(request.url).pathname.endsWith('/js/advertiser-config.js')) {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
    return;
  }
  const path = url.pathname.toLowerCase();
  if (path.includes('/api/')) return; // never cache API responses

  const isNavigation = request.mode === 'navigate' || request.destination === 'document';
  const isStatic = /\.(html|js|css|webmanifest)$/.test(path);
  if (!isNavigation && !isStatic) return;

  event.respondWith((async () => {
    const networkUrl = new URL(request.url);
    networkUrl.searchParams.set('__rb_release', RELEASE);
    try {
      const response = await fetch(new Request(networkUrl.href, {
        method: 'GET',
        headers: request.headers,
        credentials: request.credentials,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        cache: 'no-store'
      }));
      if (response && response.ok && isStatic && !isNavigation) {
        const clean = new URL(request.url);
        clean.search = '';
        clean.hash = '';
        const cache = await caches.open(CACHE_NAME);
        await cache.put(clean.href, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      const clean = new URL(request.url);
      clean.search = '';
      clean.hash = '';
      const cached = await caches.match(clean.href);
      if (cached) return cached;
      if (isNavigation) {
        const fallback = await caches.match(new URL('./index.html', self.registration.scope).href);
        if (fallback) return fallback;
      }
      return new Response('Нет подключения к интернету. Проверьте соединение и откройте приложение снова.', {
        status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
      });
    }
  })());
});
