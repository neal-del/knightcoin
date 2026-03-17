const CACHE_NAME = 'knightcoin-v2';

self.addEventListener('install', (event) => {
  // Skip waiting to immediately take over from old SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL old caches on activation
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for everything
  // This prevents stale cached HTML/JS from causing white screens after deploys
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Optionally cache successful responses for offline fallback
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache only when network is unavailable
        return caches.match(event.request);
      })
  );
});
