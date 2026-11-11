/* Oflayn rejim: internet yo'qligi haqida xabar va savol rasmlarini oldindan yuklab olish (ixtiyoriy) */
(function () {
  const { ico, esc, toast } = UI;
  const V = (window.V = window.V || {});
  const CACHE = 'chorraha-static-v3', KEY = 'chq_offline_dl';
  const supported = () => 'caches' in window && 'serviceWorker' in navigator;
  const done = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };

  /* "Oflayn" belgisi */
  function bar() {
    let b = document.getElementById('off-bar');
    if (!b) { b = document.createElement('div'); b.id = 'off-bar'; b.setAttribute('role', 'status'); b.textContent = "📴 Oflayn rejim — internet qaytganda hammasi yangilanadi"; document.body.appendChild(b); }
    b.classList.toggle('on', !navigator.onLine);
  }
  addEventListener('online', () => { bar(); toast('Internet qaytdi — onlayn rejim ✓'); try { if (window.Cloud && Cloud.token()) Cloud.push(); } catch (e) { } });
  addEventListener('offline', () => { bar(); toast("Internet yo'q — oflayn rejim"); });
  document.addEventListener('DOMContentLoaded', bar); if (document.body) bar();

  /* Barcha savol rasmlarini avtomatik saqlash (so'ramasdan, orqa fonda; uzilsa keyingi safar davom etadi) */
  const imgs = () => [...new Set((window.BANK ? BANK.Q : []).map((q) => q.img).filter(Boolean))];
  let busy = false, N = 0, TOTAL = 0, ST = '';
  const stText = () => ST;
  function pill(txt) {
    let b = document.getElementById('off-dl');
    if (!txt) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'off-dl'; document.body.appendChild(b); }
    b.textContent = txt;
  }
  // Trafik tejash rejimi yoki juda sekin (2G) tarmoqda avtomatik yuklamaymiz
  const lowData = () => { try { const n = navigator.connection; return !!(n && (n.saveData || /2g/.test(n.effectiveType || ''))); } catch (e) { return false; } };
  async function download() {
    if (busy || !supported() || !navigator.onLine || lowData()) return;
    try { await navigator.serviceWorker.ready; } catch (e) { return; }
    busy = true;
    try {
      const c = await caches.open(CACHE), list = imgs(), todo = [];
      // eski formatdagi (JPG / eski versiya) savol rasmlarini keshdan o'chirish — telefon xotirasini egallamasin
      try { const want = new Set(list.map((u) => new URL(u, location.href).href)); for (const k of await c.keys()) { if (/\/img\/q\//.test(k.url) && !want.has(k.url)) await c.delete(k); } } catch (e) { }
      for (const u of list) { if (!(await c.match(new Request(u)))) todo.push(u); }
      TOTAL = list.length; N = TOTAL - todo.length;
      if (!todo.length) { ST = 'Tayyor ✓ — internetsiz ham ishlaydi'; try { localStorage.setItem(KEY, '1'); } catch (e) { } return; }
      let fail = 0;
      const one = async (u) => {
        if (!navigator.onLine) { fail++; return; }
        try { const req = new Request(u), r = await fetch(req); if (r.ok) await c.put(req, r); else fail++; } catch (e) { fail++; }
        N++; ST = `Yuklanmoqda ${N} / ${TOTAL}`; pill(`📥 Oflayn uchun yuklanmoqda ${N}/${TOTAL}`);
        const el = document.getElementById('of-st'); if (el) el.textContent = ST;
      };
      const q = todo.slice(); await Promise.all(Array.from({ length: 4 }, async () => { while (q.length && navigator.onLine) await one(q.shift()); }));
      pill('');
      if (!fail && !q.length) { ST = 'Tayyor ✓ — internetsiz ham ishlaydi'; try { localStorage.setItem(KEY, '1'); } catch (e) { } toast('Oflayn rejim tayyor ✓'); }
      else ST = 'Yuklash to\'xtadi — internet qaytganda davom etadi';
    } catch (e) { pill(''); } finally { busy = false; const el = document.getElementById('of-st'); if (el) el.textContent = ST; }
  }
  V.offlineCard = () => !supported() ? '' : `<div class="pf-sec off-c"><h3>📴 Oflayn rejim</h3>
    <p class="mute">Ilova internetsiz ham ochiladi: savollar, rasmlar, darslik, belgilar va simulyator. Hammasi avtomatik yuklab olinadi. Internet uzilsa ilova o'zi oflayn rejimga o'tadi, qaytganda yana onlayn bo'ladi.</p>
    <p class="mute"><b id="of-st">${esc(ST || (done() ? 'Tayyor ✓ — internetsiz ham ishlaydi' : 'Kutilmoqda…'))}</b></p></div>`;
  addEventListener('online', () => setTimeout(download, 1500));
  addEventListener('load', () => setTimeout(download, 12000));   // sahifa to'liq ishga tushib bo'lgach
})();
