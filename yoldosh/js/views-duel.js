/* DUEL: 1v1 test bellashuvi (20 savol). Server: server/duel.js.
   Bot ixtiyoriy va juda kuchli (asosan 20/20). Botni yutish: ✓ galichka, ketma-ket 3 marta — ⭐ medal + 1 oylik Pro.
   Liga: Bronza → Kumush → Oltin → Olmos. Telegramga ulashish kartochkasi. */
(function () {
  const { ico, esc, toast } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const live = () => !!(window.Cloud && Cloud.live() && Cloud.token());
  const L = ['A', 'B', 'C', 'D', 'E', 'F'];
  const shell = (a, h) => V.shellStudent(a, h);
  const LG = [['🥉', 'Bronza'], ['🥈', 'Kumush'], ['🥇', 'Oltin'], ['💎', 'Olmos']];
  async function call(method, path, body) {
    const r = await fetch(api() + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() }, body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch (e) { }
    if (!r.ok) throw new Error(j.error || 'xato'); return j;
  }
  let QMAP = null;
  const qOf = (n) => { if (!QMAP) { QMAP = new Map(); (BANK.ALLQ || BANK.Q).forEach((q) => { if (q.n != null) QMAP.set(q.n, q); }); } return QMAP.get(n); };
  const sec = (ms) => (ms / 1000).toFixed(1) + ' s';
  let per = 'w';

  /* nishonlar: tarif, galichka, medal, liga — hamma ko'radi */
  const lgb = (i) => `<span class="duel-lg lg${i || 0}">${LG[i || 0][0]} ${LG[i || 0][1]}</span>`;
  function badges(p, opt) {
    if (!p || p.bot) return '';
    const t = p.tier && V.T && V.T.chip ? V.T.chip(p.tier, 14) : '';
    return `${t}${p.tick ? '<i class="duel-tick" title="Botni yutgan">✓</i>' : ''}${p.medal ? '<i class="duel-star" title="Botni ketma-ket 3 marta yutgan">⭐</i>' : ''}${opt && opt.lg && p.league ? lgb(p.li) : ''}`;
  }

  /* ---------- Duel sahifasi ---------- */
  function board(b) {
    if (!b.list.length) return `<p class="mute" style="padding:18px 6px">Hali hech kim o'ynamagan. Birinchi bo'ling!</p>`;
    const row = (r) => `<div class="duel-r ${r.me ? 'me' : ''}"><span class="duel-n">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span><div><b>${esc(r.name)} ${badges(r)}</b><small>${LG[r.li || 0][0]} ${esc(r.league || '')} · ${esc(r.region || '')} · ${r.wins} g'alaba</small></div><b class="duel-p2">${r.pts} <small>ball</small></b></div>`;
    const mine = b.me.pts > 0 && !b.list.some((r) => r.me) ? `<div class="duel-r me"><span class="duel-n">${b.me.rank}</span><div><b>Siz</b><small>${b.me.wins} g'alaba</small></div><b class="duel-p2">${b.me.pts} <small>ball</small></b></div>` : '';
    return b.list.map(row).join('') + mine;
  }
  V.duel = () => {
    const tabs = [['d', 'Kunlik'], ['w', 'Haftalik'], ['a', 'Umumiy']];
    const body = `<div class="page-h"><div><h1>Duel</h1><p>1v1 bellashuv: 20 ta savol, kim ko'p va tez to'g'ri javob bersa, shu g'olib.</p></div></div>
      <div class="card duel-hero"><div class="duel-ic">${ico('swords')}</div><div style="flex:1;min-width:0"><h2>Raqib bilan bellashing</h2><p class="mute">Haqiqiy raqib qidiriladi. Xohlasangiz, kuchli bot bilan ham sinashingiz mumkin.</p></div></div>
      <div id="dleague"></div>
      <div class="duel-stats" id="dstats"><div><b>–</b><span>g'alaba</span></div><div><b>–</b><span>haftalik ball</span></div><div><b>–</b><span>o'yin</span></div></div>
      <button class="btn primary duel-go" data-act="duel-find">${ico('swords')} Duelni boshlash</button>
      <button class="btn soft duel-bot" data-act="duel-bot">🤖 Bot bilan o'ynash <small>(ixtiyoriy)</small></button>
      <div class="card duel-botc" id="dbot"></div>
      <div class="card" style="margin-top:18px"><div class="duel-tabs">${tabs.map((t) => `<button class="${per === t[0] ? 'on' : ''}" data-act="duel-per" data-p="${t[0]}">${t[1]}</button>`).join('')}</div><div id="dboard"><p class="mute" style="padding:18px 6px">Yuklanmoqda…</p></div></div>
      <p class="mute" style="font-size:13px;margin-top:12px">G'olib 20 + (to'g'ri javoblar × 2) ball oladi, mag'lub — to'g'ri javoblar soni. Ball Duel reytingiga va umumiy reytingga qo'shiladi. Har hafta Duel g'olibiga 1 oylik Pro beriladi. Bot bilan o'yin reytingga ball bermaydi.</p>`;
    return { html: shell('duel', body), mount() { if (!live()) { document.getElementById('dboard').innerHTML = `<p class="mute" style="padding:18px 6px">Duel faqat onlayn rejimda ishlaydi. Telegram orqali kiring.</p>`; return; } loadStats(); loadBoard(); } };
  };
  async function loadStats() {
    try {
      const m = await call('GET', '/duel/me'), el = document.getElementById('dstats'); if (!el) return;
      el.innerHTML = `<div><b>${m.a.wins}</b><span>g'alaba</span></div><div><b>${m.w.pts}</b><span>haftalik ball</span></div><div><b>${m.a.games}</b><span>o'yin</span></div>`;
      const lg = m.league, pct = lg.next ? Math.min(100, Math.round(((m.a.pts - lg.from) / (lg.to - lg.from)) * 100)) : 100;
      document.getElementById('dleague').innerHTML = `<div class="card duel-lgc"><div class="duel-lgi">${LG[lg.i][0]}</div><div style="flex:1;min-width:0"><b>${lg.name} ligasi</b><div class="duel-bar"><i style="width:${pct}%"></i></div><small class="mute">${lg.next ? `${lg.next} ligasigacha ${lg.need} ball` : 'Eng yuqori liga!'}</small></div></div>`;
      const bt = m.bot, bx = document.getElementById('dbot');
      bx.innerHTML = `<div class="duel-botrow"><div class="duel-bn"><b>${bt.wins}</b><span>botni yutgan</span></div><div style="flex:1"><b>🤖 Botni yuting</b><p class="mute">Bot juda kuchli: deyarli har doim 20/20 yechadi. Uni yutsangiz <i class="duel-tick">✓</i> galichka olasiz. <b>Ketma-ket ${bt.goal} marta</b> yutsangiz: <i class="duel-star">⭐</i> medal va <b>1 oylik Pro</b>${bt.medal ? ' (olingan)' : ''}.</p><div class="duel-dots">${Array.from({ length: bt.goal }, (_, k) => `<i class="${k < bt.streak ? 'on' : ''}">${k < bt.streak ? '⭐' : ''}</i>`).join('')}<span class="mute">${bt.streak}/${bt.goal} ketma-ket</span></div></div></div>`;
    } catch (e) { }
  }
  async function loadBoard() {
    const el = document.getElementById('dboard'); if (!el) return;
    try { const b = await call('GET', '/duel/board?p=' + per); el.innerHTML = board(b); } catch (e) { el.innerHTML = `<p class="mute" style="padding:18px 6px">Reytingni yuklab bo'lmadi.</p>`; }
  }

  /* ---------- O'yin ekrani ---------- */
  let G = null;
  V.duelPlay = (id) => ({
    html: `<div class="duel-play" id="dplay"></div>`,
    mount() { start(Number(id)); },
    unmount() { if (G) G.dead = true; },
  });
  const box = () => document.getElementById('dplay');
  const me = () => (window.ST && ST.Store && ST.Store.s) || {};
  const pcard = (p, mine) => `<div class="duel-p ${mine ? 'me' : ''}"><div class="duel-av ${p.bot ? 'bot' : ''}">${p.bot ? '🤖' : esc((p.name || '?')[0])}</div><b>${mine ? 'Siz' : esc(p.name)}</b><div class="duel-bd">${badges(p, { lg: true })}</div>${p.bot ? '<small class="mute">20/20 yechadi</small>' : ''}</div>`;
  async function start(id) {
    const my = (G = { id, dead: false, i: 0, picks: [], t0: 0, q: null }), b = box(); if (!b) return;
    const waiting = () => { const bb = box(); if (bb) bb.innerHTML = `<div class="duel-wait"><div class="duel-spin"></div><h2>Raqib qidirilmoqda…</h2><p class="mute">Odam topilguncha kutishingiz yoki bot bilan o'ynashingiz mumkin</p><div class="duel-wbtns"><button class="btn soft" data-act="duel-bot" data-id="${id}">🤖 Bot bilan o'ynash</button><button class="btn ghost" data-act="duel-cancel" data-id="${id}">Bekor qilish</button></div></div>`; };
    let st; try { st = await call('GET', '/duel/' + id); } catch (e) { toast('Duel topilmadi'); location.hash = '#/app/duel'; return; }
    if (st.status === 'wait') waiting();
    while (!my.dead && st.status === 'wait') { await new Promise((r) => setTimeout(r, 1500)); if (my.dead) return; try { st = await call('GET', '/duel/' + id); } catch (e) { } }
    if (my.dead) return;
    if (st.status === 'done' || st.myDone) { return result(st, my); }
    my.st = st;
    const bb = box(); if (!bb) return;
    bb.innerHTML = `<div class="duel-vs">${pcard(st.me, true)}<div class="duel-x">VS</div>${pcard(st.opp, false)}</div><h1 class="duel-cd" id="dcd">3</h1>`;
    for (let k = 3; k >= 1; k--) { const e = document.getElementById('dcd'); if (!e || my.dead) return; e.textContent = k; await new Promise((r) => setTimeout(r, 800)); }
    my.t0 = Date.now(); question(my);
  }
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
  function next(my) { my.i++; if (my.i >= my.st.qs.length) return finish(my); question(my); }
  async function finish(my) {
    const b = box(); if (b) b.innerHTML = `<div class="duel-wait"><div class="duel-spin"></div><h2>Natija hisoblanmoqda…</h2><p class="mute">Raqib tugatishini kutamiz</p></div>`;
    const ms = Date.now() - my.t0; let st = null;
    for (let tries = 0; tries < 3 && !st; tries++) { try { st = await call('POST', '/duel/' + my.id + '/finish', { picks: my.picks, ms }); } catch (e) { await new Promise((r) => setTimeout(r, 1000)); } }
    if (!st) { toast("Aloqa yo'q. Natija yuborilmadi"); location.hash = '#/app/duel'; return; }
    for (let k = 0; !my.dead && st.status !== 'done' && k < 150; k++) { await new Promise((r) => setTimeout(r, 2000)); try { st = await call('GET', '/duel/' + my.id); } catch (e) { } }
    if (my.dead) return;
    result(st, my);
  }

  /* Telegramga ulashish kartochkasi (rasm) */
  function cardPng(st) {
    const r = st.result, W = 1080, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b1224'); g.addColorStop(1, '#1b2a55'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(184,245,59,.12)'; x.beginPath(); x.arc(900, 160, 320, 0, 7); x.fill();
    x.textAlign = 'center'; x.fillStyle = '#B8F53B'; x.font = '900 64px system-ui,sans-serif'; x.fillText('CHORRAHA · DUEL', W / 2, 150);
    x.fillStyle = '#fff'; x.font = '900 150px system-ui,sans-serif'; x.fillText('🏆 G\'ALABA', W / 2, 400);
    x.font = '900 260px system-ui,sans-serif'; x.fillText(`${r.me} : ${r.opp}`, W / 2, 700);
    x.fillStyle = '#9fb0d6'; x.font = '600 48px system-ui,sans-serif'; x.fillText(`${me().name || 'Men'}  vs  ${st.opp.name}${st.opp.bot ? ' 🤖' : ''}`, W / 2, 790);
    const ex = [r.ev && r.ev.tick ? '✓ Botni yutdim' : '', r.ev && r.ev.medal ? '⭐ Botni 3 marta ketma-ket yutdim' : ''].filter(Boolean).join('   ');
    if (ex) { x.fillStyle = '#FFC94D'; x.font = '800 46px system-ui,sans-serif'; x.fillText(ex, W / 2, 870); }
    x.fillStyle = '#B8F53B'; x.font = '800 54px system-ui,sans-serif'; x.fillText('Yeching: chorrahaa.uz', W / 2, 980);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  async function share(st) {
    const r = st.result, text = `🏆 Chorraha Duelda ${st.opp.bot ? 'botni' : st.opp.name + 'ni'} ${r.me}:${r.opp} hisobida yutdim!${r.ev && r.ev.medal ? ' ⭐ Botni ketma-ket 3 marta yutdim!' : ''}\nSiz ham sinab ko'ring 👉 https://chorrahaa.uz/`;
    try {
      const blob = await cardPng(st), file = new File([blob], 'duel.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const tw = window.Telegram && window.Telegram.WebApp, url = 'https://t.me/share/url?url=' + encodeURIComponent('https://chorrahaa.uz/') + '&text=' + encodeURIComponent(text);
    if (tw && tw.openTelegramLink) tw.openTelegramLink(url); else window.open(url, '_blank', 'noopener');
  }

  function result(st, my) {
    const b = box(); if (!b) return;
    if (st.status !== 'done') { b.innerHTML = `<div class="duel-wait"><h2>Raqib hali tugatmadi</h2><p class="mute">Natija tayyor bo'lganda Duel sahifasida ko'rinadi.</p><a class="btn soft" href="#/app/duel">Duel sahifasi</a></div>`; return; }
    const r = st.result, T = { win: ['🏆 G\'alaba!', 'good'], lose: ['Mag\'lubiyat', 'bad'], draw: ['Durang', 'warn'] }[r.win], ev = r.ev || {};
    G = Object.assign(G || {}, { last: st });
    const notes = [ev.tick ? `<div class="duel-note"><i class="duel-tick">✓</i> Botni yutdingiz — profilingizga <b>galichka</b> qo'shildi!</div>` : '', ev.medal ? `<div class="duel-note gold"><i class="duel-star">⭐</i> Botni ketma-ket ${3} marta yutdingiz — <b>medal</b> va <b>1 oylik Pro</b> sovg'a qilindi!</div>` : '', st.opp.bot && r.win === 'win' && ev.streak && !ev.medal ? `<div class="duel-note">Ketma-ket g'alaba: <b>${ev.streak}/3</b>. Yana ${3 - ev.streak} marta yutsangiz — ⭐ medal va 1 oylik Pro.</div>` : '', st.opp.bot && r.win === 'lose' ? `<div class="duel-note mute">Bot 20/20 yechganda yutadi. U ba'zan 19/20 qiladi — shunda 20/20 yechgan odam yutadi.</div>` : ''].join('');
    b.innerHTML = `<div class="duel-res ${T[1]}"><h1>${T[0]}</h1><div class="duel-score"><div><b>${r.me}</b><span>Siz · ${sec(r.meMs)}</span></div><i>:</i><div><b>${r.opp}</b><span>${esc(st.opp.name)} · ${sec(r.oppMs)}</span></div></div>
      <p class="duel-pts">${r.pts ? `+${r.pts} ball` : st.opp.bot ? 'Bot o\'yini reytingga ball bermaydi' : '+0 ball'}</p>${notes}
      <div class="ai-acts">${r.win === 'win' ? `<button class="btn soft" data-act="duel-share">✈️ Telegramda ulashish</button>` : ''}<button class="btn primary" data-act="duel-find">${ico('swords')} Yana o'ynash</button><a class="btn ghost" href="#/app/duel">Reyting</a></div></div>`;
    if (my) my.dead = true;
  }

  V.acts = Object.assign(V.acts || {}, {
    async 'duel-find'(el) {
      if (!live()) { toast('Duel uchun Telegram orqali kiring'); return; }
      if (el) el.disabled = true;
      try { const j = await call('POST', '/duel/find', {}); if (G) G.dead = true; location.hash = '#/app/duel/' + j.id; } catch (e) { toast(e.message || "Server bilan aloqa yo'q"); if (el) el.disabled = false; }
    },
    async 'duel-bot'(el) {
      if (!live()) { toast('Duel uchun Telegram orqali kiring'); return; }
      if (el) el.disabled = true;
      try { const j = await call('POST', '/duel/bot', {}); if (el && el.dataset.id && G && G.id === j.id) { const bb = box(); if (bb) bb.innerHTML = `<div class="duel-wait"><div class="duel-spin"></div><h2>Bot tayyorlanmoqda…</h2></div>`; return; } if (G) G.dead = true; location.hash = '#/app/duel/' + j.id; } catch (e) { toast(e.message || "Server bilan aloqa yo'q"); if (el) el.disabled = false; }
    },
    async 'duel-cancel'(el) { if (G) G.dead = true; try { await call('POST', '/duel/' + el.dataset.id + '/cancel', {}); } catch (e) { } location.hash = '#/app/duel'; },
    'duel-per'(el) { per = el.dataset.p; document.querySelectorAll('.duel-tabs button').forEach((b) => b.classList.toggle('on', b === el)); loadBoard(); },
    'duel-share'() { if (G && G.last) share(G.last); },
    'duel-pick'(el) {
      const my = G; if (!my || my.lock || my.dead) return; my.lock = true;
      my.picks.push(Number(el.dataset.i));
      document.querySelectorAll('#dplay .opt').forEach((o) => { o.disabled = true; });
      el.classList.add('pick');
      setTimeout(() => next(my), 450);
    },
  });
})();
