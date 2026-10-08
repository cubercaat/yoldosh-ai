/* Simulyator: tepadan ko'rinadigan haydash simulyatori (mashq).
   Haqiqiy avtomobil fizikasi (velosiped modeli: rul burchagi, g'ildirak bazasi, tezlanish, tormoz), to'qnashuv va ball tizimi.
   Mashqlar: ilon (slalom), parallel parkovka, garajga orqaga kirish.
   Eslatma: bu mashq vositasi; rasmiy simulyator mezonlari avtomaktab va imtihon markaziga qarab farq qilishi mumkin. */
(function () {
  const { ico, esc, toast } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), shell = (a, h) => V.shellStudent(a, h);

  /* ================= GEOMETRIYA ================= */
  const CAR = { L: 2.6, over: 0.9, W: 1.8, front: 0.9 };                       // g'ildirak bazasi, orqa/old osma, kenglik (metr)
  const CAR_LEN = CAR.L + CAR.over + CAR.front;
  const rad = (d) => d * Math.PI / 180;
  const angDiff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
  /* mashina markazi va burchaklari (orqa o'q koordinatasidan) */
  function pose(c) { const cx = c.x + Math.cos(c.th) * (CAR.L / 2 + (CAR.front - CAR.over) / 2 + (CAR.over - CAR.over)), cy = c.y + Math.sin(c.th) * (CAR.L / 2 + (CAR.front - CAR.over) / 2); return { cx, cy }; }
  function corners(c) {
    const ux = Math.cos(c.th), uy = Math.sin(c.th), vx = -uy, vy = ux, m = pose(c), hl = CAR_LEN / 2, hw = CAR.W / 2;
    return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => ({ x: m.cx + ux * hl * a + vx * hw * b, y: m.cy + uy * hl * a + vy * hw * b }));
  }
  /* o'qlarga parallel to'rtburchak (cx,cy,w,h) bilan SAT */
  function hitRect(c, r) {
    const pts = corners(c), minx = r.x - r.w / 2, maxx = r.x + r.w / 2, miny = r.y - r.h / 2, maxy = r.y + r.h / 2;
    if (pts.every(p => p.x < minx) || pts.every(p => p.x > maxx) || pts.every(p => p.y < miny) || pts.every(p => p.y > maxy)) return false;
    const rc = [{ x: minx, y: miny }, { x: maxx, y: miny }, { x: maxx, y: maxy }, { x: minx, y: maxy }];
    for (let i = 0; i < 4; i++) {
      const p = pts[i], q = pts[(i + 1) % 4], ax = -(q.y - p.y), ay = q.x - p.x, len = Math.hypot(ax, ay) || 1, nx = ax / len, ny = ay / len;
      const pr = (arr) => { let mn = 1e9, mx = -1e9; arr.forEach(t => { const d = t.x * nx + t.y * ny; if (d < mn) mn = d; if (d > mx) mx = d; }); return [mn, mx]; };
      const a = pr(pts), b = pr(rc); if (a[1] < b[0] || b[1] < a[0]) return false;
    }
    return true;
  }
  function hitCircle(c, k) {
    const m = pose(c), dx = k.x - m.cx, dy = k.y - m.cy, ux = Math.cos(c.th), uy = Math.sin(c.th), lx = dx * ux + dy * uy, ly = -dx * uy + dy * ux;
    const qx = Math.max(-CAR_LEN / 2, Math.min(CAR_LEN / 2, lx)), qy = Math.max(-CAR.W / 2, Math.min(CAR.W / 2, ly));
    return Math.hypot(lx - qx, ly - qy) < k.r;
  }
  const insideRect = (c, r, m = 0) => corners(c).every(p => p.x >= r.x - r.w / 2 - m && p.x <= r.x + r.w / 2 + m && p.y >= r.y - r.h / 2 - m && p.y <= r.y + r.h / 2 + m);

  /* ================= MASHQLAR ================= */
  const rect = (x, y, w, h, kind, extra) => ({ x, y, w, h, kind, ...extra });
  const EX = {
    slalom: {
      id: 'slalom', title: `Ilon (slalom)`, icon: 'cone', limit: 90, w: 64, h: 20, lead: `Konuslar orasidan navbat bilan chap-o'ng aylanib o'ting va marraga yeting.`,
      start: { x: 5, y: 10, th: 0, gear: 1 },
      build() {
        const cones = [16, 24, 32, 40, 48].map((x, i) => ({ x, y: 10, r: 0.28, fallen: false, i }));
        return { cones, rects: [], zones: [], finishX: 57, lines: [rect(32, 3.2, 62, 0.15, 'edge'), rect(32, 16.8, 62, 0.15, 'edge')], bounds: { y0: 3.2, y1: 16.8 }, side: [] };
      },
    },
    parallel: {
      id: 'parallel', title: `Parallel parkovka`, icon: 'car', limit: 150, w: 36, h: 16, lead: `Ikki turgan mashina orasidagi joyga orqaga yurib parkovka qiling va to'xtang.`,
      start: { x: 26, y: 9.4, th: Math.PI, gear: 1 },
      build() {
        const A = rect(8.6, 4.4, CAR_LEN, 1.8, 'car', { color: '#4D8DFF' }), B = rect(19.4, 4.4, CAR_LEN, 1.8, 'car', { color: '#FF7A5C' });
        const slot = rect(14.0, 4.5, 6.2, 2.6, 'slot');
        return { cones: [], rects: [A, B, rect(18, 2.2, 36, 0.8, 'curb')], zones: [slot], finishX: null, lines: [], bounds: { y0: 0, y1: 99 }, slot, target: { ang: [0, Math.PI] } };
      },
    },
    garage: {
      id: 'garage', title: `Garajga orqaga kirish`, icon: 'car', limit: 150, w: 36, h: 22, lead: `Mashinani orqaga yurgizib garajga to'g'ri kiriting va to'xtating.`,
      start: { x: 29, y: 14.8, th: Math.PI, gear: 1 },
      build() {
        const gx = 14.2, inner = 3.3, wall = 0.3, y0 = 3, depth = 6.4;
        const slot = rect(gx, y0 + depth / 2, inner, depth, 'slot');
        return { cones: [], rects: [rect(gx - inner / 2 - wall / 2, y0 + depth / 2, wall, depth, 'wall'), rect(gx + inner / 2 + wall / 2, y0 + depth / 2, wall, depth, 'wall'), rect(gx, y0 - wall / 2, inner + 2 * wall, wall, 'wall')], zones: [slot], finishX: null, lines: [], bounds: { y0: -99, y1: 19.6 }, slot, target: { ang: [Math.PI / 2] } };
      },
    },
  };

  /* ================= SIMULYATSIYA ================= */
  function makeSim(id) {
    const ex = EX[id], w = ex.build(), c = { x: ex.start.x, y: ex.start.y, th: ex.start.th, v: 0, steer: 0 };
    return { ex, c, w, gear: ex.start.gear, t: 0, score: 100, events: [], flags: {}, state: 'run', stopT: 0, inp: { gas: 0, brake: 0, steer: 0 }, brakeLight: false, msg: ex.lead, msgT: 6 };
  }
  function penalty(sim, key, label, pts, cool) {
    const last = sim.flags[key]; if (last != null && sim.t - last < (cool || 1.5)) { sim.flags[key] = sim.t; return; }
    sim.flags[key] = sim.t; sim.score = Math.max(0, sim.score - pts); sim.events.push({ t: sim.t, label, pts }); sim.msg = `${label}: −${pts}`; sim.msgT = 2.5;
  }
  function finish(sim, ok) {
    if (sim.state !== 'run') return;
    if (ok) { const bonus = Math.max(0, Math.round((sim.ex.limit - sim.t) / sim.ex.limit * 0)); sim.score = Math.min(100, sim.score + bonus); }
    if (sim.t > sim.ex.limit) { sim.score = Math.max(0, sim.score - 10); sim.events.push({ t: sim.t, label: `Vaqt oshdi`, pts: 10 }); }
    sim.state = ok ? 'done' : 'fail'; sim.pass = ok && sim.score >= 70;
  }

  function step(sim, dt) {
    if (sim.state !== 'run') return;
    const c = sim.c, i = sim.inp; sim.t += dt; if (sim.msgT > 0) sim.msgT -= dt;
    // rul (tezlikka qarab cheklanadi)
    const maxD = 0.62 / (1 + 0.12 * c.v * c.v), tgt = i.steer * maxD, rate = 2.4 * dt;
    c.steer += Math.max(-rate, Math.min(rate, tgt - c.steer));
    // tezlik
    const dir = sim.gear;
    let a = i.gas * 2.6 * dir;
    c.v += a * dt;
    if (i.brake > 0) { const d = 9 * i.brake * dt; c.v = Math.abs(c.v) <= d ? 0 : c.v - Math.sign(c.v) * d; }
    const drag = (0.35 * c.v) * dt, roll = 0.5 * dt;
    c.v -= drag; if (!i.gas) c.v = Math.abs(c.v) <= roll ? 0 : c.v - Math.sign(c.v) * roll;
    c.v = Math.max(-2.2, Math.min(4.4, c.v));
    sim.brakeLight = i.brake > 0.1;
    // harakat (orqa o'q atrofida)
    const prev = { x: c.x, y: c.y, th: c.th };
    c.th += c.v / CAR.L * Math.tan(c.steer) * dt; c.x += Math.cos(c.th) * c.v * dt; c.y += Math.sin(c.th) * c.v * dt;
    const w = sim.w, ex = sim.ex;
    // to'siqlar
    let blocked = false;
    for (const r of w.rects) {
      if (hitRect(c, r)) {
        blocked = true;
        if (r.kind === 'car') penalty(sim, 'car' + r.x, `Turgan mashinaga tegdi`, 15, 1.2);
        else if (r.kind === 'curb') penalty(sim, 'curb', `Yo'l chetiga tegdi`, 10, 1.2);
        else penalty(sim, 'wall' + r.x, `Devorga tegdi`, 10, 1.2);
      }
    }
    // maydon chegarasi
    const pts = corners(c); if (pts.some(p => p.x < 0.2 || p.x > ex.w - 0.2 || p.y < 0.2 || p.y > ex.h - 0.2)) { blocked = true; penalty(sim, 'bound', `Maydondan chiqdi`, 5, 1.5); }
    if (blocked) { c.x = prev.x; c.y = prev.y; c.th = prev.th; c.v = -c.v * 0.15; }
    // konuslar
    w.cones.forEach(k => { if (!k.fallen && hitCircle(c, k)) { k.fallen = true; k.dx = Math.cos(c.th) * Math.max(0.5, Math.abs(c.v)) * 0.4; k.dy = Math.sin(c.th) * Math.max(0.5, Math.abs(c.v)) * 0.4; penalty(sim, 'cone' + k.i, `Konusni yiqitdi`, 10, 99); } });
    w.cones.forEach(k => { if (k.fallen && (k.dx || k.dy)) { k.x += k.dx * dt; k.y += k.dy * dt; k.dx *= 0.9; k.dy *= 0.9; if (Math.abs(k.dx) + Math.abs(k.dy) < 0.02) { k.dx = k.dy = 0; } } });
    // ilon: konuslar tomonidan navbatma-navbat o'tish va chiziqlar
    if (id(sim) === 'slalom') {
      w.cones.forEach(k => { if (sim.flags['s' + k.i] == null && pose(c).cx > k.x) { sim.flags['s' + k.i] = Math.sign(pose(c).cy - 10) || 1; const j = k.i; if (j > 0 && sim.flags['s' + (j - 1)] === sim.flags['s' + j] && !k.fallen) penalty(sim, 'weave' + j, `Konuslar orasidan navbat bilan o'tmadingiz`, 10, 99); } });
      if (pts.some(p => p.y < w.bounds.y0 || p.y > w.bounds.y1)) penalty(sim, 'line', `Chiziqdan chiqdi`, 5, 1.5);
      if (pose(c).cx + CAR_LEN / 2 > w.finishX) finish(sim, true);
    } else {
      // parkovka / garaj: to'liq ichkarida, parallel va to'xtagan
      const slot = w.slot, ok = insideRect(c, slot, 0.05);
      const th = ((c.th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const angOk = w.target.ang.some(t => Math.abs(angDiff(th, t)) < rad(id(sim) === 'garage' ? 8 : 9));
      if (id(sim) === 'parallel' && pts.some(p => p.y < 3.1)) penalty(sim, 'curbline', `Yo'l chetiga chiqdi`, 10, 1.5);
      if (ok && angOk && Math.abs(c.v) < 0.08 && !i.gas) { sim.stopT += dt; sim.msg = `Ushlab turing…`; sim.msgT = 0.3; if (sim.stopT > 0.9) finish(sim, true); } else sim.stopT = 0;
    }
    if (sim.t > ex.limit + 60) finish(sim, false);
  }
  const id = (sim) => sim.ex.id;

  /* ================= CHIZISH ================= */
  let noise = null;
  function asphalt(g) {
    if (!noise) { noise = document.createElement('canvas'); noise.width = noise.height = 128; const n = noise.getContext('2d'); n.fillStyle = '#2b2f38'; n.fillRect(0, 0, 128, 128); for (let i = 0; i < 1400; i++) { const v = 30 + Math.random() * 40 | 0; n.fillStyle = `rgba(${v + 20},${v + 22},${v + 30},${Math.random() * .5})`; n.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5); } }
    return g.createPattern(noise, 'repeat');
  }
  function drawCar(g, car, color, o = {}) {
    g.save(); g.translate(o.cx, o.cy); g.rotate(o.th || 0);
    const L = CAR_LEN, W = CAR.W; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
    g.fillStyle = color; rr(g, -L / 2, -W / 2, L, W, 0.5); g.fill(); g.shadowColor = 'transparent';
    // g'ildiraklar
    g.fillStyle = '#10141c'; const fx = CAR.L / 2 + (CAR.over - CAR.front) / 2 * 0, ax = [CAR.L / 2 - (CAR.front - CAR.over) / 2, -CAR.L / 2 - (CAR.front - CAR.over) / 2]; ax.forEach((x, k) => [-1, 1].forEach(s => { g.save(); g.translate(x, s * (W / 2 - 0.05)); if (k === 0 && o.steer) g.rotate(o.steer); g.fillRect(-0.36, -0.12, 0.72, 0.24); g.restore(); }));
    // oynalar va tom
    g.fillStyle = 'rgba(20,28,45,.92)'; rr(g, -L * 0.1, -W / 2 + 0.17, L * 0.32, W - 0.34, 0.25); g.fill(); rr(g, L * 0.2, -W / 2 + 0.2, L * 0.12, W - 0.4, 0.15); g.fill(); rr(g, -L * 0.36, -W / 2 + 0.2, L * 0.14, W - 0.4, 0.15); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, -L * 0.08, -W / 2 + 0.22, L * 0.28, W - 0.44, 0.2); g.fill();
    // faralar va stop-signallar
    g.fillStyle = '#FFEFA8'; g.fillRect(L / 2 - 0.12, -W / 2 + 0.12, 0.12, 0.38); g.fillRect(L / 2 - 0.12, W / 2 - 0.5, 0.12, 0.38);
    g.fillStyle = o.brake ? '#ff2d3d' : '#8a1620'; g.fillRect(-L / 2, -W / 2 + 0.12, 0.12, 0.38); g.fillRect(-L / 2, W / 2 - 0.5, 0.12, 0.38);
    if (o.rev) { g.fillStyle = '#fff'; g.fillRect(-L / 2, -0.15, 0.12, 0.3); }
    g.restore();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function draw(g, sim, cv, view, rot) {
    const ex = sim.ex, w = sim.w, c = sim.c, cw = cv.clientWidth, ch = cv.clientHeight, dpr = cv.width / cw;
    const sc = rot ? cw / Math.min(view, 17) : cw / view, vw = rot ? ch / sc : cw / sc, vh = rot ? cw / sc : ch / sc;       // telefonda (tik ekran) maydon 90° buriladi
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#10141c'; g.fillRect(0, 0, cw, ch);
    const m = pose(c), camX = ex.w <= vw ? ex.w / 2 - vw / 2 : Math.max(0, Math.min(ex.w - vw, m.cx - vw / 2)), camY = ex.h <= vh ? ex.h / 2 - vh / 2 : Math.max(0, Math.min(ex.h - vh, m.cy - vh / 2));
    g.save(); g.scale(sc, sc); if (rot) { g.translate(vh, 0); g.rotate(Math.PI / 2); } g.translate(-camX, -camY);
    // asfalt
    g.fillStyle = asphalt(g); g.fillRect(0, 0, ex.w, ex.h);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < ex.w; x += 4) g.fillRect(x, 0, 0.04, ex.h);
    const id0 = ex.id;
    if (id0 === 'slalom') {
      g.fillStyle = 'rgba(255,255,255,.88)'; w.lines.forEach(l => g.fillRect(l.x - l.w / 2, l.y - l.h / 2, l.w, l.h));
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(2, 8.4, 6.5, 3.2); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '0.7px sans-serif'; g.fillText('START', 3.2, 10.15);
      for (let y = 3.2; y < 16.8; y += 0.8) { g.fillStyle = ((y / 0.8 | 0) % 2) ? '#fff' : '#111'; g.fillRect(w.finishX, y, 0.6, 0.8); g.fillStyle = ((y / 0.8 | 0) % 2) ? '#111' : '#fff'; g.fillRect(w.finishX + 0.6, y, 0.6, 0.8); }
    } else {
      // yo'l chetlari
      g.fillStyle = '#6c7280'; g.fillRect(0, 0, ex.w, id0 === 'parallel' ? 3 : 0);
      if (id0 === 'parallel') { g.fillStyle = '#9aa3b4'; g.fillRect(0, 2.9, ex.w, 0.2); g.fillStyle = 'rgba(255,255,255,.55)'; const s = w.slot; g.setLineDash([0.3, 0.2]); g.lineWidth = 0.1; g.strokeStyle = 'rgba(255,255,255,.7)'; g.strokeRect(s.x - s.w / 2, 3.1, s.w, 2.9); g.setLineDash([]); g.fillStyle = 'rgba(255,255,255,.4)'; for (let x = 1; x < ex.w; x += 3) g.fillRect(x, 12.9, 1.6, 0.12); }
      else { g.fillStyle = '#7b8393'; g.fillRect(0, 0, ex.w, 2.9); const s = w.slot; g.fillStyle = 'rgba(88,204,2,.12)'; g.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h); g.setLineDash([0.3, 0.2]); g.lineWidth = 0.1; g.strokeStyle = 'rgba(255,255,255,.7)'; g.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h); g.setLineDash([]); g.fillStyle = 'rgba(255,255,255,.4)'; for (let x = 1; x < ex.w; x += 3) g.fillRect(x, 19.7, 1.6, 0.12); }
      w.rects.forEach(r => {
        if (r.kind === 'car') drawCar(g, null, r.color, { cx: r.x, cy: r.y, th: 0 });
        else if (r.kind === 'wall') { g.fillStyle = '#c9ced9'; g.fillRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(r.x - r.w / 2 + 0.06, r.y - r.h / 2 + 0.06, r.w, r.h); }
      });
    }
    // konuslar
    w.cones.forEach(k => { g.save(); g.translate(k.x, k.y); if (k.fallen) g.rotate(1.2); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(0.06, 0.08, 0.34, 0, 7); g.fill(); g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(0, 0, 0.3, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 0.19, 0, 7); g.fill(); g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(0, 0, 0.09, 0, 7); g.fill(); g.restore(); });
    // mashina
    drawCar(g, null, '#F4F7FC', { cx: m.cx, cy: m.cy, th: c.th, steer: c.steer, brake: sim.brakeLight, rev: sim.gear < 0 });
    g.restore();
  }

  /* ================= SAHIFA ================= */
  const bestOf = (id0) => ((Store.s.drive || {})[id0]) || 0;
  V.drive = () => ({
    html: shell('home', `<div class="page-h"><div><h1>Simulyator</h1><p>Haqiqiy fizikali haydash mashqi. Rulni boshqaring, konuslarga tegmang, parkovka qiling.</p></div><a class="btn ghost" href="#/app">← Bosh sahifa</a></div>
    <div class="stack">${Object.values(EX).map(e => `<a class="card dv-c" href="#/app/drive/${e.id}"><span class="rw-i">${ico(e.icon)}</span><div style="flex:1;min-width:0"><b style="font-size:18px">${esc(e.title)}</b><div class="mute" style="font-size:14px">${esc(e.lead)}</div></div><div style="text-align:right"><small class="mute">Eng yaxshi</small><div style="font-size:22px;font-weight:800;color:${bestOf(e.id) >= 70 ? 'var(--ok)' : 'var(--text)'}">${bestOf(e.id) ? bestOf(e.id) : '—'}</div></div></a>`).join('')}</div>
    <div class="banner mt">${ico('alert')}<span>Boshqaruv: telefonda pastdagi rul va pedallar; kompyuterda <b>↑</b> gaz, <b>↓</b> tormoz, <b>← →</b> rul, <b>R</b> orqaga/oldinga uzatma.</span></div>`)
  });

  V.drivePlay = (exId) => {
    const ex = EX[exId]; if (!ex) return { redirect: '#/app/drive' };
    let sim = makeSim(exId), raf = 0, last = 0, acc = 0, cv, g, off = [], view = 30, hudT = 0, rot = false;
    const html = `<div class="dv"><canvas id="dvc" aria-label="Simulyator maydoni"></canvas>
      <div class="dv-top"><a class="dv-b" href="#/app/drive" aria-label="Chiqish">${ico('x')}</a><div class="dv-t"><b>${esc(ex.title)}</b><span id="dvm"></span></div><div class="dv-s"><b id="dvs">100</b><small>ball</small></div></div>
      <div class="dv-hud"><span id="dvspd">0</span><small>km/s</small><button class="dv-g" id="dvg" aria-label="Uzatma">D</button></div>
      <div class="dv-ctl"><div class="dv-steer"><input id="dvr" type="range" min="-100" max="100" value="0" aria-label="Rul"></div><div class="dv-ped"><button id="dvbr" class="br" aria-label="Tormoz">Tormoz</button><button id="dvgs" class="gs" aria-label="Gaz">Gaz</button></div></div>
      <div class="dv-end" id="dve" hidden></div></div>`;
    const keys = {};
    const onKey = (e, d) => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(k)) e.preventDefault(); if (d && k === 'r' && !e.repeat) toggleGear(); keys[k] = d; };
    const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
    const press = { gas: 0, brake: 0 };
    function toggleGear() { if (Math.abs(sim.c.v) > 0.3) { sim.msg = `Avval to'xtang`; sim.msgT = 1.2; return; } sim.gear *= -1; const b = document.getElementById('dvg'); if (b) { b.textContent = sim.gear > 0 ? 'D' : 'R'; b.classList.toggle('r', sim.gear < 0); } }
    function inputs() {
      const k = keys, steerK = (k['arrowright'] || k['d'] ? 1 : 0) - (k['arrowleft'] || k['a'] ? 1 : 0), r = document.getElementById('dvr');
      sim.inp.steer = steerK || (r ? +r.value / 100 : 0);
      sim.inp.gas = (k['arrowup'] || k['w'] || press.gas) ? 1 : 0; sim.inp.brake = (k['arrowdown'] || k['s'] || k[' '] || press.brake) ? 1 : 0;
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame); if (!last) last = ts; let dt = Math.min(0.05, (ts - last) / 1000); last = ts; acc += dt;
      while (acc >= 1 / 60) { inputs(); step(sim, 1 / 60); acc -= 1 / 60; }
      draw(g, sim, cv, view, rot); hudT += dt; if (hudT > 0.08) { hudT = 0; hud(); }
      if (sim.state !== 'run') endScreen();
    }
    function hud() {
      const s = document.getElementById('dvs'); if (!s) return; s.textContent = sim.score; document.getElementById('dvspd').textContent = Math.round(Math.abs(sim.c.v) * 3.6);
      const m = document.getElementById('dvm'); m.textContent = sim.msgT > 0 ? sim.msg : `${Math.floor(sim.t / 60)}:${String(Math.floor(sim.t % 60)).padStart(2, '0')} / ${Math.floor(ex.limit / 60)}:${String(ex.limit % 60).padStart(2, '0')}`; m.className = sim.msgT > 0 && /−/.test(sim.msg) ? 'bad' : '';
    }
    let ended = false;
    function endScreen() {
      if (ended) return; ended = true; const d = Store.s.drive = Store.s.drive || {}, first = sim.pass && !(d[exId] >= 70);
      if (sim.score > (d[exId] || 0)) d[exId] = sim.score; if (first && Store.addPoints) Store.addPoints(20, `Simulyator: ${ex.title}`); Store.save();
      const el = document.getElementById('dve'); if (!el) return; el.hidden = false;
      el.innerHTML = `<div class="dv-card"><div class="chip ${sim.pass ? 'ok' : 'bad'}">${sim.pass ? `Topshirdingiz` : `Bu safar bo'lmadi`}</div><div class="dv-big">${sim.score}</div><p class="mute">ball · ${Math.floor(sim.t)} soniya${first ? ' · +20 ball' : ''}</p>
        ${sim.events.length ? `<div class="dv-ev">${sim.events.map(e => `<div><span>${esc(e.label)}</span><b>−${e.pts}</b></div>`).join('')}</div>` : `<p>Xatosiz! Barakalla.</p>`}
        <div class="ai-acts" style="justify-content:center"><button class="btn primary" id="dvre">Qayta urinish</button><a class="btn soft" href="#/app/drive">Mashqlar</a></div></div>`;
      document.getElementById('dvre').addEventListener('click', () => { sim = makeSim(exId); ended = false; el.hidden = true; acc = 0; const r = document.getElementById('dvr'); if (r) r.value = 0; const b = document.getElementById('dvg'); b.textContent = 'D'; b.classList.remove('r'); });
    }
    return {
      html,
      mount() {
        cv = document.getElementById('dvc'); g = cv.getContext('2d'); document.body.classList.add('dv-on');
        const fit = () => { const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; view = r.width < 560 ? 20 : 30; rot = r.height > r.width * 1.1; };
        fit(); window.addEventListener('resize', fit); off.push(() => window.removeEventListener('resize', fit));
        window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); off.push(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
        const hold = (id0, k) => { const b = document.getElementById(id0), on = (e) => { e.preventDefault(); press[k] = 1; b.classList.add('on'); }, offf = () => { press[k] = 0; b.classList.remove('on'); }; b.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, offf)); };
        hold('dvgs', 'gas'); hold('dvbr', 'brake');
        const r = document.getElementById('dvr'); const rel = () => { r.value = 0; }; ['pointerup', 'touchend', 'pointercancel'].forEach(ev => r.addEventListener(ev, rel));
        document.getElementById('dvg').addEventListener('click', toggleGear);
        const vis = () => { if (document.hidden) { last = 0; } }; document.addEventListener('visibilitychange', vis); off.push(() => document.removeEventListener('visibilitychange', vis));
        raf = requestAnimationFrame(frame); window.__drive = { get sim() { return sim; }, step, makeSim };
      },
      unmount() { cancelAnimationFrame(raf); off.forEach(f => f()); off = []; document.body.classList.remove('dv-on'); },
    };
  };
  V.driveLib = { makeSim, step, corners, EX, CAR_LEN };
})();




