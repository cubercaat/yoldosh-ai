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
  addEventListener('online', () => { bar(); toast('Internet qaytdi ✓'); try { if (window.Cloud && Cloud.token()) Cloud.push(); } catch (e) { } });
  addEventListener('offline', bar);
  document.addEventListener('DOMContentLoaded', bar); if (document.body) bar();

  /* Barcha savol rasmlarini saqlash */
  const imgs = () => [...new Set((window.BANK ? BANK.Q : []).map((q) => q.img).filter(Boolean))];
  let busy = false;
  async function download() {
    if (busy || !supported()) return; busy = true;
    const list = imgs(), c = await caches.open(CACHE), btn = () => document.querySelector('[data-act="of-dl"]'), st = () => document.getElementById('of-st');
    let n = 0, fail = 0;
    const one = async (u) => { try { const req = new Request(u); if (!(await c.match(req))) { const r = await fetch(req); if (r.ok) await c.put(req, r); else fail++; } } catch (e) { fail++; } n++; if (st()) st().textContent = `${n} / ${list.length}`; };
    if (btn()) btn().disabled = true;
    const q = list.slice(); await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await one(q.shift()); }));
    busy = false; if (btn()) btn().disabled = false;
    if (!fail) { try { localStorage.setItem(KEY, '1'); } catch (e) { } toast("Tayyor! Savollar internetsiz ham ochiladi ✓"); } else toast(`${fail} ta rasm yuklanmadi — qayta urinib ko'ring`);
    if (st()) st().textContent = fail ? `${fail} ta yuklanmadi` : 'Tayyor ✓';
  }
  V.offlineCard = () => !supported() ? '' : `<div class="pf-sec off-c"><h3>📴 Oflayn rejim</h3>
    <p class="mute">Ilova internetsiz ham ochiladi: savollar, darslik, belgilar va simulyator. Savol rasmlarining hammasini oldindan yuklab olsangiz (~${Math.max(1, Math.round(imgs().length * 0.07))} MB), testlar aloqasiz ham to'liq ishlaydi. Wi-Fi'da yuklang.</p>
    <button class="btn soft" data-act="of-dl">${ico('upload')} ${done() ? 'Qayta tekshirish' : 'Oflayn uchun yuklab olish'}</button> <span id="of-st" class="mute">${done() ? 'Tayyor ✓' : ''}</span></div>`;
  V.acts = Object.assign(V.acts || {}, { 'of-dl'() { download(); } });
})();
