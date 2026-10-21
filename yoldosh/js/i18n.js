/* Til almashtirish: O'zbekcha (asosiy) / Русский. Rus rejimida matnlar lug'at orqali avtomatik almashtiriladi,
   savollar va tushuntirishlar alohida (lazy) paketlardan yuklanadi. Tarjima mashina yordamida tayyorlangan. */
(function () {
  const KEY = 'chorraha_lang';
  let lang = 'uz';
  try { lang = localStorage.getItem(KEY) || 'uz'; const m = /[?&]lang=(ru|uz)/.exec(location.search); if (m) { lang = m[1]; localStorage.setItem(KEY, lang); } } catch (e) { }
  if (lang !== 'ru') lang = 'uz';
  const I = (window.I18N = { lang, set(l) { try { localStorage.setItem(KEY, l); } catch (e) { } location.reload(); }, expl() { } });
  const CYR = /[\u0400-\u04FF]/;
  const V = '?v=1';
  const load = (src) => new Promise((res) => { const s = document.createElement('script'); s.src = src + V; s.onload = s.onerror = () => res(); document.head.appendChild(s); });

  function toggle() {
    const mount = () => {
      if (document.getElementById('i18n-sw')) return;
      const b = document.createElement('div'); b.id = 'i18n-sw'; b.className = 'notranslate'; b.setAttribute('role', 'group'); b.setAttribute('aria-label', 'Til / Язык');
      b.innerHTML = '<button type="button" data-l="uz"' + (lang === 'uz' ? ' class="on"' : '') + '>UZ</button><button type="button" data-l="ru"' + (lang === 'ru' ? ' class="on"' : '') + '>RU</button>';
      b.addEventListener('click', (e) => { const l = e.target && e.target.dataset && e.target.dataset.l; if (l && l !== lang) I.set(l); });
      document.body.appendChild(b);
    };
    const st = document.createElement('style');
    st.textContent = '#i18n-sw{position:fixed;right:10px;bottom:82px;z-index:9990;display:flex;border-radius:999px;overflow:hidden;background:rgba(15,23,42,.82);backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.25);font:600 11px/1 system-ui,sans-serif}#i18n-sw button{all:unset;cursor:pointer;padding:7px 10px;color:#cbd5e1}#i18n-sw button.on{background:#2563eb;color:#fff}@media(min-width:900px){#i18n-sw{bottom:14px}}@media print{#i18n-sw{display:none}}';
    document.head.appendChild(st);
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  }
  toggle();
  document.documentElement.lang = lang;
  if (lang !== 'ru') { I.ready = Promise.resolve(); return; }

  /* ---------- Rus rejimi ---------- */
  const cache = new Map(); let pats = null;
  const buildPats = () => {
    pats = []; const D = window.RU_UI || {};
    for (const k in D) if (k.indexOf('#') >= 0 && k.length > 3) {
      const src = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/#/g, '(.+?)');
      try { pats.push([new RegExp('^' + src + '$'), D[k]]); } catch (e) { }
    }
  };
  const fill = (r, args) => { let i = 0; return r.replace(/#/g, () => (args[i] !== undefined ? args[i++] : '#')); };
  function lookup(core) {
    const D = window.RU_UI || {};
    let r = D[core]; if (r !== undefined) return r;
    const nums = []; const k = core.replace(/\d+/g, (m) => { nums.push(m); return '#'; });
    if (nums.length) { r = D[k]; if (r !== undefined) return fill(r, nums); }
    if (!pats) buildPats();
    for (let i = 0; i < pats.length; i++) { const m = pats[i][0].exec(core); if (m) return fill(pats[i][1], m.slice(1)); }
    return undefined;
  }
  function tr(s) {
    if (!s) return s; const core = s.trim(); if (!core || core.length > 400 || CYR.test(core)) return s;
    let r = cache.get(core);
    if (r === undefined) { r = lookup(core); cache.set(core, r === undefined ? null : r); }
    if (r === null || r === undefined) return s;
    const i = s.indexOf(core); return s.slice(0, i) + r + s.slice(i + core.length);
  }
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT|SVG|CANVAS)$/;
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function node(n) {
    if (n.nodeType === 3) { const p = n.parentNode; if (p && (SKIP.test(p.nodeName) || (p.closest && p.closest('.notranslate')))) return; const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; return; }
    if (n.nodeType !== 1 || SKIP.test(n.nodeName) || (n.closest && n.closest('.notranslate'))) return;
    attrs(n);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: (x) => (x.nodeType === 1 && (SKIP.test(x.nodeName) || x.classList.contains('notranslate')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    let x; while ((x = w.nextNode())) { if (x.nodeType === 3) { const v = tr(x.nodeValue); if (v !== x.nodeValue) x.nodeValue = v; } else attrs(x); }
  }
  function attrs(e) {
    for (let i = 0; i < ATTRS.length; i++) { const a = ATTRS[i]; if (e.hasAttribute && e.hasAttribute(a)) { const o = e.getAttribute(a), v = tr(o); if (v !== o) e.setAttribute(a, v); } }
    if (e.nodeName === 'INPUT' && /^(button|submit)$/.test(e.type)) { const v = tr(e.value); if (v !== e.value) e.value = v; }
  }
  let obs = null;
  function start() {
    if (obs) return;
    document.title = tr(document.title);
    node(document.body);
    obs = new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'childList') m.addedNodes.forEach(node);
        else if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') attrs(m.target);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  I.t = (s) => tr(s);

  /* savollar paketi: BANK.Q ni joyida o'zgartiradi */
  const applyQ = () => {
    const P = window.RU_Q; if (!P || !window.BANK) return;
    BANK.Q.forEach((q) => { const r = P[q.n]; if (!r) return; q.text = r[0]; q.options.forEach((o, i) => { if (r[i + 1] != null && r[i + 1] !== '') o.label = r[i + 1]; }); });
  };
  /* tushuntirishlar */
  let eLoaded = false;
  const mergeE = () => { const R = window.RU_E; if (!R || !window.EXPL) return; for (const k in R) window.EXPL[k] = R[k]; };
  I.expl = () => { if (eLoaded) { mergeE(); return; } eLoaded = true; load('js/ru/e.js').then(mergeE); };

  I.ready = Promise.all([load('js/ru/ui.js'), load('js/ru/q.js')]).then(() => { applyQ(); });
  I.ready.then(() => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start(); });
  window.addEventListener('hashchange', () => setTimeout(() => node(document.body), 60));
})();
