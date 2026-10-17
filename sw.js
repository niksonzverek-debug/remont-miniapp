/* Remont BT Mini App cache policy.
 * Navigations and executable/style assets are network-first so deployed fixes are
 * picked up on the next open. Cache is only a fallback for offline use.
 */
const CACHE_NAME = 'remont-bt-miniapp-v2-fresh';
const LOCAL_FILES = [
  './', './index.html', './client.html', './advertiser.html',
  './css/style.css', './js/common.js', './js/client.js', './js/master.js',
  './js/advertiser.js', './js/advertiser-config.js', './manifest.webmanifest',
  './offline.html'
];
const NETWORK_FIRST_EXTENSIONS = /\.(?:html?|js|mjs|css|json|webmanifest)$/i;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_FILES.map(path => new Request(path, {cache: 'reload'}))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('remont-bt-miniapp-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always bypass caches for API-like URLs; never retain personal/account data.
  if (/\/api(?:\/|$)/i.test(url.pathname)) {
    event.respondWith(fetch(new Request(request, {cache: 'no-store'})));
    return;
  }

  const isNavigation = request.mode === 'navigate';
  const isRefreshableAsset = isNavigation || NETWORK_FIRST_EXTENSIONS.test(url.pathname);
  if (isRefreshableAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(new Request(request, {cache: 'no-store'}));
        if (response && response.ok && response.type !== 'opaque') {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(request, {ignoreSearch: true});
        if (cached) return cached;
        if (isNavigation) {
          return (await cache.match('./offline.html')) || (await cache.match('./index.html')) || new Response('Offline', {status: 503, statusText: 'Offline'});
        }
        return new Response('', {status: 503, statusText: 'Offline'});
      }
    })());
    return;
  }

  // Cache-first is retained only for non-executable static media.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
    return response;
  })());
});
