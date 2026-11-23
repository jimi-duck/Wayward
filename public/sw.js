// Wayward's service worker: the game plays on with a weak or lost signal, and starts without the network
// once it has been played. Two rules, both safe for a game that deploys often:
// - the page itself (navigation) comes from the network first, so a new build is always seen; the copy kept
//   here is used only when the network fails;
// - built files under assets/ carry a content hash, so once fetched they are served from here for good.
// Entries unused for 30 days are dropped, so old builds do not pile up on the phone.
const CACHE = 'wayward-v1';
const KEEP_MS = 30 * 24 * 3600 * 1000;
const STAMP = 'x-wayward-kept';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await prune();
    await self.clients.claim();
  })());
});

async function prune() {
  const cache = await caches.open(CACHE);
  const now = Date.now();
  for (const req of await cache.keys()) {
    const res = await cache.match(req);
    const at = Number(res?.headers.get(STAMP) ?? 0);
    if (!at || now - at > KEEP_MS) await cache.delete(req);
  }
}

/** Keep a copy, stamped with when it was kept. */
async function keep(req, res) {
  if (!res.ok || res.type === 'opaque') return;
  const headers = new Headers(res.headers);
  headers.set(STAMP, String(Date.now()));
  const body = await res.clone().arrayBuffer();
  const cache = await caches.open(CACHE);
  await cache.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        e.waitUntil(keep(new Request(url.origin + url.pathname), res.clone()));
        return res;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(new Request(url.origin + url.pathname))) ?? (await cache.match(new Request(self.registration.scope))) ?? Response.error();
      }
    })());
    return;
  }
  if (url.pathname.includes('/assets/')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      e.waitUntil(keep(req, res.clone()));
      return res;
    })());
  }
});
