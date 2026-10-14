/* Talaba ilovasi */
(function () {
  const { ico, esc, brand, gauge, bar, tone, ava, toast, modal, copy } = UI;
  const { Store, TOPICS } = ST;
  const CFG = window.YOLDOSH;
  const V = (window.V = window.V || {});
  const $ = (s) => document.querySelector(s);
  const S = (V.S = { quiz: null, result: null, chat: [], draft: null, prefill: null, stream: null, timer: null, signF: 'all', signQ: '' });
  const L = ['A', 'B', 'C', 'D'];

  /* ---------- qobiq ---------- */
  const NAV = [
    ['home', '#/app', 'home', `Bosh sahifa`], ['lessons', '#/app/lessons', 'book', `Darslik`], ['tests', '#/app/tests', 'list', `Testlar`], ['plan', '#/app/plan', 'calendar', `Imtihon rejasi`], ['rank', '#/app/rank', 'trend', `Reyting`],
    ['mistakes', '#/app/mistakes', 'redo', `Xato daftari`], ['battle', '#/app/battle', 'bolt', `Batl (do'st bilan)`], ['exam', '#/app/exam', 'flag', `Sinov imtihoni`], ['run', '#/app/run', 'flame', `Marafon`], ['similar', '#/app/similar', 'sparkles', `O'xshash savollar`], ['schools', '#/app/schools', 'flag', `Avtomaktablar`], ['schools-admin', '#/app/schools-admin', 'crown', `Avtomaktablar (admin)`], ['marathon', '#/app/marathon', 'calendar', `7 kunlik dastur`], ['drive', '#/app/drive', 'cone', `Simulyator`],
    ['signs', '#/app/signs', 'grid', `Belgilar`], ['scan', '#/app/scan', 'camera', `Kamera`], ['ai', '#/app/ai', 'sparkles', `AI yordamchi`], ['teacher', '#/app/teacher', 'send', `Ustoz bilan aloqa`], ['premium', '#/app/premium', 'crown', `Premium`], ['id', '#/app/id', 'star', `Mening ID`], ['bot', '#/app/bot', 'send', `Telegram bot`],
  ];
  function shell(active, inner) {
    if (Store.s.role === 'student') { Store.applyPenalties(); Store.reminder(); }
    if (Store.s.role === 'student' && Store.claimRefs) Store.claimRefs();
    const name = Store.s.name || 'Talaba', nm = Store.nbDue ? Store.nbDue().length : 0;
    const mob = ['home', 'tests', 'rank', 'lessons'];
    return `<div class="shell"><aside class="side">${brand()}
      ${NAV.filter(n => n[0] !== 'schools-admin' || (window.Cloud && Cloud.isAdmin)).map(n => `<a class="nav-i ${n[0] === active ? 'on' : ''}" href="${n[1]}">${ico(n[2])}<span>${n[3]}</span>${n[0] === 'mistakes' && nm ? `<span class="badge" style="background:var(--warn);color:#2a1d00">${nm}</span>` : ''}</a>`).join('')}
      <div class="sp"></div><div class="me">${ava(name)}<div style="min-width:0"><b>${esc(name)}</b><small>Talaba</small></div><button class="btn sm soft" data-act="logout" aria-label="Chiqish" style="padding:8px;min-height:34px;margin-left:auto">${ico('logout')}</button></div></aside>
      <main class="main">${inner}</main>
      ${V.bellFab ? V.bellFab() : ''}
      <nav class="tabbar" aria-label="Asosiy">${NAV.filter(n => mob.includes(n[0])).map(n => `<a class="${n[0] === active ? 'on' : ''}" href="${n[1]}">${ico(n[2])}<span>${n[3].replace(' yordamchi', '').replace('Bosh sahifa', 'Bosh').replace(" (do'st bilan)", '')}</span></a>`).join('')}<button data-act="more-nav">${ico('grid')}<span>Yana</span></button></nav></div>`;
  }
  V.shellStudent = shell;

  /* ---------- Bosh sahifa ---------- */
  V.home = () => {
    const st = Store.me(), r = ST.readiness(st), o = ST.overall(st), s = ST.status(r), weak = ST.weakTopics(st);
    const today = Math.round(Store.todaySec() / 60), streak = Store.streakDays(), wrong = Store.wrongIds().length;
    const first = !o.n;
    const msg = first ? `Hali test yechmadingiz. Birinchi testdan keyin tayyorlik darajangizni hisoblayman.` :
      r >= 85 ? `Ajoyib natija! Sinov imtihonida ham tasdiqlang.` : r >= 70 ? `Yaxshi ketyapsiz. Zaif mavzularni takrorlasangiz, imtihonga tayyor bo'lasiz.` : `Hali yo'lning boshida, bu normal. Har kuni 20–30 daqiqa mashq qiling.`;
    const next = first ? { t: `Birinchi testni boshlash`, k: 'mix' } : weak.length ? { t: `«${weak[0].t.name}» mashqi`, k: weak[0].t.id } : { t: `Aralash mashq`, k: 'mix' };
    return {
      html: shell('home', `
      <div class="page-h"><div><h1>Salom, ${esc((Store.s.name || 'do\'st').split(' ')[0])}!</h1><p>Bugun ham bir qadam oldinga. Yo'lda xavfsiz bo'ling.</p></div><span class="chip acc">${esc(CFG.school)}</span></div>
      <div class="hero-card"><div class="gauge">${gauge(r)}<div class="gv"><div><b>${r}%</b><span>tayyorlik</span></div></div></div>
        <div><span class="chip ${s.cls}"><i class="dot"></i> ${first ? 'Boshlanmagan' : s.label}</span><h2>Imtihonga tayyorlik</h2><p>${msg}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap"><button class="btn primary" data-act="start" data-key="${next.k}">${next.t} ${ico('arrow')}</button><a class="btn ghost" href="#/app/exam">Sinov imtihoni</a></div></div></div>
      ${V.homeRank ? V.homeRank() : ''}
      <div class="grid g4 keep2 mt">
        <div class="stat"><div class="lbl">${ico('clock')} Bugun</div><div class="val mono">${today}<small>daq</small></div><div class="sub">Maqsad: 30 daqiqa</div></div>
        <div class="stat"><div class="lbl">${ico('flame')} Ketma-ket</div><div class="val mono">${streak}<small>kun</small></div><div class="sub">Har kuni kamida 1 daqiqa</div></div>
        <div class="stat"><div class="lbl">${ico('target')} Aniqlik</div><div class="val mono">${o.n ? Math.round(o.acc) : 0}<small>%</small></div><div class="sub">${o.n} ta javob asosida</div></div>
        <div class="stat"><div class="lbl">${ico('book')} Ko'rilgan savol</div><div class="val mono">${st.seen}<small>/${ST.total}</small></div><div class="sub">Bazadagi savollardan</div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="h-sec"><span>Mavzular bo'yicha o'zlashtirish</span><a class="mute" href="#/app/tests" style="font-size:14px">Barchasi →</a></div>
          ${TOPICS.map(t => { const a = ST.topicAcc(st, t.id); return `<div class="trow"><span class="nm"><i class="dot" style="color:${t.hue}"></i><span>${t.name}</span></span>${a == null ? `<div class="bar"></div><span class="pc mute">–</span>` : `${bar(a)}<span class="pc">${a}%</span>`}</div>`; }).join('')}</div>
        <div class="stack">
          <div class="card"><div class="ai-h">${ico('sparkles')} Chorraha tavsiyasi</div>
            ${first ? `<p>Boshlash uchun «Testlar» bo'limidan istalgan mavzuni tanlang. 10 savoldan keyin men zaif tomonlaringizni aniqlayman.</p>` :
          weak.length ? `<p>Eng ko'p xato: <b>${weak[0].t.name}</b> (${weak[0].acc}%). Shu mavzuni 10 ta savol bilan takrorlang, keyin «Xatolar ustida ishlash» bo'limiga o'ting.</p>` : `<p>Zaif mavzu topilmadi. Endi sinov imtihonlarini yechib, natijani mustahkamlang.</p>`}
            <div class="ai-acts"><a class="btn sm soft" href="#/app/ai">AI dan so'rash</a><a class="btn sm soft" href="#/app/teacher">Ustozga yozish</a></div></div>
          <div class="grid g2 keep2">
            <a class="card feat" href="#/app/lessons" style="padding:20px"><div class="ic" style="width:42px;height:42px;margin-bottom:12px">${ico('book')}</div><b>Darslik</b><p style="font-size:14px;color:var(--mute)">Mavzular, belgilar, video</p></a>
            <a class="card feat" href="#/app/battle" style="padding:20px"><div class="ic" style="width:42px;height:42px;margin-bottom:12px">${ico('bolt')}</div><b>Batl</b><p style="font-size:14px;color:var(--mute)">Do'st bilan musobaqa</p></a>
            <a class="card feat" href="#/app/mistakes" style="padding:20px"><div class="ic" style="width:42px;height:42px;margin-bottom:12px">${ico('redo')}</div><b>Xatolar</b><p style="font-size:14px;color:var(--mute)">${wrong} ta savol takrorlashni kutmoqda</p></a>
            <a class="card feat" href="#/app/scan" style="padding:20px"><div class="ic" style="width:42px;height:42px;margin-bottom:12px">${ico('camera')}</div><b>Belgini aniqlash</b><p style="font-size:14px;color:var(--mute)">Kamera bilan suratga oling</p></a>
          </div></div></div>`)
    };
  };

  /* ---------- Testlar ---------- */
  V.tests = () => {
    const st = Store.topicStats();
    return {
      html: shell('tests', `<div class="page-h"><div><h1>Testlar</h1><p>Mavzuni tanlang. Har bir javobdan keyin AI tushuntirishi chiqadi.</p></div></div>
      <div class="grid g3">
        <button class="topic-card" data-act="start" data-key="mix" style="--tc:var(--acc)"><div class="top"><span class="tdot" style="background:var(--acc)">${ico('bolt')}</span><span class="chip acc">10 savol</span></div><h3>Aralash mashq</h3><small>Hamma mavzulardan tasodifiy savollar</small></button>
        <button class="topic-card" data-act="start" data-key="hard" style="--tc:var(--bad)"><div class="top"><span class="tdot" style="background:var(--bad)">${ico('flame')}</span><span class="chip bad">${BANK.Q.filter(q => q.level === 3).length} savol</span></div><h3>Qiyin savollar</h3><small>O'xshash belgilar, murakkab holatlar</small></button>
        ${TOPICS.map(t => { const n = BANK.Q.filter(q => q.topic === t.id).length, s = st[t.id], a = s.n ? Math.round(s.ok / s.n * 100) : null; return `<button class="topic-card" data-act="start" data-key="${t.id}" style="--tc:${t.hue}"><div class="top"><span class="tdot" style="background:${t.hue}">${ico('book')}</span><span class="chip">${n} savol</span></div><h3>${t.name}</h3>${a == null ? `<small>Hali boshlanmagan</small>` : `<div>${bar(a)}</div><small>${a}% to'g'ri · ${s.n} ta javob</small>`}</button>`; }).join('')}
      </div>`)
    };
  };

  /* ---------- Test jarayoni ---------- */
  function build(key) {
    if (V.buildHook) { const hk = V.buildHook(key); if (hk) return hk; }
    const seed = (Date.now() & 0xffffff) + 7;
    let list;
    if (key === 'mix') { const by = TOPICS.map(t => BANK.shuffle(BANK.Q.filter(q => q.topic === t.id), seed + t.id.length)); list = []; for (let i = 0; i < 3 && list.length < 10; i++) by.forEach(a => { if (a[i] && list.length < 10) list.push(a[i]); }); list = BANK.shuffle(list, seed + 5); }
    else if (key === 'mistakes') list = BANK.shuffle(Store.wrongIds().map(id => BANK.byId[id]), seed).slice(0, 15);
    else if (key === 'hard') { const by = TOPICS.map(t => BANK.shuffle(BANK.Q.filter(q => q.topic === t.id && q.level === 3), seed + t.id.length)); list = []; for (let i = 0; i < 3 && list.length < 10; i++) by.forEach(a => { if (a[i] && list.length < 10) list.push(a[i]); }); list = BANK.shuffle(list, seed + 9); }
    else if (key === 'exam') {
      const by = TOPICS.map(t => BANK.shuffle(BANK.Q.filter(q => q.topic === t.id && q.level >= 2), seed + t.id.length)); list = [];
      for (let i = 0; list.length < CFG.examQuestions && i < 12; i++) by.forEach(a => { if (a[i] && list.length < CFG.examQuestions) list.push(a[i]); });
      list = BANK.shuffle(list, seed + 3);
    } else list = BANK.shuffle(BANK.Q.filter(q => q.topic === key), seed).slice(0, 10);
    const exam = key === 'exam';
    return { key, mode: exam ? 'exam' : 'practice', list, i: 0, picks: [], revealed: false, simple: false, start: Date.now(), endAt: exam ? Date.now() + CFG.examMinutes * 60000 : 0, done: false };
  }
  const title = (k) => k === 'mix' ? `Aralash mashq` : k === 'hard' ? `Qiyin savollar` : k === 'mistakes' ? `Xatolar ustida ishlash` : k === 'exam' ? `Sinov imtihoni` : (BANK.topicById[k] || {}).name || 'Test';

  /* ---------- rasm / animatsiyali sxema ---------- */
  function qMedia(q) { return BANK.media(q); }
  function hydrateScene(root) {
    const z = S.quiz; if (!z || !window.Scenes) return; const q = z.list[z.i]; if (!Scenes.has(q) || z.stageOpen !== q.id) return;
    Scenes.hydrate(root, q, { revealed: z.revealed && z.mode !== 'exam', pick: z.picks[z.i] });
  }
  /* ---------- o'xshash savollar ---------- */
  const toks = (q) => new Set((q.text + ' ' + q.options.map(o => o.label).join(' ')).toLowerCase().replace(/[^a-zа-яё'ʻ’0-9 ]/g, ' ').split(/s+/).filter(w => w.length > 3));
  const tokCache = new Map(); const tk = (q) => { let s = tokCache.get(q.id); if (!s) { s = toks(q); tokCache.set(q.id, s); } return s; };
  BANK.similar = (q, n = 3) => {
    const a = tk(q); const out = [];
    for (const o of BANK.Q) {
      if (o.id === q.id) continue; const b = tk(o); let inter = 0; for (const w of a) if (b.has(w)) inter++;
      let sc = inter / (a.size + b.size - inter || 1); if (o.topic === q.topic) sc += 0.08; if ((o.kind === 'sign') !== (q.kind === 'sign')) sc -= 0.1;
      if (sc > 0.16) out.push([sc, o]);
    }
    return out.sort((x, y) => y[0] - x[0]).slice(0, n).map(x => x[1]);
  };
  V.simHtml = (q) => simHtml(q);
  function simHtml(q) {
    const list = BANK.similar(q, 3); if (!list.length) return '';
    return `<div class="sim"><div class="sim-h">${ico('sparkles')} <b>O'xshash savollar</b><small>Shu mavzuni mustahkamlang</small></div>${list.map(o => `<div class="sim-q" data-qid="${o.id}"><button class="sim-t" data-act="sim-open" data-id="${o.id}"><span>${esc(o.text)}</span>${ico('arrow')}</button><div class="sim-o" hidden>${o.options.map((x, i) => `<button class="sim-opt" data-act="sim-pick" data-id="${o.id}" data-i="${i}"><span class="k">${'ABCDEF'[i]}</span>${esc(x.label)}</button>`).join('')}</div></div>`).join('')}</div>`;
  }
  function qInner() {
    const z = S.quiz, q = z.list[z.i], pick = z.picks[z.i], exam = z.mode === 'exam', pro = z.mode === 'pro', rev = z.revealed;
    const imgs = q.kind === 'pick';
    const opts = q.options.map((o, k) => {
      let cls = 'opt';
      if (rev) cls += k === q.answer ? ' good' : k === pick ? ' bad' : ''; else if (pick === k) cls += pro ? ' good' : ' pick';
      const inner = imgs ? `<span class="k">${L[k]}</span>${SIGNS.svg(o.img, 'Variant ' + L[k])}` : `<span class="k">${L[k]}</span><span>${esc(o.label)}</span>`;
      return `<button class="${cls}" data-act="pick" data-i="${k}" ${rev ? 'disabled' : ''}>${inner}</button>`;
    }).join('');
    let ai = '';
    if (rev) {
      const ok = pick === q.answer;
      ai = V.explain(q, pick, ok) + (ok ? '' : `<div class="ai-acts" style="margin-top:10px"><button class="btn sm soft" data-act="to-teacher">${ico('send')} Ustozga yuborish</button></div>`);
    }
    const hasMedia = !imgs && !!(q.img || (window.Scenes && Scenes.has(q)) || q.kind === 'sign' || q.sceneSvg || q.scene || q.tl);
    let streak = 0; for (let j = z.i - (rev ? 0 : 1); j >= 0; j--) { if (z.picks[j] != null && z.picks[j] === z.list[j].answer) streak++; else break; }
    const last = z.i === z.list.length - 1;
    const foot = pro ? `<div class="q-foot"><span class="mute" style="align-self:center">Bitta xato — yutqazish. Shoshiling, vaqt kam.</span></div>` : exam
      ? `<div class="q-foot"><button class="btn ghost" data-act="prev" ${z.i === 0 ? 'disabled' : ''}>← Oldingi</button>${last ? `<button class="btn primary" data-act="finish">Yakunlash</button>` : `<button class="btn primary" data-act="next">Keyingi ${ico('arrow')}</button>`}</div>`
      : `<div class="q-foot"><span class="mute" style="align-self:center">${rev ? '' : 'Javobni tanlang'}</span>${rev ? `<button class="btn primary" data-act="${last ? 'finish' : 'next'}">${last ? 'Natijani ko\'rish' : 'Keyingi'} ${ico('arrow')}</button>` : ''}</div>`;
    return `<div class="q-top"><div class="prog"><div class="mute" style="font-size:13px;font-weight:700;margin-bottom:6px">${z.title || title(z.key)} · ${z.i + 1}/${z.list.length}</div>${bar((z.i + (rev ? 1 : 0)) / z.list.length * 100, 'var(--acc)')}</div>${streak >= 2 && !exam ? `<span class="q-streak">🔥 <b>${streak}</b> ketma-ket</span>` : ''}${z.endAt ? `<span class="q-timer" id="qt">--:--</span>` : ''}<button class="btn sm ghost" data-act="quit" aria-label="Chiqish">${ico('x')}</button></div>
      ${exam && z.list.length > 1 ? `<div class="qnav" role="navigation" aria-label="Savollar">${z.list.map((_, i) => `<button class="${i === z.i ? 'cur' : ''} ${z.picks[i] != null ? 'ans' : ''}" data-act="jump" data-i="${i}">${i + 1}</button>`).join('')}</div>` : ''}
      <div class="q-card ${hasMedia ? 'has-media' : ''}">${rev && !exam && pick === q.answer ? `<span class="plus1">+1 ball</span>` : ''}<div style="margin-bottom:16px"><span class="chip">${esc(q.topicName)}</span><span class="chip lvl ${q.level === 3 ? 'bad' : q.level === 2 ? 'warn' : 'ok'}">${BANK.LEVEL[q.level]}</span><button class="bm-b ${(Store.s.saved || []).includes(q.id) ? 'on' : ''}" data-act="save-q" data-id="${q.id}" aria-label="Saqlash">${ico('bookmark')}</button></div><h2>${esc(q.text)}</h2>${qMedia(q)}<div class="opts ${imgs ? 'imgs' : ''}">${opts}</div>${ai}${rev && V.chapterRef ? V.chapterRef(q) : ''}${foot}</div>`;
  }
  const qRender = () => { const r = $('#qroot'); if (r) { r.innerHTML = qInner(); hydrateScene(r); } if (S.quiz && S.quiz.endAt) tickTimer(); };
  function tickTimer() {
    const el = $('#qt'); if (!el || !S.quiz) return;
    const left = Math.max(0, Math.round((S.quiz.endAt - Date.now()) / 1000));
    el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; el.classList.toggle('low', left < 60); el.classList.toggle('warn', left >= 60 && left < 300);
    const z = S.quiz; z.warn = z.warn || {};
    if (z.mode === 'exam') { if (left <= 300 && left > 290 && !z.warn[5]) { z.warn[5] = 1; toast(`5 daqiqa qoldi`); } if (left <= 60 && left > 50 && !z.warn[1]) { z.warn[1] = 1; toast(`1 daqiqa qoldi!`); } }
    if (left <= 0) finish();
  }
  V.qRender = () => qRender();
  V.quiz = (key) => {
    if (!S.quiz || S.quiz.key !== key || S.quiz.done) {
      if (key === 'exam') return { redirect: '#/app/exam' };
      if (key === 'mistakes' && !Store.wrongIds().length) { toast(`Xato savollar yo'q, barakalla!`); return { redirect: '#/app/tests' }; }
      S.quiz = build(key);
    }
    return {
      html: shell(key === 'exam' ? 'exam' : key === 'mistakes' ? 'mistakes' : key.startsWith('b:') ? 'battle' : 'tests', `<div class="quiz" id="qroot">${qInner()}</div>`),
      mount() { if (S.quiz.endAt) { tickTimer(); S.timer = setInterval(tickTimer, 1000); } hydrateScene($('#qroot')); window.scrollTo(0, 0); },
    };
  };
  function finish() {
    const z = S.quiz; if (!z || z.done) return; z.done = true; clearInterval(S.timer);
    const mistakes = [], byTopic = {}; let correct = 0;
    z.list.forEach((q, i) => {
      const p = z.picks[i];
      if (z.mode === 'exam') Store.record(q, p == null ? -1 : p, 'exam');
      const ok = p === q.answer; byTopic[q.topic] = byTopic[q.topic] || { n: 0, ok: 0 }; byTopic[q.topic].n++; if (ok) { correct++; byTopic[q.topic].ok++; } else if (z.mode !== 'pro' || p != null) mistakes.push({ q, chosen: p });
    });
    const sec = Math.round((Date.now() - z.start) / 1000), total = z.list.length, pct = Math.round(correct / total * 100);
    if (z.mode === 'exam') Store.addExam(correct, total, sec, byTopic);
    S.result = { key: z.key, title: z.title, mode: z.mode, total, correct, pct, mistakes, byTopic, sec, pass: pct >= CFG.passPercent, timedOut: !!(z.endAt && Date.now() >= z.endAt) };
    if (V.onFinish) V.onFinish(z, S.result);
    location.hash = '#/app/result';
  }

  V.exam = () => ({
    html: shell('exam', `<div class="page-h"><div><h1>Sinov imtihoni</h1><p>Haqiqiy imtihonga o'xshash tajriba.</p></div></div>
      <div class="hero-card" style="grid-template-columns:1fr"><div><span class="chip acc">${ico('flag')} Imtihon rejimi</span><h2>${CFG.examQuestions} savol · ${CFG.examMinutes} daqiqa</h2>
      <p>O'tish chegarasi: ${CFG.passPercent}%. Imtihon vaqtida to'g'ri-noto'g'ri javob ko'rsatilmaydi; tushuntirishlar natija sahifasida chiqadi. Natijangiz ustozingizga ham ko'rinadi.</p>
      <div class="chip" style="margin-bottom:22px">Savollar barcha mavzulardan teng olinadi</div><br><button class="btn primary lg" data-act="start" data-key="exam">Imtihonni boshlash ${ico('arrow')}</button></div></div>
      ${Store.s.exams.length ? `<div class="card mt"><div class="h-sec">Oldingi urinishlar</div>${Store.s.exams.slice(-5).reverse().map(e => { const p = Math.round(e.score / e.total * 100); return `<div class="trow"><span class="nm">${new Date(e.ts).toLocaleDateString('uz-UZ')} · ${e.score}/${e.total}</span>${bar(p)}<span class="pc">${p}%</span></div>`; }).join('')}</div>` : ''}`)
  });

  V.result = () => {
    const R = S.result; if (!R) return { redirect: '#/app/tests' };
    const good = (R.mode === 'exam' || R.mode === 'pro') ? R.pass : R.pct >= 70, col = good ? 'rgba(52,211,153,.2)' : 'rgba(255,92,112,.18)';
    const label = R.mode === 'pro' ? (R.pass ? `Test Pro: g'alaba!` : R.pro && R.pro.cheat ? `Sahifadan chiqdingiz — hisoblanmadi` : R.timedOut ? `Vaqt tugadi` : `Yutqazdingiz: bitta xato`) : R.mode === 'exam' ? (R.pass ? `Imtihondan o'tdingiz!` : `Bu safar o'tolmadingiz`) : R.pct >= 90 ? `Zo'r natija!` : R.pct >= 70 ? `Yaxshi!` : `Mashqni davom ettiramiz`;
    return {
      html: shell('tests', `<div class="quiz" style="max-width:900px">
      <div class="res-hero" style="--rc:${col}"><span class="chip ${good ? 'ok' : 'bad'}">${R.title || title(R.key)}</span><div class="big" style="color:${tone(R.pct)};margin:16px 0 6px">${R.pct}%</div><h2 style="margin-bottom:8px">${label}</h2><p class="mute">${R.correct} / ${R.total} to'g'ri · ${Math.floor(R.sec / 60)} daq ${R.sec % 60} son</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px"><button class="btn primary" data-act="start" data-key="${R.key === 'mistakes' && !Store.wrongIds().length ? 'mix' : R.key}">Qayta urinish</button>${R.mistakes.length ? `<button class="btn ghost" data-act="start" data-key="mistakes">Xatolarni takrorlash</button>` : ''}<a class="btn ghost" href="#/app">Bosh sahifa</a></div></div>
      ${V.resultExtra ? V.resultExtra(R) : ''}
      <div class="card mt"><div class="h-sec">Mavzular bo'yicha</div>${Object.keys(R.byTopic).map(id => { const b = R.byTopic[id], p = Math.round(b.ok / b.n * 100); return `<div class="trow"><span class="nm"><i class="dot" style="color:${BANK.topicById[id].hue}"></i><span>${BANK.topicById[id].name}</span></span>${bar(p)}<span class="pc">${b.ok}/${b.n}</span></div>`; }).join('')}</div>
      ${R.mistakes.length ? `<div class="h-sec mt"><span>Xatolar va AI tushuntirishlari (${R.mistakes.length})</span></div><div class="stack s12">${R.mistakes.map(m => mistakeCard(m.q, m.chosen)).join('')}</div>` : `<div class="card mt" style="text-align:center">${ico('check')} Xato yo'q. Barakalla!</div>`}</div>`)
    };
  };
  function mistakeCard(q, chosen) {
    const e = AI.explainWrong(q, chosen != null && chosen >= 0 ? chosen : -1);
    return `<div class="mi"><div class="mm">${BANK.media(q)}</div><div><h4>${esc(q.text)}</h4><p style="color:var(--ok);font-weight:700;margin-bottom:6px">${esc(e.title)}</p><p>${esc(e.body)}</p>${chosen != null && chosen >= 0 ? `<p style="margin-top:6px;color:var(--bad)">Siz tanlagan: ${esc(q.options[chosen].label)}</p>` : `<p style="margin-top:6px;color:var(--bad)">Javob berilmagan</p>`}${q.tip ? `<p style="margin-top:6px"><b>Eslab qoling:</b> ${esc(q.tip)}</p>` : ''}</div></div>`;
  }

  V.mistakes = () => {
    const ids = Store.wrongIds();
    return {
      html: shell('mistakes', `<div class="page-h"><div><h1>Xatolar ustida ishlash</h1><p>So'nggi urinishda adashgan savollaringiz.</p></div>${ids.length ? `<button class="btn primary" data-act="start" data-key="mistakes">Takrorlashni boshlash ${ico('arrow')}</button>` : ''}</div>
      ${ids.length ? `<div class="stack s12">${ids.slice(-30).reverse().map(id => { const q = BANK.byId[id], h = [...Store.s.history].reverse().find(x => x.q === id); return mistakeCard(q, h ? h.c : null); }).join('')}</div>` : `<div class="card" style="text-align:center;padding:48px"><div class="chip ok" style="margin-bottom:14px">${ico('check')}</div><h3>Hozircha xato yo'q</h3><p class="mute" style="margin-top:8px">Test yeching — adashgan savollar shu yerda paydo bo'ladi.</p><a class="btn primary" style="margin-top:20px" href="#/app/tests">Testlarga o'tish</a></div>`}`)
    };
  };

  /* ---------- Belgilar ---------- */
  const signGrid = () => {
    const q = S.signQ.trim().toLowerCase().replace(/[ʻʼ`‘’]/g, "'");
    const l = SIGNS.list.filter(s => (S.signF === 'all' || s.topic === S.signF) && (!q || (s.name + ' ' + s.desc).toLowerCase().replace(/[ʻʼ`‘’]/g, "'").includes(q)));
    return l.length ? l.map(s => `<button class="sign-card" data-act="sign-open" data-id="${s.id}">${SIGNS.svg(s.id)}<b>${esc(s.name)}</b></button>`).join('') : `<p class="mute">Hech narsa topilmadi.</p>`;
  };
  V.signs = () => ({
    html: shell('signs', `<div class="page-h"><div><h1>Yo'l belgilari</h1><p>${SIGNS.list.length} ta belgi. Bosib, to'liq tushuntirishni ko'ring.</p></div></div>
      <div class="filters"><div class="search">${ico('search')}<input class="input" placeholder="Belgini qidiring…" data-input="sign-q" value="${esc(S.signQ)}" aria-label="Qidiruv"></div>
      <div id="sfilters" style="display:contents">${signFilters()}</div></div>
      <div class="grid g4 keep2" id="sgrid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${signGrid()}</div>`)
  });
  const signFilters = () => [['all', 'Hammasi'], ...TOPICS.filter(t => SIGNS.list.some(s => s.topic === t.id)).map(t => [t.id, t.name.replace(' belgilari', '').replace(' belgilar', '')])].map(f => `<button class="pill ${S.signF === f[0] ? 'on' : ''}" data-act="sign-f" data-f="${f[0]}">${f[1]}</button>`).join('');
  function signModal(id) {
    const s = SIGNS.byId[id]; if (!s) return;
    modal(`<div class="msign">${SIGNS.svg(id)}</div><span class="chip blue" style="margin-bottom:12px">${BANK.topicById[s.topic].name}</span><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><div class="ai-box" style="margin-top:0"><div class="ai-h">${ico('sparkles')} Eslab qolish usuli</div><div class="tip">${esc(s.tip)}</div></div>
      <div class="ai-acts"><button class="btn sm primary" data-act="ask-sign" data-id="${id}">AI dan batafsil so'rash</button><button class="btn sm soft" data-act="close">Yopish</button></div>`);
  }

  /* ---------- Kamera ---------- */
  V.scan = () => ({
    html: shell('scan', `<div class="page-h"><div><h1>Belgini aniqlash</h1><p>Ko'chada ko'rgan belgingizni suratga oling yoki rasm yuklang.</p></div></div>
      <div class="scan-grid"><div class="stack">
        <div class="viewer" id="viewer"><video id="cv" playsinline muted style="display:none"></video><canvas id="cc" style="display:none"></canvas>
          <div class="hint" id="chint">${ico('camera')}<b style="color:var(--text);display:block;margin-bottom:6px">Kamerani yoqing</b>Belgini ramka ichiga joylang va suratga oling. Rasm qurilmangizdan tashqariga chiqmaydi.</div><div class="frame" id="cframe" style="display:none"><i></i><i></i><i></i><i></i></div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-act="cam-start" id="bstart">${ico('camera')} Kamerani yoqish</button><button class="btn primary" data-act="cam-shot" id="bshot" style="display:none">Suratga olish</button>
          <label class="btn ghost" style="cursor:pointer">${ico('upload')} Rasm yuklash<input type="file" accept="image/*" capture="environment" data-input="scan-file" class="sr"></label></div></div>
        <div id="scanres"><div class="card"><div class="ai-h">${ico('sparkles')} Natija</div><p class="mute">Rasm olingach, taxminiy belgilar shu yerda chiqadi. Keyin kerakli belgini tanlab, to'liq tushuntirishni olasiz.</p></div></div></div>`),
    unmount: stopCam,
  });
  function stopCam() { if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; } }
  async function camStart() {
    const hint = $('#chint');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { hint.innerHTML = `${ico('alert')}Bu qurilma yoki sahifa kamerani qo'llab-quvvatlamaydi. «Rasm yuklash» tugmasidan foydalaning.`; return; }
    try {
      S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const v = $('#cv'); v.srcObject = S.stream; v.style.display = 'block'; await v.play();
      hint.style.display = 'none'; $('#cframe').style.display = 'block'; $('#bshot').style.display = ''; $('#bstart').style.display = 'none'; $('#cc').style.display = 'none';
    } catch (e) { hint.innerHTML = `${ico('alert')}Kameraga ruxsat berilmadi yoki kamera topilmadi. Brauzer sozlamalaridan ruxsat bering yoki «Rasm yuklash» dan foydalaning.`; }
  }
  function camShot() { const v = $('#cv'); if (!v || !v.videoWidth) return; const c = $('#cc'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); c.style.display = 'block'; v.style.display = 'none'; analyze(c); }
  function fromFile(file) {
    if (!file) return; const img = new Image(); img.onload = () => {
      const c = $('#cc'), sc = Math.min(1, 900 / Math.max(img.width, img.height)); c.width = img.width * sc; c.height = img.height * sc; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      stopCam(); $('#cv').style.display = 'none'; c.style.display = 'block'; $('#chint').style.display = 'none'; $('#cframe').style.display = 'none'; $('#bshot').style.display = 'none'; $('#bstart').style.display = ''; URL.revokeObjectURL(img.src); analyze(c);
    }; img.src = URL.createObjectURL(file);
  }
  async function analyze(canvas) {
    const box = $('#scanres'); box.innerHTML = `<div class="card"><div class="ai-h">${ico('sparkles')} Tahlil qilinmoqda…</div><div class="typing"><i></i><i></i><i></i></div></div>`;
    // 1) Backend (haqiqiy AI ko'rish) ulangan bo'lsa
    const base = (CFG.apiBase || '').replace(/\/$/, '');
    if (base) {
      try {
        const t = document.createElement('canvas'), sc = Math.min(1, 800 / Math.max(canvas.width, canvas.height)); t.width = canvas.width * sc; t.height = canvas.height * sc; t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
        const r = await fetch(base + '/vision', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: t.toDataURL('image/jpeg', .75) }) });
        if (r.ok) { const j = await r.json(); const s = SIGNS.byId[j.signId]; box.innerHTML = `<div class="card"><div class="ai-h">${ico('sparkles')} AI aniqladi</div>${s ? `<button class="cand" data-act="sign-open" data-id="${s.id}">${SIGNS.svg(s.id)}<span><b>${esc(s.name)}</b><small>Bosib to'liq ko'ring</small></span></button>` : ''}<p style="margin-top:12px;white-space:pre-line">${esc(j.text || '')}</p></div>`; return; }
      } catch (e) { /* demo tahlilga o'tamiz */ }
    }
    // 2) Demo: markaziy qismdagi ranglar bo'yicha taxmin
    const w = 64, c = document.createElement('canvas'); c.width = c.height = w; const x = c.getContext('2d');
    const side = Math.min(canvas.width, canvas.height) * .6; x.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, w, w);
    const d = x.getImageData(0, 0, w, w).data; let red = 0, blue = 0, yel = 0, wh = 0; const N = w * w;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (r > 140 && r > g * 1.6 && r > b * 1.6) red++; else if (b > 110 && b > r * 1.5 && b > g * 1.12) blue++; else if (r > 170 && g > 140 && b < 110) yel++; else if (r > 200 && g > 200 && b > 200) wh++; }
    const fr = red / N, fb = blue / N, fy = yel / N, fw = wh / N;
    let topics, why;
    if (fb > .16) { topics = ['mandatory', 'info']; why = `Ko'k rang ustun — buyuruvchi yoki axborot-ishora belgisi bo'lishi mumkin.`; }
    else if (fy > .12) { topics = ['priority', 'warning']; why = `Sariq rang ko'p — imtiyozli belgi (asosiy yo'l) bo'lishi mumkin.`; }
    else if (fr > .07) { topics = ['prohibitory', 'warning', 'priority']; why = `Qizil rang ustun — taqiqlovchi, ogohlantiruvchi yoki STOP / «Yo'l bering» bo'lishi mumkin.`; }
    else { topics = ['warning', 'prohibitory', 'mandatory', 'info', 'priority']; why = `Aniq rang ustunligi topilmadi. Rasm yaqinroq va yorug'roq bo'lsa, natija yaxshiroq bo'ladi.`; }
    const cands = topics.flatMap(t => SIGNS.list.filter(s => s.topic === t)).slice(0, 6);
    box.innerHTML = `<div class="card"><div class="ai-h">${ico('sparkles')} Taxminiy natija</div><p>${why}</p><div class="stack s12">${cands.map(s => `<button class="cand" data-act="sign-open" data-id="${s.id}">${SIGNS.svg(s.id)}<span><b>${esc(s.name)}</b><small>Bosib to'liq tushuntirishni ko'ring</small></span></button>`).join('')}</div>
      <div class="banner" style="margin-top:16px">${ico('alert')}<span>Demo rejimda belgi faqat ranglar bo'yicha taxmin qilinadi. Backend ulanganda sun'iy intellekt belgini aniq tanib, to'liq tushuntiradi.</span></div></div>`;
  }

  /* ---------- AI chat ---------- */
  const botHtml = (m) => `<div class="msg bot">${m.sign ? `<div class="ms">${SIGNS.svg(m.sign)}</div>` : ''}${esc(m.text)}${(m.action || m.askTeacher || m.followup) ? `<div class="acts">${m.action ? `<a class="btn sm primary" href="${m.action.go}">${esc(m.action.label)}</a>` : ''}${m.followup ? `<button class="btn sm soft" data-act="chat-simple">Oddiyroq tushuntir</button>` : ''}${m.askTeacher ? `<button class="btn sm soft" data-act="chat-teacher">${ico('send')} Ustozga yuborish</button>` : ''}</div>` : ''}</div>`;
  const msgsHtml = () => S.chat.map(m => m.me ? `<div class="msg me">${esc(m.text)}</div>` : botHtml(m)).join('') + (S.typing ? `<div class="msg bot typing"><i></i><i></i><i></i></div>` : '');
  function chatPaint() { const b = $('#msgs'); if (b) { b.innerHTML = msgsHtml(); b.scrollTop = b.scrollHeight; } }
  async function chatSend(text) {
    text = (text || '').trim(); if (!text) return;
    S.chat.push({ me: true, text }); S.last = text; S.typing = true; chatPaint();
    const a = await AI.ask(text); S.typing = false; S.chat.push(a); chatPaint();
  }
  V.ai = () => {
    if (!S.chat.length) S.chat.push({ text: `Salom, ${(Store.s.name || 'do\'st').split(' ')[0]}! Men Chorraha. Yo'l belgilari va qoidalar bo'yicha istalgan savolingizga javob beraman. Nimadan boshlaymiz?` });
    return {
      html: shell('ai', `<div class="page-h"><div><h1>AI yordamchi</h1><p>Tushunmagan joyingizni so'rang. Men oddiy tilda tushuntiraman.</p></div></div>
      <div class="chat"><div class="msgs" id="msgs">${msgsHtml()}</div>
        <div class="quick">${[`Qaysi mavzuda zaifman?`, `STOP bilan «Yo'l bering» farqi nima?`, `To'xtash va turish farqi`, `Aylanma yo'lda kim ustun?`, `Belgilarni qanday eslab qolaman?`, `Imtihonga tayyormanmi?`].map(q => `<button class="pill" data-act="chat-q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <form class="chat-in" data-form="chat"><input class="input" id="ci" placeholder="Savolingizni yozing…" autocomplete="off" aria-label="Xabar"><button class="btn primary" type="submit" aria-label="Yuborish">${ico('send')}</button></form></div>`),
      mount() { chatPaint(); if (S.prefill) { const p = S.prefill; S.prefill = null; chatSend(p); } },
    };
  };

  /* ---------- Ustoz bilan aloqa ---------- */
  function ctxText(topicName, text) {
    const st = Store.me(), r = ST.readiness(st), weak = ST.weakTopics(st).slice(0, 3).map(w => `${w.t.name} (${w.acc}%)`).join(', ') || `aniqlanmagan`;
    return `Chorraha — talabadan xabar\nTalaba: ${Store.s.name || 'Talaba'}\nID: ${Store.myUid()}\nMavzu: ${topicName}\nImtihonga tayyorlik: ${r}%\nZaif mavzular: ${weak}\n\nXabar: ${text}`;
  }
  V.teacher = () => {
    const st = Store.me(), weak = ST.weakTopics(st), d = S.draft || {}; S.draft = null;
    const topic = d.topic || (weak[0] ? weak[0].t.name : TOPICS[0].name);
    const msgs = Store.s.messages.slice().reverse();
    return {
      html: shell('teacher', `<div class="page-h"><div><h1>Ustoz bilan aloqa</h1><p>${esc(CFG.teacher.name)}ga yozing. Xabar Telegramga tushadi, siz haqingizdagi ma'lumot bilan birga.</p></div></div>
      <div class="grid g2"><div class="card"><div class="field" style="margin-top:0"><label for="tt">Qaysi mavzuda qiynalyapsiz?</label><select id="tt" class="select">${TOPICS.map(t => `<option ${t.name === topic ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
        <div class="field"><label for="tm">Xabaringiz</label><textarea id="tm" class="input" placeholder="Masalan: «Turish taqiqlanadi» va «To'xtash taqiqlanadi» farqini tushunmadim…">${esc(d.text || '')}</textarea></div>
        <p class="mute" style="font-size:13.5px;margin:12px 0">Avtomatik qo'shiladi: tayyorlik darajangiz (${ST.readiness(st)}%) va zaif mavzularingiz.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-act="t-send">${ico('send')} Ustozga yuborish</button><button class="btn ghost" data-act="t-tg">Telegramda ochish</button></div></div>
        <div class="stack"><div class="card"><div class="ai-h">${ico('send')} Qanday ishlaydi</div><p>1. Xabarni yozasiz.<br>2. Tizim uni ustozning panelida va Telegramida ko'rsatadi.<br>3. Ustoz sizga shaxsiy javob beradi.</p>
        ${CFG.apiBase ? '' : `<div class="banner" style="margin-top:12px">${ico('alert')}<span>Demo rejim: xabar ustoz paneliga tushadi. Telegramga avtomatik yuborish serverni ulagandan keyin ishlaydi. Hozircha «Telegramda ochish» tugmasi xabarni nusxalab, ustoz chatini ochadi.</span></div>`}</div>
        <div class="card"><div class="h-sec">Yuborilgan xabarlar</div>${msgs.length ? msgs.slice(0, 5).map(m => `<div class="msg-item" style="margin-bottom:10px"><div class="row-between"><span class="chip">${esc(m.topic)}</span><span class="mute" style="font-size:13px">${ST.fmtAgo(Math.max(1, Math.round((Date.now() - m.ts) / 60000)))}</span></div><div>${esc(m.text)}</div></div>`).join('') : `<p class="mute">Hali xabar yuborilmagan.</p>`}</div></div></div>`)
    };
  };
  function tSend(openTg) {
    const text = ($('#tm').value || '').trim(), topic = $('#tt').value;
    if (!text) { toast(`Avval xabarni yozing`); return; }
    const full = ctxText(topic, text);
    if (openTg) { copy(full).then(() => toast(`Xabar nusxalandi. Telegramda yopishtiring.`)); window.open(`https://t.me/${CFG.teacher.telegram}`, '_blank', 'noopener'); return; }
    const st = Store.me();
    Store.s.messages.push({ id: 'u' + Date.now(), ts: Date.now(), from: Store.s.name || 'Talaba', uid: Store.myUid(), topic, text, readiness: ST.readiness(st), status: 'new' }); Store.save();
    const base = (CFG.apiBase || '').replace(/\/$/, ''); if (base) fetch(base + '/telegram', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: full }) }).catch(() => { });
    toast(`Xabar ustozga yuborildi`); $('#tm').value = ''; V.rerender();
  }

  /* ---------- amallar ---------- */
  V.acts = Object.assign(V.acts || {}, {
    'stage-open'() { const z = S.quiz; if (!z) return; z.stageOpen = z.list[z.i].id; qRender(); const s = document.querySelector('.stage'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    'stage-replay'() { const z = S.quiz, r = $('#qroot'); if (!z || !r) return; Scenes.replay(r, z.list[z.i], { revealed: z.revealed && z.mode !== 'exam', pick: z.picks[z.i] }); },
    'sim-open'(el) { const c = el.closest('.sim-q'); const o = c.querySelector('.sim-o'); o.hidden = !o.hidden; c.classList.toggle('open', !o.hidden); },
    'sim-pick'(el) {
      const q = BANK.byId[el.dataset.id], i = +el.dataset.i, box = el.closest('.sim-o'); if (!q || box.dataset.done) return; box.dataset.done = 1;
      Store.record(q, i, 'similar');
      box.querySelectorAll('.sim-opt').forEach((b, k) => { b.disabled = true; if (k === q.answer) b.classList.add('good'); else if (k === i) b.classList.add('bad'); });
      if (i === q.answer) V.toastOk && V.toastOk(); 
    },
    start(el) { S.quiz = build(el.dataset.key); const h = '#/app/quiz/' + el.dataset.key; if (location.hash === h) V.rerender(); else location.hash = h; },
    pick(el) {
      const z = S.quiz, q = z.list[z.i], k = +el.dataset.i;
      if (z.mode === 'pro') {                                    // Test Pro: bitta xato — yutqazish, javob darhol tekshiriladi, tushuntirishsiz
        if (z.picks[z.i] != null || z.lock) return; z.picks[z.i] = k; Store.record(q, k, 'pro');
        if (k !== q.answer) { z.failed = true; finish(); return; }
        if (z.i === z.list.length - 1) { qRender(); finish(); return; }
        z.lock = true; qRender(); setTimeout(() => { z.lock = false; if (S.quiz === z && !z.done) { z.i++; qRender(); } }, 260); return;
      }
      if (z.mode === 'exam') { z.picks[z.i] = k; qRender(); return; }
      if (z.revealed) return; z.picks[z.i] = k; z.revealed = true; Store.record(q, k, 'practice'); qRender();
      if (k === q.answer && z.i < z.list.length - 1) {            // to'g'ri javob: avtomatik keyingi savolga o'tadi
        const at = z.i; clearTimeout(S.autoT); S.autoT = setTimeout(() => { if (S.quiz === z && !z.done && z.i === at && z.revealed) V.acts.next(); }, 750); return;
      }
      const b = document.querySelector('.q-foot'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    next() { clearTimeout(S.autoT); const z = S.quiz, go = () => { z.i++; z.revealed = false; z.simple = false; qRender(); window.scrollTo({ top: 0, behavior: 'smooth' }); }; if (z.mode === 'exam' && z.picks[z.i] == null) UI.confirmBox(`Bu savolga javob bermadingiz. Davom etamizmi?`, `Davom etish`, go); else go(); },
    prev() { const z = S.quiz; if (z.i > 0) { z.i--; qRender(); } },
    finish() { const z = S.quiz; if (z.mode === 'exam') { const un = z.list.filter((_, i) => z.picks[i] == null).length; if (un) { UI.confirmBox(`${un} ta savolga javob bermadingiz. Yakunlaymizmi?`, `Yakunlash`, finish); return; } } finish(); },
    quit() { UI.confirmBox(`Testni to'xtatamizmi? Natija saqlanmaydi.`, `To'xtatish`, () => { clearInterval(S.timer); if (S.quiz) S.quiz.done = true; location.hash = '#/app/tests'; }); },
    simplify() { S.quiz.simple = true; qRender(); },
    'to-teacher'() { const z = S.quiz, q = z.list[z.i]; S.draft = { topic: q.topicName, text: `«${q.text}» savolida adashdim. To'g'ri javobni tushunmadim, yordam bera olasizmi?` }; location.hash = '#/app/teacher'; },
    'sign-f'(el) { S.signF = el.dataset.f; $('#sfilters').innerHTML = signFilters(); $('#sgrid').innerHTML = signGrid(); },
    'sign-open'(el) { signModal(el.dataset.id); },
    'ask-sign'(el) { UI.closeModal(); S.prefill = SIGNS.byId[el.dataset.id].name + ` belgisini batafsil tushuntir`; location.hash = '#/app/ai'; },
    'cam-start': camStart, 'cam-shot': camShot,
    'chat-q'(el) { chatSend(el.dataset.q); },
    'chat-simple'() { const last = S.chat.filter(m => !m.me).pop(); if (last) { S.chat.push({ me: true, text: `Oddiyroq tushuntir` }); S.chat.push({ text: `Mayli, qisqa qilib:\n${(last.text.split('\n\n')[1] || last.text).split('.')[0]}.\n\nAsosiy g'oya: belgining shakli va rangiga qarang — ular ma'nosini yarmini aytib turadi. Qizil — ehtiyot yoki taqiq, ko'k — buyruq yoki ma'lumot.` }); chatPaint(); } },
    'chat-teacher'() { S.draft = { topic: TOPICS[6].name, text: S.last || '' }; location.hash = '#/app/teacher'; },
    't-send'() { tSend(false); }, 't-tg'() { tSend(true); },
  });
  V.inputs = Object.assign(V.inputs || {}, {
    'sign-q'(el) { S.signQ = el.value; $('#sgrid').innerHTML = signGrid(); },
    'scan-file'(el) { fromFile(el.files && el.files[0]); },
  });
  V.forms = Object.assign(V.forms || {}, { chat() { const i = $('#ci'); const t = i.value; i.value = ''; chatSend(t); } });
})();







