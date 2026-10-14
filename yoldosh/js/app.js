/* Yo'naltirgich va ishga tushirish */
(function () {
  const V = window.V, { Store } = ST;
  let unmount = null, io = null, lastTouch = Date.now();
  const $app = () => document.getElementById('app');

  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function norm(v) { return typeof v === 'string' ? { html: v } : v; }

  function pick() {
    const h = location.hash || '#/';
    const p = h.replace(/^#\/?/, '').split('/').filter(Boolean), role = Store.s.role;
    const [a, b, c] = p;
    if (!a) return V.landing();
    if (a === 'login') return V.login();
    if (a === 'register') return V.register(b || null);
    if (a === 'tg') return V.tgReturn(b);
    if (a === 'join') return V.join(b ? decodeURIComponent(b) : null, p[2] ? decodeURIComponent(p[2]) : null);
    if (a === 'app') {
      if (role !== 'student') return { redirect: '#/login' };
      if (V.blocked && V.blocked()) return { html: '<div class="login"><div class="card login-card"><h2>Hisob bloklangan</h2><p class="mute">Ma\'muriyatga murojaat qiling.</p><button class="btn soft" data-act="logout">Chiqish</button></div></div>' };
      switch (b) {
        case undefined: return V.home();
        case 'tests': return V.tests(); case 'quiz': return V.quiz(c || 'mix'); case 'exam': return V.exam();
        case 'result': return V.result(); case 'mistakes': return V.mistakes(); case 'signs': return V.signs();
        case 'rank': return V.rank(); case 'pro': return V.pro(); case 'lessons': return V.lessons(); case 'lesson': return V.lesson(c); case 'battle': return V.battle();
        case 'plan': return V.plan(); case 'marathon': return V.marathon(); case 'run': return V.run(); case 'similar': return V.similar(); case 'premium': return V.premium(); case 'drive': return c ? V.drivePlay(c) : V.drive(); case 'tickets': return V.tickets(); case 'big': return V.big(); case 'saved': return V.saved(); case 'cheats': return V.cheats(); case 'id': return V.myid(); case 'bot': return V.botStudent(); case 'scan': return V.scan(); case 'ai': return V.ai(); case 'teacher': return V.teacher();
        default: return { redirect: '#/app' };
      }
    }
    if (a === 'admin') {
      if (role !== 'admin' || (window.Cloud && Cloud.live())) return { redirect: '#/login' };
      switch (b) { case undefined: return V.adminHome(); case 'prices': return V.adminPrices(); case 'schools': return V.adminSchools(); case 'bots': return V.adminBots(); case 'students': return V.adminStudents(); case 'broadcast': return V.adminBroadcast(); case 'promo': return V.adminPromo(); case 'income': return V.adminIncome(); default: return { redirect: '#/admin' }; }
    }
    if (a === 'panel') {
      if (role !== 'teacher' || (window.Cloud && Cloud.live())) return { redirect: '#/login' };
      switch (b) {
        case undefined: return V.panel(); case 'students': return V.students(); case 'student': return V.student(c);
        case 'topics': return V.topics(); case 'messages': return V.messages(); case 'groups': return V.groups(); case 'honor': return V.honorReq(); case 'gexam': return V.gexam(); case 'parents': return V.parents(); case 'report': return V.report(); case 'tariff': return V.tariff(); case 'brand': return V.brandPage(); case 'bot': return V.botPage(); default: return { redirect: '#/panel' };
      }
    }
    return V.landing();
  }

  function render(keepScroll) {
    if (V.applyPrices) V.applyPrices();
    const h = location.hash;
    if (h && !h.startsWith('#/')) {
      if (!$app().firstChild) { location.replace('#/'); return; }          // sahifa ochilishida #bo'lim bilan kelsa avval bosh sahifani chizamiz
      const el = document.getElementById(h.slice(1)); if (el) el.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' }); return;
    }
    const y = window.scrollY;
    if (unmount) { try { unmount(); } catch (e) { } unmount = null; }
    clearInterval(V.S.timer);
    UI.closeModal();
    const v = norm(pick());
    if (v.redirect) { location.replace(v.redirect); return; }
    $app().innerHTML = v.html; unmount = v.unmount || null;
    document.title = (/^#\/(app|panel)/.test(h) ? '' : '') + `Chorraha — prava kurslari uchun aqlli platforma`;
    if (v.mount) v.mount();
    reveal();
    window.scrollTo(0, keepScroll ? y : 0);
  }
  V.rerender = () => render(true);

  function reveal() {
    const els = document.querySelectorAll('.reveal:not(.in)'); if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    els.forEach(e => io.observe(e));
  }

  V.acts = Object.assign(V.acts || {}, {
    'demo-student'() { if ((window.Cloud && Cloud.live())) { location.hash = (Store.s.meId && Store.s.name && Cloud.token()) ? '#/app' : '#/register'; return; } if (V.seedDemo) V.seedDemo(); Store.login('student', Store.s.name || 'Aziz Karimov'); location.hash = '#/app'; },
    'demo-teacher'() { if ((window.Cloud && Cloud.live())) { location.hash = '#/login'; return; } Store.login('teacher'); location.hash = '#/panel'; },
    'login-student'() { const n = (document.getElementById('nm').value || '').trim() || 'Talaba'; Store.login('student', n); location.hash = '#/app'; },
    'login-teacher'() { if ((window.Cloud && Cloud.live())) { location.hash = '#/login'; return; } Store.login('teacher'); location.hash = '#/panel'; },
    logout() { Store.logout(); if (window.Cloud) Cloud.logout(); location.hash = '#/'; },
    close() { UI.closeModal(); },
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a) { const fn = V.acts[a.dataset.act]; if (fn) { e.preventDefault(); fn(a, e); } return; }
    const g = e.target.closest('[data-go]'), inner = e.target.closest('a,button');
    if (g && (!inner || inner === g)) location.hash = g.dataset.go;       // data-go tugmaning o'zida bo'lsa ham ishlaydi
  });
  document.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.input && t.type !== 'file') { const fn = V.inputs[t.dataset.input]; if (fn) fn(t); } });
  document.addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.input && t.type === 'file') { const fn = V.inputs[t.dataset.input]; if (fn) fn(t); } });
  document.addEventListener('submit', (e) => { const f = e.target.closest('[data-form]'); if (f) { e.preventDefault(); const fn = V.forms[f.dataset.form]; if (fn) fn(f); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.closeModal(); });
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { lastTouch = Date.now(); }, { passive: true }));
  window.addEventListener('hashchange', () => render(false));

  /* Talabaning haqiqiy faol vaqti: sahifa ochiq va so'nggi 60 soniyada harakat bo'lsa */
  setInterval(() => {
    if (Store.s.role === 'student' && document.visibilityState === 'visible' && /^#\/app/.test(location.hash) && Date.now() - lastTouch < 60000) Store.tick(5);
  }, 5000);

  Store.load(); if (V.applyPrices) V.applyPrices(); UI.applyBrand();
  render(false);
})();





