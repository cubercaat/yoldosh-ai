/* Telegram Mini App: sayt bot ichida ochilganda foydalanuvchi avtomatik kiradi */
(function () {
  const tw = window.Telegram && window.Telegram.WebApp;
  if (!tw || !tw.initData) return;                         // oddiy brauzer: hech narsa qilmaymiz
  document.documentElement.classList.add('tma');
  try { tw.ready(); tw.expand(); tw.setHeaderColor && tw.setHeaderColor('#090d18'); tw.setBackgroundColor && tw.setBackgroundColor('#090d18'); tw.disableVerticalSwipes && tw.disableVerticalSwipes(); } catch (e) { }

  const CFG = window.YOLDOSH || {}, API = () => String(CFG.apiBase || '').replace(/\/$/, '');
  async function auto() {
    if (!API() || !window.Cloud || !Cloud.live || !Cloud.live()) return;
    const h = location.hash || '#/';
    if (/^#\/(privacy|terms|tg\/)/.test(h)) return;
    const S = window.ST && ST.Store; if (S && S.s && S.s.role === 'student' && Cloud.token && Cloud.token()) { if (!/^#\/app/.test(h)) location.hash = '#/app'; return; }
    let j; try {
      const r = await fetch(API() + '/auth/webapp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: tw.initData }) });
      j = await r.json(); if (!r.ok) throw new Error(j.error || 'xato');
    } catch (e) { return; }                                // xato bo'lsa — oddiy kirish oynasi ko'rinadi
    if (j.gate) {
      const box = document.getElementById('app'); if (!box) return;
      box.innerHTML = `<div class="login"><div class="card login-card"><h2>Obuna kerak</h2><p class="mute">${UI.esc(j.text)}</p>${(j.channels || []).map(c => `<a class="btn primary" style="margin:6px 0;display:flex;justify-content:center" href="${UI.esc(c.url)}" target="_blank" rel="noopener">${UI.esc(c.title)}</a>`).join('')}<button class="btn soft" onclick="location.reload()">✅ Tekshirish</button></div></div>`;
      return;
    }
    if (j.existing) {
      Cloud.setToken(j.session); Cloud.isAdmin = !!(j.user && j.user.admin);
      Object.assign(S.s, j.state || {}, { role: 'student', name: j.user.first + ' ' + j.user.last, region: j.user.region || S.s.region }); S.save();
      location.hash = '#/app'; location.reload(); return;
    }
    if (j.token) location.hash = '#/tg/' + j.token;       // yangi foydalanuvchi: faqat ism va viloyat so'raladi
  }
  window.addEventListener('load', () => setTimeout(auto, 50));
})();
