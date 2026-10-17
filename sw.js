const CACHE_NAME = 'remont-bt-miniapp-v20261017-3';
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
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
/* REMONT_BT_ADVERTISER_CONFIG_NETWORK_FIRST */
  if (new URL(request.url).pathname.endsWith('/js/advertiser-config.js')) {
    event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
    return response;
  }).catch(() => request.mode === 'navigate' ? caches.match('./index.html') : new Response('', {status: 503, statusText: 'Offline'}))));
});
