/* Animatsiyali chorraha sahnalari.
   Rasmiy savollardagi chorraha rasmlari skrinshot bo'lgani uchun, ular shu yerda SXEMA sifatida qayta chiziladi:
   yuqoridan ko'rinish, mashinalar o'z yo'nalishi bo'yicha yuradi. To'g'ri javobda — to'g'ri tartibda o'tadi,
   xato javobda — o'sha tanlov bo'yicha harakat qilinsa, qaysi mashinalar to'qnashishi ko'rsatiladi.
   Sxema rasmning aynan nusxasi emas (mashinalarning aniq joyi/burilishi taxminiy); javob esa manbadagi kalit bo'yicha. */
(function () {
  const W = 640, H = 400, SC = 10, CX = W / 2, CY = H / 2;      // dunyo birligi ≈ 1 m; ekran: 8 px/m
  const LANE = 2.6, HALF = 5.4, STOP = 7.4, FAR = 44;

  /* ---------- yo'nalishlar ---------- */
  const ARM = { S: { d: [0, -1] }, N: { d: [0, 1] }, W: { d: [1, 0] }, E: { d: [-1, 0] } };   // arm = qayerdan keladi; d = yurish yo'nalishi (ekran y pastga)
  const right = (d) => [-d[1], d[0]], left = (d) => [d[1], -d[0]];
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const mul = (v, k) => [v[0] * k, v[1] * k];

  function buildPath(from, turn, off = LANE, back = 0) {
    const d = ARM[from].d, r = right(d);
    const lane = add([0, 0], r, off);
    const start = add(add(lane, d, -FAR - back), [0, 0]);
    const pStop = add(lane, d, -STOP);
    let d2 = d;
    if (turn === 'right') d2 = right(d); else if (turn === 'left') d2 = left(d); else if (turn === 'uturn') d2 = mul(d, -1);
    const lane2 = add([0, 0], right(d2), off);
    const pExit = add(lane2, d2, STOP);
    const pts = [start, pStop];
    if (turn === 'straight' || !turn) pts.push(pExit);
    else {
      // laneların kesishuvi: control nuqta
      const c = turn === 'uturn' ? add(add(lane, d, 6), right(d), -off * 2) : (Math.abs(d[0]) > 0 ? [lane2[0], lane[1]] : [lane[0], lane2[1]]);
      for (let k = 1; k <= 22; k++) { const t = k / 22, a = 1 - t; pts.push([a * a * pStop[0] + 2 * a * t * c[0] + t * t * pExit[0], a * a * pStop[1] + 2 * a * t * c[1] + t * t * pExit[1]]); }
    }
    pts.push(add(pExit, d2, FAR));
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    return { pts, cum, len: cum[cum.length - 1], sStop: cum[1], sExit: cum[pts.length - 2] };
  }
  function at(path, s) {
    s = Math.max(0, Math.min(path.len, s));
    let i = 1; while (i < path.cum.length - 1 && path.cum[i] < s) i++;
    const a = path.pts[i - 1], b = path.pts[i], seg = path.cum[i] - path.cum[i - 1] || 1, t = (s - path.cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function segIntersect(p1, p2, p3, p4) {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]); if (Math.abs(d) < 1e-9) return null;
    const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d, u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])] : null;
  }
  function meetPoint(A, B) {
    // A va B yo'llarining kesishgan joyi (chorraha ichida)
    let best = null, bd = 1e9;
    for (let i = 1; i < A.pts.length; i++) for (let j = 1; j < B.pts.length; j++) {
      const p = segIntersect(A.pts[i - 1], A.pts[i], B.pts[j - 1], B.pts[j]);
      if (p && Math.hypot(p[0], p[1]) < bd) { bd = Math.hypot(p[0], p[1]); best = p; }
    }
    return best || [0, 0];
  }
  function sAtPoint(path, p) { let best = 0, bd = 1e9; for (let s = path.sStop; s <= path.sExit; s += 0.25) { const q = at(path, s), dd = Math.hypot(q.x - p[0], q.y - p[1]); if (dd < bd) { bd = dd; best = s; } } return best; }

  /* ---------- transport turlari ---------- */
  const KIND = {
    car: { L: 4.5, Wd: 2.0 }, truck: { L: 9.5, Wd: 2.5 }, bus: { L: 11.5, Wd: 2.6 }, tram: { L: 19, Wd: 2.6, rail: true },
    moto: { L: 2.3, Wd: 0.9 }, bike: { L: 1.9, Wd: 0.7 }, tractor: { L: 5, Wd: 2.4 },
  };
  const COLORS = { red: '#e23b44', blue: '#2f56e8', green: '#43c24d', yellow: '#f4c92a', white: '#eef1f6', bus: '#37b34a', tram: '#3c9b5a', truck: '#b9bfc9', moto: '#f4c92a', bike: '#222' };
  const WORD = { red: 'Qizil', blue: "Ko'k", green: 'Yashil', yellow: 'Sariq', tram: 'Tramvay', bus: 'Avtobus', moto: 'Mototsikl', bike: 'Velosiped', truck: 'Yuk avtomobili', white: 'Oq avtomobil' };

  /* ---------- sahna ma'lumotlari ----------
     cars: id -> {k:kind, c:rang, from, turn, back?, off?}   order: to'g'ri tartib (guruhlar)   signs: [{arm, t}]   alias: {car:id}
     opts: (ixtiyoriy) variant indeksi -> tartib. Bo'lmasa variant matni avtomatik tahlil qilinadi. */
  const S = {};
  const car = (c, from, turn = 'straight', extra) => Object.assign({ k: 'car', c, from, turn }, extra || {});
  S.A = { cars: { green: car('green', 'W'), yellow: car('yellow', 'E', 'left'), red: car('red', 'N', 'right'), blue: car('blue', 'N', 'straight', { back: 7 }) }, order: [['green'], ['yellow'], ['blue'], ['red']], signs: [] };
  S.B = { cars: { red: car('red', 'E', 'straight'), bus: { k: 'bus', c: 'bus', from: 'E', turn: 'straight', back: 8 }, tram: { k: 'tram', c: 'tram', from: 'W', turn: 'straight', off: 0 } }, order: [['red', 'bus'], ['tram']], alias: { car: 'red' }, signs: [{ arm: 'S', t: 'light', c: 'red' }] };
  S.C = { cars: { red: car('red', 'W', 'straight'), tram: { k: 'tram', c: 'tram', from: 'E', turn: 'straight', off: 0 } }, order: [['red'], ['tram']], alias: { car: 'red' }, signs: [{ arm: 'S', t: 'light', c: 'green' }], opts: { 0: [['tram'], ['red']], 1: [['red'], ['tram']] } };
  S.D = { cars: { red: car('red', 'W', 'straight'), tram: { k: 'tram', c: 'tram', from: 'E', turn: 'straight', off: 0 }, bus: { k: 'bus', c: 'bus', from: 'E', turn: 'straight', back: 10 } }, order: [['red'], ['tram', 'bus']], alias: { car: 'red' }, signs: [{ arm: 'S', t: 'light', c: 'red' }] };
  S.E = { cars: { blue: car('blue', 'N', 'straight'), green: car('green', 'S', 'left') }, order: [['blue'], ['green']], signs: [{ arm: 'S', t: 'main' }, { arm: 'S', t: 'light', c: 'green' }], opts: { 0: [['blue'], ['green']], 1: [['green'], ['blue']] } };
  S.F = { cars: { red: car('red', 'E', 'left'), moto: { k: 'moto', c: 'moto', from: 'W', turn: 'straight' } }, order: [['moto'], ['red']], alias: { car: 'red' }, signs: [{ arm: 'S', t: 'light', c: 'green' }], opts: { 0: [['red'], ['moto']], 1: [['moto'], ['red']] } };
  S.G = { cars: { moto: { k: 'moto', c: 'moto', from: 'E', turn: 'straight' }, blue: car('blue', 'W', 'left'), tram: { k: 'tram', c: 'tram', from: 'N', turn: 'straight', off: 0 } }, order: [['moto'], ['tram', 'blue']], alias: { car: 'blue' }, signs: [{ arm: 'E', t: 'main' }, { arm: 'W', t: 'yield' }] };
  S.H = { cars: { tram: { k: 'tram', c: 'tram', from: 'W', turn: 'straight', off: 0 }, bus: { k: 'bus', c: 'bus', from: 'N', turn: 'straight' }, blue: car('blue', 'S', 'straight') }, order: [['tram'], ['bus', 'blue']], alias: { car: 'blue' }, signs: [] };
  S.I = { cars: { tram: { k: 'tram', c: 'tram', from: 'E', turn: 'straight', off: 0 }, red: car('red', 'E', 'straight', { back: 25 }), blue: car('blue', 'W', 'right'), green: car('green', 'S', 'left') }, order: [['tram'], ['red'], ['green'], ['blue']], signs: [{ arm: 'W', t: 'yield' }, { arm: 'S', t: 'yield' }] };
  S.J = { cars: { red: car('red', 'N', 'straight'), tram: { k: 'tram', c: 'tram', from: 'E', turn: 'straight', off: 0 }, blue: car('blue', 'W', 'straight') }, order: [['red'], ['tram'], ['blue']], signs: [{ arm: 'S', t: 'main' }, { arm: 'W', t: 'yield' }] };
  S.K = { cars: { green: car('green', 'S', 'straight'), red: car('red', 'W', 'right'), blue: car('blue', 'N', 'straight'), yellow: car('yellow', 'E', 'left') }, order: [['green'], ['red'], ['blue'], ['yellow']], signs: [{ arm: 'S', t: 'main' }, { arm: 'E', t: 'stop' }] };
  S.L = { cars: { red: car('red', 'W', 'right'), blue: { k: 'truck', c: 'blue', from: 'E', turn: 'straight' }, green: car('green', 'N', 'right') }, order: [['red'], ['blue'], ['green']], signs: [] };
  S.M = { cars: { red: car('red', 'W', 'right'), blue: car('blue', 'E', 'straight'), green: car('green', 'S', 'left') }, order: [['green'], ['red'], ['blue']], signs: [{ arm: 'S', t: 'main' }, { arm: 'E', t: 'yield' }] };
  S.N = { cars: { yellow: car('yellow', 'W', 'left'), red: car('red', 'N', 'straight'), green: car('green', 'E', 'straight'), blue: car('blue', 'S', 'left') }, order: [['red'], ['blue', 'yellow'], ['green']], signs: [{ arm: 'S', t: 'main' }, { arm: 'W', t: 'yield' }, { arm: 'E', t: 'yield' }] };
  S.O = { cars: { green: car('green', 'W', 'right'), blue: car('blue', 'N', 'right'), red: car('red', 'S', 'right') }, order: [['green', 'blue', 'red']], signs: [] };
  S.P = { cars: { green: car('green', 'E', 'straight'), blue: car('blue', 'S', 'left'), red: car('red', 'W', 'right') }, order: [['green'], ['blue'], ['red']], signs: [] };
  S.Q = { cars: { red: car('red', 'W', 'straight'), blue: car('blue', 'E', 'straight'), green: car('green', 'S', 'left') }, order: [['blue'], ['green'], ['red']], signs: [{ arm: 'E', t: 'main' }, { arm: 'W', t: 'yield' }] };
  S.R = { cars: { blue: car('blue', 'N', 'straight'), red: car('red', 'E', 'straight'), green: car('green', 'W', 'left') }, order: [['blue'], ['red'], ['green']], signs: [] };
  S.T = { cars: { moto: { k: 'moto', c: 'moto', from: 'E', turn: 'straight' }, red: car('red', 'W', 'straight'), tram: { k: 'tram', c: 'tram', from: 'N', turn: 'straight', off: 0 } }, order: [['moto'], ['red'], ['tram']], alias: { car: 'red' }, signs: [{ arm: 'E', t: 'main' }, { arm: 'W', t: 'yield' }] };
  S.U = { cars: { moto: { k: 'moto', c: 'moto', from: 'S', turn: 'straight' }, bus: { k: 'bus', c: 'bus', from: 'W', turn: 'straight' } }, order: [['moto'], ['bus']], signs: [], opts: { 0: [['moto'], ['bus']], 1: [['bus'], ['moto']] } };
  S.V = { cars: { bike: { k: 'bike', c: 'bike', from: 'S', turn: 'right' }, yellow: car('yellow', 'N', 'left') }, order: [['bike'], ['yellow']], signs: [], opts: { 0: [['yellow'], ['bike']], 1: [['bike'], ['yellow']] } };

  /* savol raqami -> sahna */
  const MAP = { 4: 'A', 6: 'B', 16: 'C', 26: 'D', 34: 'E', 36: 'F', 65: 'G', 76: 'H', 85: 'I', 95: 'J', 115: 'K', 121: 'L', 135: 'M', 155: 'N', 175: 'N', 185: 'N', 195: 'O', 204: 'T', 205: 'P', 215: 'P', 225: 'Q', 235: 'Q', 245: 'Q', 237: 'R', 244: 'U', 184: 'V' };

  /* ---------- variant matnini tahlil qilish ---------- */
  const COLW = [['qizil', 'red'], ["ko'k", 'blue'], ['yashil', 'green'], ['sariq', 'yellow']];
  const KINDW = [['tramvay', 'tram'], ['avtobus', 'bus'], ['mototsikl', 'moto'], ['velosiped', 'bike']];
  function ids(piece, sp) {
    const out = []; const t = piece.toLowerCase().replace(/’|‘|ʻ/g, "'");
    const re = /(qizil|ko'k|yashil|sariq|tramvay|avtobus|mototsikl|velosiped|yengil avtomobil|avtomobil)/g; let m;
    while ((m = re.exec(t))) {
      const w = m[1]; let id = null;
      for (const [k, v] of COLW) if (k === w) id = v;
      for (const [k, v] of KINDW) if (k === w) id = v;
      if (!id && (w === 'avtomobil' || w === 'yengil avtomobil')) id = (sp.alias && sp.alias.car) || null;
      if (id && sp.cars[id] && !out.includes(id)) out.push(id);
    }
    return out;
  }
  function parseSeq(text, sp) {
    const t = text.replace(/ bilan bir vaqtda/g, ' ##').replace(/ va /g, ' ## ').replace(/;/g, ',');
    const parts = t.split(/(,|##)/); const groups = []; let cur = [];
    for (const p of parts) {
      if (p === ',') { if (cur.length) groups.push(cur); cur = []; }
      else if (p === '##') { /* shu guruhda qoladi */ }
      else { for (const id of ids(p, sp)) if (!cur.includes(id)) cur.push(id); }
    }
    if (cur.length) groups.push(cur);
    return groups;
  }
  const ORD = [['birinchi', 0], ['ikkinchi', 1], ['uchinchi', 2], ['oxirgi', -1]];
  function optionSeqs(q, sp) {
    if (sp.opts) return q.options.map((_, i) => sp.opts[i] || null);
    const seqs = q.options.map(o => parseSeq(o.label, sp));
    const txt = q.text.toLowerCase().replace(/’|‘|ʻ/g, "'");
    let pos = null; for (const [w, p] of ORD) if (txt.includes(w + " bo'lib") || (w === 'oxirgi' && txt.includes('oxirgi'))) pos = p;
    const single = seqs.every(s => s.length === 1);
    if (pos !== null && single) {
      const L = sp.order.length;
      return seqs.map(s => { const g = s[0], p = pos < 0 ? L - 1 : pos; const o = sp.order.map(x => x.filter(i => !g.includes(i))); o[p] = g.slice(); return o.filter(x => x.length); });
    }
    return seqs;
  }
  function correctSeq(q, sp, seqs) { const s = seqs[q.answer]; return s && s.length ? s : sp.order; }
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  /* to'liq to'g'ri tartibni (barcha mashinalar) tuzish: variantdagi qismi + qolganlar */
  function fullOrder(seq, sp) {
    const used = new Set(seq.flat()), rest = sp.order.map(g => g.filter(i => !used.has(i))).filter(g => g.length);
    return seq.concat(rest);
  }
  function plan(q, sp, pick) {
    const seqs = optionSeqs(q, sp), right = fullOrder(correctSeq(q, sp, seqs), sp);
    if (pick == null || pick === q.answer) return { seq: right, crash: null, good: true };
    const mine = seqs[pick]; if (!mine || !mine.length) return { seq: right, crash: null, good: false, note: 'noaniq' };
    const m = fullOrder(mine, sp);
    for (let i = 0; i < Math.max(m.length, right.length); i++) {
      const a = m[i] || [], b = right[i] || [];
      if (sameSet(a, b)) continue;
      const U = a.find(x => !b.includes(x)), C = b.find(x => !a.includes(x)) || b[0];
      if (U && C && U !== C) return { seq: right.slice(0, i), crash: { i, U, C }, good: false };
      // variant bir vaqtdagi harakatni ko'rsatmagan yoki ortiqcha kutishni nazarda tutgan: to'qnashuv yo'q
      return { seq: right, crash: null, good: false, note: 'kutish' };
    }
    return { seq: right, crash: null, good: false, note: 'kutish' };
  }

  /* ---------- chizish ---------- */
  const px = (x) => CX + x * SC, py = (y) => CY + y * SC;
  let bgCache = null;
  function bgFor(sp) {
    const key = JSON.stringify(sp.signs || []) + (Object.values(sp.cars).some(c => KIND[c.k].rail) ? 'r' : '');
    if (bgCache && bgCache.key === key) return bgCache.cv;
    const dpr = 2, cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
    // maysa
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2f6b3a'); gr.addColorStop(1, '#3d8247'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${20 + (i * 37) % 40},${90 + (i * 53) % 60},${30 + (i * 29) % 30},.25)`; g.fillRect((i * 97) % W, (i * 61) % H, 2, 2); }
    // yo'llar
    const hw = HALF * SC;
    g.fillStyle = '#9aa0a8'; g.fillRect(CX - hw - 7, 0, hw * 2 + 14, H); g.fillRect(0, CY - hw - 7, W, hw * 2 + 14);        // trotuar
    g.fillStyle = '#3a3e45'; g.fillRect(CX - hw, 0, hw * 2, H); g.fillRect(0, CY - hw, W, hw * 2);
    for (let i = 0; i < 2500; i++) { const v = 46 + (i * 13) % 26; g.fillStyle = `rgba(${v},${v + 2},${v + 6},.35)`; const x = (i * 71) % W, y = (i * 43) % H; if (Math.abs(x - CX) < hw || Math.abs(y - CY) < hw) g.fillRect(x, y, 2, 2); }
    // chorraha maydoni
    g.fillStyle = '#41454d'; g.fillRect(CX - hw, CY - hw, hw * 2, hw * 2);
    // chiziqlar
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.setLineDash([16, 14]);
    g.beginPath(); g.moveTo(CX, 0); g.lineTo(CX, CY - hw); g.moveTo(CX, CY + hw); g.lineTo(CX, H); g.moveTo(0, CY); g.lineTo(CX - hw, CY); g.moveTo(CX + hw, CY); g.lineTo(W, CY); g.stroke(); g.setLineDash([]);
    // stop chiziqlari va zebra
    g.fillStyle = '#f2f3f5';
    const sl = STOP * SC, z = 6;
    g.fillRect(CX, CY + sl - 3, hw, 4); g.fillRect(CX - hw, CY - sl - 1, hw, 4); g.fillRect(CX - sl - 3, CY, 4, hw); g.fillRect(CX + sl - 1, CY - hw, 4, hw);
    for (let i = 0; i < 8; i++) { const o = -hw + 8 + i * (hw * 2 - 16) / 7; g.fillRect(CX + o - 3, CY + sl + 6, 7, 20); g.fillRect(CX + o - 3, CY - sl - 26, 7, 20); g.fillRect(CX + sl + 6, CY + o - 3, 20, 7); g.fillRect(CX - sl - 26, CY + o - 3, 20, 7); }
    // rels
    if (/r$/.test(key)) { g.strokeStyle = 'rgba(210,214,222,.55)'; g.lineWidth = 1.5; for (const o of [-6, 6]) { g.beginPath(); g.moveTo(0, CY + o); g.lineTo(W, CY + o); g.moveTo(CX + o, 0); g.lineTo(CX + o, H); g.stroke(); } }
    // daraxtlar
    const trees = [[70, 60], [150, 38], [560, 70], [590, 300], [90, 330], [200, 350], [470, 345], [40, 190], [600, 160], [250, 40], [400, 365]];
    for (const [x, y] of trees) { if (Math.abs(x - CX) < hw + 14 || Math.abs(y - CY) < hw + 14) continue; g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + 6, y + 8, 17, 12, 0, 0, 7); g.fill(); const rg = g.createRadialGradient(x - 5, y - 6, 3, x, y, 20); rg.addColorStop(0, '#5fbf5a'); rg.addColorStop(1, '#2b7a35'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); }
    // belgilar
    for (const s of sp.signs || []) drawSign(g, s);
    bgCache = { key, cv }; return cv;
  }
  function armPos(arm, t = 1) {   // belgi joyi: yo'lning o'ng chekkasida, stop chizig'idan biroz oldin
    const d = ARM[arm].d, r = right(d); return add(add([0, 0], d, -(STOP + 4)), r, HALF + 1.6);
  }
  function drawSign(g, s) {
    const p = armPos(s.arm), x = px(p[0]), y = py(p[1]);
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(3, 5, 8, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#777'; g.fillRect(-1.5, -18, 3, 20);
    if (s.t === 'main') { g.rotate(Math.PI / 4); g.fillStyle = '#fff'; g.fillRect(-9, -27, 18, 18); g.fillStyle = '#f4c20d'; g.fillRect(-7, -25, 14, 14); g.rotate(-Math.PI / 4); }
    else if (s.t === 'yield') { g.fillStyle = '#e23b44'; g.beginPath(); g.moveTo(-11, -30); g.lineTo(11, -30); g.lineTo(0, -10); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-6, -27); g.lineTo(6, -27); g.lineTo(0, -15); g.closePath(); g.fill(); }
    else if (s.t === 'stop') { g.fillStyle = '#e23b44'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(Math.cos(a) * 11, -22 + Math.sin(a) * 11); } g.closePath(); g.fill(); g.fillStyle = '#fff'; g.font = '800 7px sans-serif'; g.textAlign = 'center'; g.fillText('STOP', 0, -19); }
    else if (s.t === 'light') { g.fillStyle = '#15171c'; g.fillRect(-6, -40, 12, 26); for (const [i, c] of [[0, 'red'], [1, 'yellow'], [2, 'green']]) { g.fillStyle = s.c === c ? ({ red: '#ff3b3b', yellow: '#ffc928', green: '#35e06a' })[c] : '#33363d'; g.beginPath(); g.arc(0, -35 + i * 8, 3, 0, 7); g.fill(); } }
    g.restore();
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  function drawVeh(g, v, t) {
    const k = KIND[v.k], L = k.L * SC, Wd = k.Wd * SC;
    g.save(); g.translate(px(v.x), py(v.y)); g.rotate(v.a);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(2, 5, L / 2 + 2, Wd / 2 + 3, 0, 0, 7); g.fill();
    if (v.k === 'tram') {
      const segs = 2, sl = L / segs;
      for (let i = 0; i < segs; i++) { const x0 = -L / 2 + i * sl + 1; const gr = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); gr.addColorStop(0, '#f1f4f2'); gr.addColorStop(1, '#bfc7c3'); g.fillStyle = gr; rr(g, x0, -Wd / 2, sl - 2, Wd, 5); g.fill(); g.fillStyle = '#2f8a4f'; g.fillRect(x0 + 2, -Wd / 2 + 2, sl - 6, 4); g.fillStyle = '#26323f'; for (let w = 0; w < 5; w++) g.fillRect(x0 + 8 + w * ((sl - 20) / 4), -Wd / 2 + 8, 9, Wd - 16); }
      g.fillStyle = '#ffe9a8'; g.fillRect(L / 2 - 3, -Wd / 2 + 3, 3, 5); g.fillRect(L / 2 - 3, Wd / 2 - 8, 3, 5);
    } else if (v.k === 'moto' || v.k === 'bike') {
      g.fillStyle = v.k === 'moto' ? '#20232a' : '#333'; rr(g, -L / 2, -Wd / 2, L, Wd, 3); g.fill();
      g.fillStyle = v.color; g.beginPath(); g.ellipse(-1, 0, L * .28, Wd * .6, 0, 0, 7); g.fill(); g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(0, 0, Wd * .42, 0, 7); g.fill();
      g.fillStyle = '#ffe9a8'; g.fillRect(L / 2 - 2, -2, 3, 4);
    } else {
      const gr = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); gr.addColorStop(0, shade(v.color, 1.2)); gr.addColorStop(.5, v.color); gr.addColorStop(1, shade(v.color, .72));
      g.fillStyle = gr; rr(g, -L / 2, -Wd / 2, L, Wd, v.k === 'bus' || v.k === 'truck' ? 6 : 9); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(22,32,48,.88)';
      if (v.k === 'car') { rr(g, L * .06, -Wd / 2 + 3, L * .22, Wd - 6, 3); g.fill(); rr(g, -L * .38, -Wd / 2 + 3, L * .14, Wd - 6, 3); g.fill(); g.fillStyle = shade(v.color, 1.08); rr(g, -L * .2, -Wd / 2 + 3.5, L * .26, Wd - 7, 4); g.fill(); }
      else { g.fillRect(L * .36, -Wd / 2 + 3, L * .1, Wd - 6); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-L / 2 + 6, -Wd / 2 + 3, L * .72, Wd - 6); }
      g.fillStyle = '#fff6c9'; g.fillRect(L / 2 - 3, -Wd / 2 + 2, 3, 4); g.fillRect(L / 2 - 3, Wd / 2 - 6, 3, 4);
    }
    // orqa chiroq (tormoz) va burilish ko'rsatkichi
    if (v.k !== 'tram') { g.fillStyle = v.brake ? '#ff2a2a' : '#7a1f24'; g.fillRect(-L / 2, -KIND[v.k].Wd * SC / 2 + 1, 2.5, 4); g.fillRect(-L / 2, KIND[v.k].Wd * SC / 2 - 5, 2.5, 4); }
    if (v.blink && Math.floor(t * 3) % 2 === 0) { g.fillStyle = '#ffb21d'; const s = v.blink === 'left' ? -1 : 1; g.beginPath(); g.arc(L / 2 - 2, s * (Wd / 2 - 1), 3, 0, 7); g.arc(-L / 2 + 2, s * (Wd / 2 - 1), 3, 0, 7); g.fill(); }
    if (v.hazard && Math.floor(t * 4) % 2 === 0) { g.fillStyle = '#ffb21d'; for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * (L / 2 - 2), sy * (Wd / 2 - 1), 3.2, 0, 7); g.fill(); } }
    g.restore();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------- animatsiya ---------- */
  function Scene(cv, q, sp, st) {
    this.cv = cv; this.q = q; this.sp = sp; this.g = cv.getContext('2d'); this.t = 0; this.parts = []; this.shake = 0; this.flash = 0; this.msg = '';
    const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.veh = {}; this.paths = {};
    for (const id in sp.cars) {
      const c = sp.cars[id], p = buildPath(c.from, c.turn, c.off == null ? LANE : c.off, c.back || 0);
      this.paths[id] = p;
      this.veh[id] = { id, k: c.k, color: COLORS[c.c] || c.c, s: 0, ...at(p, 0), blink: c.turn === 'left' || c.turn === 'right' ? c.turn : null, brake: false, hazard: false, state: 'enter', path: p, speed: 0, wait: 0 };
      this.veh[id].enterT = 0; this.veh[id].sTarget = p.sStop - (c.back || 0) - (KIND[c.k].L / 2 - 2);
      if (c.k === 'tram') this.veh[id].sTarget = p.sStop - (c.back || 0) - KIND[c.k].L / 2 - 1;
      const blinkL = this.veh[id].blink; if (blinkL) { /* chap/o'ng: yo'nalishga nisbatan; chizishda ekran tomoni */ this.veh[id].blink = blinkL; }
    }
    this.mode = 'idle'; this.queue = []; this.crash = null; this.done = false; this.onEnd = null;
    this.last = performance.now(); this.running = true; this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  Scene.prototype.reset = function () { for (const id in this.veh) { const v = this.veh[id]; v.s = 0; v.state = 'enter'; v.enterT = 0; v.hazard = false; v.brake = false; v.speed = 0; Object.assign(v, at(v.path, 0)); } this.mode = 'idle'; this.crash = null; this.parts = []; this.shake = 0; this.flash = 0; this.msg = ''; this.queue = []; this.done = false; };
  Scene.prototype.play = function (pl) {
    // pl: {seq, crash}. Avval mashinalar o'z joyiga keladi
    this.reset(); this.pl = pl; this.mode = 'enter'; this.t0 = this.t;
  };
  Scene.prototype.startRun = function () {
    const pl = this.pl; this.queue = pl.seq.map((grp, gi) => ({ grp, started: false, gi })); this.mode = 'run'; this.runT = 0;
    if (pl.crash) {
      const { U, C } = pl.crash, A = this.paths[C], B = this.paths[U], M = meetPoint(A, B), sA = sAtPoint(A, M), sB = sAtPoint(B, M);
      const T = 1.5; this.crash = { U, C, M, sA: sA - 1.8, sB: sB - 1.8, T, started: false, hit: false, gi: pl.crash.i };
    }
  };
  Scene.prototype.groupDone = function (grp) { return grp.every(id => { const v = this.veh[id], p = v.path; return v.s >= p.sExit + 2; }); };
  Scene.prototype.groupCleared = function (grp) { return grp.every(id => { const v = this.veh[id], p = v.path; const cross = p.sExit - p.sStop; return v.s >= p.sStop + cross * 0.62 + KIND[v.k].L * 0.4; }); };
  Scene.prototype.step = function (dt) {
    this.t += dt;
    const V = this.veh;
    if (this.mode === 'enter' || this.mode === 'idle' || this.mode === 'run') {
      for (const id in V) {
        const v = V[id];
        if (v.state === 'enter') {
          v.enterT += dt; const k = Math.min(1, v.enterT / 1.5), e = 1 - Math.pow(1 - k, 3); v.s = v.sTarget * e; v.brake = k > .7; Object.assign(v, at(v.path, v.s));
          if (k >= 1) { v.state = 'wait'; v.brake = true; }
        }
      }
    }
    if (this.mode === 'enter' && Object.values(V).every(v => v.state !== 'enter')) { this.waitT = (this.waitT || 0) + dt; if (this.waitT > 0.7) { this.waitT = 0; this.startRun(); } }
    if (this.mode === 'run') {
      this.runT += dt;
      // guruhlarni ishga tushirish
      for (const it of this.queue) {
        if (it.started) continue;
        const prev = this.queue[it.gi - 1];
        if (!prev || (prev.started && this.groupCleared(prev.grp))) { it.started = true; it.grp.forEach(id => { V[id].state = 'go'; V[id].brake = false; V[id].blink = V[id].blink; V[id].speed = 0.01; }); }
        break;
      }
      // to'qnashuv guruhi
      const cr = this.crash;
      if (cr && !cr.started) {
        const ready = this.queue.length === cr.gi ? this.queue.every(it => it.started && this.groupCleared(it.grp)) : false;
        if (ready) { cr.started = true; cr.tt = 0; [cr.U, cr.C].forEach(id => { V[id].state = 'crashrun'; V[id].brake = false; }); V[cr.C].s0 = V[cr.C].s; V[cr.U].s0 = V[cr.U].s; }
      }
      for (const id in V) {
        const v = V[id];
        if (v.state === 'go') { v.speed = Math.min(11.5, v.speed + 12 * dt); v.s += v.speed * dt; Object.assign(v, at(v.path, v.s)); if (v.s > v.path.sExit - 4 && v.blink) v.blink = null; if (v.s >= v.path.len - 1) v.state = 'gone'; }
        else if (v.state === 'crashrun' && !cr.hit) {
          cr.tt += dt; const k = Math.min(1, cr.tt / cr.T), e = k * k * (3 - 2 * k) * .35 + k * .65, tgt = id === cr.C ? cr.sA : cr.sB; v.s = v.s0 + (tgt - v.s0) * e; Object.assign(v, at(v.path, v.s));
        }
      }
      if (cr && cr.started && !cr.hit && cr.tt >= cr.T) {
        cr.hit = true; this.shake = 0.7; this.flash = 1; [cr.U, cr.C].forEach(id => { const v = V[id]; v.state = 'crashed'; v.hazard = true; v.brake = true; v.a += (id === cr.U ? .18 : -.15); });
        const m = cr.M; for (let i = 0; i < 26; i++) this.parts.push({ x: m[0], y: m[1], vx: (Math.random() - .5) * 22, vy: (Math.random() - .5) * 22, life: .6 + Math.random() * .7, c: i % 3 ? '#ffb21d' : '#ff5a3c' });
        this.msg = 'crash'; this.done = true; if (this.onEnd) this.onEnd('crash');
      }
      if (!cr && this.queue.every(it => it.started && this.groupDone(it.grp))) { if (!this.done) { this.done = true; this.mode = 'end'; if (this.onEnd) this.onEnd('ok'); } }
    }
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .93; p.vy *= .93; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    this.shake = Math.max(0, this.shake - dt * 1.4); this.flash = Math.max(0, this.flash - dt * 1.6);
  };
  Scene.prototype.draw = function () {
    const g = this.g; g.save(); g.clearRect(0, 0, W, H);
    if (this.shake > 0) g.translate((Math.random() - .5) * this.shake * 14, (Math.random() - .5) * this.shake * 14);
    g.drawImage(bgFor(this.sp), 0, 0, W, H);
    const list = Object.values(this.veh).sort((a, b) => (a.k === 'tram' ? 0 : 1) - (b.k === 'tram' ? 0 : 1));
    for (const v of list) if (v.state !== 'gone') {
      // chap/o'ng ko'rsatkich: burilish yo'nalishi bo'yicha, mashina koordinatasida chap = -y
      drawVeh(g, Object.assign({}, v, { blink: v.blink }), this.t);
    }
    for (const p of this.parts) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(px(p.x), py(p.y), 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    if (this.crash && this.crash.hit) {
      const m = this.crash.M, r = 14 + (1 - this.flash) * 38; g.strokeStyle = `rgba(255,70,50,${this.flash})`; g.lineWidth = 5; g.beginPath(); g.arc(px(m[0]), py(m[1]), r, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,60,50,.9)'; g.font = '800 26px Manrope,sans-serif'; g.textAlign = 'center'; g.fillText('AVARIYA!', px(m[0]), py(m[1]) - 44);
    }
    if (this.flash > 0) { g.fillStyle = `rgba(255,70,60,${this.flash * .25})`; g.fillRect(0, 0, W, H); }
    g.restore();
  };
  Scene.prototype.loop = function (now) {
    if (!this.running) return; if (!this.cv.isConnected) { this.running = false; return; }
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.step(dt); this.draw(); requestAnimationFrame(this.loop);
  };

  /* ---------- tashqi API ---------- */
  const specOf = (q) => { const n = q.n; const key = MAP[n]; return key ? S[key] : null; };
  window.Scenes = {
    has: (q) => !!specOf(q),
    html: (q) => specOf(q) ? `<div class="stage" data-sid="${q.id}"><canvas class="stage-cv" width="640" height="400" aria-label="Chorraha sxemasi"></canvas><div class="stage-bar"><span class="stage-tag">SXEMA</span><span class="stage-msg" data-r="msg">Savolning sxematik animatsiyasi</span><button class="stage-btn" data-act="stage-replay" type="button">↻ Qayta</button></div></div>` : '',
    /* rootEl ichidagi sahnani ishga tushiradi. state: {revealed, pick} */
    hydrate(root, q, state) {
      const sp = specOf(q); if (!sp) return;
      const st = root.querySelector('.stage'); if (!st) return; const cv = st.querySelector('canvas'), msg = st.querySelector('[data-r=msg]');
      const sc = new Scene(cv, q, sp, state); st.__scene = sc;
      const run = (pick, auto) => {
        const pl = plan(q, sp, pick); sc.onEnd = (r) => {
          if (r === 'crash') { msg.textContent = 'Siz tanlagan javob bo\'yicha harakat qilinsa, avariya bo\'ladi'; st.dataset.res = 'bad'; }
          else if (pl.good) { msg.textContent = 'To\'g\'ri tartib: mashinalar xavfsiz o\'tadi'; st.dataset.res = 'good'; }
          else { msg.textContent = pl.note === 'kutish' ? 'Bu holatda ortiqcha kutish shart emas yoki tartib boshqacha' : 'To\'g\'ri tartib'; st.dataset.res = 'mid'; }
        };
        st.dataset.res = ''; msg.textContent = pick == null ? 'Chorrahadagi harakat tartibi' : '…'; sc.play(pl);
      };
      st.__run = run;
      if (state && state.revealed) run(state.pick, true); else { sc.mode = 'idle'; msg.textContent = 'Mashinalarning joylashuvi (sxema)'; }
    },
    replay(root, q, state) { const st = root.querySelector('.stage'); if (!st || !st.__run) return; st.__run(state && state.revealed ? state.pick : q.answer); },
    replayCorrect(root, q) { const st = root.querySelector('.stage'); if (st && st.__run) st.__run(q.answer); },
    plan, SPECS: S, MAP,
  };
})();
