/* Remont BT Mini App service worker.
 * Release strategy: versioned assets + cache-busting network requests.
 * HTML navigation is always network-first and is never stored with user/session query parameters.
 */
const RELEASE = '20261018-audit3';
const CACHE_NAME = `remont-bt-miniapp-${RELEASE}`;
const CACHE_PREFIX = 'remont-bt-miniapp-';
const LOCAL_FILES = [
  './offline.html',
  './css/style.css?v=20261018-audit3',
  './js/advertiser-config.js?v=20261018-audit3',
  './js/common.js?v=20261018-audit3',
  './js/client.js?v=20261018-audit3',
  './js/master.js?v=20261018-audit3',
  './js/advertiser.js?v=20261018-audit3',
  './manifest.webmanifest?v=20261018-audit3'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(LOCAL_FILES.map(async path => {
      try {
        const fetchUrl = new URL(path, self.registration.scope);
        fetchUrl.searchParams.set('__rbv', RELEASE);
        const response = await fetch(fetchUrl.toString(), {cache: 'no-store'});
        if (response && response.ok) {
          const cacheUrl = new URL(path, self.registration.scope);
          cacheUrl.search = '';
          cacheUrl.hash = '';
          await cache.put(new Request(cacheUrl.toString()), response);
        }
      } catch (_) {
        // Offline/temporary CDN failures must not prevent the new worker installing.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname.toLowerCase();
  // Never intercept API responses or non-static requests.
  if (path.includes('/api/') || request.destination === 'document') {
    if (request.destination === 'document') {
      const networkUrl = new URL(request.url);
      networkUrl.searchParams.set('__rbv', RELEASE);
      event.respondWith(fetch(new Request(networkUrl.toString(), {
        method: 'GET',
        headers: request.headers,
        credentials: request.credentials,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        cache: 'no-store'
      })).catch(async () => {
        const offline = await caches.match('./offline.html');
        return offline || new Response('Нет подключения к интернету. Подключитесь и откройте приложение снова.', {
          status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
        });
      }));
    }
    return;
  }

  const isStaticAsset = /\.(html|js|css|webmanifest)$/.test(path);
  if (!isStaticAsset) return;

  // A unique query parameter bypasses stale CDN/browser copies after each release.
  const networkUrl = new URL(request.url);
  networkUrl.searchParams.set('__rbv', RELEASE);
  event.respondWith(fetch(new Request(networkUrl.toString(), {
    method: 'GET',
    headers: request.headers,
    mode: request.mode,
    credentials: request.credentials,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    cache: 'no-store'
  })).then(async response => {
    if (response && response.ok) {
      // Store static assets under a query-free key; never store authenticated page URLs.
      const cleanUrl = new URL(request.url);
      cleanUrl.search = '';
      cleanUrl.hash = '';
      const cache = await caches.open(CACHE_NAME);
      await cache.put(new Request(cleanUrl.toString()), response.clone()).catch(() => {});
    }
    return response;
  }).catch(async () => {
    const cleanUrl = new URL(request.url);
    cleanUrl.search = '';
    cleanUrl.hash = '';
    const cached = await caches.match(new Request(cleanUrl.toString()));
    if (cached) return cached;
    return new Response('', {status: 503, statusText: 'Offline'});
  }));
});
