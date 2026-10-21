/* Chorraha avtodrom mashqlari (bepul, o'zimizning): tepadan ko'rinadigan yengil simulyator.
   Mashqlar: Ilon, Sakkiz, Parallel parkovka, Garajga teskari kirish. Hech qanday tashqi kutubxona kerak emas.
   Marshrut: #/autodrom/play  va  #/autodrom/play/<id>. Eng yaxshi natijalar qurilmada (chorraha_ad_best). */
(function () {
  const V = (window.V = window.V || {}), { esc } = UI, KB = 'chorraha_ad_best', PASS = 80;
  const best = () => { try { return JSON.parse(localStorage.getItem(KB)) || {}; } catch (e) { return {}; } };
  const saveBest = (id, sc) => { try { const b = best(); if (!(b[id] >= sc)) { b[id] = sc; localStorage.setItem(KB, JSON.stringify(b)); } } catch (e) { } };
  const track = (n) => { try { V.track && V.track(n); } catch (e) { } };
  const R = 0.95, OFFS = [-1.3, 0, 1.3], CAR_L = 4.3, CAR_W = 1.8, WB = 2.6; // mashina: 3 ta aylana bilan

  /* ---------- mashqlar ---------- */
  function ring(cx, cy, r, n, a0, a1) { const o = []; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }
  function walls(x0, y0, x1, y1) { const t = 1; return [{ x: x0 - t, y: y0 - t, w: x1 - x0 + 2 * t, h: t, k: 'wall' }, { x: x0 - t, y: y1, w: x1 - x0 + 2 * t, h: t, k: 'wall' }, { x: x0 - t, y: y0, w: t, h: y1 - y0, k: 'wall' }, { x: x1, y: y0, w: t, h: y1 - y0, k: 'wall' }]; }

  const EX = {
    slalom() {
      const cones = []; for (let i = 0; i < 6; i++) cones.push([0, -10 - 8 * i]);
      return { id: 'slalom', ic: '🔶', name: 'Ilon', desc: "Konuslar orasidan ilon izi bilan o'ting, ularga tegmang", limit: 80, start: [0, 2, -Math.PI / 2],
        cones, solids: walls(-9, -66, 9, 8), finishY: -58, gear: 'D',
        init(s) { s.side = []; s.passed = 0; },
        step(s, car) { cones.forEach((c, i) => { if (s.side[i] === undefined && car.y < c[1]) { const sd = car.x < c[0] ? -1 : 1; s.side[i] = sd; if (i > 0 && s.side[i - 1] === sd) s.pen(5, "Konuslar tartibi buzildi"); s.passed = i + 1; } }); if (car.y < -58) return 'done'; },
        hint: (s) => `Konus: ${s.passed}/6` };
    },
    eight() {
      const Rc = 8, cL = [-Rc, 0], cR = [Rc, 0], cones = [], path = [], N = 12;
      // chap doira soat mili bo'yicha (koordinatadan boshlab pastga), keyin o'ng doira soat miliga teskari
      for (let i = 0; i <= N * 2; i++) { const a = (i % N) * 2 * Math.PI / N; if (i <= N) path.push([cL[0] + Rc * Math.cos(a), cL[1] + Rc * Math.sin(a)]); else path.push([cR[0] - Rc * Math.cos(a), cR[1] + Rc * Math.sin(a)]); }
      const dist = (p, c) => Math.hypot(p[0] - c[0], p[1] - c[1]);
      [[cL, cR], [cR, cL]].forEach(([c, o]) => [Rc - 2.6, Rc + 2.6].forEach((r) => ring(c[0], c[1], r, Math.round(r * 2.2), 0, 2 * Math.PI).forEach((p) => { if (Math.abs(dist(p, o) - Rc) > 2.6) cones.push(p); })));
      const pts = []; for (let i = 1; i <= N * 2; i++) pts.push(path[i]);
      return { id: 'eight', ic: '♾️', name: 'Sakkiz', desc: "Sakkiz raqami bo'ylab yuring: avval chap, keyin o'ng doira", limit: 120, start: [0, 0, Math.PI / 2], cones, solids: walls(-23, -15, 23, 15), gear: 'D', guide: path,
        init(s) { s.cp = 0; }, step(s, car) { const t = pts[s.cp]; if (t && Math.hypot(car.x - t[0], car.y - t[1]) < 3.4) { s.cp++; if (s.cp >= pts.length) return 'done'; } }, hint: (s) => `Nazorat: ${s.cp}/${pts.length}` };
    },
    parallel() {
      const solids = walls(-24, -9, 24, 10).concat([{ x: -10, y: 1.9, w: 6.5, h: 2.1, k: 'car' }, { x: 3.5, y: 1.9, w: 6.5, h: 2.1, k: 'car' }, { x: -24, y: 4.2, w: 48, h: 5.8, k: 'curb' }]);
      return { id: 'parallel', ic: '🅿️', name: 'Parallel parkovka', desc: "Ikki mashina orasidagi joyga yoʻlga parallel qilib joylashtiring", limit: 120, start: [15, -1.2, Math.PI], cones: [], solids, gear: 'D',
        zone: { x0: -2.6, x1: 2.6, y0: 2.0, y1: 3.2, axis: 'x' }, slot: { x: -3.5, y: 1.9, w: 7, h: 2.3 }, init() { }, step() { }, hint: () => "Joyga to'liq kiring va to'xtang" };
    },
    garage() {
      const solids = walls(-14, -13, 14, 12).concat([{ x: -2.6, y: -11, w: 0.6, h: 8, k: 'wall' }, { x: 2.0, y: -11, w: 0.6, h: 8, k: 'wall' }, { x: -2.6, y: -11.6, w: 5.2, h: 0.6, k: 'wall' }]);
      return { id: 'garage', ic: '🏠', name: 'Garajga teskari kirish', desc: "Garajga orqa bilan (R) kiring va to'xtang", limit: 120, start: [7, 3, Math.PI], cones: [], solids, gear: 'D',
        zone: { x0: -1.0, x1: 1.0, y0: -9.2, y1: -5.2, axis: 'y' }, slot: { x: -2, y: -11, w: 4, h: 8 }, init() { }, step() { }, hint: () => "Garajga to'liq kiring va to'xtang" };
    },
  };
  const ORDER = ['slalom', 'eight', 'parallel', 'garage'];

  /* ---------- menyu ---------- */
  V.adPlay = (id) => {
    if (id && EX[id]) return game(id);
    const b = best();
    return { html: `<div class="gst"><header class="gst-top"><a class="gst-logo" href="#/">Chorraha</a><span style="flex:1"></span><a class="lb gls sm" href="#/autodrom">Avtodrom</a></header>
      <main class="gst-main ad-main"><span class="chip acc">Bepul mashq</span><h1 class="ad-h">Avtodrom mashqlari</h1>
      <p class="ad-lead">Haqiqiy avtodromga borishdan oldin mashq qiling. Telefonda tugmalar, kompyuterda strelkalar yoki WASD. Ball ${PASS} dan yuqori bo'lsa — o'tdingiz.</p>
      <div class="ad-ex">${ORDER.map((k) => { const e = EX[k](); return `<a class="card ad-exc" href="#/autodrom/play/${k}"><span class="ad-ic">${e.ic}</span><span class="ad-t"><b>${e.name}</b><small>${e.desc}</small></span><span class="chip ${b[k] >= PASS ? 'ok' : ''}">${b[k] != null ? b[k] + ' ball' : 'Boshlash'}</span></a>`; }).join('')}</div></main></div>`, mount() { track('view_autodrom_play'); } };
  };

  /* ---------- o'yin ---------- */
  function game(id) {
    const ex = EX[id](), S = { x: ex.start[0], y: ex.start[1], th: ex.start[2], v: 0, st: 0, gear: 1 };
    let raf = 0, last = 0, cv, cx, W = 0, H = 0, sc = 14, camX = S.x, camY = S.y, state = 'run', time = 0, score = 100, hold = 0, msg = '', msgT = 0, keys = {}, btn = {}, hits = new Map(), conesHit = new Set(), shake = 0, ro = null;
    const gs = { pen: (n, t) => { score = Math.max(0, score - n); msg = `-${n} ${t}`; msgT = 1.8; shake = 0.25; } };
    ex.init(gs);
    const cones = ex.cones.map((c) => ({ x: c[0], y: c[1], hit: false, a: 0 }));

    const html = `<div class="adg" id="adg"><canvas id="adc"></canvas>
      <div class="adg-top"><a class="adg-b" href="#/autodrom/play" aria-label="Orqaga">←</a><div class="adg-t"><b>${ex.name}</b><span id="adh"></span></div><div class="adg-s"><b id="ads">100</b><small id="adt">0:00</small></div></div>
      <div class="adg-msg" id="adm"></div>
      <div class="adg-ctl"><div class="adg-l"><button class="adg-k" data-k="left" aria-label="Chapga">◀</button><button class="adg-k" data-k="right" aria-label="O'ngga">▶</button></div>
        <button class="adg-g" id="adgear">D</button>
        <div class="adg-r"><button class="adg-k br" data-k="brake" aria-label="Tormoz">■</button><button class="adg-k gas" data-k="gas" aria-label="Gaz">▲</button></div></div>
      <div class="adg-end" id="ade" hidden></div></div>`;

    const rectHit = (px, py, r, o) => { const nx = Math.max(o.x, Math.min(px, o.x + o.w)), ny = Math.max(o.y, Math.min(py, o.y + o.h)), dx = px - nx, dy = py - ny, d2 = dx * dx + dy * dy; if (d2 >= r * r) return null; if (d2 > 1e-9) { const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, pen: r - d }; } return { nx: 0, ny: -1, pen: r }; };
    const circles = () => OFFS.map((o) => [S.x + Math.cos(S.th) * o, S.y + Math.sin(S.th) * o]);

    function physics(dt) {
      const L = keys.ArrowLeft || keys.a || btn.left, Rr = keys.ArrowRight || keys.d || btn.right, gas = keys.ArrowUp || keys.w || btn.gas, br = keys.ArrowDown || keys.s || keys[' '] || btn.brake;
      const tg = (Rr ? 1 : 0) - (L ? 1 : 0), rate = tg ? 3.2 : 5; S.st += Math.max(-rate * dt, Math.min(rate * dt, tg - S.st));
      let v = S.v;
      if (gas) v += S.gear * 4.2 * dt; else v -= Math.sign(v) * Math.min(Math.abs(v), (0.9 + 0.08 * Math.abs(v)) * dt);
      if (br) v -= Math.sign(v) * Math.min(Math.abs(v), 9 * dt);
      v = Math.max(-3.2, Math.min(9, v)); S.v = v;
      const d = 0.62 * S.st / (1 + Math.abs(v) / 7);
      S.th += (v / WB) * Math.tan(d) * dt; S.x += Math.cos(S.th) * v * dt; S.y += Math.sin(S.th) * v * dt;
      // to'qnashuvlar
      let hit = null; for (let it = 0; it < 2; it++) { for (const [px, py] of circles()) { for (const o of ex.solids) { const h = rectHit(px, py, R, o); if (h) { S.x += h.nx * h.pen; S.y += h.ny * h.pen; hit = o; } } } }
      if (hit) { const sp = Math.abs(S.v); S.v *= -0.15; if (sp > 0.8) { const t = time, last = hits.get(hit) || -9; if (t - last > 1.5) { hits.set(hit, t); gs.pen(hit.k === 'car' ? 15 : hit.k === 'curb' ? 10 : 10, hit.k === 'car' ? 'Mashinaga tegdingiz' : hit.k === 'curb' ? 'Yo\'l chetiga tegdingiz' : 'Devorga tegdingiz'); } } }
      for (const c of cones) { if (c.hit) { c.a = Math.min(1, c.a + dt * 4); continue; } for (const [px, py] of circles()) { if (Math.hypot(px - c.x, py - c.y) < R + 0.22) { c.hit = true; gs.pen(5, 'Konusga tegdingiz'); break; } } }
    }

    function inZone() {
      const z = ex.zone; if (!z) return false;
      if (!circles().every(([px, py]) => px >= z.x0 && px <= z.x1 && py >= z.y0 && py <= z.y1)) return false;
      const a = ((S.th % Math.PI) + Math.PI) % Math.PI, ang = z.axis === 'x' ? Math.min(a, Math.PI - a) : Math.abs(a - Math.PI / 2);
      return ang < 0.14;
    }

    function finish(ok, why) {
      state = 'end'; cancelAnimationFrame(raf); const e = document.getElementById('ade'); if (!e) return;
      const final = ok ? score : Math.min(score, 69); if (ok) saveBest(id, final);
      const stars = ok ? (final >= 95 ? 3 : final >= 88 ? 2 : 1) : 0, nxt = ORDER[ORDER.indexOf(id) + 1];
      track(ok ? 'autodrom_play_pass' : 'autodrom_play_fail');
      e.hidden = false; e.innerHTML = `<div class="card adg-card"><span class="chip ${ok ? 'ok' : 'bad'}">${ok ? "O'tdingiz!" : "Yiqildingiz"}</span><div class="big">${final}</div><div class="adg-star">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <p class="mute">${esc(why)}</p><div class="adg-act"><button class="btn primary lg" id="adretry">Qayta urinish</button>${ok && nxt ? `<a class="btn soft lg" href="#/autodrom/play/${nxt}">Keyingi mashq →</a>` : ''}<a class="btn ghost" href="#/autodrom/play">Mashqlar</a></div>
        <p class="mute" style="font-size:12.5px;margin-top:10px">Haqiqiy avtodromga onlayn yozilish — tez kunda.</p></div>`;
      document.getElementById('adretry').onclick = () => { try { VR.restart(); } catch (er) { location.reload(); } };
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
      if (state === 'run') {
        time += dt; physics(dt);
        const r = ex.step(gs, S); if (r === 'done') return finish(true, `Mashq bajarildi. Vaqt: ${fmt(time)}`);
        if (ex.zone && inZone() && Math.abs(S.v) < 0.25) { hold += dt; if (hold > 1) return finish(true, `To'g'ri joylashtirdingiz. Vaqt: ${fmt(time)}`); } else hold = 0;
        if (time > ex.limit) return finish(false, 'Vaqt tugadi');
        if (score <= 50) return finish(false, 'Juda ko\'p jarima ball');
        msgT -= dt; shake = Math.max(0, shake - dt);
      }
      draw(); hud();
    }
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    function hud() {
      const q = (i) => document.getElementById(i); if (!q('ads')) return;
      q('ads').textContent = score; q('adt').textContent = `${fmt(Math.max(0, ex.limit - time))} · ${Math.round(Math.abs(S.v) * 3.6)} km/s`; q('adh').textContent = ex.hint(gs) + (ex.zone && hold > 0 ? ' · ushlab turing…' : '');
      const m = q('adm'); m.textContent = msgT > 0 ? msg : ''; m.style.opacity = msgT > 0 ? 1 : 0; q('adgear').textContent = S.gear > 0 ? 'D' : 'R'; q('adgear').classList.toggle('rev', S.gear < 0);
    }

    function draw() {
      const g = cx, k = sc; camX += (S.x + Math.cos(S.th) * S.v * 0.25 - camX) * 0.12; camY += (S.y + Math.sin(S.th) * S.v * 0.25 - camY) * 0.12;
      const sx = shake > 0 ? (Math.random() - .5) * 4 : 0, sy = shake > 0 ? (Math.random() - .5) * 4 : 0;
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#2b2f3a'; g.fillRect(0, 0, cv.width, cv.height);
      g.setTransform(k, 0, 0, k, cv.width / 2 - camX * k + sx, cv.height / 2 - camY * k + sy);
      // asfalt to'r
      g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1 / k; g.beginPath();
      const x0 = Math.floor(camX - cv.width / 2 / k) - 1, x1 = x0 + cv.width / k + 2, y0 = Math.floor(camY - cv.height / 2 / k) - 1, y1 = y0 + cv.height / k + 2;
      for (let x = x0; x <= x1; x++) { g.moveTo(x, y0); g.lineTo(x, y1); } for (let y = y0; y <= y1; y++) { g.moveTo(x0, y); g.lineTo(x1, y); } g.stroke();
      if (ex.guide) { g.setLineDash([0.8, 0.8]); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 0.18; g.beginPath(); const gd = ex.guide; for (let i = 0; i < 2; i++) { const cc = i ? [8, 0] : [-8, 0]; g.moveTo(cc[0] + 8, cc[1]); g.arc(cc[0], cc[1], 8, 0, Math.PI * 2); } g.stroke(); g.setLineDash([]); }
      if (id === 'slalom') { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(-9, -66, 18, 74); for (let i = 0; i < 18; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#111'; g.fillRect(-9 + i, -58 - j, 1, 1); } }
      if (ex.slot) { const z = ex.zone; g.fillStyle = Math.abs(S.v) < 0.25 && inZone() ? 'rgba(61,220,132,.35)' : 'rgba(79,140,255,.22)'; g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 0.12; g.setLineDash([0.5, 0.4]); g.fillRect(ex.slot.x, ex.slot.y, ex.slot.w, ex.slot.h); g.strokeRect(ex.slot.x, ex.slot.y, ex.slot.w, ex.slot.h); g.setLineDash([]); }
      // to'siqlar
      ex.solids.forEach((o) => {
        if (o.k === 'car') { rr(g, o.x, o.y, o.w, o.h, .5, o.x < 0 ? '#c0504d' : '#4d7cc0'); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(o.x + o.w * .3, o.y + .25, o.w * .4, o.h - .5); }
        else if (o.k === 'curb') { g.fillStyle = '#58606f'; g.fillRect(o.x, o.y, o.w, o.h); g.fillStyle = '#7b8496'; g.fillRect(o.x, o.y, o.w, .35); }
        else { g.fillStyle = '#8b94a7'; g.fillRect(o.x, o.y, o.w, o.h); g.strokeStyle = '#eab308'; g.lineWidth = .15; g.strokeRect(o.x + .1, o.y + .1, o.w - .2, o.h - .2); }
      });
      cones.forEach((c) => { g.save(); g.translate(c.x, c.y); if (c.hit) { g.rotate(c.a * 1.2); g.globalAlpha = 1 - c.a * .4; } g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(0, 0, .34, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, .17, 0, 7); g.fill(); g.restore(); });
      // mashina
      g.save(); g.translate(S.x, S.y); g.rotate(S.th);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-CAR_L / 2 + .15, -CAR_W / 2 + .2, CAR_L, CAR_W);
      g.fillStyle = '#111'; [[-CAR_L / 2 + .6, 1], [WB - CAR_L / 2 + .6, 1]].forEach(([wx]) => { g.save(); g.translate(wx, 0); if (wx > 0) { } [-1, 1].forEach((s2) => { g.save(); g.translate(0, s2 * (CAR_W / 2)); if (wx > 0) g.rotate(0.62 * S.st / (1 + Math.abs(S.v) / 7)); g.fillRect(-.45, -.15, .9, .3); g.restore(); }); g.restore(); });
      rr(g, -CAR_L / 2, -CAR_W / 2, CAR_L, CAR_W, .45, '#f5c518'); g.fillStyle = 'rgba(20,28,45,.85)'; rr(g, -.9, -CAR_W / 2 + .2, 1.9, CAR_W - .4, .3, 'rgba(20,28,45,.85)'); rr(g, 1.0, -CAR_W / 2 + .25, .7, CAR_W - .5, .2, 'rgba(60,80,120,.8)');
      g.fillStyle = '#fff'; g.fillRect(CAR_L / 2 - .25, -CAR_W / 2 + .12, .2, .4); g.fillRect(CAR_L / 2 - .25, CAR_W / 2 - .52, .2, .4);
      g.fillStyle = (S.gear < 0 && S.v < -0.1) ? '#fff' : '#ff3b3b'; g.fillRect(-CAR_L / 2, -CAR_W / 2 + .12, .15, .4); g.fillRect(-CAR_L / 2, CAR_W / 2 - .52, .15, .4);
      g.restore();
    }
    function rr(g, x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); }

    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', ' ', 'r', 'e'].includes(k)) return;
      e.preventDefault(); if (e.type === 'keydown') { keys[k] = true; if ((k === 'r' || k === 'e') && !e.repeat) toggleGear(); } else keys[k] = false;
    };
    const toggleGear = () => { if (Math.abs(S.v) < 1.2) S.gear = -S.gear; else { msg = "Avval to'xtang, keyin R/D"; msgT = 1.2; } };
    const resize = () => { const a = document.getElementById('adg'); if (!a || !cv) return; const dpr = Math.min(2, window.devicePixelRatio || 1); W = a.clientWidth; H = a.clientHeight; cv.width = W * dpr; cv.height = H * dpr; sc = Math.min(W, H) / (id === 'slalom' || id === 'eight' ? 26 : 24) * dpr; };
    const VR = {
      restart() { Object.assign(S, { x: ex.start[0], y: ex.start[1], th: ex.start[2], v: 0, st: 0, gear: 1 }); time = 0; score = 100; hold = 0; msgT = 0; hits.clear(); cones.forEach((c) => { c.hit = false; c.a = 0; }); ex.init(gs); camX = S.x; camY = S.y; state = 'run'; document.getElementById('ade').hidden = true; last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    };
    return {
      html,
      mount() {
        document.body.classList.add('in-adg'); track('autodrom_play_' + id); cv = document.getElementById('adc'); cx = cv.getContext('2d'); resize(); ro = new ResizeObserver(resize); ro.observe(document.getElementById('adg'));
        addEventListener('keydown', onKey); addEventListener('keyup', onKey);
        document.querySelectorAll('.adg-k').forEach((b) => { const k = b.dataset.k, on = (e) => { e.preventDefault(); btn[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) { } }, off = () => { btn[k] = false; b.classList.remove('on'); }; b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off); });
        document.getElementById('adgear').addEventListener('click', toggleGear);
        document.getElementById('adg').addEventListener('contextmenu', (e) => e.preventDefault());
        window.__adg = { S, get score() { return score; }, get state() { return state; }, ex, cones, set: (o) => Object.assign(S, o), press: (k, v) => { btn[k] = v; } };
        raf = requestAnimationFrame(frame);
      },
      unmount() { document.body.classList.remove('in-adg'); cancelAnimationFrame(raf); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); if (ro) ro.disconnect(); delete window.__adg; },
    };
  }
})();
