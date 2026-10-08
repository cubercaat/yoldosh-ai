/* Testlar markazi (sozlanadigan test, to'plamlar), Batl (do'st bilan musobaqa) va Darslik.
   Test dvijogi views-student.js da; bu fayl uni V.buildHook / V.onFinish / V.resultExtra orqali kengaytiradi. */
(function () {
  const { ico, esc, bar, tone, toast, modal, copy } = UI;
  const { Store, TOPICS } = ST;
  const V = (window.V = window.V || {}), S = V.S, CFG = window.YOLDOSH, shell = (a, h) => V.shellStudent(a, h);
  const $ = (s) => document.querySelector(s);
  const SEC_PER_Q = Math.round(CFG.examMinutes * 60 / CFG.examQuestions);          // imtihon bilan bir xil: savol uchun 75 soniya
  const T = (V.T = { count: 20, src: 'mix', mode: 'practice', timed: false, packSize: 20 });
  const topicName = (id) => id === 'mix' ? `Aralash` : id === 'hard' ? `Qiyin savollar` : id === 'mistakes' ? `Xatolarim` : (BANK.topicById[id] || {}).name || id;
  const fmtT = (s) => `${Math.floor(s / 60)} daq${s % 60 ? ' ' + (s % 60) + ' son' : ''}`;
  const init = () => { const s = Store.s; s.sets = s.sets || {}; s.battles = s.battles || {}; s.lessons = s.lessons || {}; };

  /* ---------- savol tanlash ---------- */
  function balanced(filter, seed, n) {
    const by = TOPICS.map(t => BANK.shuffle(BANK.Q.filter(q => q.topic === t.id && filter(q)), seed + BANK.hash(t.id)));
    const out = []; for (let i = 0; out.length < n && i < 600; i++) by.forEach(a => { if (a[i] && out.length < n) out.push(a[i]); });
    return BANK.shuffle(out, seed + 11);
  }
  function pickList(src, n, seed) {
    if (src === 'mix') return balanced(() => true, seed, n);
    if (src === 'hard') return balanced(q => q.level === 3, seed, n);
    if (src === 'mistakes') return BANK.shuffle(Store.wrongIds().map(id => BANK.byId[id]), seed).slice(0, n);
    return BANK.shuffle(BANK.Q.filter(q => q.topic === src), seed).slice(0, n);
  }
  const available = (src) => src === 'mix' ? BANK.Q.length : src === 'hard' ? BANK.Q.filter(q => q.level === 3).length : src === 'mistakes' ? Store.wrongIds().length : BANK.Q.filter(q => q.topic === src).length;
  function packs(src, size) {
    if (src === 'mix') return 6;
    const n = available(src); let c = Math.ceil(n / size); if (c > 1 && n - (c - 1) * size < Math.min(5, size / 2)) c--; return Math.max(1, c);
  }
  function packList(src, size, idx) {
    if (src === 'mix') return balanced(() => true, BANK.hash(`mixpack${size}-${idx}`), size);
    const all = BANK.shuffle(BANK.Q.filter(q => q.topic === src), BANK.hash('pack' + src)), c = packs(src, size);
    return idx === c - 1 ? all.slice(idx * size) : all.slice(idx * size, (idx + 1) * size);
  }
  function mk(key, title, list, { mode = 'practice', secs = 0, setKey = null } = {}) {
    return { key, title, mode, list, i: 0, picks: [], revealed: false, simple: false, start: Date.now(), endAt: secs ? Date.now() + secs * 1000 : 0, done: false, setKey };
  }
  const randSeed = () => Math.random().toString(36).slice(2, 7).toUpperCase();

  /* kalit turlari: custom | p:<src>:<size>:<idx> | b:<seed>:<count>:<src>:<mins>:<bankN> */
  V.buildHook = (key) => {
    if (key === 'custom') {
      const list = pickList(T.src, T.count, (Date.now() & 0xffffff) + 3);
      return mk(key, `${topicName(T.src)} · ${list.length} savol`, list, { mode: T.mode, secs: T.timed ? list.length * SEC_PER_Q : 0 });
    }
    if (key.startsWith('p:')) {
      const [, src, size, idx] = key.split(':'); const list = packList(src, +size, +idx);
      return mk(key, `${topicName(src)} · ${+idx + 1}-to'plam`, list, { mode: T.mode, secs: T.timed ? list.length * SEC_PER_Q : 0, setKey: key });
    }
    if (key.startsWith('b:')) {
      const [, seed, count, src, mins] = key.split(':'); const list = pickList(src, +count, BANK.hash(seed));
      return mk(key, `Batl · ${topicName(src)} · ${list.length} savol`, list, { mode: 'exam', secs: +mins ? +mins * 60 : 0 });
    }
    return null;
  };

  /* ---------- natija yozish: to'plam rekordlari va batl ---------- */
  const codeOf = (key) => { const [, seed, count, src, mins, n] = key.split(':'); return `YB-${seed}-${count}-${src}-${mins}-${n || BANK.Q.length}`; };
  V.onFinish = (z, R) => {
    init();
    if (z.setKey) { const old = Store.s.sets[z.setKey]; if (!old || R.pct > old.pct) Store.s.sets[z.setKey] = { pct: R.pct, ts: Date.now() }; Store.save(); }
    if (z.key.startsWith('b:')) {
      const code = z.key.replace(/^b:([^:]+):(\d+):([^:]+):(\d+).*$/, (m, a, b, c, d) => `YB-${a}-${b}-${c}-${d}-${BANK.Q.length}`);
      const name = (S.bp || ((Store.s.name || 'Siz').slice(0, 20) + ' [' + Store.myUid() + ']')).slice(0, 30); S.bp = null;
      const L = (Store.s.battles[code] = Store.s.battles[code] || []);
      L.push({ name, score: R.correct, total: R.total, sec: R.sec, ts: Date.now() }); Store.save(); R.battleCode = code; R.battleName = name;
    }
  };
  const rank = (L) => L.slice().sort((a, b) => b.score - a.score || a.sec - b.sec);
  const resCode = (code, r) => `YR-${code.slice(3)}~${String(r.name).replace(/[~|]/g, '')}~${r.score}~${r.sec}`;
  function parseRes(s) {
    const m = /^YR-([A-Z0-9]+-\d+-[a-z]+-\d+-\d+)~([^~]{1,30})~(\d+)~(\d+)$/.exec(String(s).trim()); if (!m) return null;
    return { code: 'YB-' + m[1], r: { name: m[2], score: +m[3], total: +m[1].split('-')[1], sec: +m[4], ts: Date.now(), remote: true } };
  }
  V.resultExtra = (R) => {
    init();
    let h = R.timedOut ? `<div class="banner mt" style="margin-top:16px">${ico('clock')}<span>Vaqt tugadi: javob berilmagan savollar xato hisoblandi.</span></div>` : '';
    if (!R.battleCode) return h;
    const L = rank(Store.s.battles[R.battleCode] || []), me = L.find(x => x.ts && x.name === R.battleName && !x.remote);
    h += `<div class="card mt"><div class="ai-h">${ico('bolt')} Batl natijalari</div><p class="mute" style="margin-bottom:10px">Kod: <b style="color:var(--text)">${esc(R.battleCode)}</b> · g'olib: ko'p to'g'ri javob, teng bo'lsa — tezroq.</p>
      ${L.map((x, i) => `<div class="trow" style="grid-template-columns:34px minmax(0,1.4fr) 1fr 90px"><b>${i === 0 ? '🏆' : i + 1}</b><span class="nm"><span>${esc(x.name)}${x.remote ? ' <span class="chip">kod orqali</span>' : ''}</span></span>${bar(Math.round(x.score / x.total * 100))}<span class="pc">${x.score}/${x.total} · ${fmtT(x.sec)}</span></div>`).join('')}
      <div class="ai-acts"><button class="btn sm primary" data-act="b-hot" data-code="${esc(R.battleCode)}">${ico('users')} Do'stim ham shu qurilmada yechadi</button><button class="btn sm soft" data-act="b-copyres" data-code="${esc(R.battleCode)}">${ico('copy')} Natija kodini nusxalash</button></div>
      <div class="field"><label for="bres">Do'stingizning natija kodini qo'shing</label><div style="display:flex;gap:8px"><input class="input" id="bres" placeholder="YR-…"><button class="btn soft" data-act="b-addres">Qo'shish</button></div></div></div>`;
    return h;
  };

  /* ---------- Testlar markazi ---------- */
  const chips = (k, arr, cur, fmt = (v) => v) => arr.map(v => `<button class="pill ${String(cur) === String(v) ? 'on' : ''}" data-act="cfg" data-k="${k}" data-v="${v}">${fmt(v)}</button>`).join('');
  function packRow(src) {
    const c = packs(src, T.packSize), size = T.packSize;
    return Array.from({ length: c }, (_, i) => { const key = `p:${src}:${size}:${i}`, b = Store.s.sets[key]; return `<button class="pk ${b ? 'done' : ''}" data-act="play-pack" data-key="${key}" style="--pk:${b ? tone(b.pct) : 'rgba(255,255,255,.18)'}" title="${b ? 'Eng yaxshi: ' + b.pct + '%' : 'Hali yechilmagan'}">${i + 1}${b ? `<small>${b.pct}%</small>` : ''}</button>`; }).join('');
  }
  /* ---------- Testlar: oddiy, yirik, ikonkali ---------- */
  const topicIcon = (id) => ({ warning: SIGNS.svg('w_danger'), priority: SIGNS.svg('p_main'), prohibitory: SIGNS.svg('b_noentry'), mandatory: SIGNS.svg('m_straight'), info: SIGNS.svg('i_park'), signals: SIGNS.tl('red'), cross: SIGNS.svg('p_stop'), rules: ico('shield'), marks: ico('list') })[id] || ico('book');
  const bigChips = (k, arr, cur, fmt) => arr.map(v => `<button class="bigp ${String(cur) === String(v) ? 'on' : ''}" data-act="cfg" data-k="${k}" data-v="${v}">${fmt(v)}</button>`).join('');
  const back = () => `<button class="back-b" data-act="tv" data-v="home">${ico('arrow', 'flip')} Orqaga</button>`;
  V.tests = () => {
    init(); const view = T.view || 'home', st = Store.topicStats(), wrong = available('mistakes');
    let body = '';
    if (view === 'home') {
      body = `<div class="page-h"><div><h1>Test yechish</h1><p>Nimadan boshlaymiz? Birini bosing.</p></div></div>
        <div class="tiles">
          <button class="tile t-acc" data-act="quick"><span class="t-ic">${ico('bolt')}</span><b>Tez test</b><small>10 ta savol, hamma mavzudan</small></button>
          <button class="tile" data-act="tv" data-v="topics"><span class="t-ic">${ico('book')}</span><b>Mavzu tanlash</b><small>Bitta mavzuni o'rganish</small></button>
          <a class="tile" href="#/app/exam"><span class="t-ic">${ico('flag')}</span><b>Imtihon</b><small>${CFG.examQuestions} ta savol, ${CFG.examMinutes} daqiqa</small></a>
          <button class="tile ${wrong ? '' : 'dim'}" data-act="play-q" data-src="mistakes"><span class="t-ic">${ico('redo')}</span><b>Xatolarim</b><small>${wrong ? wrong + ' ta savol takrorlash kerak' : 'Hozircha xato yo\'q'}</small></button>
        <a class="tile pro-t" href="#/app/pro"><span class="t-ic">${ico('flame')}</span><span><b>Test Pro</b><small>Eng qiyin savollar. Bitta xato — yutqazish. Galichka va Master olish</small></span></a>
        </div>
        <div class="more-l"><button data-act="tv" data-v="custom">${ico('target')}<span>Savollar sonini va vaqtni o'zim tanlayman</span></button><button data-act="tv" data-v="packs">${ico('list')}<span>Tayyor to'plamlar (10, 20, 50, 100 talik)</span></button></div>`;
    } else if (view === 'topics') {
      body = `${back()}<div class="page-h"><div><h1>Mavzuni tanlang</h1><p>Bosing — 10 ta savol boshlanadi.</p></div></div>
        <div class="trows">${TOPICS.map(t => { const s = st[t.id], a = s.n ? Math.round(s.ok / s.n * 100) : null; return `<button class="trw" data-act="topic-go" data-src="${t.id}"><span class="tr-ic" style="--c:${t.hue}">${topicIcon(t.id)}</span><span class="tr-t"><b>${esc(t.name)}</b><small>${available(t.id)} ta savol${a == null ? ' · hali yechilmagan' : ' · ' + a + '% to\'g\'ri'}</small>${a == null ? '' : bar(a)}</span>${ico('arrow')}</button>`; }).join('')}</div>`;
    } else if (view === 'custom') {
      const n = Math.min(T.count, available(T.src)), secs = n * SEC_PER_Q;
      body = `${back()}<div class="page-h"><div><h1>O'zim tanlayman</h1><p>Uchta oddiy qadam.</p></div></div>
        <div class="steps-s">
          <div class="stp"><div class="stp-h"><i>1</i><b>Qaysi savollar?</b></div><select class="select big" data-input="cfg-src" aria-label="Qaysi savollar">${['mix', ...TOPICS.map(t => t.id), 'hard', 'mistakes'].map(id => `<option value="${id}" ${T.src === id ? 'selected' : ''}>${esc(topicName(id))}${id === 'mix' ? ' (hamma mavzu)' : ''} — ${available(id)} ta</option>`).join('')}</select></div>
          <div class="stp"><div class="stp-h"><i>2</i><b>Nechta savol?</b></div><div class="cfg-row">${bigChips('count', [10, 20, 50, 100], T.count, v => v)}</div></div>
          <div class="stp"><div class="stp-h"><i>3</i><b>Vaqt kerakmi?</b></div><div class="cfg-row">${bigChips('timed', ['false', 'true'], String(T.timed), v => v === 'false' ? 'Yo\'q, shoshilmayman' : 'Ha · ' + fmtT(secs))}</div></div>
          <div class="stp"><div class="stp-h"><i>4</i><b>Javoblar qachon ko'rinsin?</b></div><div class="cfg-row">${bigChips('mode', ['practice', 'exam'], T.mode, v => v === 'practice' ? 'Har savoldan keyin' : 'Oxirida (imtihondek)')}</div></div>
        </div>
        <button class="go-b" data-act="play">${ico('play')} Boshlash · ${n} ta savol</button>`;
    } else {
      body = `${back()}<div class="page-h"><div><h1>Tayyor to'plamlar</h1><p>Har to'plam doim bir xil savollardan iborat. Raqamni bosing. Rangli raqam — yechilgan, ostida natija.</p></div></div>
        <div class="cfg-row" style="margin-bottom:6px"><span class="mute" style="font-weight:700">Nechtalik:</span>${bigChips('packSize', [10, 20, 50, 100], T.packSize, v => v)}</div>
        <div class="card" style="margin-top:14px">
        <div class="pk-sec"><div class="pk-h"><span class="tr-ic" style="--c:var(--acc)">${ico('bolt')}</span><b>Aralash (hamma mavzu)</b></div><div class="pk-row">${packRow('mix')}</div></div>
        ${TOPICS.map(t => `<div class="pk-sec"><div class="pk-h"><span class="tr-ic" style="--c:${t.hue}">${topicIcon(t.id)}</span><b>${esc(t.name)}</b></div><div class="pk-row">${packRow(t.id)}</div></div>`).join('')}</div>`;
    }
    return { html: shell('tests', body) };
  };
  window.addEventListener('hashchange', () => { if (location.hash === '#/app/tests') T.view = 'home'; });
  const ensure = () => (V.rerender && V.rerender());

  /* ---------- Batl ---------- */
  const B = { count: 20, src: 'mix', mins: 25, code: null };
  const keyOf = (code) => { const p = String(code).trim().split('-'); if (p.length !== 6 || p[0].toUpperCase() !== 'YB') return null; const src = p[3].toLowerCase(); if (!(src === 'mix' || src === 'hard' || BANK.topicById[src]) || !/^[A-Za-z0-9]{3,8}$/.test(p[1]) || !(+p[2] > 0 && +p[2] <= 100)) return null; return { seed: p[1].toUpperCase(), count: +p[2], src, mins: +p[4] || 0, n: +p[5] || BANK.Q.length }; };
  function mkCode() { return `YB-${randSeed()}-${B.count}-${B.src}-${B.mins}-${BANK.Q.length}`; }
  V.battle = () => {
    init();
    const hist = Object.entries(Store.s.battles).sort((a, b) => Math.max(...b[1].map(x => x.ts || 0)) - Math.max(...a[1].map(x => x.ts || 0))).slice(0, 5);
    return {
      html: shell('battle', `<div class="page-h"><div><h1>Batl: do'st bilan musobaqa</h1><p>Bir xil savollar, bir xil vaqt. Kim ko'p to'g'ri javob bersa va tezroq bo'lsa — yutadi.</p></div></div>
      <div class="banner mb">${ico('alert')}<span>Hozircha batl kod orqali o'tadi: kodni do'stingizga yuborasiz, ikkingiz ham bir xil savollarni yechasiz va natija kodlarini almashasiz. Real vaqtli onlayn batl uchun server kerak (keyingi bosqich).</span></div>
      <div class="grid g2">
        <div class="card"><div class="h-sec">1. Batl yaratish</div>
          <div class="stack s12"><div><div class="mute cfg-l">Savollar</div><div class="cfg-row">${[10, 20, 50].map(v => `<button class="pill ${B.count === v ? 'on' : ''}" data-act="bcfg" data-k="count" data-v="${v}">${v} ta</button>`).join('')}</div></div>
          <div><div class="mute cfg-l">Mavzu</div><select class="select" data-input="bsrc" aria-label="Mavzu">${['mix', ...TOPICS.map(t => t.id), 'hard'].map(id => `<option value="${id}" ${B.src === id ? 'selected' : ''}>${esc(topicName(id))}</option>`).join('')}</select></div>
          <div><div class="mute cfg-l">Vaqt</div><div class="cfg-row">${[0, 10, 15, 25, 40, 60].map(v => `<button class="pill ${B.mins === v ? 'on' : ''}" data-act="bcfg" data-k="mins" data-v="${v}">${v ? v + ' daq' : 'Vaqtsiz'}</button>`).join('')}</div></div></div>
          <button class="btn primary" style="margin-top:18px" data-act="b-create">${ico('bolt')} Kod yaratish</button>
          ${B.code ? `<div class="ai-box"><div class="ai-h">Batl kodi</div><p style="font-size:22px;font-weight:800;letter-spacing:.02em;word-break:break-all">${esc(B.code)}</p><div class="ai-acts"><button class="btn sm primary" data-act="b-start" data-code="${esc(B.code)}">Men boshlayman</button><button class="btn sm soft" data-act="b-copy">${ico('copy')} Nusxalash</button></div><p class="mute" style="font-size:13px;margin-top:10px">Do'stingizga yuboring: u «Kod bilan qo'shilish» ga yozadi.</p></div>` : ''}</div>
        <div class="stack"><div class="card"><div class="h-sec">2. Kod bilan qo'shilish</div><div style="display:flex;gap:8px"><input class="input" id="bjoin" placeholder="YB-XXXXX-20-mix-25-630" autocomplete="off"><button class="btn primary" data-act="b-join">Qo'shilish</button></div></div>
          <div class="card"><div class="h-sec">3. Natijalarni solishtirish</div><p class="mute" style="font-size:14px;margin-bottom:10px">Do'stingiz yuborgan natija kodini (YR-…) kiriting.</p><div style="display:flex;gap:8px"><input class="input" id="bres" placeholder="YR-…"><button class="btn soft" data-act="b-addres">Qo'shish</button></div></div></div></div>
      ${hist.length ? `<div class="h-sec mt">Oxirgi batllar</div><div class="stack s12">${hist.map(([code, L]) => `<div class="card" style="padding:18px"><div class="row-between"><b>${esc(code)}</b><button class="btn sm soft" data-act="b-start" data-code="${esc(code)}">Qayta yechish</button></div>${rank(L).map((x, i) => `<div class="trow" style="grid-template-columns:34px minmax(0,1.4fr) 110px"><b>${i === 0 ? '🏆' : i + 1}</b><span class="nm"><span>${esc(x.name)}</span></span><span class="pc">${x.score}/${x.total} · ${fmtT(x.sec)}</span></div>`).join('')}</div>`).join('')}</div>` : ''}`)
    };
  };
  const startBattle = (code) => { const k = keyOf(code); if (!k) { toast(`Kod noto'g'ri. Namuna: YB-XXXXX-20-mix-25-630`); return; } if (k.n !== BANK.Q.length) { toast(`Savollar bazasi versiyasi farq qiladi: savollar mos kelmasligi mumkin`); }
    V.acts.start({ dataset: { key: `b:${k.seed}:${k.count}:${k.src}:${k.mins}:${k.n}` } }); };

  /* ---------- Darslik ---------- */
  V.lessons = () => {
    init();
    const done = Object.keys(Store.s.lessons).filter(k => Store.s.lessons[k]).length;
    return {
      html: shell('lessons', `<div class="page-h"><div><h1>Darslik</h1><p>Mavzular bo'yicha qisqa darslar, belgilar va rasmiy matnga havola.</p></div><span class="chip acc">${done}/${LESSONS.list.length} o'qilgan</span></div>
      <div class="card hero-card" style="grid-template-columns:1fr;margin-bottom:22px"><div><span class="chip blue">${ico('book')} Rasmiy manba</span><h2 style="font-size:22px">Yo'l harakati qoidalari — to'liq matn</h2><p>Darslikdagi matnlar o'quv maqsadida soddalashtirilgan. Aniq va yakuniy matn — rasmiy hujjatda.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn primary" href="${LESSONS.OFFICIAL.url}" target="_blank" rel="noopener noreferrer">Rasmiy matnni ochish (lex.uz)</a></div></div></div>
      <div class="grid g3">${LESSONS.list.map((l, i) => { const t = BANK.topicById[l.id], ok = Store.s.lessons[l.id], b = Store.s.sets[`p:${l.id}:10:0`]; return `<a class="topic-card" href="#/app/lesson/${l.id}" style="--tc:${t.hue}"><div class="top"><span class="tdot" style="background:${t.hue}">${ok ? ico('check') : i + 1}</span><span class="chip">${l.min} daq</span></div><h3>${esc(t.name)}</h3><small>${ok ? 'O\'qilgan' : 'Hali o\'qilmagan'}${b ? ' · test ' + b.pct + '%' : ''}</small></a>`; }).join('')}</div>`)
    };
  };
  V.lesson = (id) => {
    init();
    const l = LESSONS.byId[id]; if (!l) return { redirect: '#/app/lessons' };
    const t = BANK.topicById[id], signs = SIGNS.list.filter(s => s.topic === id), idx = LESSONS.list.indexOf(l), next = LESSONS.list[idx + 1], ok = Store.s.lessons[id];
    return {
      html: shell('lessons', `<div class="page-h"><div><a class="mute" href="#/app/lessons" style="font-size:14px">← Darslik</a><h1 style="margin-top:6px">${esc(t.name)}</h1><p>${idx + 1}-dars · ${l.min} daqiqa</p></div><button class="btn ${ok ? 'soft' : 'primary'}" data-act="lesson-read" data-id="${id}">${ico('check')} ${ok ? 'O\'qilgan' : 'O\'qidim'}</button></div>
      <div class="card"><p style="font-size:17px;line-height:1.65">${esc(l.intro)}</p></div>
      <div class="stack mt">${l.sections.map(s => `<div class="card"><div class="h-sec">${esc(s.h)}</div><ul class="l-list" style="margin-top:0;gap:11px">${s.items.map(x => `<li>${ico('check')}<span>${esc(x)}</span></li>`).join('')}</ul></div>`).join('')}</div>
      ${signs.length ? `<div class="h-sec mt">Shu mavzudagi belgilar (${signs.length})</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${signs.map(s => `<button class="sign-card" data-act="sign-open" data-id="${s.id}">${SIGNS.svg(s.id)}<b>${esc(s.name)}</b></button>`).join('')}</div>` : ''}
      <div class="ai-box"><div class="ai-h">${ico('sparkles')} Eslab qoling</div>${l.tips.map(x => `<div class="tip" style="margin-bottom:8px">${esc(x)}</div>`).join('')}</div>
      <div class="card mt"><div class="h-sec">${ico('book')} Rasmiy manba</div><a class="cand" href="${LESSONS.OFFICIAL.url}" target="_blank" rel="noopener noreferrer"><span class="tdot" style="background:rgba(77,141,255,.2);color:#8db4ff;width:46px;height:46px;border-radius:14px;flex:none">${ico('book')}</span><span><b>${esc(LESSONS.OFFICIAL.name)}</b><small>Aniq va yakuniy matn</small></span></a></div>
      <div class="hero-card mt" style="grid-template-columns:1fr;padding:24px"><div><h2 style="font-size:22px">Bilimingizni sinang</h2><p>Shu mavzu bo'yicha 10 talik to'plam. Natija darslik ro'yxatida ko'rinadi.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-act="play-pack" data-key="p:${id}:10:0">10 ta savol${T.timed ? ' (vaqtli)' : ''} ${ico('arrow')}</button><a class="btn ghost" href="#/app/tests">Boshqa testlar</a>${next ? `<a class="btn ghost" href="#/app/lesson/${next.id}">Keyingi dars →</a>` : ''}</div></div></div>`)
    };
  };

  /* ---------- amallar ---------- */
  V.acts = Object.assign(V.acts || {}, {
    tv(el) { T.view = el.dataset.v; V.rerender(); window.scrollTo(0, 0); },
    quick() { Object.assign(T, { src: 'mix', count: 10, mode: 'practice', timed: false }); V.acts.play(); },
    'topic-go'(el) { Object.assign(T, { src: el.dataset.src, count: 10, mode: 'practice', timed: false }); V.acts.play(); },
    cfg(el) { const k = el.dataset.k, v = el.dataset.v; T[k] = k === 'count' || k === 'packSize' ? +v : k === 'timed' ? v === 'true' : v; ensure(); },
    play() { if (!available(T.src)) { toast(T.src === 'mistakes' ? `Xato savollar yo'q, barakalla!` : `Bu manbada savol yo'q`); return; } V.acts.start({ dataset: { key: 'custom' } }); },
    'play-q'(el) { T.src = el.dataset.src; V.acts.play(); },
    'play-pack'(el) { V.acts.start({ dataset: { key: el.dataset.key } }); },
    bcfg(el) { B[el.dataset.k] = +el.dataset.v; B.code = null; ensure(); },
    'b-create'() { B.code = mkCode(); ensure(); },
    'b-copy'() { copy(B.code).then(() => toast(`Kod nusxalandi. Do'stingizga yuboring.`)); },
    'b-start'(el) { startBattle(el.dataset.code); },
    'b-join'() { startBattle($('#bjoin').value); },
    'b-copyres'(el) { const code = el.dataset.code, L = (Store.s.battles[code] || []).filter(x => !x.remote), r = L[L.length - 1]; if (r) copy(resCode(code, r)).then(() => toast(`Natija kodi nusxalandi. Do'stingizga yuboring.`)); },
    'b-addres'() {
      const p = parseRes($('#bres').value); if (!p) { toast(`Natija kodi noto'g'ri. Namuna: YR-…~Ali~17~640`); return; }
      const L = (Store.s.battles[p.code] = Store.s.battles[p.code] || []); if (L.some(x => x.remote && x.name === p.r.name && x.score === p.r.score && x.sec === p.r.sec)) { toast(`Bu natija allaqachon qo'shilgan`); return; }
      L.push(p.r); Store.save(); toast(`${p.r.name} natijasi qo'shildi`); if (location.hash === '#/app/result') { const R = S.result; if (R) R.battleCode = p.code; }
      ensure();
    },
    'b-hot'(el) {
      const code = el.dataset.code;
      modal(`<h3>Do'stingiz navbati</h3><p class="mute">Ismini kiriting, so'ng shu savollarning o'zi unga ham beriladi.</p><div class="field"><label for="hn">Ism</label><input class="input" id="hn" maxlength="24" placeholder="Masalan: Ali"></div><div class="ai-acts"><button class="btn primary" id="hgo">Boshlash</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      document.getElementById('hgo').addEventListener('click', () => { S.bp = (document.getElementById('hn').value || '').trim().slice(0, 24) || 'Do\'st'; UI.closeModal(); startBattle(code); });
    },
    'lesson-read'(el) { const id = el.dataset.id; Store.s.lessons[id] = !Store.s.lessons[id]; Store.save(); ensure(); },
  });
  V.inputs = Object.assign(V.inputs || {}, {
    'cfg-src'(el) { T.src = el.value; /* faqat holat: qayta chizmaymiz (fokus yo'qolmasin) */ ensure(); },
    bsrc(el) { B.src = el.value; B.code = null; },
  });
})();

