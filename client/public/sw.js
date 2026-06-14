const CACHE_NAME = 'farefox-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through: always fetch from network, no caching of dynamic data
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
