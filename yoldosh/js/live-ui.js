/* Jonli qismlar: «online» soni (haqiqiy), global reyting podiumi, kunduzgi/tungi rejim */
(function () {
  const { ico, esc, toast } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const live = () => !!(window.Cloud && Cloud.live() && Cloud.token());

  /* ---------- kunduzgi / tungi rejim ---------- */
  const KEY = 'chorraha_theme';
  const cur = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const apply = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'light' ? '#FFF3E3' : '#112219');
    try { localStorage.setItem(KEY, t); } catch (e) { }
  };
  const SUN = '<circle cx="12" cy="12" r="4.200"/><path d="M12 2.500v2.300M12 19.200v2.300M2.500 12h2.300M19.200 12h2.300M5.300 5.300l1.600 1.600M17.100 17.100l1.600 1.600M18.700 5.300l-1.600 1.600M6.900 17.100l-1.600 1.600"/>';
  const MOON = '<path d="M20 14.500A8.500 8.500 0 0 1 9.500 4 8.500 8.500 0 1 0 20 14.500z"/>';
  V.themeIcon = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${cur() === 'light' ? MOON : SUN}</svg>`;

  /* ---------- online soni (oxirgi 75 soniyada faol bo'lganlar) ---------- */
  const state = { online: 0, playing: 0 };
  const paintOnline = () => {
    document.querySelectorAll('.js-online').forEach((e) => { e.textContent = state.online ? `${state.online} online` : 'JONLI · 1v1'; });
    document.querySelectorAll('.js-playing').forEach((e) => { e.textContent = state.playing ? `${state.playing} ta o'yin ketmoqda` : ''; });
  };
  async function ping() {
    if (!live()) return;
    try {
      const r = await fetch(api() + '/duel/ping', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() }, body: '{}' });
      if (r.ok) { const j = await r.json(); state.online = j.online; state.playing = j.playing; paintOnline(); }
    } catch (e) { }
  }
  V.online = state; V.paintOnline = paintOnline;
  setInterval(() => { if (!document.hidden && /#\/app/.test(location.hash)) ping(); }, 30000);
  addEventListener('hashchange', () => { if (/#\/app\/(duel|friends)?$/.test(location.hash) || location.hash === '#/app') setTimeout(ping, 400); });

  /* ---------- global reyting podiumi ---------- */
  const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return [72,150,200,36,12,176][h % 6]; };
  async function podium() {
    const el = document.getElementById('hx-pod'); if (!el || !CFG.apiBase) return;
    try {
      const r = await fetch(api() + '/rank'); if (!r.ok) return; const j = await r.json(), top = (j.top || []).slice(0, 3); if (!top.length) return;
      const order = [top[1], top[0], top[2]], cls = ['p2', 'p1', 'p3'], medal = ['2', '1', '3'];
      el.innerHTML = order.map((t, i) => t ? `<span class="hx-ps ${cls[i]}"><i style="--h:${hue(t.name)}">${esc(t.name[0])}${i === 1 ? '<u>👑</u>' : ''}</i><b>${esc(t.name)}</b><small>${t.points}</small><s>${medal[i]}</s></span>` : '<span class="hx-ps"></span>').join('');
      const me = ((window.ST && ST.Store && ST.Store.s.points) || 0), rank = (j.top || []).filter((t) => t.points > me).length + 1, g = document.querySelector('.hx-gme');
      if (g && (j.top || []).length) g.insertAdjacentHTML('beforebegin', `<em class="hx-gr">${rank <= 100 && me > 0 ? '#' + rank : ''}</em>`);
    } catch (e) { }
  }
  V.homeLive = () => { paintOnline(); ping(); podium(); };
  V.pingOnline = ping;

  V.acts = Object.assign(V.acts || {}, {
    'theme-toggle'(el) { apply(cur() === 'light' ? 'dark' : 'light'); if (el) el.innerHTML = V.themeIcon(); },
  });
  try { const t = localStorage.getItem(KEY); if (t) apply(t); } catch (e) { }
})();
