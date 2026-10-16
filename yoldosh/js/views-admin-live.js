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
  const A = { qq: '', promos: null, tab: 'stats', orders: null, ost: 'paid', pending: 0, act: null, stats: null, users: null, q: '', schools: null, leads: null, err: '' };
  const fmt = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ago = (t) => { if (!t) return '—'; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'hozir' : m < 60 ? m + ' daq oldin' : m < 1440 ? Math.round(m / 60) + ' soat oldin' : Math.round(m / 1440) + ' kun oldin'; };
  const get = async (p) => { const r = await fetch(api() + p, { headers: H() }); if (r.status === 403 || r.status === 401) { setTok(''); throw new Error('auth'); } return r.json(); };

  const loginView = () => `<div class="login"><div class="card login-card">${brand()}<h2>Admin kirishi</h2><p class="mute">Faqat platforma egasi uchun.</p>
    <div class="field"><label for="al-u">Login</label><input id="al-u" class="input" autocomplete="username" autocapitalize="off"></div>
    <div class="field"><label for="al-p">Parol</label><input id="al-p" class="input" type="password" autocomplete="current-password"></div>
    ${A.err ? `<p style="color:var(--bad)">${esc(A.err)}</p>` : ''}
    <button class="tg-btn" data-act="al-login">${ico('crown')} Kirish</button>
    <p style="margin-top:18px;text-align:center"><a class="mute" href="#/">← Bosh sahifa</a></p></div></div>`;

  const tabs = [['stats', '📊', 'Hisob'], ['orders', '💳', "To'lovlar"], ['users', '👥', 'Foydalanuvchilar'], ['questions', '📝', 'Savollar'], ['promos', '🎟️', 'Promokodlar'], ['settings', '⚙️', 'Narxlar va sozlamalar'], ['broadcast', '📣', 'Xabar va reklama'], ['staff', '🛡️', 'Adminlar'], ['schools', '🏫', 'Avtomaktablar'], ['leads', '📨', 'Arizalar']];
  const shell = (body) => `<div class="adm"><aside class="adm-side"><a class="adm-b" href="#/">${brand()}</a>${tabs.map(([k, i, l]) => `<button class="nv ${A.tab === k ? 'on' : ''}" data-act="al-tab" data-t="${k}"><i>${i}</i>${l}${k === 'orders' && A.pending ? `<span class="cnt">${A.pending}</span>` : ''}</button>`).join('')}<span class="sp"></span><button class="nv out" data-act="al-out"><i>🚪</i>Chiqish</button></aside><main class="adm-m">${body}</main></div>`;

  const statCard = (l, v, s, ic, cls, raw) => `<div class="card adm-s ${cls || ''}"><span class="ic">${ic || ''}</span><small>${l}</small><b ${raw ? '' : `data-count="${+String(v).replace(/\s/g, '') || 0}"`}>${v}</b>${s ? `<span class="mute">${s}</span>` : ''}</div>`;
  const hello = () => { const h = new Date().getHours(); return h < 5 ? 'Xayrli tun' : h < 12 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech'; };
  const statsBody = () => {
    const s = A.stats; if (!s) return '<div class="adm-g"><div class="adm-skel"></div><div class="adm-skel"></div><div class="adm-skel"></div><div class="adm-skel"></div></div>';
    const max = Math.max(1, ...s.regions.map(r => r.c));
    const days = Array.from({ length: 14 }, (_, i) => (s.signups14.find(x => x.d === i) || { c: 0 }).c), mx = Math.max(1, ...days);
    const act = A.act;
    const feed = !act ? '<div class="adm-skel" style="height:140px"></div>' : (act.orders.length || act.users.length) ? `<div class="adm-feed">${[...act.orders.map(o => ({ t: o.updated, ic: o.status === 'approved' ? '💰' : o.status === 'rejected' ? '❌' : '⏳', tx: `${esc(o.first + ' ' + (o.last || ''))} · ${fmt(o.amount)} so'm · ${o.status === 'approved' ? 'tasdiqlandi' : o.status === 'rejected' ? 'rad etildi' : 'to\'lov kutilmoqda'}` })), ...act.users.map(u => ({ t: u.created, ic: '🆕', tx: `${esc(u.first + ' ' + (u.last || ''))} ro'yxatdan o'tdi${u.region ? ' · ' + esc(u.region) : ''}` }))].sort((a, b) => b.t - a.t).slice(0, 10).map((x, i) => `<div class="it" style="animation-delay:${i * 50}ms"><span class="dot">${x.ic}</span><span>${x.tx}<br><small class="mute">${ago(x.t)}</small></span></div>`).join('')}</div>` : '<p class="mute">Hali faoliyat yo\'q.</p>';
    return `<div class="adm-hero"><div><h1>${hello()}, admin 👋</h1><p>Chorraha platformasining bugungi holati</p></div><span class="adm-live">Jonli</span></div>
      <div class="adm-g">${statCard('Jami daromad', fmt(s.revenue) + " so'm", 'sotuvlar: ' + fmt(s.sales), '💰', 'gold', true)}${statCard('30 kunlik daromad', fmt(s.revenue30) + " so'm", '', '📈', 'gold', true)}${statCard("Kutilayotgan to'lov", fmt(s.pending), s.pending ? 'tasdiqlash kerak!' : 'hammasi joyida', '⏳', s.pending ? 'red' : '')}${statCard('Jami foydalanuvchilar', fmt(s.users), '', '👥', 'blue')}${statCard("Bugun qo'shilgan", fmt(s.new1), 'oxirgi 24 soat', '🆕')}${statCard("7 kunda qo'shilgan", fmt(s.new7), '', '📅')}${statCard('Faol (24 soat)', fmt(s.active1), '7 kun: ' + fmt(s.active7), '🔥')}${statCard('Premium', fmt(s.premium), '', '👑', 'gold')}${statCard('Batl natijalari', fmt(s.battles), '', '⚔️')}${statCard('Avtomaktablar', fmt(s.schools), 'arizalar: ' + fmt(s.leads), '🏫')}${statCard('Jami ball', fmt(s.points), '', '⭐')}</div>
      <div class="adm-2 mt"><div class="card" style="padding:22px"><div class="h-sec">Ro'yxatdan o'tish (oxirgi 14 kun)</div><div class="adm-bars">${days.map((c, i) => `<i title="${c}" style="height:${Math.max(4, Math.round(c / mx * 100))}%;animation-delay:${i * 45}ms"><em>${c || ''}</em></i>`).join('')}</div></div>
      <div class="card" style="padding:22px"><div class="h-sec">So'nggi faoliyat</div>${feed}</div></div>
      <div class="card mt" style="padding:22px"><div class="h-sec">Viloyatlar bo'yicha</div>${s.regions.length ? s.regions.map((r, i) => `<div class="trow"><span class="nm">${esc(r.r)}</span><span class="bar"><i style="width:${Math.round(r.c / max * 100)}%;animation-delay:${i * 70}ms"></i></span><b>${r.c}</b></div>`).join('') : '<p class="mute">Hali ma\'lumot yo\'q.</p>'}</div>`;
  };
  const OST = { new: ["Kutilmoqda", ''], paid: ['Tekshirish kerak', 'warn'], approved: ['Tasdiqlangan', 'ok'], rejected: ['Rad etilgan', 'bad'] };
  const ordersBody = () => `<div class="adm-hero"><div><h1>To'lovlar</h1><p>Talaba karta orqali to'lagach, shu yerda tasdiqlaysiz — Premium darhol ochiladi va talabaga Telegramdan xabar ketadi.</p></div></div>
    <div class="adm-tabs">${[['paid', 'Tekshirish kerak'], ['new', 'Kutilmoqda'], ['approved', 'Tasdiqlangan'], ['rejected', 'Rad etilgan'], ['', 'Hammasi']].map(([k, l]) => `<button class="${A.ost === k ? 'on' : ''}" data-act="od-f" data-s="${k}">${l}</button>`).join('')}</div>
    <div class="stack s12">${!A.orders ? '<div class="adm-skel"></div>' : A.orders.length ? A.orders.map(o => { const st = OST[o.status] || [o.status, '']; return `<div class="card ord"><div class="row"><div><b>#${o.id} · ${esc(o.first + ' ' + (o.last || ''))}</b> ${o.username ? `<a href="https://t.me/${esc(o.username)}" target="_blank" rel="noopener">@${esc(o.username)}</a>` : ''}<br><small class="mute">${esc(o.region || '—')} · ${o.days} kun Premium · ${ago(o.created)}</small></div><span class="amt">${fmt(o.amount)} so'm</span></div>${o.note ? `<small class="mute">📝 Izoh: ${esc(o.note)}</small>` : ''}${o.reason ? `<small class="mute">Sabab: ${esc(o.reason)}</small>` : ''}<div class="row"><span class="chip ${st[1]}">${st[0]}</span>${o.status === 'approved' || o.status === 'rejected' ? '' : `<span class="ai-acts"><button class="btn primary sm" data-act="od-ok" data-id="${o.id}" data-n="${esc(o.first)}" data-a="${o.amount}">✓ Tasdiqlash</button><button class="btn ghost sm" data-act="od-no" data-id="${o.id}">Rad etish</button></span>`}</div></div>`; }).join('') : '<div class="card mute" style="padding:26px;text-align:center">Bu bo\'limda to\'lov yo\'q.</div>'}</div>`;
  const AUDL = { all: 'Hamma foydalanuvchilar', free: "Premium bo'lmaganlar (reklama uchun eng yaxshisi)", prem: 'Premium egalari' };
  const bcItems = () => !A.bcs ? '<div class="adm-skel" style="height:90px"></div>' : A.bcs.length ? A.bcs.map(x => { const pc = x.total ? Math.min(100, Math.round((x.sent + x.failed) / x.total * 100)) : 100; return `<div class="card" style="padding:16px"><div class="row-between"><b>#${x.id} · ${x.status === 'done' ? '✅ tugagan' : x.status === 'running' ? '⏳ yuborilmoqda' : esc(x.status)}</b><small class="mute">${ago(x.created)} · ${esc(AUDL[x.audience] || x.audience)}</small></div><p class="mute" style="margin:6px 0">${x.photo ? '🖼 ' : ''}${esc(String(x.text || '').slice(0, 120))}${x.btn_text ? ' · 🔗 ' + esc(x.btn_text) : ''}</p><div class="adm-prog" style="margin:8px 0"><i style="width:${pc}%"></i></div><small class="mute">Yetkazildi: ${fmt(x.sent)} · Xato: ${fmt(x.failed)} · Jami: ${fmt(x.total)}</small></div>`; }).join('') : '<div class="card mute" style="padding:20px">Hali yuborish bo\'lmagan.</div>';
  const broadcastBody = () => `<div class="adm-hero"><div><h1>Xabar va reklama</h1><p>Ro'yxatdan o'tgan foydalanuvchilarga Telegram bot orqali xabar yoki rasmli reklama yuboring. Tugma qo'shsangiz, bosganda sizning havolangiz ochiladi. Botning o'zida ham shu ishni qilish mumkin: /admin</p></div></div>
    <div class="card adm-bc" style="padding:22px"><div class="field"><label for="bc-t">Matn (reklamada rasm izohi bo'ladi)</label><textarea id="bc-t" class="input" maxlength="1000" placeholder="Masalan: 🎉 Bugun Premium 30% arzon! Faqat shu hafta."></textarea></div>
    <div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="bc-a">Kimga</label><select id="bc-a" class="select">${Object.entries(AUDL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div class="field"><label for="bc-img">Rasm (ixtiyoriy, reklama uchun)</label><input id="bc-img" type="file" accept="image/*"></div>
    <div class="field"><label for="bc-bt">Tugma matni (ixtiyoriy)</label><input id="bc-bt" class="input" maxlength="40" placeholder="Premium olish"></div><div class="field"><label for="bc-bu">Tugma havolasi</label><input id="bc-bu" class="input" maxlength="300" placeholder="https://chorrahaa.uz"></div></div>
    <div class="mute" id="bc-s">Yuborishdan oldin matnni diqqat bilan tekshiring: qaytarib bo'lmaydi.</div><div class="ai-acts" style="margin-top:14px"><button class="btn primary" data-act="bc-go">📣 Yuborish</button></div></div>
    <div class="h-sec mt">So'nggi yuborishlar</div><div class="stack s12" id="bc-list">${bcItems()}</div>`;
  const PL = { broadcast: 'Xabar va reklama yuborish', orders: "To'lovlarni tasdiqlash", users: 'Foydalanuvchilarga Premium berish', promo: 'Promokod yaratish', stats: "Statistikani ko'rish" };
  const staffBody = () => { const S = A.staff; if (!S) return '<div class="adm-skel"></div>'; return `<div class="adm-hero"><div><h1>Adminlar</h1><p>Admin qo'shganda unga nimalarga ruxsat berishni o'zingiz tanlaysiz. Adminlar botda /admin buyrug'i orqali ishlaydi va faqat o'zi uchun ruxsat etilgan bo'limlarni ko'radi.</p></div></div>
    <div class="card" style="padding:20px"><div class="h-sec">Egalar (hamma huquq)</div><p class="mute">${S.owners.map(o => '<code>' + esc(o) + '</code>').join(', ') || '—'}</p></div>
    <div class="card mt" style="padding:20px"><div class="h-sec">Yangi admin / ruxsatni o'zgartirish</div><div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="sf-id">Telegram ID (raqam)</label><input id="sf-id" class="input" inputmode="numeric" placeholder="123456789"></div><div class="field"><label for="sf-n">Ismi (eslab qolish uchun)</label><input id="sf-n" class="input" maxlength="60" placeholder="Ali"></div></div>
    <div class="stack s12" style="margin:8px 0">${Object.entries(S.perms).map(([k, l]) => `<label class="consent"><input type="checkbox" class="sf-p" value="${k}"> <span><b>${esc(l)}</b></span></label>`).join('')}</div><div class="ai-acts"><button class="btn primary" data-act="sf-save">Saqlash</button></div>
    <p class="mute" style="font-size:13px">Telegram ID ni bilmasangiz: odam @userinfobot ga /start yozsa, ID sini ko'rsatadi. Yoki botda /admin → «Adminlar» → «Admin qo'shish» orqali uning xabarini forward qilsangiz kifoya.</p></div>
    <div class="h-sec mt">Adminlar (${S.staff.length})</div><div class="stack s12">${S.staff.length ? S.staff.map(x => `<div class="card sch"><div class="sch-h"><div><h3>${esc(x.name || x.tg_id)} <small class="mute">${esc(x.tg_id)}</small></h3><small class="mute">${x.perms.length ? x.perms.map(p => esc(PL[p] || p)).join(' · ') : 'ruxsat yo\'q'}</small></div></div><div class="ai-acts"><button class="btn soft sm" data-act="sf-edit" data-id="${esc(x.tg_id)}">Tahrirlash</button><button class="btn ghost sm" data-act="sf-del" data-id="${esc(x.tg_id)}">Olib tashlash</button></div></div>`).join('') : '<div class="card mute" style="padding:20px">Hali admin yo\'q.</div>'}</div>`; };
  const countUp = (root) => root.querySelectorAll('[data-count]').forEach(el => { const to = +el.dataset.count, t0 = performance.now(), d = 900; if (!to) return; const f = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(to * e)); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const usersBody = () => `<div class="field" style="max-width:420px"><label for="au-q">Qidirish (ism, familya, @username yoki Telegram ID)</label><input id="au-q" class="input" value="${esc(A.q)}" placeholder="masalan: Aziz"></div>
    <div class="stack s12" id="au-list">${!A.users ? '<div class="card">Yuklanmoqda…</div>' : A.users.length ? A.users.map(u => `<div class="card sch"><div class="sch-h"><div><h3>${esc(u.first + ' ' + u.last)} ${u.prem_until > Date.now() ? '<span class="bdg-pr">PREMIUM</span>' : ''}</h3><small class="mute">${u.username ? '@' + esc(u.username) + ' · ' : ''}ID ${esc(u.tg_id)} · ${esc(u.region || '—')}</small></div><span class="chip ok">${fmt(u.points)} ball</span></div>
      <p class="mute">Qo'shilgan: ${new Date(u.created).toLocaleDateString('uz')} · Oxirgi kirish: ${ago(u.last_seen)}${u.prem_until > Date.now() ? ' · Premium: ' + new Date(u.prem_until).toLocaleDateString('uz') + ' gacha' : ''}</p>
      <div class="ai-acts"><button class="btn soft sm" data-act="au-add" data-id="${u.id}" data-n="${esc(u.first)}">+ Kun qo'shish…</button><button class="btn soft sm" data-act="au-prem" data-id="${u.id}" data-d="30">+30 kun Premium</button><button class="btn soft sm" data-act="au-prem" data-id="${u.id}" data-d="365">+1 yil</button>${u.prem_until > Date.now() ? `<button class="btn ghost sm" data-act="au-prem" data-id="${u.id}" data-d="0">Premiumni olish</button>` : ''}<button class="btn ghost sm" data-act="au-del" data-id="${u.id}" data-n="${esc(u.first + ' ' + u.last)}">O'chirish</button></div></div>`).join('') : '<div class="card">Hech narsa topilmadi.</div>'}</div>`;
  const schoolsBody = () => `<div class="page-h"><div><h2>Avtomaktablar</h2></div><button class="btn primary" data-act="sch-edit" data-id="">+ Avtomaktab qo'shish</button></div><div class="stack s12">${!A.schools ? '<div class="card">Yuklanmoqda…</div>' : A.schools.length ? A.schools.map(V._sch.adminCard).join('') : '<div class="card" style="text-align:center;padding:30px">Hali avtomaktab yo\'q.</div>'}</div><div id="sa-leads"></div>`;
  const leadsBody = () => `<div class="card"><div class="h-sec">Oxirgi arizalar</div>${!A.leads ? 'Yuklanmoqda…' : A.leads.length ? A.leads.map(l => `<div class="trow"><span class="nm"><b>${esc(l.first + ' ' + l.last)}</b> ${l.username ? `<a href="https://t.me/${esc(l.username)}" target="_blank" rel="noopener">@${esc(l.username)}</a>` : ''}<br><small class="mute">→ ${esc(l.school)}</small></span><span class="mute">${esc(l.region || '')} ${l.phone ? ' · ' + esc(l.phone) : ''} · ${new Date(l.created).toLocaleDateString('uz')}</span></div>`).join('') : '<p class="mute">Hozircha ariza yo\'q.</p>'}</div>`;


  const SETF = [['premiumPrice', "Premium narxi (so'm / oy)"], ['marathonPrice', "Imtihon oldi marafoni narxi (so'm)"], ['trialDays', 'Yangi foydalanuvchiga bepul sinov (kun)'], ['freeRunsPerDay', 'Bepul rejimda kuniga testlar soni'], ['freeTestSize', 'Bepul test hajmi (savol)'], ['refNeed', "Premium sovg'a uchun taklif qilinadigan do'stlar"], ['refNeedPaid', "Ulardan Premium sotib olganlar soni"], ['refRewardDays', "Sovg'a Premium muddati (kun)"], ['passPercent', "Imtihondan o'tish chegarasi (%)"], ['examQuestions', 'Imtihon savollari soni'], ['examMinutes', 'Imtihon vaqti (daqiqa)'], ['price3', "3 oylik Premium narxi (so'm; bo'sh = 3×oylik)"], ['price12', "1 yillik Premium narxi (so'm; bo'sh = 12×oylik)"]];
  const PAYF = [['payCard', "Karta raqami (talabaga ko'rinadi)", '8600 1234 5678 9012'], ['payName', 'Karta egasi (F.I.Sh.)', 'ALIYEV ALI'], ['payNote', "To'lov izohi bo'yicha qo'shimcha ko'rsatma", 'masalan: Telegram username ni ham yozing'], ['supportTelegram', 'Yordam uchun Telegram (@username)', '@chorahabot']];
  const settingsBody = () => { const c = window.CFG || CFG, st = (window.CMS && CMS.settings) || {}; return `<div class="card"><div class="h-sec">Umumiy</div>
    <label class="consent"><input type="checkbox" id="st-allFree" ${c.allFree ? 'checked' : ''}> <span><b>Hamma funksiya bepul</b> (Premium cheklovlari o'chiq). O'chirsangiz, bepul rejim cheklovlari va Premium ishga tushadi.</span></label>
    <div class="field"><label for="st-announcement">E'lon (hamma talabaning bosh sahifasi tepasida chiqadi; bo'sh = yo'q)</label><input id="st-announcement" class="input" maxlength="200" value="${esc(c.announcement || '')}" placeholder="Masalan: 1 noyabrdan yangi savollar qo'shiladi!"></div></div>
    <div class="card mt"><div class="h-sec">💳 To'lov rekvizitlari</div><p class="mute" style="font-size:13.5px">Talaba «Premium olish» ni bossa, shu karta ko'rsatiladi. To'lovni «To'lovlar» bo'limida tasdiqlaysiz.</p><div class="grid g2 keep2" style="gap:12px">${PAYF.map(([k, l, ph]) => `<div class="field"><label for="st-${k}">${l}</label><input id="st-${k}" class="input" maxlength="120" placeholder="${esc(ph)}" value="${esc(c[k] || '')}"></div>`).join('')}</div></div>
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
  const BODY = { staff: staffBody, orders: ordersBody, broadcast: broadcastBody, settings: settingsBody, questions: questionsBody, promos: promosBody, stats: statsBody, users: usersBody, schools: schoolsBody, leads: leadsBody };
  const load = async () => {
    try {
      if (A.tab === 'stats') { A.stats = await get('/admin/stats'); A.pending = A.stats.pending; get('/admin/activity').then(x => { A.act = x; if (A.tab === 'stats' && V.rerender) V.rerender(); }).catch(() => { }); }
      else if (A.tab === 'staff') { A.staff = await get('/admin/staff'); }
      else if (A.tab === 'broadcast') { A.bcs = (await get('/admin/broadcasts')).items; if (A.bcs.some(x => x.status === 'running')) { clearTimeout(A._bt); A._bt = setTimeout(() => { if (A.tab === 'broadcast') load(); }, 3000); } }
      else if (A.tab === 'orders') { A.orders = (await get('/admin/orders' + (A.ost ? '?status=' + A.ost : ''))).orders; }
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
      countUp(document.querySelector('.adm-m')); if (!A.stats && !A.orders && A.tab !== 'stats') { } if (A.tab === 'stats' && !A.stats) { /* load() quyida */ }
      const q = document.getElementById('au-q'); if (q) { let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => { A.q = q.value.trim(); A.users = null; await load(); }, 350); }); }
      const aq = document.getElementById('aq-q'); if (aq) { let t; aq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { A.qq = aq.value.trim(); V.rerenderSoft2('aq-q'); }, 350); }); }
      if (A.tab === 'promos' && !A.promos) load(); else if (!['settings', 'questions', 'promos'].includes(A.tab) && !A[{ stats: 'stats', users: 'users', schools: 'schools', leads: 'leads', orders: 'orders', staff: 'staff', broadcast: 'bcs' }[A.tab]]) load(); else if (A.tab === 'schools') V._sch.setAdmin(A.schools);
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
      const o = {}; SETF.forEach(([k]) => { const v = document.getElementById('st-' + k).value; if (v !== '') o[k] = +v; }); o.allFree = document.getElementById('st-allFree').checked; o.announcement = document.getElementById('st-announcement').value.trim(); PAYF.forEach(([k]) => { o[k] = document.getElementById('st-' + k).value.trim(); });
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
      try { const r = await fetch(api() + '/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user, password }) }); const j = await r.json(); if (!r.ok) { A.err = j.error || 'Xato'; V.rerender(); return; } setTok(j.session); A.err = ''; fetch(api() + '/admin/bot-setup', { method: 'POST', headers: H(), body: '{}' }).catch(() => { }); A.stats = A.users = A.schools = A.leads = null; A.tab = 'stats'; V.rerender(); } catch (e) { A.err = 'Server bilan aloqa yo\'q'; V.rerender(); }
    },
    'al-out'() { setTok(''); A.err = ''; V.rerender(); },
    'al-tab'(el) { A.tab = el.dataset.t; if (A.tab === 'staff') A.staff = null; if (A.tab === 'broadcast') A.bcs = null; if (A.tab === 'stats') { A.stats = null; A.act = null; } if (A.tab === 'orders') A.orders = null; window.scrollTo(0, 0); V.rerender(); },
    'od-f'(el) { A.ost = el.dataset.s; A.orders = null; V.rerender(); },
    async 'od-ok'(el) { if (!confirm('#' + el.dataset.id + ' (' + el.dataset.n + ', ' + fmt(el.dataset.a) + " so'm) to'lovi tasdiqlansinmi? Premium darhol ochiladi.")) return; try { await post('/admin/order', { id: +el.dataset.id, action: 'approve' }); toast('Tasdiqlandi, Premium ochildi'); A.orders = null; A.pending = Math.max(0, A.pending - 1); V.rerender(); } catch (e) { toast('Xato: ' + e.message); } },
    async 'od-no'(el) { const r = prompt("Rad etish sababi (talabaga yuboriladi, bo'sh qoldirsa ham bo'ladi):"); if (r === null) return; try { await post('/admin/order', { id: +el.dataset.id, action: 'reject', reason: r }); toast('Rad etildi'); A.orders = null; A.pending = Math.max(0, A.pending - 1); V.rerender(); } catch (e) { toast('Xato: ' + e.message); } },
    async 'au-add'(el) { const d = parseInt(prompt(el.dataset.n + " ga necha kun Premium qo'shilsin?", '30'), 10); if (!(d > 0)) return; try { await post('/admin/user', { id: +el.dataset.id, add_days: d }); toast('+' + d + " kun qo'shildi"); A.users = null; load(); } catch (e) { toast('Xato: ' + e.message); } },
    async 'bc-go'() {
      const text = document.getElementById('bc-t').value.trim(), file = document.getElementById('bc-img').files[0];
      const bt = document.getElementById('bc-bt').value.trim(), bu = document.getElementById('bc-bu').value.trim(), audience = document.getElementById('bc-a').value, s = document.getElementById('bc-s');
      if (text.length < 3 && !file) { toast('Matn yoki rasm kerak'); return; }
      if ((bt || bu) && !(bt && /^https?:\/\//.test(bu))) { toast("Tugma uchun matn va https:// bilan boshlanadigan havola kerak"); return; }
      const names = { all: 'HAMMA foydalanuvchiga', free: "Premium bo'lmaganlarga", prem: 'Premium egalariga' };
      if (!confirm('Xabar ' + names[audience] + ' yuboriladi. Qaytarib bo\'lmaydi. Davom etasizmi?')) return;
      try {
        s.textContent = 'Tayyorlanmoqda…'; let media_id;
        if (file) { const m = await post('/admin/media', { data: await fileToData(file) }); media_id = m.id; }
        const r = await post('/admin/broadcast', { text, audience, media_id, btn_text: bt, btn_url: bu });
        toast('Yuborish boshlandi: ' + r.total + ' kishi'); document.getElementById('bc-t').value = ''; s.textContent = '✅ Boshlandi (#' + r.id + '). Pastda jarayonni ko\'rasiz.'; A.bcs = null; load();
      } catch (e) { s.textContent = 'Xato: ' + e.message; }
    },
    async 'sf-save'() {
      const id = document.getElementById('sf-id').value.replace(/\D/g, ''); if (id.length < 2) { toast('Telegram ID ni kiriting'); return; }
      const perms = [...document.querySelectorAll('.sf-p:checked')].map(x => x.value);
      try { await post('/admin/staff', { tg_id: id, name: document.getElementById('sf-n').value.trim(), perms }); toast('Saqlandi'); A.staff = null; load(); } catch (e) { toast('Xato: ' + e.message); }
    },
    'sf-edit'(el) {
      const x = (A.staff && A.staff.staff || []).find(y => y.tg_id === el.dataset.id); if (!x) return;
      document.getElementById('sf-id').value = x.tg_id; document.getElementById('sf-n').value = x.name || '';
      document.querySelectorAll('.sf-p').forEach(c => { c.checked = x.perms.includes(c.value); }); document.getElementById('sf-id').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    async 'sf-del'(el) { if (!confirm('Bu adminlikdan olib tashlansinmi?')) return; try { await post('/admin/staff', { tg_id: el.dataset.id, delete: true }); toast('Olib tashlandi'); A.staff = null; load(); } catch (e) { toast('Xato'); } },
    async 'au-prem'(el) { try { const r = await fetch(api() + '/admin/user', { method: 'POST', headers: H(), body: JSON.stringify({ id: +el.dataset.id, prem_days: +el.dataset.d }) }); if (!r.ok) throw 0; toast(+el.dataset.d ? 'Premium berildi' : 'Premium olib tashlandi'); A.users = null; load(); } catch (e) { toast('Xato'); } },
    async 'au-del'(el) { if (!confirm(el.dataset.n + ' va uning barcha ma\'lumotlari o\'chiriladi. Davom etasizmi?')) return; try { const r = await fetch(api() + '/admin/user', { method: 'POST', headers: H(), body: JSON.stringify({ id: +el.dataset.id, delete: true }) }); if (!r.ok) throw 0; toast('O\'chirildi'); A.users = null; load(); } catch (e) { toast('Xato'); } },
  });
  void closeModal; void modal;
})();
