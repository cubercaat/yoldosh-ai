/* Ustoz / rahbar paneli */
(function () {
  const { ico, esc, brand, gauge, bar, tone, ava, toast, modal, copy } = UI;
  const { Store, TOPICS } = ST;
  const CFG = window.YOLDOSH;
  const V = (window.V = window.V || {});
  const $ = (s) => document.querySelector(s);
  const T = { f: 'all', q: '' };
  const G = { sel: 'all' };
  const fl = () => { const a = ST.students(); return G.sel === 'all' ? a : a.filter(s => s.group === G.sel); };
  const siteBase = () => (Store.s.siteUrl || location.href.split('#')[0]).replace(/\/$/, '') + (/\.html?$/.test(Store.s.siteUrl || '') ? '' : '');
  const base = () => (Store.s.siteUrl || CFG.siteUrl || location.href.split('#')[0]);
  const linkOf = (g) => `${base()}#/join/${g.code}/${encodeURIComponent(g.name)}`;
  const groupBar = () => { const gs = Store.groups(); return `<div class="filters" style="margin-bottom:16px"><span class="mute" style="font-weight:700">Guruh:</span><button class="pill ${G.sel === 'all' ? 'on' : ''}" data-act="g-sel" data-g="all">Hammasi</button>${gs.map(g => `<button class="pill ${G.sel === g.id ? 'on' : ''}" data-act="g-sel" data-g="${esc(g.id)}">${esc(g.name)}</button>`).join('')}<a class="pill" href="#/panel/groups">+ Guruh</a></div>`; };
  const SHORT = [`Ogohl.`, `Imtiyoz`, `Taqiq`, `Buyuruv`, `Axborot`, `Svetofor`, `Qoidalar`, `Kesishma`, `Chiziq`];
  const COLS = `190px repeat(${TOPICS.length},1fr)`;
  const WD = [`Yak`, `Du`, `Se`, `Chor`, `Pay`, `Ju`, `Sha`];

  const inbox = () => {
    const done = Store.s.msgDone || {};
    const demo = ST.DEMO_MSGS.map(m => ({ id: m.id, from: m.from, topic: m.topic, text: m.text, ts: Date.now() - m.ago * 60000, status: done[m.id] ? 'done' : m.status }));
    const real = Store.s.messages.map(m => ({ ...m, status: done[m.id] ? 'done' : m.status }));
    return [...real, ...demo].sort((a, b) => b.ts - a.ts);
  };
  const newCount = () => inbox().filter(m => m.status === 'new').length;

  function shell(active, inner) {
    const items = [['ov', '#/panel', 'chart', `Umumiy ko'rinish`], ['gr', '#/panel/groups', 'users', `Guruhlar`], ['st', '#/panel/students', 'list', `Talabalar`], ['hn', '#/panel/honor', 'flag', `Faxriylar`], ['tp', '#/panel/topics', 'grid', `Mavzular tahlili`], ['ge', '#/panel/gexam', 'flag', `Guruh imtihoni`], ['pr', '#/panel/parents', 'msg', `Hisobotlar`], ['bt', '#/panel/bot', 'send', `Telegram bot`], ['rp', '#/panel/report', 'print', `Rahbar hisoboti`], ['tf', '#/panel/tariff', 'crown', `Tarif`], ['bs', '#/panel/brand', 'brush', `Brend`], ['ms', '#/panel/messages', 'msg', `Xabarlar`]];
    const nc = newCount(), pend = (Store.s.honor && Store.s.honor.status === 'pending') ? 1 : 0;
    return `<div class="shell"><aside class="side">${brand()}
      ${items.map(n => `<a class="nav-i ${n[0] === active ? 'on' : ''}" href="${n[1]}">${ico(n[2])}<span>${n[3]}</span>${n[0] === 'ms' && nc ? `<span class="badge">${nc}</span>` : ''}${n[0] === 'hn' && pend ? `<span class="badge">${pend}</span>` : ''}</a>`).join('')}
      <div class="sp"></div><div class="me">${ava(CFG.teacher.name)}<div style="min-width:0"><b>${esc(CFG.teacher.name)}</b><small>Ustoz / Rahbar</small></div><button class="btn sm soft" data-act="logout" aria-label="Chiqish" style="padding:8px;min-height:34px;margin-left:auto">${ico('logout')}</button></div></aside>
      <main class="main">${inner}</main>
      <nav class="tabbar" aria-label="Asosiy">${items.map(n => `<a class="${n[0] === active ? 'on' : ''}" href="${n[1]}">${ico(n[2])}<span>${n[3].replace(`Umumiy ko'rinish`, 'Umumiy')}</span>${n[0] === 'ms' && nc ? `<span class="badge">${nc}</span>` : ''}</a>`).join('')}</nav></div>`;
  }
  const demoBanner = () => `<div class="banner mb">${ico('alert')}<span><b>Demo ma'lumotlar.</b> Jadvaldagi ${ST.DEMO.length} ta talaba namunaviy. Talaba sifatida kirib test yechsangiz, o'zingiz ham ro'yxatda «Siz» bo'lib paydo bo'lasiz.</span></div>`;
  const ago = (d) => d === 0 ? `Bugun` : d === 1 ? `Kecha` : d >= 99 ? `Hali kirmagan` : `${d} kun oldin`;
  const weekLabels = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return WD[d.getDay()]; });
  const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;
  const stat = (icon, label, val, unit, sub) => `<div class="stat"><div class="lbl">${ico(icon)} ${label}</div><div class="val mono">${val}<small>${unit || ''}</small></div><div class="sub">${sub || ''}</div></div>`;

  /* ---------- Umumiy ---------- */
  V.panel = () => {
    const list = fl(), sm = ST.summary(list), ins = AI.insights(sm);
    const counts = { ok: 0, near: 0, no: 0 }; sm.withR.forEach(x => counts[ST.status(x.r).key]++);
    const worst = sm.topics.filter(t => t.act).sort((a, b) => b.pct - a.pct).slice(0, 5);
    const avgDays = Array.from({ length: 7 }, (_, i) => Math.round(list.reduce((a, s) => a + s.days[i], 0) / sm.N)), mx = Math.max(10, ...avgDays), lab = weekLabels();
    const attention = sm.withR.slice().sort((a, b) => a.r - b.r).slice(0, 5);
    return {
      html: shell('ov', `<div class="page-h"><div><h1>Umumiy ko'rinish</h1><p>${esc(CFG.school)} · ${sm.N} ta talaba</p></div><a class="btn ghost" href="#/panel/students">Barcha talabalar ${ico('arrow')}</a></div>
      ${demoBanner()}${groupBar()}
      <div class="grid g4 keep2">
        ${stat('users', `Jami talabalar`, sm.N, '', `Faol o'quvchilar`)}
        ${stat('bolt', `Bugun faol`, sm.activeToday, `/${sm.N}`, `${pctOf(sm.activeToday, sm.N)}% talaba bugun kirgan`)}
        ${stat('trend', `Haftalik faol`, pctOf(sm.activeWeek, sm.N), '%', `So'nggi 7 kunda kirganlar`)}
        ${stat('clock', `Kunlik vaqt`, sm.avgMin, ' daq', `Bugun faol talabalar o'rtachasi`)}
      </div>
      <div class="grid g4 keep2" style="margin-top:18px">
        ${stat('shield', `Imtihonga tayyor`, pctOf(sm.ready, sm.N), '%', `${sm.ready} ta talaba (85% dan yuqori)`)}
        ${stat('target', `O'rtacha o'zlashtirish`, sm.mastery, '%', `Barcha javoblar bo'yicha`)}
        ${stat('alert', `Kirmayotganlar`, sm.inactive.length, ' nafar', `3 va undan ko'p kun`)}
        ${stat('msg', `Yangi xabarlar`, newCount(), '', `Talabalardan`)}
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="ai-h">${ico('sparkles')} Chorraha tahlili</div><div class="stack s12" style="margin-top:12px">${ins.map(i => `<div class="ins ${i.tone}"><span class="ii">${ico(i.tone === 'ok' ? 'check' : i.tone === 'info' ? 'target' : 'alert')}</span><div><b>${esc(i.title)}</b><p>${esc(i.text)}</p></div></div>`).join('')}</div></div>
        <div class="stack">
          <div class="card"><div class="h-sec"><span>Eng ko'p xato qilinadigan mavzular</span></div>${worst.map(w => `<div class="trow" style="grid-template-columns:minmax(0,1.5fr) minmax(80px,1fr) 56px"><span class="nm"><i class="dot" style="color:${w.t.hue}"></i><span>${w.t.name}</span></span>${bar(w.pct, '#FF5C70')}<span class="pc">${w.pct}%</span></div>`).join('')}<p class="mute" style="font-size:13px;margin-top:10px">Talabalarning necha foizi bu mavzuda 70% dan past natija ko'rsatmoqda.</p></div>
          <div class="card"><div class="h-sec">Imtihonga tayyorlik</div>
            <div style="display:flex;height:16px;border-radius:99px;overflow:hidden;gap:3px;margin-bottom:16px"><i style="flex:${counts.ok || .01};background:#34D399"></i><i style="flex:${counts.near || .01};background:#FBBF24"></i><i style="flex:${counts.no || .01};background:#FF5C70"></i></div>
            <div style="display:flex;gap:18px;flex-wrap:wrap;font-weight:700"><span><i class="dot" style="color:#34D399"></i> Tayyor ${counts.ok} (${pctOf(counts.ok, sm.N)}%)</span><span><i class="dot" style="color:#FBBF24"></i> Yaqin ${counts.near} (${pctOf(counts.near, sm.N)}%)</span><span><i class="dot" style="color:#FF5C70"></i> Tayyor emas ${counts.no} (${pctOf(counts.no, sm.N)}%)</span></div></div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="h-sec"><span>Kunlik o'rtacha shug'ullanish (daqiqa)</span></div><div class="weekbars">${avgDays.map((v, i) => `<div class="${v ? '' : 'z'}"><span>${v}</span><i style="height:${Math.max(4, v / mx * 90)}px"></i><span>${lab[i]}</span></div>`).join('')}</div></div>
        <div class="card"><div class="h-sec"><span>Diqqat talab qiladigan talabalar</span></div>${attention.map(x => `<a class="trow" href="#/panel/student/${x.s.id}" style="grid-template-columns:minmax(0,1.4fr) minmax(80px,1fr) 56px"><span class="nm">${ava(x.s.name, 32)}<span>${esc(x.s.name)}</span></span>${bar(x.r)}<span class="pc">${x.r}%</span></a>`).join('')}</div>
      </div>`)
    };
  };

  /* ---------- Talabalar ---------- */
  function rows() {
    const q = T.q.trim().toLowerCase();
    let l = fl().map(s => ({ s, r: ST.readiness(s), o: ST.overall(s) }));
    l = l.filter(x => (!q || x.s.name.toLowerCase().includes(q) || (x.s.uid || '').toLowerCase().includes(q)) && (T.f === 'all' || (T.f === 'inactive' ? x.s.lastActive >= 3 : ST.status(x.r).key === T.f)));
    l.sort((a, b) => b.r - a.r);
    if (!l.length) return `<tr><td colspan="7" class="mute" style="text-align:center;padding:36px">Talaba topilmadi</td></tr>`;
    return l.map(({ s, r, o }) => { const st = ST.status(r), w = ST.weakTopics(s)[0]; return `<tr class="row" data-go="#/panel/student/${s.id}">
      <td><div class="pn">${ava(s.name, 38)}<div><div>${esc(s.name)}${s.me ? ` <span class="chip acc" style="padding:2px 8px;font-size:11px">Siz</span>` : ''}</div><small class="mute"><b class="mono uid-t">${esc(s.uid || '')}</b> · ${esc(ST.groupName(s.group))}</small></div></div></td>
      <td><div class="mini">${bar(r)}<b class="mono">${r}%</b></div></td><td><span class="chip ${st.cls}">${st.label}</span></td>
      <td class="mono">${Math.round(o.acc)}%</td><td class="mono">${s.days[6] ? ST.fmtMin(s.days[6]) : '<span class="mute">–</span>'}</td>
      <td><span class="${s.lastActive >= 3 ? 'chip bad' : 'mute'}">${ago(s.lastActive)}</span></td><td>${w ? `<span class="mute">${w.t.name.replace(' belgilari', '').replace(' belgilar', '')} (${w.acc}%)</span>` : '<span class="mute">–</span>'}</td></tr>`; }).join('');
  }
  const filters = () => [['all', 'Hammasi'], ['ok', 'Tayyor'], ['near', 'Yaqin'], ['no', 'Tayyor emas'], ['inactive', 'Kirmayotganlar']].map(f => `<button class="pill ${T.f === f[0] ? 'on' : ''}" data-act="t-f" data-f="${f[0]}">${f[1]}</button>`).join('');
  V.students = () => ({
    html: shell('st', `<div class="page-h"><div><h1>Talabalar</h1><p>Har bir talabaning tayyorlik darajasi, faolligi va zaif mavzulari.</p></div></div>
      ${groupBar()}<div class="filters"><div class="search">${ico('search')}<input class="input" placeholder="Ism yoki ID bo'yicha qidirish…" data-input="t-q" value="${esc(T.q)}" aria-label="Qidiruv"></div><div id="tf" style="display:contents">${filters()}</div></div>
      <div class="card scroll-x" style="padding:6px"><table class="tbl" style="min-width:860px"><thead><tr><th>Talaba</th><th>Tayyorlik</th><th>Holat</th><th>O'zlashtirish</th><th>Bugun</th><th>Oxirgi faollik</th><th>Zaif mavzu</th></tr></thead><tbody id="tb">${rows()}</tbody></table></div>`)
  });

  /* ---------- Talaba kartasi ---------- */
  V.student = (id) => {
    const s = ST.students().find(x => x.id === id); if (!s) return { redirect: '#/panel/students' };
    const r = ST.readiness(s), o = ST.overall(s), st = ST.status(r), weak = ST.weakTopics(s), lab = weekLabels(), mx = Math.max(10, ...s.days);
    const tot = s.days.reduce((a, b) => a + b, 0), exAvg = s.exams.length ? Math.round(s.exams.reduce((a, b) => a + b, 0) / s.exams.length) : null;
    const notes = [];
    if (s.lastActive >= 3) notes.push(`${ago(s.lastActive)} kirgan — tezda eslatma yuborish tavsiya etiladi.`);
    if (weak.length) notes.push(`Eng zaif mavzu: «${weak[0].t.name}» (${weak[0].acc}%). Shu mavzu bo'yicha qo'shimcha mashq bering.`);
    if (tot / 7 < 20 && s.lastActive < 3) notes.push(`Kunlik o'rtacha ${Math.round(tot / 7)} daqiqa — bu kam. Maqsad: kuniga 20–30 daqiqa.`);
    if (r >= 85) notes.push(`Imtihonga tayyor. Rasmiy imtihon sanasini belgilash mumkin.`);
    else if (r >= 70) notes.push(`Imtihonga yaqin. 2–3 ta sinov imtihoni natijani mustahkamlaydi.`);
    if (!notes.length) notes.push(`Hozircha alohida e'tibor talab qiladigan holat yo'q.`);
    return {
      html: shell('st', `<div class="page-h"><div style="display:flex;gap:16px;align-items:center">${ava(s.name, 60)}<div><h1 style="font-size:28px">${esc(s.name)}</h1><p><b class="mono uid-t">ID: ${esc(s.uid || '')}</b> · ${esc(ST.groupName(s.group))} · ${ago(s.lastActive)}</p></div></div><div style="display:flex;gap:10px"><a class="btn ghost" href="#/panel/students">← Ro'yxat</a><button class="btn primary" data-act="remind" data-id="${s.id}">${ico('send')} Eslatma yozish</button></div></div>
      <div class="hero-card"><div class="gauge">${gauge(r)}<div class="gv"><div><b>${r}%</b><span>tayyorlik</span></div></div></div>
        <div><span class="chip ${st.cls}"><i class="dot"></i> ${st.label}</span><h2>${o.n ? `${Math.round(o.acc)}% o'zlashtirish` : `Hali test yechmagan`}</h2><div class="stack s12" style="margin-top:6px">${notes.map(n => `<div style="display:flex;gap:10px;color:#cdd6ea">${ico('sparkles')}<span>${esc(n)}</span></div>`).join('')}</div></div></div>
      <div class="grid g4 keep2 mt">${stat('book', `Javoblar`, o.n, '', `Jami yechilgan`)}${stat('clock', `Haftalik vaqt`, (tot / 60).toFixed(1), ' soat', `${Math.round(tot / 7)} daq / kun o'rtacha`)}${stat('flag', `Imtihonlar`, s.exams.length, '', exAvg != null ? `O'rtacha ${exAvg}%` : `Hali topshirmagan`)}${stat('target', `Ko'rilgan savol`, s.seen, `/${ST.total}`, `${pctOf(s.seen, ST.total)}% qamrab olingan`)}</div>
      <div class="grid g2 mt"><div class="card"><div class="h-sec">Mavzular bo'yicha</div>${TOPICS.map(t => { const a = ST.topicAcc(s, t.id); return `<div class="trow"><span class="nm"><i class="dot" style="color:${t.hue}"></i><span>${t.name}</span></span>${a == null ? `<div class="bar"></div><span class="pc mute">–</span>` : `${bar(a)}<span class="pc">${a}%</span>`}</div>`; }).join('')}</div>
        <div class="stack"><div class="card"><div class="h-sec">So'nggi 7 kun (daqiqa)</div><div class="weekbars">${s.days.map((v, i) => `<div class="${v ? '' : 'z'}"><span>${v}</span><i style="height:${Math.max(4, v / mx * 90)}px"></i><span>${lab[i]}</span></div>`).join('')}</div></div>
        <div class="card"><div class="h-sec">Imtihon natijalari</div>${s.exams.length ? s.exams.slice(-5).map((e, i) => `<div class="trow"><span class="nm">${i + 1}-urinish</span>${bar(e)}<span class="pc">${e}%</span></div>`).join('') : `<p class="mute">Hali sinov imtihoni topshirilmagan.</p>`}</div></div></div>
      ${s.me && Store.wrongIds().length ? `<div class="card mt"><div class="h-sec">Oxirgi xatolar</div>${Store.wrongIds().slice(-5).map(id => `<div class="trow" style="grid-template-columns:1fr"><span>${esc(BANK.byId[id].text)} <span class="mute">— ${esc(BANK.byId[id].topicName)}</span></span></div>`).join('')}</div>` : ''}${V.studentExtra ? V.studentExtra(s) : ''}`)
    };
  };
  V.shellTeacher = shell; V.fl = fl;
  function remindModal(id) {
    const s = ST.students().find(x => x.id === id); if (!s) return; const w = ST.weakTopics(s)[0], first = s.name.split(' ')[0];
    const text = s.lastActive >= 3 ? `Salom, ${first}! ${ago(s.lastActive).toLowerCase()} Chorraha ga kirmaganingizni ko'rdim. Imtihon yaqinlashmoqda, bugun 20 daqiqa mashq qilib ko'ring. Qiyinchilik bo'lsa, yozing.` : w ? `Salom, ${first}! «${w.t.name}» mavzusida natijangiz ${w.acc}%. Shu mavzuni qayta mashq qilib, keyin sinov imtihonini yechib ko'ring. Tushunmagan joyingiz bo'lsa, yozing.` : `Salom, ${first}! Natijalaringiz yaxshi. Davom eting va sinov imtihonlarini yechishni unutmang.`;
    modal(`<h3>Eslatma: ${esc(first)}</h3><p class="mute">Matnni tahrirlang, nusxalab Telegramda yuboring.</p><textarea class="input" id="rtext" style="min-height:150px">${esc(text)}</textarea><div class="ai-acts"><button class="btn primary" data-act="r-copy">${ico('copy')} Nusxalash</button><button class="btn soft" data-act="close">Yopish</button></div>${CFG.apiBase ? '' : `<p class="mute" style="font-size:13px;margin-top:14px">Server ulangach, eslatma talabaning Telegramiga avtomatik ketadi.</p>`}`);
  }

  /* ---------- Mavzular tahlili ---------- */
  V.topics = () => {
    const list = fl(), sm = ST.summary(list), sorted = sm.withR.slice().sort((a, b) => b.r - a.r);
    const cell = (a) => a == null ? `<div class="hc" style="background:rgba(255,255,255,.05);color:var(--mute2)">–</div>` : `<div class="hc" style="background:${a >= 85 ? 'rgba(52,211,153,.22)' : a >= 70 ? 'rgba(251,191,36,.22)' : 'rgba(255,92,112,.26)'};color:${a >= 85 ? '#6ff0bd' : a >= 70 ? '#fcd569' : '#ff9aa8'}">${a}</div>`;
    return {
      html: shell('tp', `<div class="page-h"><div><h1>Mavzular tahlili</h1><p>Qaysi mavzuda talabalarning necha foizi qiynalayotganini ko'ring.</p></div></div>${groupBar()}
      <div class="grid g4 keep2" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${sm.topics.map(t => `<div class="stat"><div class="lbl"><i class="dot" style="color:${t.t.hue}"></i> ${t.t.name}</div><div class="val mono" style="color:${t.pct >= 35 ? '#FF5C70' : t.pct >= 20 ? '#FBBF24' : '#34D399'}">${t.pct}<small>%</small></div><div class="sub">${t.weak} talaba qiynalmoqda · o'rtacha ${t.avg}%</div></div>`).join('')}</div>
      <div class="card mt scroll-x"><div class="h-sec">Talabalar × mavzular (to'g'ri javoblar, %)</div><div style="min-width:900px"><div class="heat" style="grid-template-columns:${COLS};margin-bottom:6px"><span></span>${SHORT.map(s => `<span class="mute" style="text-align:center;font-size:12.5px;font-weight:800">${s}</span>`).join('')}</div>
        ${sorted.map(({ s }) => `<a class="heat" href="#/panel/student/${s.id}" style="grid-template-columns:${COLS};margin-bottom:4px"><span class="nm" style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:14px;min-width:0">${ava(s.name, 28)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</span></span>${TOPICS.map(t => cell(ST.topicAcc(s, t.id))).join('')}</a>`).join('')}</div>
        <div style="display:flex;gap:18px;margin-top:16px;font-size:13px;color:var(--mute);flex-wrap:wrap"><span><i class="dot" style="color:#34D399"></i> 85% va yuqori</span><span><i class="dot" style="color:#FBBF24"></i> 70–84%</span><span><i class="dot" style="color:#FF5C70"></i> 70% dan past</span></div></div>`)
    };
  };

  /* ---------- Xabarlar ---------- */
  V.messages = () => {
    const l = inbox();
    return {
      html: shell('ms', `<div class="page-h"><div><h1>Xabarlar</h1><p>Talabalardan kelgan savollar. Har birida talabaning zaif mavzulari ko'rsatiladi.</p></div></div>
      <div class="stack s12">${l.map(m => `<div class="msg-item ${m.status === 'new' ? 'new' : ''}"><div class="row-between"><div style="display:flex;gap:12px;align-items:center">${ava(m.from, 38)}<div><b>${esc(m.from)}</b>${m.uid ? ` <a class="chip acc mono" href="#/panel/student/me">${esc(m.uid)}</a>` : ''}<div class="mute" style="font-size:13px">${ST.fmtAgo(Math.max(1, Math.round((Date.now() - m.ts) / 60000)))}</div></div></div><div style="display:flex;gap:8px"><span class="chip blue">${esc(m.topic)}</span><span class="chip ${m.status === 'new' ? 'acc' : 'ok'}">${m.status === 'new' ? 'Yangi' : 'Hal qilindi'}</span></div></div>
        <div>${esc(m.text)}</div><div class="ai-acts" style="margin-top:0">${m.status === 'new' ? `<button class="btn sm primary" data-act="m-reply" data-id="${m.id}">Javob yozish</button><button class="btn sm soft" data-act="m-done" data-id="${m.id}">Hal qilindi</button>` : ''}</div></div>`).join('')}</div>`)
    };
  };

  /* ---------- Guruhlar ---------- */
  V.groups = () => {
    const all = ST.students(), gs = Store.groups();
    return {
      html: shell('gr', `<div class="page-h"><div><h1>Guruhlar</h1><p>Har guruh uchun alohida havola. Talaba shu havola orqali ro'yxatdan o'tadi va o'z guruhida ko'rinadi.</p></div></div>
      <div class="grid g2"><div class="card"><div class="h-sec"><span>${ico('users')} Yangi guruh</span></div><div style="display:flex;gap:10px"><input class="input" id="gname" maxlength="40" placeholder="Masalan: 3-guruh (kechki)"><button class="btn primary" data-act="g-create">Yaratish</button></div><p class="mute" style="font-size:13.5px;margin-top:12px">Yaratilgach, guruh havolasi paydo bo'ladi. Uni Telegram guruhingizga tashlang.</p></div>
        <div class="card"><div class="h-sec"><span>${ico('send')} Sayt manzili</span></div><input class="input" id="siteurl" data-input="siteurl" value="${esc(base())}" placeholder="https://sizning-sayt.uz/"><p class="mute" style="font-size:13.5px;margin-top:12px">Havolalar shu manzildan quriladi. Ilovani joylagan haqiqiy manzilni yozing.</p></div></div>
      <div class="stack mt">${gs.map(g => {
        const m = all.filter(s => s.group === g.id), sm = ST.summary(m), n = m.length;
        return `<div class="card"><div class="row-between"><div style="display:flex;gap:14px;align-items:center">${ava(g.name, 46)}<div><b style="font-size:18px">${esc(g.name)}</b><div class="mute" style="font-size:13.5px">${n} ta talaba · kod: <b style="color:var(--text)">${esc(g.code)}</b>${g.demo ? ' · demo' : ''}</div></div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm primary" data-act="g-open" data-g="${esc(g.id)}">Talabalarni ko'rish</button>${g.demo ? '' : `<button class="btn sm soft" data-act="g-del" data-g="${esc(g.id)}">O'chirish</button>`}</div></div>
          ${n ? `<div class="grid g4 keep2" style="margin-top:16px;gap:12px"><div class="kpi"><small>Tayyor</small><b>${sm.ready}<small>/${n}</small></b></div><div class="kpi"><small>O'zlashtirish</small><b>${sm.mastery}<small>%</small></b></div><div class="kpi"><small>Bugun faol</small><b>${sm.activeToday}</b></div><div class="kpi"><small>Kirmayotgan</small><b>${sm.inactive.length}</b></div></div>` : `<p class="mute" style="margin-top:14px">Hali talaba qo'shilmagan. Havolani yuboring.</p>`}
          <div class="field"><label>Taklif havolasi</label><div class="glink"><input class="input" readonly value="${esc(linkOf(g))}" onclick="this.select()"><button class="btn sm primary" data-act="g-copy" data-g="${esc(g.id)}">${ico('copy')} Nusxalash</button></div></div></div>`; }).join('')}</div>
      ${all.filter(s => !s.group).length ? `<div class="banner mt">${ico('alert')}<span>${all.filter(s => !s.group).length} ta talaba hech qaysi guruhga biriktirilmagan.</span></div>` : ''}`)
    };
  };

  /* ---------- Faxriylar: hujjatni tekshirish (ustoz yoki admin) ---------- */
  V.honorReq = () => {
    const h = Store.s.honor, st = Store.s;
    const card = !h ? '' : `<div class="card"><div class="row-between"><div style="display:flex;gap:14px;align-items:center">${ava(st.name || 'Talaba', 46)}<div><b style="font-size:18px">${esc(st.name || 'Talaba')}</b><div class="mute" style="font-size:13.5px">${esc(ST.groupName(st.groupId))} · ${esc(st.region || 'viloyat tanlanmagan')} · ${(st.points || 0)} ball · reytingda ${V.rankOf ? V.rankOf('all', true) : '—'}-o'rin</div></div></div>
        <span class="chip ${h.status === 'pending' ? 'warn' : h.status === 'approved' ? 'ok' : 'bad'}">${h.status === 'pending' ? 'Tekshirilmoqda' : h.status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}</span></div>
        <img src="${h.img}" alt="Hujjat rasmi" style="width:100%;max-height:360px;object-fit:contain;border-radius:14px;margin-top:16px;background:#0006;cursor:zoom-in" data-act="honor-zoom">
        <p class="mute" style="font-size:13px;margin-top:8px">Yuborilgan: ${new Date(h.ts).toLocaleString('uz-UZ')}</p>
        ${h.status === 'pending' ? `<div class="ai-acts"><button class="btn primary" data-act="honor-ok">${ico('check')} Tasdiqlash — faxriylarga qo'shish</button><button class="btn soft" data-act="honor-no">Rad etish</button></div>` : h.status === 'approved' ? `<p style="margin-top:10px">Reytingdagi o'rni: <b>${h.rankAt}</b>. Talaba reytingdan chiqarilgan.</p>` : `<p style="margin-top:10px" class="mute">Sabab: ${esc(h.note || '—')}</p>`}</div>`;
    return { html: shell('hn', `<div class="page-h"><div><h1>Faxriylar</h1><p>Talabalar yuborgan «nazariy imtihondan o'tdim» hujjatlarini tekshiring. Tasdiqlangan talaba reytingdan chiqib, Faxriylar ro'yxatiga o'tadi.</p></div></div>
      <div class="banner mb">${ico('alert')}<span>Hujjatni diqqat bilan tekshiring: ism, sana va imtihon natijasi mos bo'lishi kerak. Rasm faqat ustoz va adminlarga ko'rinadi.</span></div>
      ${card || `<div class="card" style="text-align:center;padding:44px"><b>Hozircha so'rov yo'q</b><p class="mute" style="margin-top:8px">Talaba hujjat yuborganda shu yerda paydo bo'ladi.</p></div>`}`) };
  };
  V.acts = Object.assign(V.acts || {}, {
    'honor-zoom'() { modal(`<img src="${Store.s.honor.img}" alt="Hujjat" style="width:100%;border-radius:12px">`); },
    'honor-ok'() {
      const h = Store.s.honor; UI.confirmBox(`${Store.s.name} hujjatini tasdiqlaysizmi? U Faxriylarga o'tadi va reytingdan chiqadi.`, `Tasdiqlash`, () => {
        h.rankAt = V.rankOf ? V.rankOf('all', true) : 1; h.status = 'approved'; h.when = Date.now(); Store.notify(`Tabriklaymiz! Nazariy imtihondan o'tganingiz tasdiqlandi. Siz Faxriylar ro'yxatiga qo'shildingiz (reytingda ${h.rankAt}-o'rin). Kelgusida omad!`, 'bonus'); Store.save(); V.rerender();
      });
    },
    'honor-no'() {
      modal(`<h3>Rad etish sababi</h3><div class="field"><select id="hr" class="select"><option>Rasm aniq emas</option><option>Hujjat nazariy imtihonga tegishli emas</option><option>Ism mos kelmaydi</option><option>Hujjat shubhali</option></select></div><div class="ai-acts"><button class="btn primary" id="hrok">Rad etish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      document.getElementById('hrok').addEventListener('click', () => { const h = Store.s.honor; h.status = 'rejected'; h.note = document.getElementById('hr').value; Store.notify(`Hujjatingiz rad etildi: ${h.note}. Aniqroq rasm bilan qayta yuboring.`, 'penalty'); Store.save(); UI.closeModal(); V.rerender(); });
    },
    'g-sel'(el) { G.sel = el.dataset.g; V.rerender(); },
    'g-open'(el) { G.sel = el.dataset.g; location.hash = '#/panel/students'; },
    'g-create'() { const n = (document.getElementById('gname').value || '').trim(); if (n.length < 2) { toast(`Guruh nomini yozing`); return; } Store.addGroup(n); toast(`Guruh yaratildi`); V.rerender(); },
    'g-copy'(el) { const g = Store.groupById(el.dataset.g); if (g) copy(linkOf(g)).then(() => toast(`Havola nusxalandi. Talabalarga yuboring.`)); },
    'g-del'(el) { const g = Store.groupById(el.dataset.g); UI.confirmBox(`«${g.name}» guruhini o'chiramizmi? Talabalar guruhsiz qoladi.`, `O'chirish`, () => { Store.removeGroup(g.id); if (G.sel === g.id) G.sel = 'all'; V.rerender(); }); },
    't-f'(el) { T.f = el.dataset.f; $('#tf').innerHTML = filters(); $('#tb').innerHTML = rows(); },
    remind(el) { remindModal(el.dataset.id); },
    'r-copy'() { copy($('#rtext').value).then(() => toast(`Nusxalandi. Telegramda yuboring.`)); },
    'm-done'(el) { Store.s.msgDone = Store.s.msgDone || {}; Store.s.msgDone[el.dataset.id] = true; Store.save(); UI.closeModal(); V.rerender(); },
    'm-reply'(el) {
      const m = inbox().find(x => x.id === el.dataset.id); if (!m) return;
      modal(`<h3>Javob: ${esc(m.from)}</h3><p class="mute" style="margin-bottom:12px">«${esc(m.text)}»</p><textarea class="input" id="rtext" style="min-height:130px" placeholder="Javobingizni yozing…"></textarea><div class="ai-acts"><button class="btn primary" data-act="r-copy">${ico('copy')} Nusxalash</button><button class="btn soft" data-act="m-done" data-id="${m.id}">Hal qilindi deb belgilash</button></div>`);
    },
  });
  V.inputs = Object.assign(V.inputs || {}, { 't-q'(el) { T.q = el.value; $('#tb').innerHTML = rows(); }, siteurl(el) { Store.s.siteUrl = el.value.trim(); Store.save(); } });
})();





