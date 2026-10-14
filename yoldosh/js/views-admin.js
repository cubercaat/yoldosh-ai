/* Bosh admin paneli: narxlar, qoidalar, avtomaktablar kelishuvi, Telegram bot (ko'zgu) va uning to'lovi, talabalar, e'lonlar, promokodlar.
   Oddiy ustoz narxlarni O'ZGARTIRA OLMAYDI. Kelishuv turlari: tarif / kelishilgan summa / ulush (masalan 30%).
   Telegram bot: har maktab umumiy botdan yoki o'z botidan foydalanadi; to'lov muddati tugagan kuni bot AVTOMATIK to'xtaydi
   (backend: src/services/bot.js — webhook har xabarda muddatni tekshiradi, soatlik vazifa esa hodisani qayd etadi).
   DEMO: admin PIN config.js da (adminPin), ma'lumotlar brauzerda; haqiqiy rejimda admin roli va to'lovlar serverda. */
(function () {
  const { ico, esc, ava, toast, modal, closeModal, copy } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const $ = (id) => document.getElementById(id);
  const DAY = 864e5;
  const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ` so'm`;
  const num = (v) => Math.max(0, Math.round(+String(v).replace(/\s/g, '')) || 0);
  const dd = (t) => UI.dt(t, false);

  /* ---------- narxlar: asl qiymat + admin o'zgarishi + maktab kelishuvi ---------- */
  const BASE = JSON.parse(JSON.stringify({ premiumPrice: CFG.premiumPrice, marathonPrice: CFG.marathonPrice, trialDays: CFG.trialDays, freeRunsPerDay: CFG.freeRunsPerDay, freeTestSize: CFG.freeTestSize, refNeed: CFG.refNeed, refNeedPaid: CFG.refNeedPaid, refRewardDays: CFG.refRewardDays, idTiers: CFG.idTiers, plans: CFG.plans, botPlans: CFG.botPlans, reservedIds: CFG.reservedIds }));
  const NUMS = ['premiumPrice', 'marathonPrice', 'trialDays', 'freeRunsPerDay', 'freeTestSize', 'refNeed', 'refNeedPaid', 'refRewardDays'];
  const schools = () => {
    const s = Store.s, now = Date.now();
    if (!s.schools) s.schools = [
      { id: 'sc1', name: CFG.school, mode: 'share', share: 30, studentPrice: 99000, payers: 40, planId: 'standard', fixed: 0, students: null, since: now - 40 * DAY, bot: { mode: 'platform', username: '', tokenSet: false, paidUntil: now + 12 * DAY, manual: false } },
      { id: 'sc2', name: `Yo'l Plus avtomaktabi`, mode: 'plan', share: 30, studentPrice: 0, payers: 0, planId: 'standard', fixed: 0, students: 112, since: now - 90 * DAY, bot: { mode: 'own', username: 'yolplus_bot', tokenSet: true, paidUntil: now + 2 * DAY, manual: false } },
      { id: 'sc3', name: `Tez Haydovchi`, mode: 'fixed', share: 30, studentPrice: 0, payers: 0, planId: 'start', fixed: 900000, students: 64, since: now - 20 * DAY, bot: { mode: 'platform', username: '', tokenSet: false, paidUntil: now - 3 * DAY, manual: false } },
    ];
    return s.schools;
  };
  const mySchool = () => schools()[0];
  function applyPrices() {
    const o = Store.s.prices || {}, b = JSON.parse(JSON.stringify(BASE));
    NUMS.forEach(k => { CFG[k] = o[k] != null ? o[k] : b[k]; });
    CFG.idTiers = b.idTiers.map((t, i) => ({ ...t, price: o.idTiers && o.idTiers[i] != null ? o.idTiers[i] : t.price }));
    CFG.plans = b.plans.map(p => ({ ...p, price: o.plans && o.plans[p.id] != null ? o.plans[p.id] : p.price }));
    CFG.botPlans = b.botPlans.map((p, i) => ({ ...p, price: o.botPlans && o.botPlans[i] != null ? o.botPlans[i] : p.price }));
    CFG.reservedIds = Store.s.reservedIds || b.reservedIds;
    const sc = mySchool();   // ulush rejimida talaba narxini avtomaktab belgilagan
    if (Store.s.role === 'student' && sc.mode === 'share' && sc.studentPrice > 0) CFG.premiumPrice = sc.studentPrice;
    if (Store.s.role === 'student') syncBroadcasts();
  }
  function syncBroadcasts() {
    const s = Store.s, seen = s.seenBc = s.seenBc || {};
    (s.broadcasts || []).forEach(b => { if (!seen[b.id]) { seen[b.id] = 1; Store.notify(b.text, 'bonus'); } });
  }
  V.applyPrices = applyPrices; V.schools = schools; V.mySchool = mySchool;

  /* ---------- bot yordamchilari ---------- */
  const nOf = (sc) => sc.students != null ? sc.students : ST.students().length;
  const planOfN = (n) => CFG.botPlans.find(p => !p.upTo || n <= p.upTo) || CFG.botPlans[CFG.botPlans.length - 1];
  const planLbl = (p) => p.upTo ? `${p.upTo} tagacha talaba` : `400 dan ko'p talaba`;
  const botOf = (sc) => sc.bot || (sc.bot = { mode: 'platform', username: '', tokenSet: false, paidUntil: 0, manual: false });
  function botState(sc) {
    const b = sc.bot; if (!b || b.removed) return 'none'; if (b.manual) return 'suspended';
    if (b.mode === 'own' && !b.tokenSet) return 'needs_token'; if (!b.paidUntil || b.paidUntil <= Date.now()) return 'expired'; return 'active';
  }
  const STATE = { active: ['ok', 'Faol'], expired: ['bad', `To'lov muddati o'tgan: to'xtatilgan`], suspended: ['bad', `Admin to'xtatgan`], needs_token: ['warn', 'Token ulanishi kutilmoqda'], none: ['', 'Ulanmagan'] };
  const botName = (sc) => { const b = botOf(sc); return b.mode === 'own' ? '@' + (b.username || '—') : '@' + CFG.platformBot; };
  V.Bot = { state: botState, of: botOf, name: botName, plan: (sc) => planOfN(nOf(sc)), school: mySchool, label: (st) => STATE[st] };

  function income(sc) {
    if (sc.mode === 'plan') { const p = CFG.plans.find(x => x.id === sc.planId); return p ? p.price : 0; }
    if (sc.mode === 'fixed') return sc.fixed;
    return Math.round(sc.payers * sc.studentPrice * sc.share / 100);
  }
  const botIncome = (sc) => botState(sc) === 'active' ? planOfN(nOf(sc)).price : 0;
  const modeLbl = (sc) => sc.mode === 'plan' ? 'Tarif' : sc.mode === 'fixed' ? 'Kelishilgan summa' : `Ulush ${sc.share}%`;

  /* ---------- qobiq ---------- */
  const NAVI = [['ov', '#/admin', 'chart', 'Umumiy'], ['pr', '#/admin/prices', 'crown', 'Narxlar'], ['sc', '#/admin/schools', 'users', 'Avtomaktablar'], ['bt', '#/admin/bots', 'send', 'Botlar'], ['st', '#/admin/students', 'list', 'Talabalar'], ['bc', '#/admin/broadcast', 'msg', `E'lonlar`], ['pm', '#/admin/promo', 'gift', 'Promokodlar'], ['in', '#/admin/income', 'trend', 'Daromad']];
  function shell(active, inner) {
    return `<div class="shell"><aside class="side"><a class="brand" href="#/admin">${UI.logo()}<span class="bn"><b>Bosh admin</b><small>Chorraha</small></span></a>
      ${NAVI.map(n => `<a class="nav-i ${n[0] === active ? 'on' : ''}" href="${n[1]}">${ico(n[2])}<span>${n[3]}</span></a>`).join('')}
      <div class="sp"></div><div class="me">${ava('Bosh admin')}<div style="min-width:0"><b>Bosh admin</b><small>Faqat admin</small></div><button class="btn sm soft" data-act="logout" aria-label="Chiqish" style="padding:8px;min-height:34px;margin-left:auto">${ico('logout')}</button></div></aside>
      <main class="main">${inner}</main>
      <nav class="tabbar">${NAVI.map(n => `<a class="${n[0] === active ? 'on' : ''}" href="${n[1]}">${ico(n[2])}<span>${n[3]}</span></a>`).join('')}</nav></div>`;
  }
  const field = (id, label, val, suffix) => `<div class="field"><label for="${id}">${label}</label><div class="sfx"><input id="${id}" class="input mono" inputmode="numeric" value="${val}">${suffix ? `<span>${suffix}</span>` : ''}</div></div>`;
  const kpi = (l, v, s, tone) => `<div class="stat"><div class="lbl">${l}</div><div class="val mono" style="font-size:24px${tone ? `;color:${tone}` : ''}">${v}</div><div class="sub">${s || ''}</div></div>`;
  const note = (t) => { const l = (Store.s.priceLog = Store.s.priceLog || []); l.push({ ts: Date.now(), text: t }); if (l.length > 80) l.shift(); };

  /* ---------- Umumiy ---------- */
  V.adminHome = () => {
    const sc = schools(), st = sc.map(botState), bAct = st.filter(x => x === 'active').length, bBad = st.filter(x => x === 'expired' || x === 'suspended').length;
    const subs = sc.reduce((a, s) => a + income(s), 0), bots = sc.reduce((a, s) => a + botIncome(s), 0), stud = sc.reduce((a, s) => a + nOf(s), 0);
    const alerts = sc.map(s => ({ s, st: botState(s), left: Math.ceil((botOf(s).paidUntil - Date.now()) / DAY) })).filter(x => x.st === 'expired' || (x.st === 'active' && x.left <= 3));
    return {
      html: shell('ov', `<div class="page-h"><div><h1>Umumiy</h1><p>Platforma holati bir joyda.</p></div></div>
      <div class="grid g4 keep2">${kpi('Avtomaktablar', sc.length, 'faol kelishuv')}${kpi('Talabalar', stud, 'barcha maktablarda')}${kpi('Botlar', `${bAct}/${sc.length}`, bBad ? `${bBad} tasi to'xtagan` : 'hammasi faol', bBad ? '#FF7A8A' : '')}${kpi('Oylik tushum', money(subs + bots), 'maktab + bot (taxminiy)')}</div>
      <div class="grid g2 mt"><div class="card"><div class="h-sec">${ico('alert')} E'tibor kerak</div>${alerts.length ? alerts.map(a => `<div class="trow" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(a.s.name)} <span class="mute">· bot</span></span><span class="chip ${a.st === 'expired' ? 'bad' : 'warn'}">${a.st === 'expired' ? `To'xtagan` : `${a.left} kun qoldi`}</span></div>`).join('') : `<p class="mute">Hozircha hammasi joyida.</p>`}<a class="btn sm soft" href="#/admin/bots" style="margin-top:12px">Botlar</a></div>
        <div class="card"><div class="h-sec">Tezkor amallar</div><div class="stack s12"><a class="btn soft" href="#/admin/prices">${ico('crown')} Narxlarni o'zgartirish</a><a class="btn soft" href="#/admin/broadcast">${ico('msg')} E'lon yuborish</a><a class="btn soft" href="#/admin/promo">${ico('gift')} Promokod yaratish</a><a class="btn soft" href="#/admin/students">${ico('list')} Talabani ID bo'yicha topish</a></div></div></div>`)
    };
  };

  /* ---------- Narxlar va qoidalar ---------- */
  V.adminPrices = () => {
    const log = (Store.s.priceLog || []).slice().reverse().slice(0, 8);
    return {
      html: shell('pr', `<div class="page-h"><div><h1>Narxlar va qoidalar</h1><p>Hamma narx va qoidani faqat shu yerdan o'zgartirasiz. Oddiy ustozlar o'zgartira olmaydi.</p></div><button class="btn primary" data-act="ap-save">${ico('check')} Saqlash</button></div>
      <div class="grid g2"><div class="card"><div class="h-sec">Talaba uchun</div>
        ${field('ap-premiumPrice', 'Premium (oyiga)', CFG.premiumPrice, `so'm`)}${field('ap-marathonPrice', 'Imtihon oldi marafoni (7 kun)', CFG.marathonPrice, `so'm`)}${field('ap-trialDays', 'Yangi talabaga bepul sinov', CFG.trialDays, 'kun')}</div>
        <div class="card"><div class="h-sec">Bepul rejim cheklovi</div><div class="grid g2 keep2" style="gap:12px">${field('ap-freeRunsPerDay', 'Kuniga testlar', CFG.freeRunsPerDay, 'ta')}${field('ap-freeTestSize', 'Test hajmi', CFG.freeTestSize, 'ta savol')}</div><p class="mute" style="font-size:13.5px">Bepul rejimda batl, Test Pro, xato daftari takrori va imtihon rejasi yopiq.</p></div></div>
      <div class="card mt"><div class="h-sec">${ico('gift')} Taklif (referal) orqali Premium sovg'a</div><div class="grid g3" style="gap:12px">${field('ap-refNeed', `Taklif qilinadigan do'stlar`, CFG.refNeed, 'ta')}${field('ap-refNeedPaid', 'Ulardan Premium olganlar', CFG.refNeedPaid, 'ta')}${field('ap-refRewardDays', `Sovg'a muddati`, CFG.refRewardDays, 'kun')}</div></div>
      <div class="grid g2 mt"><div class="card"><div class="h-sec">Avtomaktab tariflari (oyiga)</div>${CFG.plans.map(p => p.id === 'network' ? `<p class="mute" style="font-size:14px">${esc(p.name)}: kelishuv asosida (Avtomaktablar bo'limida).</p>` : field('ap-pl-' + p.id, `${esc(p.name)} (${p.upTo} tagacha talaba)`, p.price, `so'm`)).join('')}</div>
        <div class="card"><div class="h-sec">${ico('send')} Telegram bot tarifi (oyiga)</div>${CFG.botPlans.map((p, i) => field('ap-bp' + i, planLbl(p), p.price, `so'm`)).join('')}</div></div>
      <div class="card mt"><div class="h-sec">ID narxlari</div><p class="mute" style="font-size:14px;margin-bottom:12px">Bepul avtomatik ID: 2 harf + 4 raqam. Quyidagilar pullik.</p><div class="grid g3" style="gap:12px">${CFG.idTiers.map((t, i) => field('ap-id' + i, `${t.label} <span class="mute">(${t.ex})</span>`, t.price, `so'm`)).join('')}</div></div>
      <div class="card mt"><div class="h-sec">Oxirgi o'zgarishlar</div>${log.length ? log.map(l => `<div class="trow" style="grid-template-columns:1fr auto"><span>${esc(l.text)}</span><span class="mute" style="font-size:13px">${UI.dt(l.ts)}</span></div>`).join('') : `<p class="mute">Hali o'zgarish yo'q.</p>`}</div>`)
    };
  };

  /* ---------- Avtomaktablar ---------- */
  V.adminSchools = () => ({
    html: shell('sc', `<div class="page-h"><div><h1>Avtomaktablar</h1><p>Har maktab bilan kelishuv: tarif, kelishilgan summa yoki ulush (masalan, talaba narxidan 30%).</p></div><button class="btn primary" data-act="as-add">${ico('users')} Yangi maktab</button></div>
      <div class="stack">${schools().map(sc => `<div class="card"><div class="row-between"><div style="display:flex;gap:14px;align-items:center">${ava(sc.name, 46)}<div><b style="font-size:18px">${esc(sc.name)}</b><div class="mute" style="font-size:13.5px">${nOf(sc)} ta talaba · ${esc(modeLbl(sc))}</div></div></div><div style="text-align:right"><small class="mute">Oyiga platformaga</small><div style="font-size:22px;font-weight:800">${money(income(sc))}</div></div></div>
        <div class="ai-acts"><button class="btn sm primary" data-act="as-edit" data-id="${sc.id}">Kelishuvni o'zgartirish</button></div></div>`).join('')}</div>`)
  });
  function editModal(id) {
    const sc = schools().find(x => x.id === id); if (!sc) return;
    modal(`<h3>${esc(sc.name)}</h3>
      <div class="field"><label for="as-mode">Kelishuv turi</label><select id="as-mode" class="select" data-input="as-mode"><option value="plan" ${sc.mode === 'plan' ? 'selected' : ''}>Tarif (Start, Standart…)</option><option value="fixed" ${sc.mode === 'fixed' ? 'selected' : ''}>Kelishilgan oylik summa</option><option value="share" ${sc.mode === 'share' ? 'selected' : ''}>Ulush: talaba narxidan foiz</option></select></div>
      <div id="as-f">${modeFields(sc)}</div>
      <div class="ai-acts"><button class="btn primary" data-act="as-save" data-id="${sc.id}">${ico('check')} Saqlash</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
  }
  function modeFields(sc, mode) {
    mode = mode || sc.mode;
    if (mode === 'plan') return `<div class="field"><label for="as-plan">Tarif</label><select id="as-plan" class="select">${CFG.plans.filter(p => p.price).map(p => `<option value="${p.id}" ${sc.planId === p.id ? 'selected' : ''}>${esc(p.name)} · ${money(p.price)}</option>`).join('')}</select></div>`;
    if (mode === 'fixed') return field('as-fixed', 'Oyiga kelishilgan summa', sc.fixed || '', `so'm`);
    return `${field('as-share', 'Platforma ulushi', sc.share, '%')}${field('as-price', 'Talaba narxi (maktab belgilaydi)', sc.studentPrice || CFG.premiumPrice, `so'm`)}${field('as-payers', 'Taxminiy to\'lovchi talabalar', sc.payers, 'ta')}<p class="mute" style="font-size:13.5px">Maktab talabadan shu narxni oladi, platformaga kelishilgan ulush foizi tushadi.</p>`;
  }
  V.inputs = Object.assign(V.inputs || {}, { 'as-mode'(t) { const sc = schools().find(x => x.id === document.querySelector('[data-act="as-save"]').dataset.id); $('as-f').innerHTML = modeFields(sc, t.value); } });

  /* ---------- Botlar ---------- */
  V.adminBots = () => {
    const sc = schools(), plat = sc.filter(s => botOf(s).mode === 'platform' && !botOf(s).removed).length, own = sc.filter(s => botOf(s).mode === 'own' && !botOf(s).removed).length;
    return {
      html: shell('bt', `<div class="page-h"><div><h1>Telegram botlar</h1><p>Avtomaktablar sizning botingizdan yoki o'z botidan foydalanadi. To'lov muddati tugagan kuni bot o'zi to'xtaydi.</p></div></div>
      <div class="grid g3"><div class="stat"><div class="lbl">${ico('send')} Bizning bot</div><div class="val mono" style="font-size:22px">@${esc(CFG.platformBot)}</div><div class="sub">${plat} ta maktab ishlatadi</div></div>${kpi(`Maktabning o'z botlari`, own, 'ko\'zgu (white-label)')}${kpi('Botdan oylik tushum', money(sc.reduce((a, s) => a + botIncome(s), 0)), 'faol botlar')}</div>
      <div class="stack mt">${sc.map(s => {
        const b = botOf(s), st = botState(s), [cls, lbl] = STATE[st], pl = planOfN(nOf(s)), left = Math.ceil((b.paidUntil - Date.now()) / DAY);
        return `<div class="card"><div class="row-between"><div style="display:flex;gap:14px;align-items:center">${ava(s.name, 46)}<div><b style="font-size:18px">${esc(s.name)}</b><div class="mute" style="font-size:13.5px">${b.removed ? 'Bot uzilgan' : `${b.mode === 'own' ? `O'z boti` : 'Umumiy bot'}: <b class="mono" style="color:var(--text)">${esc(botName(s))}</b>`} · ${nOf(s)} ta talaba</div></div></div><span class="chip ${cls}">${lbl}</span></div>
          <div class="grid g4 keep2" style="margin-top:14px;gap:12px"><div class="kpi"><small>Tarif</small><b style="font-size:16px">${esc(planLbl(pl))}</b></div><div class="kpi"><small>Oyiga</small><b style="font-size:16px">${money(pl.price)}</b></div><div class="kpi"><small>To'langan sana</small><b style="font-size:16px">${b.paidUntil ? dd(b.paidUntil) : '—'}</b></div><div class="kpi"><small>Qoldi</small><b style="font-size:16px;color:${left <= 0 ? '#FF7A8A' : left <= 3 ? 'var(--warn)' : 'var(--text)'}">${b.paidUntil ? (left > 0 ? left + ' kun' : `tugagan`) : '—'}</b></div></div>
          ${b.removed ? '' : `<div class="ai-acts"><button class="btn sm primary" data-act="bot-pay" data-id="${s.id}">${ico('check')} To'lov qabul qilindi (+30 kun)</button><button class="btn sm soft" data-act="bot-date" data-id="${s.id}">${ico('calendar')} Sana belgilash</button><button class="btn sm soft" data-act="bot-susp" data-id="${s.id}">${b.manual ? 'Yoqish' : `To'xtatish`}</button><button class="btn sm soft" data-act="bot-tok" data-id="${s.id}">Bot ulash</button><button class="btn sm soft" data-act="bot-rm" data-id="${s.id}">Botni uzish</button></div>`}</div>`; }).join('')}</div>
      <div class="banner mt">${ico('alert')}<span>Haqiqiy ishlashi: bot serverda (backend/src/services/bot.js). Hamma xabar kelganda to'lov muddati tekshiriladi, muddati o'tgan maktab botida faqat «to'xtatilgan» xabari chiqadi. Token faqat serverda shifrlanib saqlanadi, ilovada ko'rinmaydi.</span></div>`)
    };
  };

  /* ---------- Talabalar (ID bo'yicha qidiruv, premium berish, bloklash, band ID lar) ---------- */
  let SQ = '';
  const grants = () => (Store.s.grants = Store.s.grants || {});
  const blocked = () => (Store.s.blockedIds = Store.s.blockedIds || {});
  V.blocked = () => Store.s.role === 'student' && !!blocked()[Store.myUid()];
  V.grantUntil = () => { const g = grants()[Store.myUid()]; return g && g > Date.now() ? g : 0; };
  V.adminStudents = () => {
    const q = SQ.trim().toLowerCase(), all = ST.students(), list = all.filter(s => !q || s.name.toLowerCase().includes(q) || (s.uid || '').toLowerCase().includes(q)).slice(0, 60), res = CFG.reservedIds || [];
    const idSales = (Store.s.payments || []).filter(p => /^ID/.test(p.title));
    return {
      html: shell('st', `<div class="page-h"><div><h1>Talabalar</h1><p>ID yoki ism bo'yicha toping, Premium bering yoki bloklang.</p></div></div>
      <div class="filters"><div class="search">${ico('search')}<input class="input" id="aq" placeholder="ID yoki ism…" data-input="adm-q" value="${esc(SQ)}" aria-label="Qidiruv"></div></div>
      <div class="card scroll-x" style="padding:6px;margin-top:14px"><table class="tbl" style="min-width:640px"><thead><tr><th>ID</th><th>Talaba</th><th>Guruh</th><th>Holat</th><th></th></tr></thead><tbody id="atb">${rowsHtml(list)}</tbody></table></div>
      <div class="grid g2 mt"><div class="card"><div class="h-sec">${ico('flag')} Band ID lar</div><p class="mute" style="font-size:14px;margin-bottom:10px">Bu ID larni hech kim sotib ola olmaydi.</p><div class="chips">${res.map(r => `<span class="chip warn mono">${esc(r)} <button class="x-b" data-act="res-del" data-id="${esc(r)}" aria-label="Olib tashlash">×</button></span>`).join('') || '<span class="mute">Yo\'q</span>'}</div>
        <div style="display:flex;gap:8px;margin-top:12px"><input class="input mono" id="resn" maxlength="6" placeholder="AA77" style="text-transform:uppercase"><button class="btn primary" data-act="res-add">Band qilish</button></div></div>
        <div class="card"><div class="h-sec">ID sotuvlari</div>${idSales.length ? idSales.slice().reverse().map(p => `<div class="trow" style="grid-template-columns:1fr auto"><span class="mono">${esc(p.title)}</span><b>${money(p.sum)}</b></div>`).join('') : `<p class="mute">Hali sotuv yo'q.</p>`}</div></div>`)
    };
  };
  function status(s) {
    if (blocked()[s.uid]) return `<span class="chip bad">Bloklangan</span>`;
    const g = grants()[s.uid]; if (g && g > Date.now()) return `<span class="chip ok">Premium · ${Math.ceil((g - Date.now()) / DAY)} kun</span>`;
    if (s.me && V.Prem) { const st = V.Prem.status(); return `<span class="chip ${st === 'free' ? 'warn' : 'ok'}">${{ premium: 'Premium', school: `Maktab to'lagan`, trial: 'Bepul sinov', free: 'Bepul' }[st]}</span>`; }
    return `<span class="chip">Faol</span>`;
  }
  const rowsHtml = (list) => list.length ? list.map(s => `<tr><td class="mono"><b class="uid-t">${esc(s.uid || '')}</b></td><td>${esc(s.name)}${s.me ? ' <span class="chip acc" style="padding:2px 8px;font-size:11px">Siz</span>' : ''}</td><td class="mute">${esc(ST.groupName(s.group))}</td><td>${status(s)}</td>
    <td style="white-space:nowrap"><button class="btn sm soft" data-act="adm-grant" data-u="${esc(s.uid)}">Premium berish</button> <button class="btn sm soft" data-act="adm-block" data-u="${esc(s.uid)}">${blocked()[s.uid] ? 'Ochish' : 'Bloklash'}</button></td></tr>`).join('') : `<tr><td colspan="5" class="mute" style="text-align:center;padding:30px">Topilmadi</td></tr>`;
  V.inputs['adm-q'] = (t) => { SQ = t.value; const q = SQ.trim().toLowerCase(); $('atb').innerHTML = rowsHtml(ST.students().filter(s => !q || s.name.toLowerCase().includes(q) || (s.uid || '').toLowerCase().includes(q)).slice(0, 60)); };

  /* ---------- E'lonlar ---------- */
  V.adminBroadcast = () => {
    const l = (Store.s.broadcasts || []).slice().reverse();
    return {
      html: shell('bc', `<div class="page-h"><div><h1>E'lonlar</h1><p>Barcha talabalarga bildirishnoma (qo'ng'iroqcha) sifatida boradi.</p></div></div>
      <div class="card"><div class="field"><label for="bct">Matn</label><textarea id="bct" class="input" maxlength="300" style="min-height:110px" placeholder="Masalan: Bu hafta Premium 20% arzon!"></textarea></div><button class="btn primary" data-act="bc-send">${ico('send')} Yuborish</button></div>
      <div class="card mt"><div class="h-sec">Yuborilganlar</div>${l.length ? l.map(b => `<div class="trow" style="grid-template-columns:1fr auto"><span>${esc(b.text)}</span><span class="mute" style="font-size:13px">${UI.dt(b.ts)}</span></div>`).join('') : `<p class="mute">Hali e'lon yo'q.</p>`}</div>`)
    };
  };

  /* ---------- Promokodlar ---------- */
  V.adminPromo = () => {
    const l = (Store.s.promos || []).slice().reverse();
    return {
      html: shell('pm', `<div class="page-h"><div><h1>Promokodlar</h1><p>Talaba kodni Premium sahifasida kiritsa, bepul Premium kunlari qo'shiladi.</p></div></div>
      <div class="card"><div class="grid g3" style="gap:12px"><div class="field"><label for="pc-c">Kod</label><input id="pc-c" class="input mono" maxlength="16" placeholder="YANGI30" style="text-transform:uppercase"></div>${field('pc-d', 'Premium kunlari', 30, 'kun')}${field('pc-m', 'Necha kishi ishlata oladi', 50, 'ta')}</div><button class="btn primary" data-act="pc-add">${ico('check')} Yaratish</button></div>
      <div class="card mt"><div class="h-sec">Kodlar</div>${l.length ? l.map(p => `<div class="trow" style="grid-template-columns:minmax(0,1fr) auto auto"><b class="mono">${esc(p.code)}</b><span class="mute">${p.days} kun · ${p.used}/${p.max}</span><button class="btn sm soft" data-act="pc-del" data-c="${esc(p.code)}" aria-label="O'chirish">${ico('x')}</button></div>`).join('') : `<p class="mute">Hali kod yo'q.</p>`}</div>`)
    };
  };
  const basePremium = V.premium;
  setTimeout(() => {
    const bp = V.premium; if (!bp) return;
    V.premium = () => { const v = bp(); if (!v || !v.html) return v; const card = `<div class="card mt"><div class="h-sec">Promokod</div><div style="display:flex;gap:8px"><input class="input mono" id="promo-i" maxlength="16" placeholder="Kodni kiriting" style="text-transform:uppercase"><button class="btn primary" data-act="promo-use">Qo'llash</button></div></div>`; v.html = v.html.replace('<div class="card mt"><div class="h-sec">Nimalar ochiladi</div>', card + '<div class="card mt"><div class="h-sec">Nimalar ochiladi</div>'); return v; };
  }, 0);

  /* ---------- Daromad ---------- */
  V.adminIncome = () => {
    const sc = schools(), sub = sc.reduce((a, s) => a + income(s), 0), bots = sc.reduce((a, s) => a + botIncome(s), 0), pays = Store.s.payments || [], idSum = pays.filter(p => /^ID/.test(p.title)).reduce((a, p) => a + p.sum, 0), other = pays.filter(p => !/^ID/.test(p.title)).reduce((a, p) => a + p.sum, 0);
    return {
      html: shell('in', `<div class="page-h"><div><h1>Daromad</h1><p>Avtomaktablardan oylik tushum, bot to'lovlari va talabalar to'lovlari. Taxminiy, demo ma'lumotlar asosida.</p></div></div>
      <div class="grid g4 keep2">${kpi('Avtomaktablar', sc.length, 'faol kelishuv')}${kpi('Maktablardan / oy', money(sub), 'tarif, summa va ulush')}${kpi('Botlardan / oy', money(bots), 'faol botlar')}${kpi('ID + Premium', money(idSum + other), 'shu brauzerdagi demo')}</div>
      <div class="card mt"><div class="h-sec">Maktablar bo'yicha</div>${sc.map(s => `<div class="trow" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) auto auto"><span>${esc(s.name)}</span><span class="mute">${esc(modeLbl(s))}</span><b>${money(income(s))}</b><span class="mute">+ bot ${money(botIncome(s))}</span></div>`).join('')}</div>`)
    };
  };

  /* ---------- ustoz paneli: kelishuv + Telegram bot ---------- */
  const baseTariff = V.tariff;
  V.tariff = () => {
    const v = baseTariff(), sc = mySchool(); if (!v || !v.html) return v;
    const card = `<div class="card mb ag-c"><div class="row-between"><div class="h-sec" style="margin:0">${ico('crown')} Sizning kelishuvingiz</div><span class="chip warn">${esc(modeLbl(sc))}</span></div>
      ${sc.mode === 'share' ? `<p class="mute" style="font-size:14.5px;margin:10px 0 12px">Talabalar uchun Premium narxini o'zingiz belgilaysiz. Platformaga shu narxdan <b style="color:var(--text)">${sc.share}%</b> to'lanadi.</p>
        <div class="field"><label for="ag-p">Talaba narxi (oyiga)</label><div class="sfx"><input id="ag-p" class="input mono" inputmode="numeric" value="${sc.studentPrice}"><span>so'm</span></div></div>
        <div class="grid g3" style="gap:12px"><div class="kpi"><small>Talabadan</small><b>${money(sc.studentPrice)}</b></div><div class="kpi"><small>Platformaga (${sc.share}%)</small><b>${money(sc.studentPrice * sc.share / 100)}</b></div><div class="kpi"><small>Maktabga qoladi</small><b>${money(sc.studentPrice * (100 - sc.share) / 100)}</b></div></div>
        <button class="btn primary" style="margin-top:14px" data-act="ag-save">${ico('check')} Narxni saqlash</button>`
        : `<p class="mute" style="font-size:14.5px;margin-top:10px">${sc.mode === 'fixed' ? `Oylik kelishilgan summa: <b style="color:var(--text)">${money(sc.fixed)}</b>.` : `Tarifingiz: <b style="color:var(--text)">${esc((CFG.plans.find(p => p.id === sc.planId) || {}).name || '')}</b>.`} Narxlar va shartlarni faqat bosh admin o'zgartiradi.</p>`}</div>`;
    v.html = v.html.replace('<div class="card mt"><div class="h-sec">Hisoblagich</div>', card + '<div class="card mt"><div class="h-sec">Hisoblagich</div>'); return v;
  };

  V.botPage = () => {
    const sc = mySchool(), b = botOf(sc), st = botState(sc), [cls, lbl] = STATE[st], pl = planOfN(nOf(sc)), left = Math.ceil((b.paidUntil - Date.now()) / DAY);
    return {
      html: V.shellTeacher('bt', `<div class="page-h"><div><h1>Telegram bot</h1><p>Talabalar haftalik natijani o'z Telegramida oladi. Bot maktabingiz nomidan ishlaydi.</p></div><span class="chip ${cls}">${lbl}</span></div>
      ${st === 'expired' ? `<div class="banner mb">${ico('alert')}<span><b>Bot to'xtatilgan:</b> to'lov muddati tugagan. Davom ettirish uchun to'lovni amalga oshiring, bot shu zahoti qayta ishlaydi.</span></div>` : st === 'active' && left <= 3 ? `<div class="banner mb">${ico('alert')}<span>To'lov muddati ${left} kundan keyin tugaydi. O'sha kuni bot avtomatik to'xtaydi.</span></div>` : ''}
      <div class="grid g4 keep2"><div class="stat"><div class="lbl">${ico('send')} Bot</div><div class="val mono" style="font-size:20px">${esc(botName(sc))}</div><div class="sub">${b.mode === 'own' ? `Sizning botingiz` : 'Umumiy Yo\'ldosh boti'}</div></div>${kpi('Tarif', money(pl.price), planLbl(pl))}${kpi('Talabalar', nOf(sc), 'tarif shunga qarab')}${kpi(`To'langan`, b.paidUntil ? dd(b.paidUntil) : '—', b.paidUntil && left > 0 ? left + ' kun qoldi' : '')}</div>
      <div class="grid g2 mt"><div class="card"><div class="h-sec">Qaysi bot ishlasin</div>
        <div class="cfg-row" style="margin-bottom:12px"><button class="bigp ${b.mode === 'platform' ? 'on' : ''}" data-act="bot-mode" data-m="platform">Umumiy bot</button><button class="bigp ${b.mode === 'own' ? 'on' : ''}" data-act="bot-mode" data-m="own">Mening botim</button></div>
        ${b.mode === 'own' ? `<div class="field"><label for="bot-u">Bot username</label><input id="bot-u" class="input mono" maxlength="33" placeholder="@mening_botim" value="${esc(b.username ? '@' + b.username : '')}"></div><button class="btn primary" data-act="bot-save">${ico('check')} Saqlash</button>
          <p class="mute" style="font-size:13.5px;margin-top:12px">1) @BotFather da bot yarating. 2) Tokenni <b>faqat bosh adminga</b> yuboring: u serverga shifrlab ulaydi. Token bu yerga yozilmaydi.</p>${b.tokenSet ? `<div class="chip ok" style="margin-top:10px">${ico('check')} Token ulangan</div>` : `<div class="chip warn" style="margin-top:10px">Token ulanishi kutilmoqda</div>`}`
          : `<p class="mute" style="font-size:14.5px">Talabalar <b class="mono" style="color:var(--text)">@${esc(CFG.platformBot)}</b> orqali natija oladi. O'z botingiz bo'lsa, «Mening botim» ni tanlang.</p>`}</div>
        <div class="card"><div class="h-sec">Bot nima qiladi</div><div class="stack s12">${['Haftalik natija: talabaning o\'ziga (yakshanba kechqurun)', 'Talaba /hisobot yozsa, hozirgi natijani oladi', 'Talaba /id yozsa, ID sini ko\'radi: ustozga shu ID ni aytadi', 'Talaba botni o\'zi ulaydi: ilovadagi bir martalik havola orqali'].map(x => `<div class="rew on"><span class="rw-i">${ico('check')}</span><div>${esc(x)}</div></div>`).join('')}</div></div></div>
      <div class="card mt"><div class="h-sec">Bot tarifi (talabalar soniga qarab, oyiga)</div><div class="grid g4 keep2" style="gap:12px">${CFG.botPlans.map(p => `<div class="kpi ${p === pl ? 'sel' : ''}"><small>${esc(planLbl(p))}</small><b>${money(p.price)}</b></div>`).join('')}</div><p class="mute" style="font-size:13.5px;margin-top:12px">To'lov va muddatni bosh admin qayd etadi. Muddat tugagan kuni bot avtomatik to'xtaydi.</p></div>`)
    };
  };

  /* ---------- talaba: botni ulash ---------- */
  V.botStudent = () => {
    const sc = mySchool(), st = botState(sc), linked = !!Store.s.botLinked, [cls, lbl] = STATE[st];
    return {
      html: V.shellStudent('bot', `<div class="page-h"><div><h1>Telegram bot</h1><p>Haftalik natijangiz va ID ingiz Telegramingizga keladi.</p></div><span class="chip ${linked ? 'ok' : cls}">${linked ? 'Ulangan' : lbl}</span></div>
      <div class="card"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="rw-i">${ico('send')}</span><div style="flex:1;min-width:220px"><b style="font-size:18px">${esc(botName(sc))}</b><div class="mute" style="font-size:14px">${esc(sc.name)} boti</div></div>
        ${st === 'active' ? `<button class="btn primary" data-act="bot-link">${ico('send')} ${linked ? 'Qayta ulash' : 'Botni ulash'}</button>` : `<span class="mute" style="font-size:14px">Maktabingiz boti hozir faol emas.</span>`}</div></div>
      <div class="card mt"><div class="h-sec">Misol: haftalik xabar</div><div class="tg-msg">Salom, ${esc((Store.s.name || 'Talaba').split(' ')[0])}! Haftalik natijangiz (ID: ${esc(Store.myUid())}):<br><br>• Yechilgan savollar: 86<br>• To'g'ri javoblar: 78%<br>• Shug'ullangan kunlar: 5/7<br>• Sinov imtihonlari: 2<br>• Xato daftarida: 14 ta savol<br><br>Xato daftaridagi savollarni takrorlang, natija tez oshadi.</div>
        <p class="mute" style="font-size:13.5px;margin-top:10px">Xohlasangiz, xabarni ota-onangizga ko'rsatishingiz mumkin.</p></div>`)
    };
  };

  /* ---------- amallar ---------- */
  V.acts = Object.assign(V.acts || {}, {
    'login-admin'() { if ((window.Cloud && Cloud.live())) { location.hash = '#/login'; return; }
      modal(`<h3>Bosh admin</h3><p class="mute">Faqat platforma egasi uchun.</p><div class="field"><label for="apin">PIN-kod</label><input id="apin" type="password" class="input" inputmode="numeric" autocomplete="off"></div><div class="ai-acts"><button class="btn primary" id="apinb">Kirish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>${CFG.adminPin === '2026' ? `<p class="mute" style="font-size:13px;margin-top:12px">Demo PIN: 2026. Ishga tushirishda config.js da o'zgartiring; haqiqiy rejimda admin roli serverda tekshiriladi.</p>` : ''}`);
      const go = () => { if ($('apin').value === String(CFG.adminPin)) { Store.login('admin'); closeModal(); location.hash = '#/admin'; } else toast(`PIN noto'g'ri`); };
      $('apinb').addEventListener('click', go); $('apin').addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); $('apin').focus();
    },
    'ap-save'() {
      const o = Store.s.prices = Store.s.prices || {};
      NUMS.forEach(k => { const el = $('ap-' + k); if (!el) return; const v = num(el.value); if (v !== CFG[k]) note(`${k}: ${CFG[k]} → ${v}`); o[k] = v; });
      o.idTiers = CFG.idTiers.map((t, i) => { const v = num($('ap-id' + i).value); if (v !== t.price) note(`ID ${t.ex}: ${t.price} → ${v}`); return v; });
      o.botPlans = CFG.botPlans.map((p, i) => { const v = num($('ap-bp' + i).value); if (v !== p.price) note(`Bot tarifi ${planLbl(p)}: ${p.price} → ${v}`); return v; });
      o.plans = o.plans || {}; CFG.plans.forEach(p => { const el = $('ap-pl-' + p.id); if (el) { const v = num(el.value); if (v !== p.price) note(`Tarif ${p.name}: ${p.price} → ${v}`); o.plans[p.id] = v; } });
      Store.save(); applyPrices(); toast(`Saqlandi`); V.rerender();
    },
    'as-edit'(el) { editModal(el.dataset.id); },
    'as-add'() { modal(`<h3>Yangi avtomaktab</h3><div class="field"><label for="as-nm">Nomi</label><input id="as-nm" class="input" maxlength="40"></div><div class="ai-acts"><button class="btn primary" id="as-nmb">Qo'shish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`); $('as-nmb').addEventListener('click', () => { const n = $('as-nm').value.trim(); if (n.length < 3) { toast(`Nomini yozing`); return; } const sc = { id: 'sc' + Date.now().toString(36), name: n, mode: 'share', share: 30, studentPrice: CFG.premiumPrice, payers: 0, planId: 'start', fixed: 0, students: 0, since: Date.now(), bot: { mode: 'platform', username: '', tokenSet: false, paidUntil: 0, manual: false } }; schools().push(sc); note(`Yangi maktab: ${n}`); Store.save(); closeModal(); editModal(sc.id); }); },
    'as-save'(el) {
      const sc = schools().find(x => x.id === el.dataset.id); if (!sc) return; const mode = $('as-mode').value, old = modeLbl(sc);
      sc.mode = mode;
      if (mode === 'plan') sc.planId = $('as-plan').value; else if (mode === 'fixed') sc.fixed = num($('as-fixed').value); else { sc.share = Math.min(100, num($('as-share').value)); sc.studentPrice = num($('as-price').value); sc.payers = num($('as-payers').value); }
      note(`${sc.name}: ${old} → ${modeLbl(sc)}`); Store.save(); applyPrices(); closeModal(); toast(`Kelishuv saqlandi`); V.rerender();
    },
    'ag-save'() { const sc = mySchool(), v = num($('ag-p').value); if (v < 10000) { toast(`Narx juda past`); return; } sc.studentPrice = v; note(`${sc.name} talaba narxi: ${v}`); Store.save(); applyPrices(); toast(`Talaba narxi saqlandi`); V.rerender(); },

    /* bot: bosh admin */
    'bot-pay'(el) { const sc = schools().find(x => x.id === el.dataset.id), b = botOf(sc), pl = planOfN(nOf(sc)); b.paidUntil = Math.max(Date.now(), b.paidUntil || 0) + 30 * DAY; b.manual = false; Store.s.botPays = (Store.s.botPays || []).concat({ ts: Date.now(), school: sc.name, sum: pl.price }); note(`Bot to'lovi: ${sc.name} ${money(pl.price)}, ${dd(b.paidUntil)} gacha`); Store.save(); toast(`To'lov qayd etildi: ${dd(b.paidUntil)} gacha`); V.rerender(); },
    'bot-date'(el) {
      const sc = schools().find(x => x.id === el.dataset.id), b = botOf(sc), d = new Date(b.paidUntil || Date.now() + 30 * DAY), v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      modal(`<h3>To'lov sanasi</h3><p class="mute">Shu kunning oxirida bot avtomatik to'xtaydi.</p><div class="field"><label for="bd">Sana</label><input id="bd" type="date" class="input" value="${v}"></div><div class="ai-acts"><button class="btn primary" id="bdb">Saqlash</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      $('bdb').addEventListener('click', () => { const t = new Date($('bd').value + 'T23:59:59').getTime(); if (isNaN(t)) { toast(`Sanani tanlang`); return; } b.paidUntil = t; note(`Bot sanasi: ${sc.name} → ${dd(t)}`); Store.save(); closeModal(); toast(`Saqlandi`); V.rerender(); });
    },
    'bot-susp'(el) { const sc = schools().find(x => x.id === el.dataset.id), b = botOf(sc); b.manual = !b.manual; note(`Bot ${b.manual ? 'to\'xtatildi' : 'yoqildi'}: ${sc.name}`); Store.save(); V.rerender(); },
    'bot-tok'(el) {
      const sc = schools().find(x => x.id === el.dataset.id), b = botOf(sc);
      modal(`<h3>Maktab boti</h3><div class="field"><label for="bu">Bot username</label><input id="bu" class="input mono" maxlength="33" placeholder="@maktab_bot" value="${esc(b.username ? '@' + b.username : '')}"></div><div class="banner">${ico('alert')}<span>Token ilovada kiritilmaydi. Serverga <code>PUT /admin/bots/:id/token</code> orqali yuboriladi va shifrlab saqlanadi. Demo: faqat «ulangan» deb belgilanadi.</span></div><div class="ai-acts"><button class="btn primary" id="bub">Ulandi deb belgilash</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      $('bub').addEventListener('click', () => { const u = $('bu').value.trim().replace(/^@/, ''); if (!/^[A-Za-z0-9_]{5,32}$/.test(u)) { toast(`Username 5–32 belgi`); return; } b.mode = 'own'; b.username = u; b.tokenSet = true; b.removed = false; note(`Bot ulandi: ${sc.name} @${u}`); Store.save(); closeModal(); toast(`Bot ulandi`); V.rerender(); });
    },
    'bot-rm'(el) { const sc = schools().find(x => x.id === el.dataset.id); UI.confirmBox(`${sc.name} botini uzasizmi? Token o'chiriladi, bot ishlamay qoladi.`, `Uzish`, () => { const b = botOf(sc); b.removed = true; b.tokenSet = false; note(`Bot uzildi: ${sc.name}`); Store.save(); V.rerender(); }); },
    /* bot: ustoz */
    'bot-mode'(el) { const b = botOf(mySchool()); b.mode = el.dataset.m; if (b.mode === 'own' && !b.username) b.tokenSet = false; b.removed = false; Store.save(); V.rerender(); },
    'bot-save'() { const u = $('bot-u').value.trim().replace(/^@/, ''); if (!/^[A-Za-z0-9_]{5,32}$/.test(u)) { toast(`Username 5–32 belgi: harf, raqam, _`); return; } const b = botOf(mySchool()); if (b.username !== u) { b.username = u; b.tokenSet = false; } Store.save(); toast(`Saqlandi. Tokenni bosh adminga yuboring.`); V.rerender(); },
    /* bot: talaba */
    'bot-link'() {
      const sc = mySchool(), tok = Math.random().toString(36).slice(2, 12), link = `https://t.me/${botOf(sc).mode === 'own' && botOf(sc).username ? botOf(sc).username : CFG.platformBot}?start=${tok}`;
      modal(`<h3>Botni ulash</h3><p class="mute">Havola 15 daqiqa amal qiladi va faqat bir marta ishlaydi. Uni boshqalarga bermang.</p><a class="btn primary lg" style="width:100%" target="_blank" rel="noopener noreferrer" href="${link}">${ico('send')} Telegramda ochish</a><div class="glink" style="margin-top:12px"><input class="input" readonly value="${link}" onclick="this.select()"></div><div class="banner" style="margin-top:14px">${ico('alert')}<span>Demo: haqiqiy bot server ulangach ishlaydi. Hozir ulanishni belgilab ko'rish mumkin.</span></div><div class="ai-acts"><button class="btn soft" data-act="bot-done">Ulandim (demo)</button></div>`);
    },
    'bot-done'() { Store.s.botLinked = true; Store.save(); closeModal(); toast(`Bot ulandi`); V.rerender(); },
    /* talabalar, e'lon, promo */
    'adm-grant'(el) {
      const u = el.dataset.u; modal(`<h3>Premium berish</h3><p class="mute">ID: <b class="mono">${esc(u)}</b></p>${field('gr-d', 'Necha kun', 30, 'kun')}<div class="ai-acts"><button class="btn primary" id="grb">Berish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      $('grb').addEventListener('click', () => { const d = num($('gr-d').value); if (!d) return; const g = grants(); g[u] = Math.max(Date.now(), g[u] || 0) + d * DAY; note(`Premium berildi: ${u}, ${d} kun`); Store.save(); closeModal(); toast(`Premium berildi`); V.rerender(); });
    },
    'adm-block'(el) { const u = el.dataset.u, b = blocked(); if (b[u]) delete b[u]; else b[u] = 1; note(`${b[u] ? 'Bloklandi' : 'Blokdan chiqarildi'}: ${u}`); Store.save(); V.rerender(); },
    'res-add'() { const v = ($('resn').value || '').toUpperCase().replace(/\s/g, ''); if (!v) return; const l = (Store.s.reservedIds || (CFG.reservedIds || []).slice()); if (!l.includes(v)) l.push(v); Store.s.reservedIds = l; note(`Band ID: ${v}`); Store.save(); applyPrices(); V.rerender(); },
    'res-del'(el) { Store.s.reservedIds = (CFG.reservedIds || []).filter(x => x !== el.dataset.id); note(`Band ID olib tashlandi: ${el.dataset.id}`); Store.save(); applyPrices(); V.rerender(); },
    'bc-send'() { const t = ($('bct').value || '').trim(); if (t.length < 3) { toast(`Matnni yozing`); return; } (Store.s.broadcasts = Store.s.broadcasts || []).push({ id: 'b' + Date.now(), ts: Date.now(), text: t }); Store.save(); toast(`Yuborildi`); V.rerender(); },
    'pc-add'() {
      const c = ($('pc-c').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), d = num($('pc-d').value), m = num($('pc-m').value); if (c.length < 4 || !d || !m) { toast(`Kod (4+ belgi), kun va soni kerak`); return; }
      const l = (Store.s.promos = Store.s.promos || []); if (l.find(p => p.code === c)) { toast(`Bu kod bor`); return; } l.push({ code: c, days: d, max: m, used: 0, by: {} }); note(`Promokod: ${c}, ${d} kun`); Store.save(); V.rerender();
    },
    'pc-del'(el) { Store.s.promos = (Store.s.promos || []).filter(p => p.code !== el.dataset.c); Store.save(); V.rerender(); },
    'promo-use'() {
      const c = ($('promo-i').value || '').toUpperCase().trim(), p = (Store.s.promos || []).find(x => x.code === c), me = Store.myUid();
      if (!p || p.used >= p.max) { toast(`Kod noto'g'ri yoki tugagan`); return; } if (p.by[me]) { toast(`Bu kodni ishlatgansiz`); return; }
      p.by[me] = 1; p.used++; const base = Store.s.sub && Store.s.sub.until > Date.now() ? Store.s.sub.until : Date.now(); Store.s.sub = { until: base + p.days * DAY, gift: true }; Store.notify(`Promokod qabul qilindi: ${p.days} kun Premium.`, 'bonus'); Store.save(); toast(`${p.days} kun Premium qo'shildi`); V.rerender();
    },
  });
})();

