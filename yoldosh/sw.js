/* Chorraha: og'ir statik fayllarni (simulyator, rasm) qurilmada saqlaydi — qayta ochganda tez. HTML/JS/CSS ga tegmaydi (eskirib qolish xavfi yo'q). */
const V = 'chorraha-static-v1';
const HEAVY = /\/(sim\/(assets|models|draco|basis)|img)\//;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || !HEAVY.test(u.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(V), hit = await c.match(r);
    if (hit) return hit;
    const res = await fetch(r);
    if (res.ok && res.status === 200) c.put(r, res.clone()).catch(() => { });
    return res;
  })());
});
