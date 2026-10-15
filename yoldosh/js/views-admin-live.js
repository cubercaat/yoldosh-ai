/* Haqiqiy Admin paneli (#/admin): login + parol bilan kiriladi (parol xeshi serverda sir sifatida saqlanadi).
   Bo'limlar: Hisob (statistika), Foydalanuvchilar (qidiruv, Premium berish, o'chirish), Avtomaktablar, Arizalar. */
(function () {
  const { ico, esc, toast, modal, closeModal, brand } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const KEY = 'chorraha_admin';
  const tok = () => { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const setTok = (t) => { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch (e) { } };
  const H = () => ({ 'content-type': 'application/json', authorization: 'Bearer ' + tok() });
  window.AdminAuth = { tok, H };
  const A = { tab: 'stats', stats: null, users: null, q: '', schools: null, leads: null, err: '' };
  const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ago = (t) => { if (!t) return '—'; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'hozir' : m < 60 ? m + ' daq oldin' : m < 1440 ? Math.round(m / 60) + ' soat oldin' : Math.round(m / 1440) + ' kun oldin'; };
  const get = async (p) => { const r = await fetch(api() + p, { headers: H() }); if (r.status === 403 || r.status === 401) { setTok(''); throw new Error('auth'); } return r.json(); };

  const loginView = () => `<div class="login"><div class="card login-card">${brand()}<h2>Admin kirishi</h2><p class="mute">Faqat platforma egasi uchun.</p>
    <div class="field"><label for="al-u">Login</label><input id="al-u" class="input" autocomplete="username" autocapitalize="off"></div>
    <div class="field"><label for="al-p">Parol</label><input id="al-p" class="input" type="password" autocomplete="current-password"></div>
    ${A.err ? `<p style="color:var(--bad)">${esc(A.err)}</p>` : ''}
    <button class="tg-btn" data-act="al-login">${ico('crown')} Kirish</button>
    <p style="margin-top:18px;text-align:center"><a class="mute" href="#/">← Bosh sahifa</a></p></div></div>`;

  const tabs = [['stats', 'Hisob'], ['users', 'Foydalanuvchilar'], ['schools', 'Avtomaktablar'], ['leads', 'Arizalar']];
  const shell = (body) => `<div class="adm"><header class="adm-h"><a class="adm-b" href="#/">${brand()}</a><nav>${tabs.map(([k, l]) => `<button class="${A.tab === k ? 'on' : ''}" data-act="al-tab" data-t="${k}">${l}</button>`).join('')}</nav><button class="btn ghost sm" data-act="al-out">Chiqish</button></header><main class="adm-m">${body}</main></div>`;

  const statCard = (l, v, s) => `<div class="card adm-s"><small>${l}</small><b>${v}</b>${s ? `<span class="mute">${s}</span>` : ''}</div>`;
  const statsBody = () => {
    const s = A.stats; if (!s) return '<div class="card">Yuklanmoqda…</div>';
    const max = Math.max(1, ...s.regions.map(r => r.c));
    const days = Array.from({ length: 14 }, (_, i) => (s.signups14.find(x => x.d === i) || { c: 0 }).c), mx = Math.max(1, ...days);
    return `<div class="adm-g">${statCard('Jami foydalanuvchilar', fmt(s.users))}${statCard("Bugun qo'shilgan", fmt(s.new1), 'oxirgi 24 soat')}${statCard("7 kunda qo'shilgan", fmt(s.new7))}${statCard('Faol (24 soat)', fmt(s.active1), '7 kun: ' + fmt(s.active7))}${statCard('Premium', fmt(s.premium))}${statCard('Avtomaktablar', fmt(s.schools), 'arizalar: ' + fmt(s.leads))}${statCard('Jami ball', fmt(s.points))}</div>
      <div class="card mt"><div class="h-sec">Ro'yxatdan o'tish (oxirgi 14 kun)</div><div class="adm-bars">${days.map((c, i) => `<i title="${c}" style="height:${Math.max(4, Math.round(c / mx * 100))}%"><em>${c || ''}</em></i>`).join('')}</div></div>
      <div class="card mt"><div class="h-sec">Viloyatlar bo'yicha</div>${s.regions.length ? s.regions.map(r => `<div class="trow"><span class="nm">${esc(r.r)}</span><span class="bar"><i style="width:${Math.round(r.c / max * 100)}%"></i></span><b>${r.c}</b></div>`).join('') : '<p class="mute">Hali ma\'lumot yo\'q.</p>'}</div>`;
  };
  const usersBody = () => `<div class="field" style="max-width:420px"><label for="au-q">Qidirish (ism, familya, @username yoki Telegram ID)</label><input id="au-q" class="input" value="${esc(A.q)}" placeholder="masalan: Aziz"></div>
    <div class="stack s12" id="au-list">${!A.users ? '<div class="card">Yuklanmoqda…</div>' : A.users.length ? A.users.map(u => `<div class="card sch"><div class="sch-h"><div><h3>${esc(u.first + ' ' + u.last)} ${u.prem_until > Date.now() ? '<span class="bdg-pr">PREMIUM</span>' : ''}</h3><small class="mute">${u.username ? '@' + esc(u.username) + ' · ' : ''}ID ${esc(u.tg_id)} · ${esc(u.region || '—')}</small></div><span class="chip ok">${fmt(u.points)} ball</span></div>
      <p class="mute">Qo'shilgan: ${new Date(u.created).toLocaleDateString('uz')} · Oxirgi kirish: ${ago(u.last_seen)}${u.prem_until > Date.now() ? ' · Premium: ' + new Date(u.prem_until).toLocaleDateString('uz') + ' gacha' : ''}</p>
      <div class="ai-acts"><button class="btn soft sm" data-act="au-prem" data-id="${u.id}" data-d="30">+30 kun Premium</button><button class="btn soft sm" data-act="au-prem" data-id="${u.id}" data-d="365">+1 yil</button>${u.prem_until > Date.now() ? `<button class="btn ghost sm" data-act="au-prem" data-id="${u.id}" data-d="0">Premiumni olish</button>` : ''}<button class="btn ghost sm" data-act="au-del" data-id="${u.id}" data-n="${esc(u.first + ' ' + u.last)}">O'chirish</button></div></div>`).join('') : '<div class="card">Hech narsa topilmadi.</div>'}</div>`;
  const schoolsBody = () => `<div class="page-h"><div><h2>Avtomaktablar</h2></div><button class="btn primary" data-act="sch-edit" data-id="">+ Avtomaktab qo'shish</button></div><div class="stack s12">${!A.schools ? '<div class="card">Yuklanmoqda…</div>' : A.schools.length ? A.schools.map(V._sch.adminCard).join('') : '<div class="card" style="text-align:center;padding:30px">Hali avtomaktab yo\'q.</div>'}</div><div id="sa-leads"></div>`;
  const leadsBody = () => `<div class="card"><div class="h-sec">Oxirgi arizalar</div>${!A.leads ? 'Yuklanmoqda…' : A.leads.length ? A.leads.map(l => `<div class="trow"><span class="nm"><b>${esc(l.first + ' ' + l.last)}</b> ${l.username ? `<a href="https://t.me/${esc(l.username)}" target="_blank" rel="noopener">@${esc(l.username)}</a>` : ''}<br><small class="mute">→ ${esc(l.school)}</small></span><span class="mute">${esc(l.region || '')} ${l.phone ? ' · ' + esc(l.phone) : ''} · ${new Date(l.created).toLocaleDateString('uz')}</span></div>`).join('') : '<p class="mute">Hozircha ariza yo\'q.</p>'}</div>`;

  const BODY = { stats: statsBody, users: usersBody, schools: schoolsBody, leads: leadsBody };
  const load = async () => {
    try {
      if (A.tab === 'stats') A.stats = await get('/admin/stats');
      else if (A.tab === 'users') A.users = (await get('/admin/users?q=' + encodeURIComponent(A.q))).users;
      else if (A.tab === 'schools') { A.schools = (await get('/admin/schools')).schools; V._sch.setAdmin(A.schools); }
      else if (A.tab === 'leads') A.leads = (await get('/admin/leads')).leads;
    } catch (e) { if (e.message === 'auth') { A.err = 'Sessiya tugadi, qayta kiring'; } else toast('Yuklab bo\'lmadi'); }
    if (V.rerenderSoft) V.rerenderSoft();
  };

  V.adminLive = () => ({
    html: tok() ? shell(BODY[A.tab]()) : loginView(),
    mount() {
      if (!tok()) { const u = document.getElementById('al-u'); if (u) u.focus(); document.getElementById('al-p') && document.getElementById('al-p').addEventListener('keydown', (e) => { if (e.key === 'Enter') V.acts['al-login'](); }); return; }
      const q = document.getElementById('au-q'); if (q) { let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => { A.q = q.value.trim(); A.users = null; await load(); }, 350); }); }
      if (!A[{ stats: 'stats', users: 'users', schools: 'schools', leads: 'leads' }[A.tab]]) load(); else if (A.tab === 'schools') V._sch.setAdmin(A.schools);
    },
  });
  V.rerenderSoft = () => { if (/#\/admin/.test(location.hash) && V.rerender) { const f = document.activeElement && document.activeElement.id === 'au-q'; V.rerender(); if (f) { const q = document.getElementById('au-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } } };

  V.acts = Object.assign(V.acts || {}, {
    async 'al-login'() {
      const user = document.getElementById('al-u').value.trim(), password = document.getElementById('al-p').value; if (!user || !password) { toast('Login va parolni kiriting'); return; }
      try { const r = await fetch(api() + '/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user, password }) }); const j = await r.json(); if (!r.ok) { A.err = j.error || 'Xato'; V.rerender(); return; } setTok(j.session); A.err = ''; A.stats = A.users = A.schools = A.leads = null; A.tab = 'stats'; V.rerender(); } catch (e) { A.err = 'Server bilan aloqa yo\'q'; V.rerender(); }
    },
    'al-out'() { setTok(''); A.err = ''; V.rerender(); },
    'al-tab'(el) { A.tab = el.dataset.t; V.rerender(); },
    async 'au-prem'(el) { try { const r = await fetch(api() + '/admin/user', { method: 'POST', headers: H(), body: JSON.stringify({ id: +el.dataset.id, prem_days: +el.dataset.d }) }); if (!r.ok) throw 0; toast(+el.dataset.d ? 'Premium berildi' : 'Premium olib tashlandi'); A.users = null; load(); } catch (e) { toast('Xato'); } },
    async 'au-del'(el) { if (!confirm(el.dataset.n + ' va uning barcha ma\'lumotlari o\'chiriladi. Davom etasizmi?')) return; try { const r = await fetch(api() + '/admin/user', { method: 'POST', headers: H(), body: JSON.stringify({ id: +el.dataset.id, delete: true }) }); if (!r.ok) throw 0; toast('O\'chirildi'); A.users = null; load(); } catch (e) { toast('Xato'); } },
  });
  void closeModal; void modal;
})();
