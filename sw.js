/* فزعة — Service Worker
 * - ملفات التطبيق: تُخزَّن عند أول فتح ويشتغل الموقع بدون إنترنت.
 * - Leaflet والخط: يُخزَّنون أول مرة يُحمَّلون.
 * - بلاطات الخريطة: تُخزَّن للي شفته فقط (بحد أقصى).
 */
const VERSION = 'fazaa-v1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const TILES = `${VERSION}-tiles`;
const MAX_TILES = 250;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data.js',
  './js/auth.js',
  './js/home.js',
  './js/driver.js',
  './js/packages.js',
  './js/profile.js',
  './js/admin.js',
  './js/app.js',
  './assets/logo.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // بلاطات الخريطة: كاش أولاً
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          cache.put(req, res.clone());
          trim(TILES, MAX_TILES);
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // تنقّل بين الصفحات: الشبكة أولاً ثم الكاش
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ملفاتنا + Leaflet + الخط: stale-while-revalidate
  const sameOrigin = url.origin === self.location.origin;
  const cdn = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
  if (sameOrigin || cdn) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) {
              const copy = res.clone();
              caches.open(sameOrigin ? SHELL : RUNTIME).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
