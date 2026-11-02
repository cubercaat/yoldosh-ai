/* Chorraha: OFLAYN REJIM.
   - Ilova yadrosi (index.html, css, js, ikonalar) o'rnatilganda saqlanadi; internet bor bo'lsa har doim yangisi olinadi (eskirmaydi),
     internet yo'q/sekin bo'lsa saqlangan nusxa ochiladi.
   - Og'ir fayllar (simulyator, rasmlar) birinchi ko'rilganda saqlanadi va keyin internetsiz ochiladi.
   - Server so'rovlari (API) tegilmaydi. */
const V = 'chorraha-static-v3';
const HEAVY = /\/(sim\/(assets|models|draco|basis)|img)\//;
const LIGHT = /\.(?:html|js|css|webmanifest|json|png|svg|ico|webp|mjs)$|\/$/;
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    try {
      const html = await (await fetch('./index.html', { cache: 'reload' })).text();
      const urls = new Set(['./', './index.html', './manifest.webmanifest']);
      for (const m of html.matchAll(/(?:src|href)="((?:js|css|img)\/[^"#]+)"/g)) urls.add(m[1]);
      await Promise.all([...urls].map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => { })));
    } catch (err) { /* internet yo'q — keyingi safar */ }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
  await self.clients.claim();
})()));

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('t')), ms))]);

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (FONTS.test(r.url)) {                                         // shriftlar: avval saqlanganidan, orqada yangilash
    e.respondWith((async () => { const c = await caches.open(V), hit = await c.match(r); const up = fetch(r).then((res) => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()).catch(() => { }); return res; }).catch(() => hit); return hit || up; })());
    return;
  }
  if (u.origin !== location.origin) return;
  if (HEAVY.test(u.pathname)) {                                    // og'ir: avval saqlanganidan
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r);
      if (res.ok && res.status === 200) c.put(r, res.clone()).catch(() => { });
      return res;
    })());
    return;
  }
  if (r.mode === 'navigate' || LIGHT.test(u.pathname)) {           // yengil: avval internet, bo'lmasa saqlangan
    e.respondWith((async () => {
      const c = await caches.open(V);
      try {
        const res = await withTimeout(fetch(r), r.mode === 'navigate' ? 4500 : 6000);
        if (res.ok && res.status === 200) c.put(r, res.clone()).catch(() => { });
        return res;
      } catch (err) {
        const hit = (await c.match(r)) || (await c.match(r, { ignoreSearch: true }));
        if (hit) return hit;
        if (r.mode === 'navigate') { const idx = (await c.match('./index.html')) || (await c.match('./')); if (idx) return idx; }
        return fetch(r);
      }
    })());
  }
});
