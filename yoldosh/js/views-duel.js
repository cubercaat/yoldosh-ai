/* DUEL: 1v1 test bellashuvi. Server: server/duel.js. 10 savol, kim ko'p va tez to'g'ri javob bersa — g'olib.
   Raqib topilmasa 8 soniyadan keyin «Bot» bilan o'ynaladi. Ball Duel reytingiga (kunlik / haftalik / umumiy) va umumiy reytingga yoziladi. */
(function () {
  const { ico, esc, toast } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const live = () => !!(window.Cloud && Cloud.live() && Cloud.token());
  const L = ['A', 'B', 'C', 'D', 'E', 'F'];
  const shell = (a, h) => V.shellStudent(a, h);
  async function call(method, path, body) {
    const r = await fetch(api() + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() }, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch (e) { }
    if (!r.ok) throw new Error(j.error || 'xato'); return j;
  }
  let QMAP = null;
  const qOf = (n) => { if (!QMAP) { QMAP = new Map(); (BANK.ALLQ || BANK.Q).forEach((q) => { if (q.n != null) QMAP.set(q.n, q); }); } return QMAP.get(n); };
  const sec = (ms) => (ms / 1000).toFixed(1) + ' s';
  let per = 'w';

  /* ---------- Duel sahifasi: statistika, boshlash tugmasi, reyting ---------- */
  function board(b) {
    if (!b.list.length) return `<p class="mute" style="padding:18px 6px">Hali hech kim o'ynamagan. Birinchi bo'ling!</p>`;
    const rows = b.list.map((r) => `<div class="duel-r ${r.me ? 'me' : ''}"><span class="duel-n">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span><div><b>${esc(r.name)}</b><small>${esc(r.region || '')} · ${r.wins} g'alaba</small></div><b class="duel-p2">${r.pts} <small>ball</small></b></div>`).join('');
    const mine = b.me.pts > 0 && !b.list.some((r) => r.me) ? `<div class="duel-r me"><span class="duel-n">${b.me.rank}</span><div><b>Siz</b><small>${b.me.wins} g'alaba</small></div><b class="duel-p2">${b.me.pts} <small>ball</small></b></div>` : '';
    return rows + mine;
  }
  V.duel = () => {
    const tabs = [['d', 'Kunlik'], ['w', 'Haftalik'], ['a', 'Umumiy']];
    const body = `<div class="page-h"><div><h1>Duel</h1><p>1v1 bellashuv: 10 ta savol, kim ko'p va tez to'g'ri javob bersa, shu g'olib.</p></div></div>
      <div class="card duel-hero"><div class="duel-ic">${ico('swords')}</div><div style="flex:1;min-width:0"><h2>Raqib bilan bellashing</h2><p class="mute">Raqib avtomatik topiladi. Topilmasa, «Bot» bilan o'ynaysiz.</p></div></div>
      <div class="duel-stats" id="dstats"><div><b>–</b><span>g'alaba</span></div><div><b>–</b><span>haftalik ball</span></div><div><b>–</b><span>o'yin</span></div></div>
      <button class="btn primary duel-go" data-act="duel-find">${ico('swords')} Duelni boshlash</button>
      <div class="card" style="margin-top:18px"><div class="duel-tabs">${tabs.map((t) => `<button class="${per === t[0] ? 'on' : ''}" data-act="duel-per" data-p="${t[0]}">${t[1]}</button>`).join('')}</div><div id="dboard"><p class="mute" style="padding:18px 6px">Yuklanmoqda…</p></div></div>
      <p class="mute" style="font-size:13px;margin-top:12px">G'olib 20 + (to'g'ri javoblar × 2) ball oladi, mag'lub — to'g'ri javoblar soni. Ball Duel reytingiga va umumiy reytingga qo'shiladi. Bot bilan o'yinda ball yarmi.</p>`;
    return { html: shell('duel', body), mount() { if (!live()) { document.getElementById('dboard').innerHTML = `<p class="mute" style="padding:18px 6px">Duel faqat onlayn rejimda ishlaydi. Telegram orqali kiring.</p>`; return; } loadStats(); loadBoard(); } };
  };
  async function loadStats() {
    try { const m = await call('GET', '/duel/me'), el = document.getElementById('dstats'); if (el) el.innerHTML = `<div><b>${m.a.wins}</b><span>g'alaba</span></div><div><b>${m.w.pts}</b><span>haftalik ball</span></div><div><b>${m.a.games}</b><span>o'yin</span></div>`; } catch (e) { }
  }
  async function loadBoard() {
    const el = document.getElementById('dboard'); if (!el) return;
    try { const b = await call('GET', '/duel/board?p=' + per); el.innerHTML = board(b); } catch (e) { el.innerHTML = `<p class="mute" style="padding:18px 6px">Reytingni yuklab bo'lmadi.</p>`; }
  }

  /* ---------- O'yin ekrani ---------- */
  let G = null;     // joriy o'yin holati
  V.duelPlay = (id) => ({
    html: `<div class="duel-play" id="dplay"><div class="duel-wait"><div class="duel-spin"></div><h2>Raqib qidirilmoqda…</h2><p class="mute">Bir necha soniya</p></div></div>`,
    mount() { start(Number(id)); },
    unmount() { if (G) G.dead = true; },
  });
  const box = () => document.getElementById('dplay');
  async function start(id) {
    const my = (G = { id, dead: false, i: 0, picks: [], t0: 0, q: null });
    let st; try { st = await call('GET', '/duel/' + id); } catch (e) { toast("Duel topilmadi"); location.hash = '#/app/duel'; return; }
    while (!my.dead && st.status === 'wait') { await new Promise((r) => setTimeout(r, 1200)); if (my.dead) return; try { st = await call('GET', '/duel/' + id); } catch (e) { } }
    if (my.dead) return;
    if (st.status === 'done' || st.myDone) { return result(st, my); }
    my.st = st;
    const b = box(); if (!b) return;
    b.innerHTML = `<div class="duel-vs"><div class="duel-p me"><div class="duel-av">${esc((Store().name || 'S')[0])}</div><b>Siz</b></div><div class="duel-x">VS</div><div class="duel-p"><div class="duel-av ${st.opp.bot ? 'bot' : ''}">${st.opp.bot ? '🤖' : esc(st.opp.name[0])}</div><b>${esc(st.opp.name)}</b>${st.opp.bot ? '<small class="mute">Raqib topilmadi</small>' : ''}</div></div><h1 class="duel-cd" id="dcd">3</h1>`;
    for (let k = 3; k >= 1; k--) { const e = document.getElementById('dcd'); if (!e || my.dead) return; e.textContent = k; await new Promise((r) => setTimeout(r, 750)); }
    my.t0 = Date.now(); question(my);
  }
  const Store = () => (window.ST && ST.Store && ST.Store.s) || {};
  function question(my) {
    if (my.dead) return; const b = box(); if (!b) return;
    const n = my.st.qs[my.i], q = qOf(n);
    if (!q) { my.picks.push(-1); next(my); return; }
    const imgs = q.kind === 'pick';
    const opts = q.options.map((o, k) => `<button class="opt" data-act="duel-pick" data-i="${k}">${imgs ? `<span class="k">${L[k]}</span>${SIGNS.svg(o.img, 'Variant ' + L[k])}` : `<span class="k">${L[k]}</span><span>${esc(o.label)}</span>`}</button>`).join('');
    b.innerHTML = `<div class="duel-top"><b>Duel · ${my.i + 1}/${my.st.qs.length}</b><span class="mute">${esc(my.st.opp.name)} bilan</span><a class="duel-x-btn" href="#/app/duel" aria-label="Chiqish">${ico('x')}</a></div><div class="duel-bar"><i style="width:${(my.i / my.st.qs.length) * 100}%"></i></div>
      <div class="q-card ${BANK.media(q) ? 'has-media' : ''}" style="margin-top:14px"><h2>${esc(q.text)}</h2>${BANK.media(q)}<div class="opts ${imgs ? 'imgs' : ''}">${opts}</div></div>`;
    my.q = q; my.lock = false; window.scrollTo(0, 0);
  }
  function next(my) {
    my.i++;
    if (my.i >= my.st.qs.length) return finish(my);
    question(my);
  }
  async function finish(my) {
    const b = box(); if (b) b.innerHTML = `<div class="duel-wait"><div class="duel-spin"></div><h2>Natija hisoblanmoqda…</h2><p class="mute">Raqib tugatishini kutamiz</p></div>`;
    const ms = Date.now() - my.t0; let st = null;
    for (let tries = 0; tries < 3 && !st; tries++) { try { st = await call('POST', '/duel/' + my.id + '/finish', { picks: my.picks, ms }); } catch (e) { await new Promise((r) => setTimeout(r, 1000)); } }
    if (!st) { toast("Aloqa yo'q. Natija yuborilmadi"); location.hash = '#/app/duel'; return; }
    for (let k = 0; !my.dead && st.status !== 'done' && k < 150; k++) { await new Promise((r) => setTimeout(r, 2000)); try { st = await call('GET', '/duel/' + my.id); } catch (e) { } }
    if (my.dead) return;
    result(st, my);
  }
  function result(st, my) {
    const b = box(); if (!b) return;
    if (st.status !== 'done') { b.innerHTML = `<div class="duel-wait"><h2>Raqib hali tugatmadi</h2><p class="mute">Natija tayyor bo'lganda Duel sahifasida ko'rinadi.</p><a class="btn soft" href="#/app/duel">Duel sahifasi</a></div>`; return; }
    const r = st.result, T = { win: ['🏆 G\'alaba!', 'good'], lose: ['Mag\'lubiyat', 'bad'], draw: ['Durang', 'warn'] }[r.win];
    b.innerHTML = `<div class="duel-res ${T[1]}"><h1>${T[0]}</h1><div class="duel-score"><div><b>${r.me}</b><span>Siz · ${sec(r.meMs)}</span></div><i>:</i><div><b>${r.opp}</b><span>${esc(st.opp.name)} · ${sec(r.oppMs)}</span></div></div><p class="duel-pts">+${r.pts} ball <small class="mute">${st.opp.bot ? '(bot bilan o\'yinda yarmi)' : 'Duel va umumiy reytingga'}</small></p>
      <div class="ai-acts"><button class="btn primary" data-act="duel-find">${ico('swords')} Yana o'ynash</button><a class="btn soft" href="#/app/duel">Reyting</a></div></div>`;
    if (my) my.dead = true;
  }

  V.acts = Object.assign(V.acts || {}, {
    async 'duel-find'(el) {
      if (!live()) { toast('Duel uchun Telegram orqali kiring'); return; }
      if (el) el.disabled = true;
      try { const j = await call('POST', '/duel/find', {}); if (G) G.dead = true; location.hash = '#/app/duel/' + j.id; } catch (e) { toast(e.message || "Server bilan aloqa yo'q"); if (el) el.disabled = false; }
    },
    'duel-per'(el) { per = el.dataset.p; document.querySelectorAll('.duel-tabs button').forEach((b) => b.classList.toggle('on', b === el)); loadBoard(); },
    'duel-pick'(el) {
      const my = G; if (!my || my.lock || my.dead) return; my.lock = true;
      const k = Number(el.dataset.i); my.picks.push(k);
      document.querySelectorAll('#dplay .opt').forEach((o) => { o.disabled = true; });
      el.classList.add('pick');
      setTimeout(() => next(my), 450);
    },
  });
})();
