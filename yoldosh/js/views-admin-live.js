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
  const A = { qq: '', promos: null, tab: 'stats', stats: null, users: null, q: '', schools: null, leads: null, err: '' };
  const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ago = (t) => { if (!t) return '—'; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'hozir' : m < 60 ? m + ' daq oldin' : m < 1440 ? Math.round(m / 60) + ' soat oldin' : Math.round(m / 1440) + ' kun oldin'; };
  const get = async (p) => { const r = await fetch(api() + p, { headers: H() }); if (r.status === 403 || r.status === 401) { setTok(''); throw new Error('auth'); } return r.json(); };

  const loginView = () => `<div class="login"><div class="card login-card">${brand()}<h2>Admin kirishi</h2><p class="mute">Faqat platforma egasi uchun.</p>
    <div class="field"><label for="al-u">Login</label><input id="al-u" class="input" autocomplete="username" autocapitalize="off"></div>
    <div class="field"><label for="al-p">Parol</label><input id="al-p" class="input" type="password" autocomplete="current-password"></div>
    ${A.err ? `<p style="color:var(--bad)">${esc(A.err)}</p>` : ''}
    <button class="tg-btn" data-act="al-login">${ico('crown')} Kirish</button>
    <p style="margin-top:18px;text-align:center"><a class="mute" href="#/">← Bosh sahifa</a></p></div></div>`;

  const tabs = [['stats', 'Hisob'], ['settings', 'Narxlar va sozlamalar'], ['questions', 'Savollar'], ['promos', 'Promokodlar'], ['users', 'Foydalanuvchilar'], ['schools', 'Avtomaktablar'], ['leads', 'Arizalar']];
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


  const SETF = [['premiumPrice', "Premium narxi (so'm / oy)"], ['marathonPrice', "Imtihon oldi marafoni narxi (so'm)"], ['trialDays', 'Yangi foydalanuvchiga bepul sinov (kun)'], ['freeRunsPerDay', 'Bepul rejimda kuniga testlar soni'], ['freeTestSize', 'Bepul test hajmi (savol)'], ['refNeed', "Premium sovg'a uchun taklif qilinadigan do'stlar"], ['refNeedPaid', "Ulardan Premium sotib olganlar soni"], ['refRewardDays', "Sovg'a Premium muddati (kun)"], ['passPercent', "Imtihondan o'tish chegarasi (%)"], ['examQuestions', 'Imtihon savollari soni'], ['examMinutes', 'Imtihon vaqti (daqiqa)']];
  const settingsBody = () => { const c = window.CFG || CFG, st = (window.CMS && CMS.settings) || {}; return `<div class="card"><div class="h-sec">Umumiy</div>
    <label class="consent"><input type="checkbox" id="st-allFree" ${c.allFree ? 'checked' : ''}> <span><b>Hamma funksiya bepul</b> (Premium cheklovlari o'chiq). O'chirsangiz, bepul rejim cheklovlari va Premium ishga tushadi.</span></label>
    <div class="field"><label for="st-announcement">E'lon (hamma talabaning bosh sahifasi tepasida chiqadi; bo'sh = yo'q)</label><input id="st-announcement" class="input" maxlength="200" value="${esc(c.announcement || '')}" placeholder="Masalan: 1 noyabrdan yangi savollar qo'shiladi!"></div></div>
    <div class="card mt"><div class="h-sec">Narxlar va qoidalar</div><div class="grid g2 keep2" style="gap:12px">${SETF.map(([k, l]) => `<div class="field"><label for="st-${k}">${l}</label><input id="st-${k}" class="input" type="number" min="0" value="${c[k] === undefined ? '' : c[k]}"></div>`).join('')}</div>
    <div class="ai-acts"><button class="btn primary" data-act="st-save">Saqlash</button></div><p class="mute" style="font-size:13px">O'zgarishlar bir necha soniyada hamma foydalanuvchiga tushadi (ular sahifani keyingi ochganda).</p></div>`; };

  const questionsBody = () => {
    const all = BANK.ALLQ || [], q = A.qq.toLowerCase(), cust = (window.CMS && CMS.allCustom) || [];
    const list = (q ? all.filter(x => String(x.n) === q || x.text.toLowerCase().includes(q)) : all.filter(x => x.edited || x.hidden)).slice(0, 40);
    return `<div class="page-h"><div><h2>Savollar</h2><p class="mute">Jami: ${all.length} ta rasmiy + ${cust.length} ta qo'shimcha. Tahrirlangan yoki yashirilgan savollar pastda.</p></div><button class="btn primary" data-act="aq-new">+ Yangi savol</button></div>
    <div class="field" style="max-width:420px"><label for="aq-q">Rasmiy savolni qidirish (raqam yoki matn)</label><input id="aq-q" class="input" value="${esc(A.qq)}" placeholder="masalan: 405 yoki 'svetofor'"></div>
    <div class="stack s12">${list.length ? list.map(x => `<div class="card sch ${x.hidden ? 'off' : ''}"><div class="sch-h"><div><h3>#${x.n} ${x.edited ? '<span class="chip acc">tahrirlangan</span>' : ''} ${x.hidden ? '<span class="chip">yashirin</span>' : ''}</h3><small class="mute">${esc(x.text.slice(0, 140))}</small></div></div><div class="ai-acts"><button class="btn soft sm" data-act="aq-edit" data-n="${x.n}">Tahrirlash</button>${x.edited ? `<button class="btn ghost sm" data-act="aq-reset" data-n="${x.n}">Asl holiga qaytarish</button>` : ''}</div></div>`).join('') : '<div class="card">Hech narsa yo\'q. Qidiruvdan foydalaning.</div>'}</div>
    <div class="h-sec mt">Qo'shimcha savollar (${cust.length})</div><div class="stack s12">${cust.length ? cust.map(x => `<div class="card sch"><div class="sch-h"><div><h3>${esc(x.text.slice(0, 120))}</h3><small class="mute">${esc(x.topicName)} · ${x.options.length} variant${x.img ? ' · rasmli' : ''}</small></div></div><div class="ai-acts"><button class="btn soft sm" data-act="aq-cedit" data-id="${x.cid}">Tahrirlash</button><button class="btn ghost sm" data-act="aq-cdel" data-id="${x.cid}">O'chirish</button></div></div>`).join('') : '<div class="card mute">Hali qo\'shimcha savol yo\'q.</div>'}</div>`;
  };

  const promosBody = () => `<div class="page-h"><div><h2>Promokodlar</h2><p class="mute">Foydalanuvchi kodni kiritsa, Premium muddati qo'shiladi. Har kishi bitta kodni bir marta ishlatadi.</p></div></div>
    <div class="card"><div class="h-sec">Yangi promokod</div><div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="pm-c">Kod (lotin harf/raqam)</label><input id="pm-c" class="input" maxlength="24" placeholder="YOZ2026"></div><div class="field"><label for="pm-d">Necha kun Premium</label><input id="pm-d" class="input" type="number" min="1" value="30"></div><div class="field"><label for="pm-m">Limit (0 = cheksiz)</label><input id="pm-m" class="input" type="number" min="0" value="0"></div><div class="field"><label for="pm-e">Amal qilish muddati (ixtiyoriy)</label><input id="pm-e" class="input" type="date"></div></div><div class="ai-acts"><button class="btn primary" data-act="pm-add">Yaratish</button></div></div>
    <div class="stack s12 mt">${!A.promos ? '<div class="card">Yuklanmoqda…</div>' : A.promos.length ? A.promos.map(p => `<div class="card sch ${p.active ? '' : 'off'}"><div class="sch-h"><div><h3>${esc(p.code)} <span class="chip acc">+${p.days} kun</span></h3><small class="mute">Ishlatilgan: ${p.used}${p.max_uses ? ' / ' + p.max_uses : ''}${p.expires ? ' · ' + new Date(p.expires).toLocaleDateString('uz') + ' gacha' : ''}</small></div></div><div class="ai-acts"><button class="btn soft sm" data-act="pm-tog" data-id="${p.id}">${p.active ? "O'chirib qo'yish" : 'Yoqish'}</button><button class="btn ghost sm" data-act="pm-del" data-id="${p.id}">O'chirish</button></div></div>`).join('') : '<div class="card mute">Hali promokod yo\'q.</div>'}</div>`;
  const BODY = { settings: settingsBody, questions: questionsBody, promos: promosBody, stats: statsBody, users: usersBody, schools: schoolsBody, leads: leadsBody };
  const load = async () => {
    try {
      if (A.tab === 'stats') A.stats = await get('/admin/stats');
      else if (A.tab === 'users') A.users = (await get('/admin/users?q=' + encodeURIComponent(A.q))).users;
      else if (A.tab === 'schools') { A.schools = (await get('/admin/schools')).schools; V._sch.setAdmin(A.schools); }
      else if (A.tab === 'leads') A.leads = (await get('/admin/leads')).leads;
      else if (A.tab === 'promos') A.promos = (await get('/admin/promos')).promos;
      else if (A.tab === 'questions' && window.CMS) await CMS.refresh();
    } catch (e) { if (e.message === 'auth') { A.err = 'Sessiya tugadi, qayta kiring'; } else toast('Yuklab bo\'lmadi'); }
    if (V.rerenderSoft) V.rerenderSoft();
  };

  V.adminLive = () => ({
    html: tok() ? shell(BODY[A.tab]()) : loginView(),
    mount() {
      if (!tok()) { const u = document.getElementById('al-u'); if (u) u.focus(); document.getElementById('al-p') && document.getElementById('al-p').addEventListener('keydown', (e) => { if (e.key === 'Enter') V.acts['al-login'](); }); return; }
      const q = document.getElementById('au-q'); if (q) { let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => { A.q = q.value.trim(); A.users = null; await load(); }, 350); }); }
      const aq = document.getElementById('aq-q'); if (aq) { let t; aq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { A.qq = aq.value.trim(); V.rerenderSoft2('aq-q'); }, 350); }); }
      if (A.tab === 'promos' && !A.promos) load(); else if (!['settings', 'questions', 'promos'].includes(A.tab) && !A[{ stats: 'stats', users: 'users', schools: 'schools', leads: 'leads' }[A.tab]]) load(); else if (A.tab === 'schools') V._sch.setAdmin(A.schools);
    },
  });
  V.rerenderSoft = () => { if (/#\/admin/.test(location.hash) && V.rerender) { const f = document.activeElement && document.activeElement.id === 'au-q'; V.rerender(); if (f) { const q = document.getElementById('au-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } } };

  V.rerenderSoft2 = (id) => { V.rerender(); const e = document.getElementById(id); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } };
  const post = async (p, b) => { const r = await fetch(api() + p, { method: 'POST', headers: H(), body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'xato'); return j; };
  const qForm = (t, q) => `<h3>${t}</h3><div style="max-height:64vh;overflow:auto;padding-right:4px"><div class="field"><label for="qf-t">Savol matni</label><textarea id="qf-t" class="input" rows="3">${esc(q.text || '')}</textarea></div>
    <div class="field"><label for="qf-o">Variantlar (har qatorda bittadan, 2–6 ta)</label><textarea id="qf-o" class="input" rows="5">${esc((q.options || []).map(o => o.label || o).join('\n'))}</textarea></div>
    <div class="field"><label for="qf-a">To'g'ri variant raqami (1 dan)</label><input id="qf-a" class="input" type="number" min="1" max="6" value="${(q.answer || 0) + 1}"></div>
    <div class="field"><label for="qf-x">Tushuntirish (AI yordamchi va ovoz uchun)</label><textarea id="qf-x" class="input" rows="3">${esc(q.explainText || '')}</textarea></div>
    ${q.isNew ? `<div class="field"><label for="qf-top">Mavzu</label><select id="qf-top" class="select">${BANK.TOPICS.map(t => `<option value="${t.id}" ${t.id === (q.topic || 'rules') ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label for="qf-img">Rasm (ixtiyoriy, 400 KB gacha)</label><input id="qf-img" type="file" accept="image/*"><small class="mute" id="qf-imgs">${q.img ? 'Hozirgi rasm saqlanadi' : ''}</small></div>` : ''}
    ${q.n && !q.isNew ? `<label class="consent"><input type="checkbox" id="qf-h" ${q.hidden ? 'checked' : ''}> <span>Bu savolni yashirish (talabalarga ko'rinmasin)</span></label>` : ''}</div>
    <div class="ai-acts"><button class="btn primary" data-act="qf-save" data-n="${q.n || ''}" data-cid="${q.cid || ''}" data-img="${esc(q.imgRaw || '')}">Saqlash</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`;
  const fileToData = (f) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); let q = 0.85, d = c.toDataURL('image/jpeg', q); while (d.length > 540000 && q > 0.4) { q -= 0.1; d = c.toDataURL('image/jpeg', q); } res(d); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(f); });

  V.acts = Object.assign(V.acts || {}, {
    async 'st-save'() {
      const o = {}; SETF.forEach(([k]) => { const v = document.getElementById('st-' + k).value; if (v !== '') o[k] = +v; }); o.allFree = document.getElementById('st-allFree').checked; o.announcement = document.getElementById('st-announcement').value.trim();
      try { await post('/admin/settings', { settings: o }); if (window.CMS) { CMS.applySettings(Object.assign({}, CMS.settings, o)); try { localStorage.removeItem('chorraha_cms_v1'); } catch (e) { } } toast('Saqlandi'); } catch (e) { toast('Saqlab bo\'lmadi: ' + e.message); }
    },
    'aq-new'() { modal(qForm('Yangi savol', { isNew: true, options: ['', '', ''] })); },
    'aq-edit'(el) { const q = (BANK.ALLQ || []).find(x => String(x.n) === el.dataset.n); if (!q) return; modal(qForm('Savol #' + q.n, Object.assign({}, q, { explainText: (window.EXPL && EXPL[q.n]) || '' }))); },
    'aq-cedit'(el) { const q = (CMS.allCustom || []).find(x => String(x.cid) === el.dataset.id); if (!q) return; modal(qForm('Savolni tahrirlash', Object.assign({}, q, { isNew: true, explainText: (window.EXPL && EXPL[q.n]) || '', imgRaw: q.img ? (q.img.split('/media/')[1] ? 'media:' + q.img.split('/media/')[1] : q.img) : '' }))); },
    async 'aq-reset'(el) { try { await post('/admin/qedit', { n: +el.dataset.n, reset: true }); toast('Asl holiga qaytdi'); await CMS.refresh(); A.tab = 'questions'; V.rerender(); } catch (e) { toast('Xato'); } },
    async 'aq-cdel'(el) { if (!confirm("Bu savol o'chiriladi. Davom etasizmi?")) return; try { await post('/admin/cquestion', { id: +el.dataset.id, delete: true }); toast("O'chirildi"); await CMS.refresh(); V.rerender(); } catch (e) { toast('Xato'); } },
    async 'qf-save'(el) {
      const text = document.getElementById('qf-t').value.trim(), options = document.getElementById('qf-o').value.split('\n').map(x => x.trim()).filter(Boolean), answer = (+document.getElementById('qf-a').value || 1) - 1, explain = document.getElementById('qf-x').value.trim();
      if (text.length < 5 || options.length < 2 || answer < 0 || answer >= options.length) { toast("Savol, kamida 2 variant va to'g'ri variant raqamini to'g'ri kiriting"); return; }
      try {
        if (el.dataset.n && !document.getElementById('qf-top')) await post('/admin/qedit', { n: +el.dataset.n, hide: document.getElementById('qf-h').checked, text, options, answer, explain });
        else {
          let img = el.dataset.img || ''; const f = document.getElementById('qf-img') && document.getElementById('qf-img').files[0];
          if (f) { const m = await post('/admin/media', { data: await fileToData(f) }); img = 'media:' + m.id; }
          await post('/admin/cquestion', { id: el.dataset.cid ? +el.dataset.cid : undefined, topic: document.getElementById('qf-top').value, text, options, answer, explain, img });
        }
        closeModal(); toast('Saqlandi'); await CMS.refresh(); A.tab = 'questions'; V.rerender();
      } catch (e) { toast('Saqlab bo\'lmadi: ' + e.message); }
    },
    async 'pm-add'() {
      const e = document.getElementById('pm-e').value; try { await post('/admin/promo', { code: document.getElementById('pm-c').value, days: +document.getElementById('pm-d').value, max_uses: +document.getElementById('pm-m').value || 0, expires: e ? new Date(e + 'T23:59:59').getTime() : 0 }); toast('Yaratildi'); A.promos = null; load(); } catch (er) { toast(er.message); }
    },
    async 'pm-tog'(el) { try { await post('/admin/promo', { id: +el.dataset.id, toggle: true }); A.promos = null; load(); } catch (e) { toast('Xato'); } },
    async 'pm-del'(el) { if (!confirm("Promokod o'chiriladi. Davom etasizmi?")) return; try { await post('/admin/promo', { id: +el.dataset.id, delete: true }); A.promos = null; load(); } catch (e) { toast('Xato'); } },
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
