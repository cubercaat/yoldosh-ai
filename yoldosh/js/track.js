/* Yengil analitika: faqat hodisa nomi, manba va kun hisoblanadi (shaxsiy ma'lumotsiz). Server: POST /ev */
(function () {
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, SK = 'chorraha_src', DK = 'chorraha_ev_once';
  const q = new URLSearchParams(location.search), h = new URLSearchParams((location.hash.split('?')[1]) || '');
  const src = (q.get('s') || q.get('utm_source') || h.get('s') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  try { if (src) localStorage.setItem(SK, src); } catch (e) { }
  const source = () => { try { return localStorage.getItem(SK) || ''; } catch (e) { return ''; } };
  const once = (n) => { try { const d = JSON.parse(sessionStorage.getItem(DK) || '{}'); if (d[n]) return false; d[n] = 1; sessionStorage.setItem(DK, JSON.stringify(d)); return true; } catch (e) { return true; } };
  V.track = (name, opt) => {
    try {
      name = String(name).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32); if (!name || !CFG.apiBase) return;
      if (!(opt && opt.repeat) && !once(name)) return;
      const body = JSON.stringify({ n: name, s: source() });
      if (navigator.sendBeacon) navigator.sendBeacon(CFG.apiBase.replace(/\/$/, '') + '/ev', new Blob([body], { type: 'text/plain' }));
      else fetch(CFG.apiBase.replace(/\/$/, '') + '/ev', { method: 'POST', body, keepalive: true }).catch(() => { });
    } catch (e) { }
  };
  V.source = source;
  V.track('visit');
  window.addEventListener('hashchange', () => { const m = /^#\/(\w+)/.exec(location.hash); if (m && ['register', 'guest', 'premium', 'pay'].includes(m[1])) V.track('view_' + m[1]); });
})();
