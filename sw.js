const CACHE_NAME = 'remont-bt-miniapp-masterflow-20261018-v1';
const LOCAL_FILES = [
  './', './index.html', './client.html', './advertiser.html',
  './css/style.css', './js/common.js', './js/client.js', './js/master.js',
  './js/advertiser.js', './js/advertiser-config.js', './manifest.webmanifest'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_FILES.map(path => new Request(path, {cache: 'reload'})).filter(Boolean))).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.toLowerCase();
  // Never cache API responses or user-specific data.
  if (path.includes('/api/')) return;
  const isAppAsset = request.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(path);
  if (!isAppAsset) return;
  // Network-first: current client/master screens and scripts win; cache is offline fallback only.
  event.respondWith(fetch(new Request(request, { cache: 'no-store' })).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return (await caches.match('./client.html')) || (await caches.match('./index.html')) || new Response('Офлайн', {status: 503});
    }
    return new Response('', {status: 503, statusText: 'Offline'});
  }));
});
