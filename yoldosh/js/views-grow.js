/* Daromad va o'sish: Premium obuna (99 000 so'm/oy), referal, ulashiladigan kartochkalar, guruh imtihoni (talaba tomoni),
   bosh sahifa kartalari, demo talaba ma'lumotlari va "Yana" menyusi.
   DEMO: to'lov simulyatsiya qilinadi (Click/Payme ulanmagan). Haqiqiy to'lov va obuna holati serverda saqlanadi. */
(function () {
  const { ico, esc, bar, toast, modal, closeModal, copy } = UI;
  const { Store, TOPICS } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, S = V.S, shell = (a, h) => V.shellStudent(a, h);
  const DAY = 864e5, $ = (id) => document.getElementById(id), money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ` so'm`;
  const todayQ = () => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); return Store.s.history.filter(h => h.ts >= t0.getTime()).length; };
  const siteUrl = () => (Store.s.siteUrl || CFG.siteUrl || location.href.split('#')[0]);

  /* ================= PREMIUM ================= */
  const Prem = {
    schoolPaid() { return !!(Store.s.school && Store.s.school.paid); },
    active() { const s = Store.s; return !!(s.sub && s.sub.until > Date.now()) || this.schoolPaid() || !!(V.grantUntil && V.grantUntil()); },
    trialLeft() { const s = Store._pts(); return s.trialUntil ? Math.max(0, Math.ceil((s.trialUntil - Date.now()) / DAY)) : 0; },
    ok() { return !!CFG.allFree || this.active() || this.trialLeft() > 0; },
    status() { return this.active() ? (this.schoolPaid() && !(Store.s.sub && Store.s.sub.until > Date.now()) ? 'school' : 'premium') : this.trialLeft() > 0 ? 'trial' : 'free'; },
    daysLeft() { const s = Store.s, u = Math.max(s.sub && s.sub.until > Date.now() ? s.sub.until : 0, V.grantUntil ? V.grantUntil() : 0); return u ? Math.ceil((u - Date.now()) / DAY) : 0; },
    /* kalit bo'yicha cheklov sababi (null = ruxsat) */
    check(key) {
      if (key && key.startsWith('b:') && !CFG.allFree && this.tier()) { const L = this.battleLimit(); if (this.battlesToday() >= L) return { why: `Bugungi ${L} ta batl tugadi. Ko'proq o'ynash uchun yuqoriroq tarifga o'ting`, k: 'limit' }; }
      if (this.ok() || (key && key.startsWith('g:'))) return null;
      if (key === 'pro') return { why: `Test Pro faqat Premium uchun`, k: 'pro' };
      if (key === 'nb') return { why: `Xato daftarini intervalli takrorlash Premium uchun`, k: 'nb' };
      if (key && key.startsWith('b:')) return { why: `Do'st bilan batl Premium uchun`, k: 'battle' };
      if (this.runsToday() >= (CFG.freeRunsPerDay || 3)) return { why: `Bugungi bepul ${CFG.freeRunsPerDay || 3} ta test tugadi`, k: 'limit' };
      return null;
    },
    /* tarif: pro < premium < max (maktab/grant orqali — premium) */
    tier() { const s = Store.s; if (s.sub && s.sub.until > Date.now()) return s.sub.tier || 'pro'; return this.active() ? 'premium' : ''; },
    battleLimit() { return ({ pro: 10, premium: 30, max: 1e9 })[this.tier()] || 0; },
    battlesToday() { const r = Store.s.bt; return r && r.d === ST.dayKey() ? r.n : 0; },
    countBattle() { const r = Store.s.bt; Store.s.bt = r && r.d === ST.dayKey() ? { d: r.d, n: r.n + 1 } : { d: ST.dayKey(), n: 1 }; Store.save(); },
    runsToday() { const r = Store.s.runs; return r && r.d === ST.dayKey() ? r.n : 0; },
    countRun() { const r = Store.s.runs; Store.s.runs = r && r.d === ST.dayKey() ? { d: r.d, n: r.n + 1 } : { d: ST.dayKey(), n: 1 }; Store.save(); },
  };
  V.Prem = Prem;
  const BEN = [[`Cheksiz testlar`, `Bepul: kuniga ${CFG.freeRunsPerDay || 3} ta ${CFG.freeTestSize || 20} talik test`], [`Test Pro va Master galichka`, `Eng qiyin savollar, reytingda belgi`], [`Xato daftari + intervalli takrorlash`, `Adashgan savollar 1, 3, 7, 14 kunda qaytadi`], [`Shaxsiy imtihon rejasi`, `Sanaga qarab kuniga necha soat va savol`], [`Do'st bilan batl va sinov imtihonlari`, `Cheklovsiz`], [`AI tahlil va ustoz nazorati`, `To'liq natijalar ustozingizga ko'rinadi`]];
  function paywall(r) {
    modal(`<div class="pw-i">${ico('crown')}</div><h3 style="margin:10px 0 6px">${esc(r.why)}</h3><p class="mute">Premium bilan hammasi ochiladi.</p>
      <div class="pw-list">${BEN.slice(0, 4).map(b => `<div>${ico('check')}<span>${esc(b[0])}</span></div>`).join('')}</div>
      <div class="pw-price"><b>${money(CFG.premiumPrice)}</b><span>oyiga</span></div>
      <div class="ai-acts"><button class="btn primary lg" data-act="pay" data-what="premium">${ico('crown')} Premium olish</button><button class="btn soft" data-act="close">Keyinroq</button></div>`);
  }
  function checkout(what) {
    const price = what === 'marathon' ? CFG.marathonPrice : CFG.premiumPrice, title = what === 'marathon' ? `Imtihon oldi marafoni (7 kun)` : `Premium obuna (30 kun)`;
    modal(`<h3>To'lov</h3><div class="co-sum"><span>${esc(title)}</span><b>${money(price)}</b></div>
      <div class="field"><label>To'lov usuli</label><div class="cfg-row" id="pm">${['Click', 'Payme', 'Uzum', 'Uzcard'].map((m, i) => `<button class="bigp ${i === 0 ? 'on' : ''}" data-act="pm" data-m="${m}">${m}</button>`).join('')}</div></div>
      <div class="banner" style="margin-top:16px">${ico('alert')}<span><b>Demo:</b> haqiqiy to'lov Click/Payme ulangach ishlaydi. Hozir tugma obunani sinov uchun faollashtiradi, pul yechilmaydi.</span></div>
      <div class="ai-acts"><button class="btn primary lg" data-act="pay-do" data-what="${what}">${ico('check')} To'lash (demo)</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
  }
  V.premium = () => {
    const st = Prem.status(), left = st === 'premium' ? Prem.daysLeft() : Prem.trialLeft();
    const label = { premium: `Premium faol · ${left} kun qoldi`, school: `Premium: avtomaktabingiz to'lagan`, trial: `Bepul sinov · ${left} kun qoldi`, free: `Bepul rejim` }[st];
    return {
      html: shell('premium', `<div class="page-h"><div><h1>Premium</h1><p>Imtihonga eng tez va ishonchli tayyorgarlik.</p></div><span class="chip ${st === 'free' ? 'bad' : 'ok'}">${label}</span></div>
      <div class="plan-hero"><div class="ph-days"><b>99</b><span>ming/oy</span></div><div class="ph-t"><span class="chip warn">Eng yaxshi tanlov</span><h2>${money(CFG.premiumPrice)} · oyiga</h2><p>Bitta qo'shimcha dars narxidan arzon. Istalgan paytda bekor qilasiz.</p>
        ${st === 'premium' || st === 'school' ? '' : `<button class="go-b" style="margin-top:14px" data-act="pay" data-what="premium">${ico('crown')} Premium olish</button>`}</div></div>
      <div class="card mt"><div class="h-sec">Nimalar ochiladi</div><div class="stack s12">${BEN.map(b => `<div class="rew on"><span class="rw-i">${ico('check')}</span><div><b>${esc(b[0])}</b><small>${esc(b[1])}</small></div></div>`).join('')}</div></div>
      <div class="card mt"><div class="h-sec">Bepul va Premium</div><table class="cmp"><tr><th></th><th>Bepul</th><th>Premium</th></tr><tr><td>Kunlik testlar</td><td>${CFG.freeRunsPerDay || 3} ta</td><td>Cheksiz</td></tr><tr><td>Test hajmi</td><td>${CFG.freeTestSize || 20} ta</td><td>Istalgancha</td></tr><tr><td>Test Pro, Master</td><td>—</td><td>✓</td></tr><tr><td>Xato daftari takrori</td><td>—</td><td>✓</td></tr><tr><td>Imtihon rejasi</td><td>—</td><td>✓</td></tr><tr><td>Batl</td><td>—</td><td>✓</td></tr></table></div>
      <div class="card mt" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span class="rw-i">${ico('gift')}</span><div style="flex:1;min-width:200px"><b>Do'stingizni taklif qiling</b><div class="mute" style="font-size:14px">Ikkalangizga +50 ball. Premium ham do'stlar bilan qiziqarli.</div></div><a class="btn soft" href="#/app/rank">Havolani olish</a></div>
      ${Store.s.payments && Store.s.payments.length ? `<div class="card mt"><div class="h-sec">To'lovlar tarixi (demo)</div>${Store.s.payments.slice().reverse().map(p => `<div class="trow" style="grid-template-columns:1fr auto"><span>${new Date(p.ts).toLocaleDateString('uz-UZ')} · ${esc(p.title)}</span><b>${money(p.sum)}</b></div>`).join('')}</div>` : ''}`)
    };
  };
  const wrapPage = (name, label) => { const o = V[name]; V[name] = () => Prem.ok() ? o() : { html: shell(name === 'plan' ? 'plan' : name, `<div class="page-h"><div><h1>${label}</h1></div></div><div class="card" style="text-align:center;padding:44px"><div class="pw-i" style="margin:0 auto 12px">${ico('crown')}</div><h3>${label} — Premium uchun</h3><p class="mute" style="margin:8px 0 18px">Bepul sinov muddati tugagan.</p><button class="btn primary lg" data-act="pay" data-what="premium">${ico('crown')} Premium olish · ${money(CFG.premiumPrice)}</button></div>`) }; };
  setTimeout(() => { wrapPage('plan', 'Imtihon rejasi'); wrapPage('battle', 'Batl'); }, 0);

  /* ================= REFERAL ================= */
  const refLink = () => `${siteUrl()}#/register/${Store._pts().refCode}`;
  V.refCard = () => {
    const s = Store._pts(), n = s.refCount || 0, np = s.refPaid || 0, need = CFG.refNeed || 15, needP = CFG.refNeedPaid || 2;
    return `<div class="card mt ref-c"><div class="ref-h"><span class="rw-i">${ico('gift')}</span><div><b>Do'stingizni taklif qiling: ikkalangizga +50 ball</b><div class="mute" style="font-size:14px">Taklif qilganlar: ${n} ta${n ? ` · +${50 * n} ball` : ''}</div></div></div>
      <div class="ref-goal ${s.refRewarded ? 'done' : ''}"><b>${ico('crown')} ${need} ta do'st + ${needP} tasi Premium olsa: ${CFG.refRewardDays || 30} kun Premium sovg'a</b>
        <div class="rg-r"><span>Do'stlar</span>${bar(Math.min(100, Math.round(n / need * 100)), 'var(--acc)')}<em>${Math.min(n, need)}/${need}</em></div><div class="rg-r"><span>Premium olganlar</span>${bar(Math.min(100, Math.round(np / needP * 100)), '#F7C600')}<em>${Math.min(np, needP)}/${needP}</em></div>${s.refRewarded ? `<small class="mute">Sovg'a Premium berilgan.</small>` : ''}</div>
      <div class="glink" style="margin-top:12px"><input class="input" readonly value="${esc(refLink())}" onclick="this.select()"><button class="btn sm primary" data-act="ref-copy">${ico('copy')} Nusxalash</button><button class="btn sm soft" data-act="ref-tg">${ico('send')}</button></div>
      <div class="mute" style="font-size:13px;margin-top:8px">Sizning kodingiz: <b style="color:var(--text)">${esc(s.refCode)}</b></div></div>`;
  };

  /* ================= KARTOCHKALAR (ulashish uchun rasm) ================= */
  function wrapText(g, text, x, y, maxW, lh) { const words = String(text).split(' '); let line = '', yy = y; words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; }); g.fillText(line, x, yy); return yy; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawCard(o) {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const gold = o.theme === 'gold', acc = gold ? '#F7C600' : (getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#B8F53B');
    let bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0C1530'); bg.addColorStop(1, '#05070D'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    let rg = g.createRadialGradient(W * .8, 160, 20, W * .8, 160, 620); rg.addColorStop(0, gold ? 'rgba(247,198,0,.35)' : 'rgba(77,141,255,.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    rg = g.createRadialGradient(120, H - 120, 20, 120, H - 120, 600); rg.addColorStop(0, gold ? 'rgba(255,176,32,.25)' : 'rgba(184,245,59,.25)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1; for (let x = 0; x < W; x += 72) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 72) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // logo
    const b = UI.schoolBrand(), brandName = b && b.name ? b.name : `Chorraha`;
    g.fillStyle = acc; rr(g, 70, 70, 84, 84, 24); g.fill(); g.strokeStyle = '#0B1400'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(96, 138); g.lineTo(108, 86); g.moveTo(128, 138); g.lineTo(116, 86); g.stroke();
    g.fillStyle = '#fff'; g.font = '800 46px Manrope, Arial, sans-serif'; g.textAlign = 'left'; g.fillText(brandName, 176, 126); if (b && b.name) { g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 26px Manrope, Arial'; g.fillText(`Chorraha`, 178, 156); }
    // kicker
    g.fillStyle = acc; g.font = '800 34px Manrope, Arial'; g.textAlign = 'center'; g.fillText((o.kicker || '').toUpperCase(), W / 2, 320);
    // medalion
    const cx = W / 2, cy = 560; let mg = g.createRadialGradient(cx, cy, 20, cx, cy, 230); mg.addColorStop(0, gold ? 'rgba(247,198,0,.5)' : 'rgba(184,245,59,.4)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mg; g.beginPath(); g.arc(cx, cy, 230, 0, 7); g.fill();
    g.lineWidth = 16; g.strokeStyle = acc; g.beginPath(); g.arc(cx, cy, 150, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.arc(cx, cy, 140, 0, 7); g.fill();
    g.strokeStyle = acc; g.lineWidth = 26; g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.icon === 'star') { g.fillStyle = acc; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 56 : 120, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); }
    else { g.beginPath(); g.moveTo(cx - 66, cy + 4); g.lineTo(cx - 18, cy + 52); g.lineTo(cx + 70, cy - 48); g.stroke(); }
    // matn
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 78px Manrope, Arial'; const y2 = wrapText(g, o.title || '', W / 2, 830, 900, 92);
    if (o.big) { g.fillStyle = acc; g.font = '800 150px Manrope, Arial'; g.fillText(o.big, W / 2, y2 + 170); }
    g.fillStyle = 'rgba(255,255,255,.78)'; g.font = '600 38px Manrope, Arial'; wrapText(g, o.sub || '', W / 2, (o.big ? y2 + 250 : y2 + 80), 860, 52);
    // ism
    if (o.name) { g.fillStyle = 'rgba(255,255,255,.08)'; rr(g, W / 2 - 330, 1150, 660, 96, 48); g.fill(); g.fillStyle = '#fff'; g.font = '800 42px Manrope, Arial'; g.fillText(o.name, W / 2, 1212); }
    g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '600 28px Manrope, Arial'; g.fillText(`Haydovchilik imtihoniga aqlli tayyorgarlik`, W / 2, 1300);
    return c;
  }
  function shareModal(c, text) {
    const url = c.toDataURL('image/png');
    modal(`<h3>Kartochka tayyor</h3><img class="card-img" src="${url}" alt="Natija kartochkasi"><p class="mute" style="font-size:13.5px;margin-top:8px">Rasmni bosib turib saqlashingiz yoki quyidagi tugmalardan foydalanishingiz mumkin.</p>
      <div class="ai-acts"><button class="btn primary" id="shs">${ico('send')} Ulashish</button><a class="btn soft" id="shd" download="yoldosh-natija.png" href="${url}">${ico('upload')} Yuklab olish</a><a class="btn soft" target="_blank" rel="noopener noreferrer" href="https://t.me/share/url?url=${encodeURIComponent(siteUrl())}&text=${encodeURIComponent(text)}">Telegram</a></div>`);
    $('shs').addEventListener('click', () => { c.toBlob(async (blob) => { try { const f = new File([blob], 'yoldosh.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text }); else { await copy(text); toast(`Matn nusxalandi. Rasmni «Yuklab olish» orqali saqlang.`); } } catch (e) { /* bekor qilindi */ } }); });
  }
  V.shareCard = (o) => { try { shareModal(drawCard(o), o.text || `Chorraha da natijam!`); } catch (e) { toast(`Kartochka yasab bo'lmadi`); } };

  /* natija sahifasiga ulashish tugmalari */
  const prevExtra = V.resultExtra;
  V.resultExtra = (R) => {
    let h = prevExtra ? prevExtra(R) : '';
    const p = Store.proStat(), who = Store.s.name || 'Talaba';
    if (R.mode === 'pro' && R.pass) h += `<div class="ai-acts" style="justify-content:center;margin-top:18px"><button class="btn primary" data-act="card-pro">${ico('image')} ${p.master ? 'Master kartochkasi' : 'Galichka kartochkasi'}</button></div>`;
    else if (R.mode !== 'pro') h += `<div class="ai-acts" style="justify-content:center;margin-top:18px"><button class="btn soft" data-act="card-result">${ico('image')} Natijani ulashish</button></div>`;
    return h;
  };

  /* ================= GURUH IMTIHONI (talaba tomoni) ================= */
  const gexams = () => (Store.s.gexams || []).filter(e => !e.groupId || e.groupId === Store.s.groupId);
  V.gexamList = gexams;
  function gexamList(e) {
    const pool = BANK.Q.filter(q => q.level >= 2), seed = BANK.hash(e.id), by = TOPICS.map(t => BANK.shuffle(pool.filter(q => q.topic === t.id), seed + BANK.hash(t.id))), out = [];
    for (let i = 0; i < 60 && out.length < e.count; i++) by.forEach(a => { if (a[i] && out.length < e.count) out.push(a[i]); });
    return BANK.shuffle(out, seed + 3);
  }
  const prevHook = V.buildHook;
  V.buildHook = (key) => {
    if (key.startsWith('g:')) {
      const e = (Store.s.gexams || []).find(x => x.id === key.slice(2)); if (!e) return null; const list = gexamList(e);
      return { key, title: `Guruh imtihoni: ${e.title}`, mode: 'exam', list, i: 0, picks: [], revealed: false, simple: false, start: Date.now(), endAt: Date.now() + e.minutes * 60000, done: false };
    }
    return prevHook ? prevHook(key) : null;
  };
  const prevFin = V.onFinish;
  V.onFinish = (z, R) => {
    if (prevFin) prevFin(z, R);
    if (z.key.startsWith('g:') && !(Store.s.gres || []).find(r => r.exam === z.key.slice(2) && r.id === (Store.s.meId || 'me'))) { Store.s.gres = Store.s.gres || []; Store.s.gres.push({ exam: z.key.slice(2), name: Store.s.name || 'Talaba', score: R.correct, total: R.total, sec: R.sec, ts: Date.now(), id: Store.s.meId || 'me' }); Store.save(); }
  };
  function gexamCard() {
    const list = gexams().filter(e => e.at + e.minutes * 60000 + DAY > Date.now()).sort((a, b) => a.at - b.at), e = list[0]; if (!e) return '';
    const done = (Store.s.gres || []).find(r => r.exam === e.id && r.id === (Store.s.meId || 'me')), now = Date.now(), open = now >= e.at, d = new Date(e.at);
    return `<div class="card mt gx-c"><div class="ref-h"><span class="rw-i" style="background:var(--warn);color:#2a1d00">${ico('flag')}</span><div><b>Guruh imtihoni: ${esc(e.title)}</b><div class="mute" style="font-size:14px">${UI.dt(d)} · ${e.count} savol · ${e.minutes} daqiqa</div></div></div>
      ${done ? `<p style="margin-top:10px">Natijangiz: <b>${done.score}/${done.total}</b> — ustozingizga yuborildi.</p>` : open ? `<button class="btn primary" style="margin-top:12px" data-act="start" data-key="g:${e.id}">Imtihonni boshlash</button>` : `<p class="mute" style="margin-top:10px">Boshlanishiga ${Math.max(1, Math.ceil((e.at - now) / 60000))} daqiqa qoldi.</p>`}</div>`;
  }

  /* ================= BOSH SAHIFA KARTALARI ================= */
  const baseHome = V.homeRank;
  V.homeRank = () => {
    if (Store.s.role !== 'student') return '';
    const st = Prem.status(), left = st === 'trial' ? Prem.trialLeft() : st === 'premium' ? Prem.daysLeft() : 0, due = Store.nbDue().length, plan = Store.s.plan;
    let h = baseHome ? baseHome() : '';
    h += gexamCard();
    h += `<div class="grid g2 mt">
      <a class="card feat" href="#/app/plan" style="padding:20px"><div class="ic" style="width:42px;height:42px;margin-bottom:12px">${ico('calendar')}</div><b>Imtihon rejasi</b><p style="font-size:14px;color:var(--mute)">${plan && plan.date ? `${Math.max(0, Math.round((new Date(plan.date) - Date.now()) / DAY))} kun qoldi · rejani ko'ring` : `Sanani kiriting, reja tuzaman`}</p></a>
      <a class="card feat" href="#/app/mistakes" style="padding:20px"><div class="ic" style="width:42px;height:42px;margin-bottom:12px">${ico('redo')}</div><b>Xato daftari</b><p style="font-size:14px;color:${due ? 'var(--warn)' : 'var(--mute)'}">${due ? `Bugun ${due} ta savolni takrorlang` : 'Bugun takror yo\'q'}</p></a></div>
      <div class="card mt prem-c ${st}"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span class="rw-i gold">${ico('crown')}</span><div style="flex:1;min-width:190px"><b>${{ premium: 'Premium faol', school: 'Premium (avtomaktab to\'lagan)', trial: `Bepul sinov: ${left} kun qoldi`, free: 'Bepul rejim' }[st]}</b><div class="mute" style="font-size:14px">${st === 'free' ? `Kuniga ${CFG.freeRunsPerDay || 3} ta ${CFG.freeTestSize || 20} talik test. Premium: cheksiz — ${money(CFG.premiumPrice)}/oy` : st === 'trial' ? `Keyin Premium ${money(CFG.premiumPrice)}/oy` : 'Hamma imkoniyatlar ochiq'}</div></div>${st === 'premium' || st === 'school' ? '' : `<a class="btn sm primary" href="#/app/premium">Premium</a>`}</div></div>`;
    return h;
  };

  /* ================= DEMO TALABA (taqdimot uchun jonli ko'rinish) ================= */
  function seedDemoStudent() {
    const s = Store.s, r = BANK.rng(777), now = Date.now(), pool = BANK.Q;
    Object.assign(s, { uid: ST.genUid('demo-aziz'), name: 'Aziz Karimov', first: 'Aziz', last: 'Karimov', tg: 'aziz_k', region: `Toshkent shahri`, groupId: 'A', meId: s.meId || 'rdemo', role: 'student' });
    s.roster = s.roster || []; if (!s.roster.find(x => x.id === s.meId)) s.roster.push({ id: s.meId, name: s.name, first: 'Aziz', last: 'Karimov', tg: 'aziz_k', groupId: 'A', region: s.region, joined: now - 14 * DAY });
    s.history = []; s.days = {}; s.exams = []; s.nb = {}; s.sets = s.sets || {}; s.lessons = { warning: true, priority: true, prohibitory: true };
    const acc = { warning: .82, priority: .78, prohibitory: .66, mandatory: .84, info: .9, signals: .72, rules: .7, cross: .52, marks: .75 };
    for (let d = 13; d >= 0; d--) {
      const day = new Date(now - d * DAY), n = d === 0 ? 14 : 8 + Math.floor(r() * 26), key = ST.dayKey(day); s.days[key] = (12 + Math.floor(r() * 40)) * 60;
      for (let i = 0; i < n; i++) { const q = pool[Math.floor(r() * pool.length)], ok = r() < (acc[q.topic] || .7) + (13 - d) * .005, ts = day.setHours(9 + Math.floor(r() * 12), Math.floor(r() * 60)); s.history.push({ q: q.id, t: q.topic, ok, c: ok ? q.answer : (q.answer + 1) % 4, ts, m: 'practice' }); if (!ok) { const e = s.nb[q.id]; s.nb[q.id] = { q: q.id, t: q.topic, count: (e ? e.count : 0) + 1, ok: 0, box: Math.floor(r() * 3), next: now + (Math.floor(r() * 5) - 2) * DAY, last: ts, first: ts, done: false }; } }
    }
    [[13, 20, 920], [15, 20, 880], [17, 20, 760]].forEach((e, i) => s.exams.push({ ts: now - (9 - i * 3) * DAY, score: e[0], total: e[1], sec: e[2], byTopic: {} }));
    s.points = 1240; s.pts = [{ ts: now - 14 * DAY, d: 100, r: `Ro'yxatdan o'tgani uchun` }, { ts: now - 5 * DAY, d: 200, r: `Test Pro: galichka` }, { ts: now - 2 * DAY, d: 40, r: `Test ≥90%` }]; s.joinDay = ST.dayKey(new Date(now - 14 * DAY)); s.lastDay = ST.dayKey(); s.penDone = null;
    const sk = Store.seasonKey(), pm = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n, 1); return Store.seasonKey(d); };
    s.sp = { [sk]: 420, [pm(1)]: 760, [pm(2)]: 310 }; s.pro = { attempts: 4, passes: 1, streak: 1, badge: true, master: false, last: now - 2 * DAY };
    s.trialUntil = now + 5 * DAY; s.refCode = s.refCode || 'R-DEMO01'; s.refCount = 2; s.plan = { date: ST.dayKey(new Date(now + 21 * DAY)), hours: 1.5 };
    s.notes = [{ id: 1, ts: now - 3600e3, text: `Tabriklaymiz! Test Pro dan o'tdingiz va galichka (✓) oldingiz. +200 ball.`, kind: 'bonus', read: false }, { id: 2, ts: now - 2 * 3600e3, text: `Bugun hali test yechmadingiz. Kamida bitta test yeching.`, kind: 'reminder', read: true }];
    s.honor = undefined; s.brand = s.brand || undefined; Store.save();
  }
  V.seedDemo = () => { if (!Store.s.history.length || !Store.s.meId) seedDemoStudent(); };

  /* ================= amallar ================= */
  const prevStart = V.acts.start;
  V.acts = Object.assign(V.acts || {}, {
    start(el) {
      const key = el.dataset.key, r = Prem.check(key); if (r) { paywall(r); return; }
      const free = !Prem.ok() && !(key && key.startsWith('g:')), before = S.quiz; prevStart(el);
      if (key && key.startsWith('b:') && S.quiz && S.quiz !== before) Prem.countBattle();
      if (free && S.quiz && S.quiz !== before) { Prem.countRun(); const n = CFG.freeTestSize || 20; if (S.quiz.list.length > n) S.quiz.list = S.quiz.list.slice(0, n); }
    },
    pay(el) { closeModal(); checkout(el.dataset.what); },
    pm(el) { document.querySelectorAll('#pm .bigp').forEach(b => b.classList.toggle('on', b === el)); },
    'pay-do'(el) {
      const what = el.dataset.what, s = Store.s; s.payments = s.payments || [];
      if (what === 'marathon') { s.marathon = { start: ST.dayKey(), done: {} }; s.payments.push({ ts: Date.now(), title: `Marafon (7 kun)`, sum: CFG.marathonPrice }); Store.notify(`Marafon boshlandi! 1-kun vazifalari sizni kutmoqda.`, 'bonus'); }
      else { const base = s.sub && s.sub.until > Date.now() ? s.sub.until : Date.now(); s.sub = { until: base + 30 * DAY }; s.payments.push({ ts: Date.now(), title: `Premium (30 kun)`, sum: CFG.premiumPrice }); Store.notify(`Premium faollashtirildi: 30 kun. Rahmat!`, 'bonus'); if (s.usedRef && !s.refPaidCredited) { s.refPaidCredited = true; Store.creditRefPaid(s.usedRef); } }
      Store.save(); closeModal(); toast(`Faollashtirildi (demo)`); V.rerender ? V.rerender() : (location.hash = '#/app/premium'); if (what === 'marathon') location.hash = '#/app/marathon'; else if (location.hash.startsWith('#/app/quiz')) location.hash = '#/app/premium';
    },
    'ref-copy'() { copy(refLink()).then(() => toast(`Havola nusxalandi. Do'stingizga yuboring.`)); },
    'ref-tg'() { window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink())}&text=${encodeURIComponent(`Chorraha da prava imtihoniga tayyorlanyapman. Qo'shil, ikkalamiz +50 ball olamiz!`)}`, '_blank', 'noopener'); },
    'card-result'() { const R = S.result; if (!R) return; V.shareCard({ kicker: R.title || 'Test natijasi', title: R.pct >= 90 ? `Ajoyib natija!` : R.pct >= 70 ? `Yaxshi natija!` : `Mashq davom etmoqda`, big: R.pct + '%', sub: `${R.correct}/${R.total} to'g'ri javob`, name: Store.s.name, text: `Chorraha da ${R.pct}% natija ko'rsatdim!` }); },
    'card-pro'() { const p = Store.proStat(); V.shareCard(p.master ? { kicker: 'Test Pro', theme: 'gold', icon: 'star', title: `Master!`, sub: `${CFG.masterStreak} marta ketma-ket xatosiz o'tdim`, name: Store.s.name, text: `Chorraha: Test Pro dan ${CFG.masterStreak} marta xatosiz o'tib Master bo'ldim!` } : { kicker: 'Test Pro', title: `Pro testdan o'tdim!`, sub: `${CFG.proQuestions} ta eng qiyin savol, bitta xatosiz`, name: Store.s.name, text: `Chorraha: Test Pro dan xatosiz o'tdim!` }); },
    'card-rank'() { const rk = V.rankOf ? V.rankOf('all') : 1; V.shareCard({ kicker: 'Reyting', title: `Respublika reytingida`, big: rk + '-o\'rin', sub: `${Store.s.region || 'O\'zbekiston'} · ${Store.s.points} ball`, name: Store.s.name, text: `Chorraha reytingida ${rk}-o'rindaman!` }); },
    'card-cert'() { const h = Store.s.honor || {}; V.shareCard({ kicker: 'Tabriklaymiz!', theme: 'gold', icon: 'star', title: `${Store.s.name} nazariy imtihondan o'tdi`, sub: `Reytingda ${h.rankAt}-o'rinda turib imtihondan o'tdi. Kelgusida omad!`, name: Store.s.name, text: `Nazariy imtihondan o'tdim! Chorraha ga rahmat.` }); },
    'card-marathon'() { V.shareCard({ kicker: 'Marafon', theme: 'gold', icon: 'star', title: `7 kunlik marafon yakunlandi`, sub: `Imtihon oldi tayyorgarlikni tugatdim`, name: Store.s.name, text: `Chorraha marafonini tugatdim!` }); },
    'more-nav'() {
      modal(`<h3>Bo'limlar</h3><div class="more-g">${[['#/app', 'home', 'Bosh sahifa'], ['#/app/lessons', 'book', 'Darslik'], ['#/app/tests', 'list', 'Testlar'], ['#/app/plan', 'calendar', 'Imtihon rejasi'], ['#/app/rank', 'trend', 'Reyting'], ['#/app/mistakes', 'redo', 'Xato daftari'], ['#/app/battle', 'bolt', 'Batl'], ['#/app/exam', 'flag', 'Sinov imtihoni'], ['#/app/marathon', 'flame', 'Marafon'], ['#/app/signs', 'grid', 'Belgilar'], ['#/app/scan', 'camera', 'Kamera'], ['#/app/ai', 'sparkles', 'AI yordamchi'], ['#/app/teacher', 'send', 'Ustozga yozish'], ['#/app/premium', 'crown', 'Premium'], ['#/app/id', 'star', 'Mening ID'], ['#/app/bot', 'send', 'Telegram bot']].map(x => `<a href="${x[0]}" data-act="close">${ico(x[1])}<span>${x[2]}</span></a>`).join('')}</div><button class="btn soft" style="width:100%;margin-top:14px" data-act="logout">${ico('logout')} Chiqish</button>`);
    },
  });
})();







