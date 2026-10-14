/* Bulut sinxronizatsiya: sessiya bo'lsa (haqiqiy ro'yxatdan o'tgan foydalanuvchi) holat serverga saqlanadi.
   Demo rejimda (apiBase bo'sh) hech narsa qilmaydi. */
(function () {
  const CFG = window.YOLDOSH, KEY = 'chorraha_session';
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const Cloud = (window.Cloud = {
    live: () => !!(CFG.apiBase && CFG.telegramBot),
    token: () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } },
    setToken: (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch (e) { } },
    logout() { Cloud.setToken(''); },
    snapshot() { const s = Object.assign({}, ST.Store.s); delete s.schools; delete s.messages; delete s.groups; delete s.role; return s; },
    async push() {
      const t = Cloud.token(); if (!t || !Cloud.live()) return;
      try { await fetch(api() + '/sync', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ state: Cloud.snapshot(), points: ST.Store.s.points || 0 }) }); } catch (e) { }
    },
    async top() { try { const r = await fetch(api() + '/rank'); return r.ok ? (await r.json()).top || [] : []; } catch (e) { return []; } },
  });
  let timer = null;
  const origSave = ST.Store.save.bind(ST.Store);
  ST.Store.save = function () { origSave(); if (!Cloud.token() || !Cloud.live()) return; clearTimeout(timer); timer = setTimeout(Cloud.push, 4000); };
  window.addEventListener('pagehide', () => { if (Cloud.token()) Cloud.push(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && Cloud.token()) Cloud.push(); });
})();
