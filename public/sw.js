// Service Worker HippoAnalyse Android PWA (Safe Network-First Strategy)
const CACHE_NAME = 'hippoanalyse-pwa-v2';
const STATIC_ASSETS = [
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Navigation / HTML page requests MUST be Network-First to prevent stale app locks
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || fetch(event.request);
      })
    );
    return;
  }

  // Non-GET requests, APIs, Vite dev scripts: direct network bypass
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/@') ||
    event.request.url.includes('/src/') ||
    event.request.url.includes('node_modules')
  ) {
    return;
  }

  // Assets (images, fonts, styles): Stale-While-Revalidate with error tolerance
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
