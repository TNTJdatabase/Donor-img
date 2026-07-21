/* ══════════════════════════════════════════════════════════
   SERVICE WORKER — Blood Poster PWA
   Strategy:
   - App shell (this HTML page, manifest, icons): cache-first,
     so the tool opens instantly and works fully offline.
   - Everything else (Google Fonts, etc.): network-first,
     falling back to cache if the network is unavailable.
   Bump CACHE_NAME whenever you change the HTML/CSS/JS so old
   clients pick up the new version instead of a stale cache.
══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'blood-poster-v1';

/* Adjust this list if you rename the HTML file or add more assets */
const APP_SHELL = [
  './',
  './social-media-1-1-1.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.ico'
];

/* ── INSTALL: pre-cache the app shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: clean up old cache versions ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: cache-first for our own files, network-first for everything else ── */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // don't try to cache POST/etc.

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    /* App shell: serve from cache instantly, update cache in background */
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(networkResp => {
          if (networkResp && networkResp.ok) {
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkResp;
        }).catch(() => cached); // offline → fall back to cache
        return cached || fetchPromise;
      })
    );
  } else {
    /* Third-party (e.g. Google Fonts): try network, fall back to cache */
    event.respondWith(
      fetch(req).then(networkResp => {
        const clone = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return networkResp;
      }).catch(() => caches.match(req))
    );
  }
});
