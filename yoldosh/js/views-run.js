/* MARAFON — cheksiz test. Boshida 3 ta savol; har yechilganda keyingisi ochiladi (4-, 5-, 6-... savol).
   Yechilgan savollar orqada qoladi. 3 ta xato qilguncha davom etadi. Har to'g'ri javob = 1 ball (Store.record beradi),
   ketma-ket 20 ta xatosiz = +10 bonus, 50 ta xatosiz = +30 bonus. Holat Store.s.run da saqlanadi (qaytib kirsangiz davom etadi). */
(function () {
  const { ico, esc, toast } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), shell = (a, h) => V.shellStudent(a, h);
  const S = { cur: null, autoT: null };
  const START = 3, MAX_MISTAKES = 3, BONUS = [[20, 10], [50, 30]];
  const L = 'ABCDEF';

  const fresh = (prevBest) => ({ seed: (Date.now() & 0xffffff) + 11, picks: {}, mistakes: 0, correct: 0, streak: 0, maxStreak: 0, earned: 0, bonus: 0, over: false, best: prevBest || 0, startedAt: Date.now(), wrong: [] });
  const state = () => { if (!Store.s.run) { Store.s.run = fresh(0); Store.save(); } return Store.s.run; };
  let _pool = null, _seed = null;
  const pool = (r) => { if (!_pool || _seed !== r.seed || _pool.length !== BANK.Q.length) { _pool = BANK.shuffle(BANK.Q.slice(), r.seed).map(q => q.id); _seed = r.seed; } return _pool; };
  const solvedCount = (r) => Object.keys(r.picks).length;
  const visible = (r) => Math.min(pool(r).length, START + solvedCount(r));
  const nextMilestone = (r) => { for (const [n] of BONUS) if (r.streak < n) return n; return BONUS[BONUS.length - 1][0]; };

  function qCard(r, id, idx, isNew) {
    const q = BANK.byId[id]; if (!q) return '';
    const pick = r.picks[id], done = pick != null, ok = done && pick === q.answer, imgs = q.kind === 'pick';
    const media = BANK.media(q);
    const opts = q.options.map((o, k) => {
      let c = 'opt'; if (done) c += k === q.answer ? ' good' : k === pick ? ' bad' : '';
      return `<button class="${c}" data-act="run-pick" data-id="${id}" data-i="${k}" ${done ? 'disabled' : ''}><span class="k">${L[k]}</span><span>${esc(o.label)}</span></button>`;
    }).join('');
    const why = done ? V.explain(q, pick, ok) : '';
    const sc = '';
    return `<article class="run-q ${done ? 'done ' + (ok ? 'okq' : 'badq') : ''} ${isNew ? 'new' : ''}" data-id="${id}">
      <div class="no"><b>${idx + 1}</b> savol${done ? (ok ? ' · <span style="color:var(--ok)">to\'g\'ri +1</span>' : ' · <span style="color:var(--bad)">xato</span>') : ''}</div>
      <h3>${esc(q.text)}</h3>${sc || media}<div class="opts ${imgs ? 'imgs' : ''}">${opts}</div>${why}</article>`;
  }

  function hud(r) {
    const nm = nextMilestone(r), prev = BONUS.filter(([n]) => n < nm).pop(), base = prev ? prev[0] : 0, pct = Math.min(100, Math.round(((r.streak - base) / (nm - base)) * 100)), bonusAmt = (BONUS.find(([n]) => n === nm) || [0, 0])[1];
    return `<div class="run-hud"><div><small>Yechildi</small><b>${solvedCount(r)}</b></div>
      <div><small>Ball (shu marafon)</small><b>+${r.earned + r.bonus}</b></div>
      <div class="bonus"><small>Ketma-ket to'g'ri</small><b>${r.streak}</b><div class="run-bonus"><i style="width:${pct}%"></i></div><small style="margin-top:4px;text-transform:none;letter-spacing:0">${nm} ta → +${bonusAmt} bonus</small></div>
      <div><small>Imkoniyat</small><div class="lives">${Array.from({ length: MAX_MISTAKES }, (_, i) => `<i class="${i < r.mistakes ? 'off' : ''}"></i>`).join('')}</div></div></div>`;
  }

  function body(r, newId) {
    const ids = pool(r).slice(0, visible(r));
    if (r.over) {
      const rank = Store.s.points || 0;
      return `<div class="run-over"><div style="font-size:42px">💥</div><h2>Marafon tugadi</h2><p class="mute">3 ta xatoga yetdingiz</p><div class="big">${solvedCount(r)}</div><p class="mute">ta savol yechildi · ${r.correct} ta to'g'ri</p>
        <div class="row"><span class="chip ok">+${r.earned} ball (to'g'ri javoblar)</span><span class="chip acc">+${r.bonus} bonus</span><span class="chip">Eng uzun seriya: ${r.maxStreak}</span><span class="chip">Rekord: ${r.best} ta</span></div>
        <div class="row"><button class="btn primary lg" data-act="run-restart">${ico('redo')} Qaytadan boshlash</button><a class="btn ghost lg" href="#/app/mistakes">Xatolarim</a><a class="btn ghost lg" href="#/app/rank">Reyting</a></div><p class="mute" style="font-size:13px">Jami reyting balli: ${rank}</p></div>
        <div class="run-list">${ids.filter(id => r.picks[id] != null).slice(-6).reverse().map(id => qCard(r, id, ids.indexOf(id), false)).join('')}</div>`;
    }
    // bitta savol ko'rinadi; tepada raqamlar qatori: boshida 3 ta, har yechilgan sayin yangi raqam ochiladi
    const total = ids.length; let cur = S.cur; if (cur == null || cur >= total) cur = S.cur = firstOpen(r, ids);
    const strip = ids.map((id, i) => { const p = r.picks[id], q = BANK.byId[id]; const c = i === cur ? ' cur' : '', st = p == null ? '' : p === q.answer ? ' ok' : ' bad'; return `<button class="rn${st}${c}" data-act="run-go" data-i="${i}">${i + 1}</button>`; }).join('');
    const id = ids[cur], done = r.picks[id] != null, okNow = done && r.picks[id] === BANK.byId[id].answer;
    return `<div class="run-strip">${strip}</div><div class="run-list">${qCard(r, id, cur, id === newId)}</div>${done && !okNow ? `<div class="run-next"><button class="btn primary lg" data-act="run-next">Keyingi savol ${ico('arrow')}</button></div>` : ''}`;
  }

  const firstOpen = (r, ids) => { const i = ids.findIndex(id => r.picks[id] == null); return i < 0 ? 0 : i; };
  const nextOpen = (r, ids, from) => { for (let k = 1; k <= ids.length; k++) { const i = (from + k) % ids.length; if (r.picks[ids[i]] == null) return i; } return from; };

  function paint(newId, keepScroll) {
    const r = state(), root = document.getElementById('run-root'); if (!root) return;
    const y = window.scrollY;
    root.innerHTML = `${hud(r)}${body(r, newId)}`;
    if (keepScroll) window.scrollTo(0, y);
  }
  const pop = (txt) => { const d = document.createElement('div'); d.className = 'run-pop'; d.textContent = txt; document.body.appendChild(d); setTimeout(() => d.remove(), 2300); };

  V.run = () => ({
    html: shell('run', `<div class="page-h"><div><h1>Marafon</h1><p>Test yechib boraveting: har yechilgan savol keyingisini ochadi. 3 ta xato qilguncha cheksiz. Har to'g'ri javob — 1 ball, 20 ta xatosiz — +10, 50 ta xatosiz — +30 bonus.</p></div><a class="btn ghost" href="#/app">← Bosh sahifa</a></div><div class="run" id="run-root"></div>`),
    mount() { paint(null); },
  });

  V.acts = Object.assign(V.acts || {}, {
    'run-pick'(el) {
      const r = state(); if (r.over) return; const id = el.dataset.id, k = +el.dataset.i, q = BANK.byId[id]; if (!q || r.picks[id] != null) return;
      r.picks[id] = k; const ok = k === q.answer;
      const before = Store.s.points || 0; Store.record(q, k, 'run'); r.earned += ok ? 1 : 0;
      let newId = null;
      if (ok) {
        r.correct++; r.streak++; r.maxStreak = Math.max(r.maxStreak, r.streak);
        for (const [n, b] of BONUS) if (r.streak === n) { Store.addPoints(b, `Marafon: ${n} ta xatosiz`); r.bonus += b; pop(`🔥 ${n} ta xatosiz! +${b} bonus ball`); if (navigator.vibrate) navigator.vibrate([40, 40, 80]); }
      } else { r.mistakes++; r.streak = 0; r.wrong.push(id); if (navigator.vibrate) navigator.vibrate(120); }
      const total = pool(r).length;
      if (r.mistakes >= MAX_MISTAKES) { r.over = true; r.best = Math.max(r.best || 0, solvedCount(r)); }
      else if (solvedCount(r) >= total) { r.over = true; r.best = Math.max(r.best || 0, solvedCount(r)); }
      else newId = pool(r)[visible(r) - 1];
      Store.save();
      void before; paint(newId, true);
      if (ok && !r.over) { clearTimeout(S.autoT); S.autoT = setTimeout(() => { const rr = state(); if (rr.over) return; S.cur = nextOpen(rr, pool(rr).slice(0, visible(rr)), S.cur == null ? 0 : S.cur); paint(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 750); return; }
      if (r.over) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    'run-go'(el) { clearTimeout(S.autoT); S.cur = +el.dataset.i; paint(null); },
    'run-next'() { clearTimeout(S.autoT); const r = state(); S.cur = nextOpen(r, pool(r).slice(0, visible(r)), S.cur == null ? 0 : S.cur); paint(null); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'run-restart'() { S.cur = null; const r = state(); Store.s.run = fresh(Math.max(r.best || 0, solvedCount(r))); Store.save(); paint(null); window.scrollTo(0, 0); },
  });
})();
