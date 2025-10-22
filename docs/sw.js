const CACHE = 'fastcalc-v1';
const ASSETS = [
  '/quickcalcs/round.html',
  '/quickcalcs/manifest.webmanifest',
  '/quickcalcs/icon-192.png',
  '/quickcalcs/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE && caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // For navigations, try network first, fallback to cached round.html
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/quickcalcs/round.html')));
    return;
  }

  // For other GETs, serve cache-first, then network
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req))
  );
});
