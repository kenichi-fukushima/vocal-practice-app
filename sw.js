// Service worker for offline use. Built by vite.config.ts (offline-service-worker).
const VERSION = 'a2723fffa627';
const FILES = ["./","assets/index-C_lQ23Mn.js","assets/index-CbebUbZn.css","apple-touch-icon.png","icon-192.png","icon-512.png","icon.svg","manifest.webmanifest","samples/A1.mp3","samples/A2.mp3","samples/A3.mp3","samples/A4.mp3","samples/A5.mp3","samples/A6.mp3","samples/C1.mp3","samples/C2.mp3","samples/C3.mp3","samples/C4.mp3","samples/C5.mp3","samples/C6.mp3","samples/Ds1.mp3","samples/Ds2.mp3","samples/Ds3.mp3","samples/Ds4.mp3","samples/Ds5.mp3","samples/Ds6.mp3","samples/Fs1.mp3","samples/Fs2.mp3","samples/Fs3.mp3","samples/Fs4.mp3","samples/Fs5.mp3","samples/Fs6.mp3"];
const CACHE = `app-${VERSION}`;
const FONTS = 'fonts-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

/** Pages: try the network briefly so updates arrive, else use the cached app. */
async function navigate(request) {
  try {
    const res = await Promise.race([fetch(request), timeout(3000)]);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      await cache.put('./', res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match('./', { cacheName: CACHE });
    return cached ?? Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') {
    const cache = await caches.open(cacheName);
    await cache.put(request, res.clone());
  }
  return res;
}

/** Font CSS: serve the cached copy, refresh in the background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONTS);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached ?? fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && url.origin === location.origin) {
    event.respondWith(navigate(request));
  } else if (url.origin === location.origin) {
    event.respondWith(cacheFirst(request, CACHE));
  } else if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONTS));
  } else if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
