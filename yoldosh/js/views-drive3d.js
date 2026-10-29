/* Simulyator 3D: uchinchi shaxs ko'rinishidagi haydash simulyatori (Three.js, cdnjs dan yuklanadi).
   Garaj (mashina tanlash) -> avtodrom doirasi: parkovka, tezlik zonasi, burilishlar (ko'rsatkich bilan), svetofor, ilon, STOP, marra.
   Bepul rejim: 5 soat ichida jami 2 daqiqa va faqat Cobalt. Premium: cheksiz va hamma mashina.
   Eslatma: mashq vositasi; rasmiy avtodrom mezonlari avtomaktab/imtihon markaziga qarab farq qilishi mumkin. */
(function () {
  const { ico, esc, toast, modal, closeModal } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, shell = (a, h) => V.shellStudent(a, h);
  const FREE_SEC = 120, WINDOW = 5 * 3600e3;
  const rad = (d) => d * Math.PI / 180, TAU = Math.PI * 2;
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  /* ================= TRANSPORT VOSITALARI ================= */
  const CARS = [
    { id: 'cobalt', name: 'Chevrolet Cobalt', cat: 'B', kind: 'car', body: 'sedan', p: { hood: .25, rake: .13, roof: .30, rwin: .14, trunk: .98 }, L: 4.48, W: 1.75, H: 1.5, WB: 2.62, ovF: .88, R: .31, accel: 3.0, vmax: 13.5, free: true, brand: 'chevy', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B'], glb: 'sim/models/vehicles/cobalt/cobalt.glb', paint: 'Realistic_Car_Paint' },
    { id: 'gentra', name: 'Chevrolet Gentra', cat: 'B', kind: 'car', body: 'sedan', p: { hood: .27, rake: .14, roof: .28, rwin: .16, trunk: .96 }, L: 4.5, W: 1.74, H: 1.49, WB: 2.6, ovF: .9, R: .31, accel: 3.1, vmax: 13.5, brand: 'chevy', colors: ['#15171C'], glb: 'sim/models/vehicles/gentra/gentra.glb', paint: 'carpaint' },
    { id: 'nexia', name: 'Daewoo Nexia', cat: 'B', kind: 'car', body: 'sedan', p: { hood: .26, rake: .15, roof: .26, rwin: .16, trunk: .96 }, L: 4.48, W: 1.72, H: 1.54, WB: 2.48, ovF: .93, R: .301, accel: 2.8, vmax: 13, brand: 'daewoo', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B', '#2B3A55'], glb: 'sim/models/vehicles/nexia/nexia.glb', paint: 'primary' },
    { id: 'malibu', name: 'Chevrolet Malibu', cat: 'B', kind: 'car', body: 'sedan', p: { hood: .3, rake: .18, roof: .22, rwin: .24, trunk: .94 }, L: 4.93, W: 1.95, H: 1.49, WB: 2.87, ovF: 1.02, R: .348, accel: 3.4, vmax: 14, brand: 'chevy', colors: ['#15171C', '#E9EDF3', '#2B3A55', '#8E1B1B'], glb: 'sim/models/vehicles/malibu/malibu.glb', paint: 'primary' },
    { id: 'mc20', name: 'Maserati MC20', cat: 'B', kind: 'car', body: 'sedan', p: { hood: .3, rake: .2, roof: .2, rwin: .2, trunk: .8 }, L: 4.67, W: 2.0, H: 1.22, WB: 2.71, ovF: 1.12, R: .353, accel: 5.2, vmax: 17, brand: 'maserati', colors: ['#E9EDF3', '#15171C', '#C9A227', '#1F4FA0', '#8E1B1B'], glb: 'sim/models/vehicles/mc20/mc20.glb', paint: 'primary' },
    { id: 'spark', name: 'Chevrolet Spark', cat: 'B', kind: 'car', body: 'hatch', p: { hood: .22, rake: .14, re: .12 }, L: 3.6, W: 1.6, H: 1.52, WB: 2.37, ovF: .62, R: .29, accel: 2.6, vmax: 12.5, brand: 'chevy', colors: ['#B9BEC6', '#E9EDF3', '#F2C400', '#C62828'], glb: 'sim/models/vehicles/spark/spark.glb', paint: 'Chevrolet_Beat_2010_carpaint' },
    { id: 'matiz', name: 'Daewoo Matiz', cat: 'B', kind: 'car', body: 'hatch', p: { hood: .17, rake: .05, re: .1 }, L: 3.5, W: 1.49, H: 1.5, WB: 2.34, ovF: .6, R: .28, accel: 2.3, vmax: 12, brand: 'daewoo', colors: ['#D8C29A', '#E9EDF3', '#1B3F8F', '#C62828'], glb: 'sim/models/vehicles/matiz/matiz.glb', paint: 'Car_Paint' },
    { id: 'song', name: 'BYD Song Plus', cat: 'B', kind: 'car', body: 'suv', p: { hood: .26, rake: .16, re: .16, drop: .42 }, L: 4.77, W: 1.89, H: 1.67, WB: 2.77, ovF: .95, R: .37, accel: 3.6, vmax: 14.5, brand: 'byd', colors: ['#2A2326', '#E9EDF3', '#6E7886', '#1B3F8F'] },
    { id: 'cyber', name: 'Tesla Cybertruck', cat: 'B', kind: 'angular', body: 'cyber', L: 5.68, W: 2.03, H: 1.96, WB: 3.8, ovF: .95, R: .42, accel: 4.2, vmax: 16, brand: 'tesla', colors: ['#B5BBC3', '#1B1D21'] },
    { id: 'g63', name: 'Mercedes-Benz G63', cat: 'B', kind: 'angular', body: 'gwagon', L: 4.87, W: 1.98, H: 1.97, WB: 2.89, ovF: .95, R: .4, accel: 3.4, vmax: 14.5, brand: 'merc', colors: ['#111316', '#E9EDF3', '#4B5A3A', '#6E7886'], glb: 'sim/models/vehicles/gclass/gclass.glb', paint: 'Car_paint' },
    { id: 'bus', name: `MAN avtobus (D)`, cat: 'D', kind: 'bus', heavy: true, L: 12, W: 2.55, H: 3.3, WB: 6.1, ovF: 2.7, R: .5, accel: 1.5, vmax: 11, steer: .55, gears: 6, colors: ['#F2F4F8', '#1B3F8F', '#C62828', '#2E7D32'] },
    { id: 'isuzu', name: `Isuzu NMR yuk mashinasi (C)`, cat: 'C', kind: 'boxtruck', heavy: true, L: 6.9, W: 2.2, H: 3.2, WB: 3.4, ovF: 1.1, R: .38, accel: 1.9, vmax: 12, steer: .6, gears: 5, colors: ['#F2F4F8', '#1B3F8F', '#F2C400', '#C62828'] },
    { id: 'volvo', name: `Volvo FH + tirkama (CE)`, cat: 'CE', kind: 'semi', heavy: true, L: 6.2, W: 2.55, H: 3.5, WB: 3.8, ovF: 1.2, R: .5, accel: 1.4, vmax: 11, steer: .5, gears: 6, trailer: { L: 13.6, W: 2.55, H: 4.0, kp: 1.7, axle: 9.7 }, colors: ['#1B3F8F', '#C62828', '#F2F4F8', '#2B2E34'] },
  ];
  CARS.forEach(c => { c.ovR = c.L - c.WB - c.ovF; c.c = (c.WB + c.ovF - c.ovR) / 2; c.steer = c.steer || .6; c.gears = c.gears || 5; c.cat = c.cat || 'B'; });
  const CATN = { B: 'Yengil avtomobil (B)', C: 'Yuk mashinasi (C)', D: 'Avtobus (D)', CE: 'Tirkamali yuk (CE)' };
  /* ================= vaqt cheklovi (bepul rejim) ================= */
  const Free = {
    st() { const d = (Store.s.drv = Store.s.drv || { t0: 0, used: 0 }); if (d.t0 && Date.now() - d.t0 >= WINDOW) { d.t0 = 0; d.used = 0; } return d; },
    premium() { return !!(V.Prem && V.Prem.ok()); },
    left() { return this.premium() ? Infinity : Math.max(0, FREE_SEC - this.st().used); },
    reopenAt() { const d = this.st(); return d.t0 ? d.t0 + WINDOW : 0; },
    use(sec) { const d = this.st(); if (!d.t0) d.t0 = Date.now(); d.used = Math.min(FREE_SEC, d.used + sec); },
  };
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const hhmm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  /* ================= Three.js yuklash ================= */
  let threeP = null;
  const loadThree = () => window.THREE ? Promise.resolve() : (threeP = threeP || new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload = ok; s.onerror = () => { threeP = null; no(new Error('three')); }; document.head.appendChild(s); }));

  /* ================= TRASSA (markaziy chiziq) ================= */
  function buildPath() {
    const pts = [], marks = {}; let x = 0, z = 0, th = 0, s = 0; const step = 1;
    const push = () => pts.push({ x, z, th, s });
    const straight = (len, name) => { if (name) marks[name] = s; for (let i = 0; i < len / step; i++) { push(); x += Math.cos(th) * step; z += Math.sin(th) * step; s += step; } };
    const arc = (r, name) => { if (name) marks[name] = s; const n = Math.round(Math.PI / 2 * r / step), dth = (Math.PI / 2) / n, ds = Math.PI / 2 * r / n; for (let i = 0; i < n; i++) { push(); th += dth / 2; x += Math.cos(th) * ds; z += Math.sin(th) * ds; th += dth / 2; s += ds; } };
    straight(70, 's1'); arc(16, 'a1'); straight(46, 's2'); arc(16, 'a2'); straight(70, 's3'); arc(16, 'a3'); straight(46, 's4'); arc(16, 'a4');
    marks.total = s; marks.end = s; return { pts, marks, total: s };
  }
  const PATH = buildPath();
  const at = (s) => { const n = PATH.pts.length, i = ((Math.floor(s) % n) + n) % n, p = PATH.pts[i], q = PATH.pts[(i + 1) % n], f = s - Math.floor(s); return { x: p.x + (q.x - p.x) * f, z: p.z + (q.z - p.z) * f, th: p.th }; };
  const sideOf = (s, d) => { const p = at(s); return { x: p.x - Math.sin(p.th) * d, z: p.z + Math.cos(p.th) * d, th: p.th }; };        // d > 0: yo'lning o'ng tomoni
  const M = PATH.marks;

  /* ================= MASHINA MODELLARI (parametrik, 3D) ================= */
  function smooth(geo) {
    geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, map = new Map(), key = (i) => `${Math.round(p.getX(i) * 400)}|${Math.round(p.getY(i) * 400)}|${Math.round(p.getZ(i) * 400)}`;
    for (let i = 0; i < p.count; i++) { const k = key(i), a = map.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); map.set(k, a); }
    for (let i = 0; i < p.count; i++) { const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); } n.needsUpdate = true;
  }
  const chaikin = (pts, n) => { for (let it = 0; it < n; it++) { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } pts = out; } return pts; };
  /* kuzov siluetidan 3D (yon profili -> kenglik bo'yicha extrude) */
  function extrude(poly, depth, bev, mat, sm) {
    const T3 = THREE, sh = new T3.Shape(); poly.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); sh.closePath();
    const g = new T3.ExtrudeGeometry(sh, { depth: depth - 2 * bev.t, bevelEnabled: true, bevelThickness: bev.t, bevelSize: bev.s, bevelSegments: bev.n, curveSegments: 4 }); g.translate(0, 0, -(depth - 2 * bev.t) / 2); if (sm) smooth(g);
    const m = new T3.Mesh(g, mat); m.castShadow = true; return m;
  }
  const poly2 = (T3, pts) => { const s = new T3.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; };
  function mats(color, metal) {
    const T3 = THREE;
    return { body: new T3.MeshPhysicalMaterial({ color, metalness: metal == null ? .5 : metal, roughness: metal > .8 ? .38 : .3, clearcoat: metal > .8 ? 0 : 1, clearcoatRoughness: .06 }),
      glass: new T3.MeshPhysicalMaterial({ color: 0x0a1320, metalness: .9, roughness: .04, transparent: true, opacity: .84, side: T3.DoubleSide }),
      black: new T3.MeshStandardMaterial({ color: 0x0c0e12, roughness: .7 }), trim: new T3.MeshStandardMaterial({ color: 0x15181d, roughness: .5, metalness: .3 }), chrome: new T3.MeshStandardMaterial({ color: 0xd5dbe6, metalness: 1, roughness: .2 }),
      tire: new T3.MeshStandardMaterial({ color: 0x0b0b0d, roughness: .9 }), rim: new T3.MeshStandardMaterial({ color: 0xaab2bf, metalness: 1, roughness: .28 }), disc: new T3.MeshStandardMaterial({ color: 0x4b525e, metalness: .8, roughness: .5 }) };
  }
  const box = (T3, w, h, d, mat, x, y, z) => { const m = new T3.Mesh(new T3.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  const cyl = (T3, rt, rb, h, mat, x, y, z, rx, rz) => { const m = new T3.Mesh(new T3.CylinderGeometry(rt, rb, h, 20), mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; return m; };
  /* davlat raqami */
  const plateTex = (txt) => tex(520, 112, (g, w, h) => {
    g.fillStyle = '#f6f6f1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#141414'; g.lineWidth = 7; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#1b4fa8'; g.fillRect(10, 10, 62, h - 20); g.fillStyle = '#fff'; g.fillRect(16, 22, 50, 9); g.fillStyle = '#1da93b'; g.fillRect(16, 31, 50, 9); g.fillStyle = '#fff'; g.font = '800 26px sans-serif'; g.textAlign = 'center'; g.fillText('UZ', 41, 78);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 70px "Arial Narrow",Arial,sans-serif'; g.fillText(String(txt || '').toUpperCase().slice(0, 12), 300, h / 2 + 4);
  }, null);
  function setPlate(car, text) { const u = car.userData; if (!u.plateMat) return; if (u.plateMat.map) u.plateMat.map.dispose(); u.plateMat.map = plateTex(text); u.plateMat.needsUpdate = true; }
  /* g'ildirak: quyma disk (5 ta spitsa) yoki yuk g'ildiragi */
  function wheelMesh(T3, R, M, heavy, dual) {
    const w = new T3.Group(), tw = heavy ? .3 : .22;
    const addTire = (z) => { const tire = new T3.Mesh(new T3.CylinderGeometry(R, R, tw, 32), M.tire); tire.rotation.x = Math.PI / 2; tire.position.z = z; tire.castShadow = true; w.add(tire); const side = new T3.Mesh(new T3.CylinderGeometry(R * .93, R * .93, tw + .01, 32), M.trim); side.rotation.x = Math.PI / 2; side.position.z = z; w.add(side); };
    if (dual) { addTire(-tw * .55); addTire(tw * .55); } else addTire(0);
    const rz = dual ? tw * 1.1 : tw * .5;
    [rz, -rz].forEach((z, k) => { if (k === 1 && !dual) return; const rim = new T3.Mesh(new T3.CylinderGeometry(R * .66, R * .66, .04, 24), M.rim); rim.rotation.x = Math.PI / 2; rim.position.z = z; w.add(rim);
      if (!heavy) { for (let i = 0; i < 5; i++) { const sp = new T3.Mesh(new T3.BoxGeometry(R * .58, .05, .035), M.rim); const a = i * TAU / 5; sp.position.set(Math.cos(a) * R * .34, Math.sin(a) * R * .34, z + .01 * (z > 0 ? 1 : -1)); sp.rotation.z = a; w.add(sp); } const ring = new T3.Mesh(new T3.TorusGeometry(R * .64, .018, 8, 28), M.chrome); ring.position.z = z; w.add(ring); }
      const hub = new T3.Mesh(new T3.CylinderGeometry(R * .16, R * .16, .07, 12), heavy ? M.rim : M.black); hub.rotation.x = Math.PI / 2; hub.position.z = z + (z > 0 ? .02 : -.02); w.add(hub); });
    if (!heavy) { const dsc = new T3.Mesh(new T3.CylinderGeometry(R * .52, R * .52, .03, 20), M.disc); dsc.rotation.x = Math.PI / 2; dsc.position.z = tw * .3 * (1); w.add(dsc); }
    return w;
  }
  const lamp = (T3, col, em, k) => new T3.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: k == null ? .25 : k, roughness: .25 });
  function lightKit(T3, g, spec, o) {
    const L = spec.L, W = spec.W, u = g.userData; u.head = lamp(T3, 0xfff3c4, 0xffe9a0, .25); u.tail = lamp(T3, 0x7a0f18, 0xff1830, .25);
    const ind = () => new T3.MeshStandardMaterial({ color: 0xff9a1f, emissive: 0xff7a00, emissiveIntensity: 0, roughness: .4 }); u.ind = [ind(), ind(), ind(), ind()];
    const hy = o.headY, hx = o.headX, tz = o.headZ;
    [1, -1].forEach(sd => { const hl = box(T3, .08, o.headH, o.headW, u.head, hx, hy, sd * tz); g.add(hl); const tl = box(T3, .07, o.tailH, o.tailW, u.tail, -L / 2 - .01, o.tailY, sd * (W / 2 - o.tailW / 2 - .1)); g.add(tl); });
    [[hx + .01, hy - o.headH / 2 - .05, 0, 1], [hx + .01, hy - o.headH / 2 - .05, 1, -1]].forEach(([x, y, k, sd]) => { const m = box(T3, .06, .07, .2, u.ind[k], x, y, sd * (tz + o.headW / 2 - .1)); g.add(m); });
    [[2, 1], [3, -1]].forEach(([k, sd]) => { const m = box(T3, .06, .08, .2, u.ind[k], -L / 2 - .02, o.tailY - o.tailH / 2 - .08, sd * (W / 2 - .25)); g.add(m); });
  }
  function plates(T3, g, spec, x1, y1, x2, y2, plate, wide) {
    const mat = new T3.MeshStandardMaterial({ map: plateTex(plate), roughness: .5 }), u = g.userData; u.plateMat = mat;
    const pw = wide || .52, ph = .11;
    const f = new T3.Mesh(new T3.BoxGeometry(.03, ph, pw), mat); f.position.set(x1, y1, 0); g.add(f); const r = new T3.Mesh(new T3.BoxGeometry(.03, ph, pw), mat); r.position.set(x2, y2, 0); g.add(r);
  }
  function axles(T3, g, spec, M, R, dualRear, heavy) {
    const u = g.userData, W = spec.W, xf = spec.WB - spec.c, xr = -spec.c; u.R = R; u.wheels = []; u.steer = [];
    [[xf, 1, true], [xf, -1, true], [xr, 1, false], [xr, -1, false]].forEach(([x, sd, front]) => { const pv = new T3.Group(); pv.position.set(x, R, sd * (W / 2 - (heavy ? .22 : .13))); const w = wheelMesh(T3, R, M, heavy, dualRear && !front); if (sd < 0) w.scale.z = -1; pv.add(w); g.add(pv); u.wheels.push(w); if (front) u.steer.push(pv); });
  }
  function mirrors(T3, g, x, y, W, M, big) { [1, -1].forEach(sd => { const m = box(T3, big ? .16 : .1, big ? .34 : .1, big ? .22 : .2, M.body, x, y, sd * (W / 2 + (big ? .2 : .1))); m.castShadow = true; g.add(m); const arm = box(T3, .05, .04, .12, M.black, x, y, sd * (W / 2 + .04)); g.add(arm); }); }

  /* ---- yengil avtomobil (silliq kuzov): sedan / hetchbek / krossover ---- */
  function carProfile(c) {
    const L = c.L, H = c.H, T = c.body, h = L / 2, P = c.p || {};
    if (T === 'sedan') {
      const wbx = h - (P.hood || .27) * L, wtx = wbx - (P.rake || .13) * L, roofEnd = wtx - (P.roof || .27) * L, rwx = roofEnd - (P.rwin || .15) * L, xm = (wtx + roofEnd) / 2, ty = P.trunk || .98;
      return { body: [[-h, .36], [h, .36], [h, .6], [h - .09, .8], [wbx, .9], [wtx, H], [roofEnd, H], [rwx, ty], [-h + .03, ty - .02], [-h, .7]],
        win: [[[wbx - .15, 1.0], [wtx - .04, H - .07], [xm - .04, H - .07], [xm - .04, 1.0]], [[xm + .04, 1.0], [xm + .04, H - .07], [roofEnd + .02, H - .07], [rwx + .25, 1.0]]], gf: [[wbx + .02, .91], [wtx + .02, H - .03]], gr: [[rwx - .02, ty + .01], [roofEnd - .02, H - .03]], hood: wbx, cab: [roofEnd, wtx] };
    }
    if (T === 'hatch') {
      const wbx = h - (P.hood || .24) * L, wtx = wbx - (P.rake || .14) * L, roofEnd = -h + (P.re || .12) * L + .1 * L, xm = (wtx + roofEnd) / 2;
      return { body: [[-h, .36], [h, .36], [h, .6], [h - .08, .78], [wbx, .9], [wtx, H], [roofEnd, H], [-h + .05, H - .5], [-h, .7]],
        win: [[[wbx - .15, 1.0], [wtx - .04, H - .07], [xm - .04, H - .07], [xm - .04, 1.0]], [[xm + .04, 1.0], [xm + .04, H - .07], [roofEnd + .04, H - .07], [-h + .22, 1.0]]], gf: [[wbx + .02, .91], [wtx + .02, H - .03]], gr: [[-h + .06, H - .5], [roofEnd - .02, H - .03]], hood: wbx, cab: [roofEnd, wtx] };
    }
    const wbx = h - (P.hood || .26) * L, wtx = wbx - (P.rake || .12) * L, roofEnd = -h + (P.re || .1) * L, xm = (wtx + roofEnd) / 2, dr = P.drop || .3;
    return { body: [[-h, .48], [h, .48], [h, .85], [h - .1, 1.02], [wbx, 1.1], [wtx, H], [roofEnd, H], [-h + .02, H - dr], [-h, .75]],
      win: [[[wbx - .15, 1.18], [wtx - .04, H - .08], [xm - .04, H - .08], [xm - .04, 1.18]], [[xm + .04, 1.18], [xm + .04, H - .08], [roofEnd + .05, H - .08], [-h + .22, 1.18]]], gf: [[wbx + .02, 1.11], [wtx + .02, H - .03]], gr: [[-h + .03, H - dr], [roofEnd - .01, H - .03]], hood: wbx, cab: [roofEnd, wtx] };
  }
  function buildPassenger(spec, color, plate) {
    const T3 = THREE, g = new T3.Group(), L = spec.L, W = spec.W, H = spec.H, M = mats(color, .5), pr = carProfile(spec), R = spec.R, c = spec.c, xf = spec.WB - c, xr = -c, ra = R + .06, base = .26;
    let poly = pr.body.map(p => p.slice());
    const arch = (xc) => { const a = [[xc - ra, base]]; for (let k = 0; k <= 10; k++) { const t = Math.PI - k * Math.PI / 10; a.push([xc + Math.cos(t) * ra, R + Math.sin(t) * ra * .95]); } a.push([xc + ra, base]); return a; };
    poly = [[-L / 2, base], ...arch(xr), ...arch(xf), [L / 2, base], ...poly.slice(2)]; poly = chaikin(poly, 1);
    g.add(extrude(poly, W - .02, { t: .08, s: .06, n: 4 }, M.body, true));
    pr.win.forEach(pl => { const gg = new T3.ShapeGeometry(poly2(T3, pl)); [1, -1].forEach(sd => { const m = new T3.Mesh(gg, M.glass); m.position.z = sd * (W / 2 + .004); g.add(m); }); const fr = new T3.Mesh(new T3.ShapeGeometry(poly2(T3, pl.map(p => [p[0], p[1] - .03]))), M.black); [1, -1].forEach(sd => { const m = fr.clone(); m.position.z = sd * (W / 2 + .001); g.add(m); }); });
    const quad = (A, B, wid, sg) => { const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new T3.PlaneGeometry(len, wid); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const m = new T3.Mesh(pg, M.glass); m.position.set((A[0] + B[0]) / 2 + sg * dy / len * .016, (A[1] + B[1]) / 2 - sg * dx / len * .016, 0); g.add(m); };
    quad(pr.gf[0], pr.gf[1], W * .8, 1); if (pr.gr) quad(pr.gr[0], pr.gr[1], W * .78, -1);
    const cb = pr.cab, ih = Math.max(.15, H - 1.14); g.add(box(T3, (cb[1] - cb[0]) * .8, ih, W * .74, M.black, (cb[0] + cb[1]) / 2, 1.0 + ih / 2, 0));
    // eshik chiziqlari, tutqichlar, porog
    const xm = (pr.cab[0] + pr.cab[1]) / 2; [1, -1].forEach(sd => { [xm - .02, pr.cab[1] + .45, pr.cab[0] - .12].forEach(x => g.add(box(T3, .014, .62, .006, M.black, x, .72, sd * (W / 2 + .003)))); [xm - .3, xm + .5].forEach(x => g.add(box(T3, .13, .028, .02, M.chrome, x, .96, sd * (W / 2 + .012)))); g.add(box(T3, L * .5, .06, .04, M.trim, -c * .15 + .1, .36, sd * (W / 2 - .02))); });
    // old/orqa: bamper, panjara, tuman chiroqlari
    g.add(box(T3, .12, .2, W * .88, M.trim, L / 2 + .015, .43, 0)); g.add(box(T3, .12, .2, W * .88, M.trim, -L / 2 - .015, .43, 0));
    const gz = spec.brand === 'byd' ? W * .55 : W * .4; g.add(box(T3, .05, .15, gz, M.black, L / 2 + .04, .66, 0)); g.add(box(T3, .06, .03, gz, M.chrome, L / 2 + .06, .7, 0)); if (spec.brand === 'chevy') { g.add(box(T3, .07, .06, .24, new T3.MeshStandardMaterial({ color: 0xd6b25a, metalness: 1, roughness: .25 }), L / 2 + .07, .68, 0)); }
    [1, -1].forEach(sd => { g.add(box(T3, .06, .08, .2, lamp(T3, 0xfff6cf, 0xfff0b0, .35), L / 2 + .025, .46, sd * (W * .32))); const lens = new T3.Mesh(new T3.CylinderGeometry(.01, .01, .01, 4), M.chrome); void lens; });
    lightKit(T3, g, spec, { headY: .72, headX: L / 2 + .02, headH: .14, headW: .42, headZ: W / 2 - .36, tailY: .8, tailH: .14, tailW: .36 });
    [1, -1].forEach(sd => g.add(box(T3, .09, .15, .5, M.chrome, L / 2 + .02, .76, sd * (W / 2 - .36)))); // chrome ramka
    plates(T3, g, spec, L / 2 + .06, .5, -L / 2 - .06, .5, plate);
    mirrors(T3, g, pr.hood - .35, 1.0, W, M, false);
    if (spec.body !== 'sedan') { [1, -1].forEach(sd => { const rail = cyl(T3, .018, .018, (pr.cab[1] - pr.cab[0]) * .92, M.black, (pr.cab[0] + pr.cab[1]) / 2, spec.H + .02, sd * (W / 2 - .2), 0, Math.PI / 2); g.add(rail); }); }
    if (spec.body === 'hatch') { g.add(cyl(T3, .006, .006, .55, M.black, -L / 2 + .3, spec.H + .28, W / 2 - .35, 0, 0)); }
    axles(T3, g, spec, M, R, false, false); g.userData.spec = spec; g.userData.M = M; return g;
  }

  /* ---- burchakli kuzovlar: Cybertruck va G-klass ---- */
  function buildAngular(spec, color, plate) {
    const T3 = THREE, g = new T3.Group(), L = spec.L, W = spec.W, H = spec.H, h = L / 2, R = spec.R, c = spec.c, M = mats(color, spec.body === 'cyber' ? .95 : .55);
    if (spec.body === 'cyber') {
      const poly = [[-h, .55], [h, .55], [h, .92], [h - .5, 1.05], [-.06 * L, H], [-.3 * L, 1.64], [-.33 * L, 1.5], [-h, 1.5]];
      g.add(extrude(poly, W, { t: .03, s: .03, n: 1 }, M.body, false));
      g.add((() => { const gg = new T3.ShapeGeometry(poly2(T3, [[h - .6, 1.1], [-.06 * L - .05, H - .1], [-.3 * L + .05, 1.6], [-.3 * L + .05, 1.12]])), m = new T3.Mesh(gg, M.glass); m.position.z = W / 2 + .004; return m; })());
      g.add((() => { const gg = new T3.ShapeGeometry(poly2(T3, [[h - .6, 1.1], [-.06 * L - .05, H - .1], [-.3 * L + .05, 1.6], [-.3 * L + .05, 1.12]])), m = new T3.Mesh(gg, M.glass); m.position.z = -W / 2 - .004; return m; })());
      const A = [h - .5, 1.06], B = [-.06 * L, H - .02], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new T3.PlaneGeometry(len, W * .84); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new T3.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); g.add(ws);
      g.add(box(T3, .04, .06, W * .94, lamp(T3, 0xffffff, 0xffffff, 1.2), h + .02, .93, 0)); g.userData.cyberBar = true;
      [1, -1].forEach(sd => { g.add(box(T3, 1.5, .1, .06, M.black, 0, .6, sd * (W / 2 + .02))); });
      g.add(box(T3, .2, .14, W * .9, M.black, h + .02, .6, 0));
      lightKit(T3, g, spec, { headY: .96, headX: h + .02, headH: .06, headW: .7, headZ: W / 2 - .52, tailY: 1.4, tailH: .07, tailW: .8 });
      plates(T3, g, spec, h + .03, .66, -h - .02, 1.1, plate); mirrors(T3, g, h - .8, 1.12, W, M, false);
    } else {
      const wbx = h - .24 * L, wtx = wbx - .07 * L, poly = [[-h, .55], [h, .55], [h, .98], [h - .12, 1.1], [wbx, 1.14], [wtx, H], [-h + .12, H], [-h, H - .14]];
      g.add(extrude(poly, W, { t: .05, s: .05, n: 2 }, M.body, false));
      const wl = [[wbx - .2, 1.22], [wtx - .03, H - .1], [-h + .2, H - .1], [-h + .2, 1.22]]; [1, -1].forEach(sd => { const m = new T3.Mesh(new T3.ShapeGeometry(poly2(T3, wl)), M.glass); m.position.z = sd * (W / 2 + .004); g.add(m); });
      const A = [wbx, 1.15], B = [wtx, H - .03], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new T3.PlaneGeometry(len, W * .86); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new T3.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); g.add(ws);
      g.add(box(T3, .1, .22, W * .96, M.black, h + .03, .68, 0)); g.add(box(T3, .06, .3, W * .5, M.black, h + .02, .96, 0)); for (let i = 0; i < 6; i++) g.add(box(T3, .03, .26, .03, M.chrome, h + .06, .96, -W * .21 + i * W * .084)); g.add(cyl(T3, .13, .13, .03, M.chrome, h + .07, .96, 0, 0, Math.PI / 2));
      [1, -1].forEach(sd => { g.add(cyl(T3, .15, .15, .09, lamp(T3, 0xfff3c4, 0xffe9a0, .35), h - .01, 1.02, sd * (W / 2 - .3), 0, Math.PI / 2)); g.add(cyl(T3, .18, .18, .06, M.chrome, h - .02, 1.02, sd * (W / 2 - .3), 0, Math.PI / 2)); g.add(box(T3, .5, .14, .16, M.black, c * 0 + (spec.WB - c), R + .22, sd * (W / 2 + .06))); g.add(box(T3, .5, .14, .16, M.black, -c, R + .22, sd * (W / 2 + .06))); });
      g.add(box(T3, .7, .06, W * .8, M.black, 0, H + .03, 0)); g.add(box(T3, .08, .12, W * .5, M.black, -h - .05, 1.0, 0));
      lightKit(T3, g, spec, { headY: 1.02, headX: h + .0, headH: .02, headW: .02, headZ: W / 2 - .3, tailY: 1.1, tailH: .24, tailW: .16 });
      plates(T3, g, spec, h + .06, .52, -h - .08, 1.0, plate); mirrors(T3, g, wbx - .1, 1.28, W, M, false);
    }
    axles(T3, g, spec, M, R, false, false); g.userData.spec = spec; g.userData.M = M; return g;
  }

  /* ---- avtobus (D) ---- */
  function buildBus(spec, color, plate) {
    const T3 = THREE, g = new T3.Group(), L = spec.L, W = spec.W, H = spec.H, h = L / 2, M = mats(color, .3);
    const poly = [[-h, .55], [h - .4, .55], [h, .75], [h, 1.5], [h - .15, 1.9], [h - 1.45, H], [-h + .4, H], [-h, H - .25]];
    g.add(extrude(poly, W, { t: .06, s: .08, n: 3 }, M.body, true));
    // yon oynalar (panjara-panjara)
    for (let i = 0; i < 8; i++) { const x0 = -h + .9 + i * 1.22; [1, -1].forEach(sd => { const m = new T3.Mesh(new T3.PlaneGeometry(1.1, 1.55), M.glass); m.position.set(x0 + .55, 2.2, sd * (W / 2 + .006)); if (sd < 0) m.rotation.y = Math.PI; g.add(m); }); }
    const A = [h - .2, 1.55], B = [h - 1.4, H - .12], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new T3.PlaneGeometry(len, W * .92); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new T3.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); g.add(ws);
    const strip = tex(512, 64, (cx, w, hh) => { cx.fillStyle = '#10141c'; cx.fillRect(0, 0, w, hh); cx.fillStyle = '#ffb000'; cx.font = '800 38px monospace'; cx.textAlign = 'center'; cx.fillText("YO'LDOSH  AVTOBUS", w / 2, 44); }, null); g.add((() => { const m = new T3.Mesh(new T3.PlaneGeometry(1.8, .26), new T3.MeshBasicMaterial({ map: strip })); m.position.set(h - 1.0, H - .3, W / 2 - .15); m.rotation.y = Math.PI / 2 * 0; m.visible = false; return m; })());
    g.add(box(T3, .08, .34, W * .7, new T3.MeshBasicMaterial({ map: strip }), h - 1.4, H - .52, 0));
    for (let i = 0; i < 4; i++) [1, -1].forEach(sd => g.add(box(T3, 1.2, .7, .02, M.black, -h + 1.8 + i * 1.7, .98, sd * (W / 2 + .004))));
    g.add(box(T3, .18, .3, W * .94, M.black, h + .01, .72, 0)); g.add(box(T3, .08, .36, W * .6, M.black, h + .01, 1.1, 0)); g.add(box(T3, .1, .05, W * .5, M.chrome, h + .03, 1.3, 0));
    lightKit(T3, g, spec, { headY: .98, headX: h + .01, headH: .2, headW: .5, headZ: W / 2 - .45, tailY: 1.1, tailH: .3, tailW: .3 });
    plates(T3, g, spec, h + .06, .6, -h - .02, .72, plate, .6); mirrors(T3, g, h - .8, 1.8, W, M, true);
    g.add(box(T3, L * .82, H - 1.45, W * .9, M.black, -.2, 1.45 + (H - 1.45) / 2, 0));
    axles(T3, g, spec, M, spec.R, true, true); g.userData.spec = spec; g.userData.M = M; return g;
  }

  /* ---- Isuzu yuk mashinasi (C) ---- */
  function buildBox(spec, color, plate) {
    const T3 = THREE, g = new T3.Group(), L = spec.L, W = spec.W, H = spec.H, h = L / 2, M = mats(color, .3), xf = spec.WB - spec.c;
    const cab = [[1.45, .65], [h, .65], [h, 1.5], [h - .06, 1.62], [h - .45, 2.55], [1.5, 2.6]];
    g.add(extrude(cab, W - .04, { t: .06, s: .08, n: 3 }, M.body, true));
    const A = [h - .08, 1.64], B = [h - .46, 2.5], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new T3.PlaneGeometry(len, W * .84); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new T3.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); g.add(ws);
    [1, -1].forEach(sd => { const m = new T3.Mesh(new T3.ShapeGeometry(poly2(T3, [[h - .35, 1.7], [h - .62, 2.46], [2.0, 2.46], [2.0, 1.7]])), M.glass); m.position.z = sd * (W / 2 + .004); g.add(m); });
    const boxMat = new T3.MeshStandardMaterial({ color: 0xf2f4f8, roughness: .45, metalness: .1 }), boxL = 1.45 + h - .05, bx = new T3.Mesh(new T3.BoxGeometry(boxL, 2.25, W), boxMat);
    bx.position.set(-h + boxL / 2, 2.075, 0); bx.castShadow = true; g.add(bx);
    [1, -1].forEach(sd => { for (let i = 1; i < 4; i++) g.add(box(T3, .04, 2.25, .01, M.trim, -h + i * boxL / 4, 2.07, sd * (W / 2 + .004))); g.add(box(T3, boxL, .16, .02, new T3.MeshStandardMaterial({ color }), -h + boxL / 2, 1.4, sd * (W / 2 + .006))); });
    g.add(box(T3, L - .3, .22, W - .5, M.black, 0, .7, 0));
    g.add(box(T3, .08, .5, W * .7, M.black, h + .01, .98, 0)); g.add(box(T3, .12, .24, W * .9, M.trim, h + .02, .62, 0)); g.add(box(T3, .1, .05, W * .5, M.chrome, h + .04, 1.18, 0));
    lightKit(T3, g, spec, { headY: 1.16, headX: h + .01, headH: .22, headW: .4, headZ: W / 2 - .3, tailY: 1.0, tailH: .3, tailW: .2 });
    plates(T3, g, spec, h + .05, .72, -h - .02, .78, plate, .56); mirrors(T3, g, h - .6, 2.0, W, M, true);
    axles(T3, g, spec, M, spec.R, true, true); g.userData.spec = spec; g.userData.M = M; return g;
  }

  /* ---- Volvo FH tortuvchi (CE) va yarim tirkama ---- */
  function buildSemi(spec, color, plate) {
    const T3 = THREE, g = new T3.Group(), L = spec.L, W = spec.W, h = L / 2, M = mats(0xf2f4f8, .3), c = spec.c, xr = -c;
    const cab = [[.4, .9], [h, .9], [h, 1.9], [h - .1, 2.0], [h - .6, 3.45], [h - .75, 3.55], [.35, 3.55]];
    g.add(extrude(cab, W - .04, { t: .06, s: .08, n: 3 }, M.body, true));
    const A = [h - .1, 2.02], B = [h - .6, 3.4], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new T3.PlaneGeometry(len, W * .86); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new T3.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); g.add(ws);
    [1, -1].forEach(sd => { const m = new T3.Mesh(new T3.ShapeGeometry(poly2(T3, [[h - .35, 2.1], [h - .75, 3.3], [1.5, 3.3], [1.5, 2.1]])), M.glass); m.position.z = sd * (W / 2 + .004); g.add(m); g.add(box(T3, 1.2, .9, .01, M.trim, .85, 2.25, sd * (W / 2 + .004))); const tank = cyl(T3, .32, .32, 1.4, M.chrome, 1.5, .85, sd * (W / 2 + .1), 0, Math.PI / 2); g.add(tank); });
    g.add(box(T3, .12, 1.0, W * .8, M.black, h + .01, 1.25, 0)); g.add(box(T3, .14, .05, W * .74, M.chrome, h + .03, 1.45, 0)); g.add(box(T3, .14, .05, W * .74, M.chrome, h + .03, 1.1, 0)); g.add(box(T3, .13, .3, W * .94, M.body, h + .03, .9, 0)); g.add(box(T3, .1, .1, W * .9, M.black, h + .0, .6, 0));
    g.add(box(T3, L - .2, .28, W - .7, M.black, 0, .85, 0)); g.add(cyl(T3, .55, .55, .06, new T3.MeshStandardMaterial({ color: 0x5a616d, metalness: .8 }), xr + .25, 1.12, 0));
    lightKit(T3, g, spec, { headY: 1.78, headX: h + .02, headH: .22, headW: .5, headZ: W / 2 - .42, tailY: 1.0, tailH: .2, tailW: .2 });
    plates(T3, g, spec, h + .07, .85, -h - .02, .85, plate, .56); mirrors(T3, g, h - .35, 2.6, W, M, true);
    axles(T3, g, spec, M, spec.R, true, true); g.userData.spec = spec; g.userData.M = M; return g;
  }
  function buildTrailer(spec, color) {
    const T3 = THREE, tr = spec.trailer, g = new T3.Group(), L = tr.L, W = tr.W, M = mats(color, .2), blue = new T3.MeshStandardMaterial({ color, roughness: .6 }), white = new T3.MeshStandardMaterial({ color: 0xf1f3f7, roughness: .5 });
    const body = new T3.Mesh(new T3.BoxGeometry(L, 2.75, W), blue); body.position.set(0, 1.2 + 1.375, 0); body.castShadow = true; g.add(body);
    [1, -1].forEach(sd => { g.add(box(T3, L, .16, .03, white, 0, 1.3, sd * (W / 2 + .01))); g.add(box(T3, L, .1, .03, white, 0, 3.85, sd * (W / 2 + .01))); for (let i = 0; i <= 12; i++) g.add(box(T3, .05, 2.5, .03, white, -L / 2 + .3 + i * (L - .6) / 12, 2.55, sd * (W / 2 + .012))); g.add(box(T3, L * .85, .1, .03, white, 0, 2.6, sd * (W / 2 + .013))); });
    g.add(box(T3, L, .26, W - .5, M.black, 0, 1.05, 0)); g.add(box(T3, .04, 2.6, W - .1, white, L / 2 + .01, 2.5, 0)); g.add(box(T3, .06, .3, W - .4, M.black, -L / 2 - .02, 1.0, 0));
    g.userData.tail = lamp(T3, 0x7a0f18, 0xff1830, .25); g.userData.ind = [0, 1, 2, 3].map(() => new T3.MeshStandardMaterial({ color: 0xff9a1f, emissive: 0xff7a00, emissiveIntensity: 0 }));
    [1, -1].forEach(sd => { g.add(box(T3, .06, .3, .22, g.userData.tail, -L / 2 - .04, 1.2, sd * (W / 2 - .2))); });
    g.userData.wheels = []; const R = .5, axX = L / 2 - tr.kp - tr.axle; [axX - 1.3, axX, axX + 1.3].forEach(x => [1, -1].forEach(sd => { const pv = new T3.Group(); pv.position.set(x, R, sd * (W / 2 - .22)); const w = wheelMesh(T3, R, M, true, true); if (sd < 0) w.scale.z = -1; pv.add(w); g.add(pv); g.userData.wheels.push(w); g.add(box(T3, .04, .5, .5, M.black, x - .6, .62, sd * (W / 2 - .05))); }));
    [1, -1].forEach(sd => g.add(box(T3, .12, .9, .12, M.black, L / 2 - tr.kp - 1.0, .5, sd * .8)));
    const pm = new T3.MeshStandardMaterial({ map: plateTex('01 A 777 AA'), roughness: .5 }); g.userData.plateMat = pm; g.add(box(T3, .03, .11, .52, pm, -L / 2 - .08, .8, 0)); g.userData.R = R; g.userData.spec = spec; return g;
  }
  /* tayyor 3D model (.glb) ulash: spec.glb = 'sim/models/vehicles/<id>/<id>.glb'. Model kodda yasalgan kuzovning o'rnini egallaydi:
     g'ildiraklar (Wheel_FL/FR/RL/RR) aylanadi va old g'ildiraklar burilsa buriladi, kuzov bo'yog'i (paint material) tanlangan rangga bo'yaladi,
     Headlights/Taillights tugunlari (bo'lsa) chiroq sifatida yonadi. Model koordinatasi: +z oldi, +x chap, boshi o'qlar o'rtasida, yerda. */
  let gltfP = null, meshP = null; const glbCache = {};
  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.head.appendChild(s); });
  const loadGLTF = () => (window.THREE && THREE.GLTFLoader) ? Promise.resolve() : (gltfP = gltfP || loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js').catch(e => { gltfP = null; throw e; }));
  const loadMeshopt = () => window.MeshoptDecoder ? Promise.resolve() : (meshP = meshP || loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js').catch(e => { meshP = null; throw e; }));
  const loadGLB = (url) => glbCache[url] || (glbCache[url] = Promise.all([loadGLTF(), loadMeshopt()]).then(() => new Promise((ok, no) => {
    const ld = new THREE.GLTFLoader(); if (window.MeshoptDecoder) ld.setMeshoptDecoder(window.MeshoptDecoder); ld.load(url, ok, undefined, no);
  })).catch(e => { delete glbCache[url]; throw e; }));
  const emitProxy = (mats) => { let v = 0; return { get emissiveIntensity() { return v; }, set emissiveIntensity(x) { v = x; mats.forEach(m => { m.emissiveIntensity = x; }); } }; };
  function attachModel(g, spec, color) {
    loadGLB(spec.glb).then((gl) => {
      const T3 = THREE, m = gl.scene.clone(true), u = g.userData, named = {};
      m.traverse(o => { if (o.name) named[o.name] = o; });
      // materiallarni nusxalash (garajda rang almashganda boshqa nusxalarga ta'sir qilmasin)
      const cl = new Map(), cm = (mt) => { if (!cl.has(mt)) cl.set(mt, mt.clone()); return cl.get(mt); };
      m.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(cm) : cm(o.material); o.castShadow = true; o.receiveShadow = true; } });
      // o'lcham: model uzunligi spec.L ga moslanadi
      const box0 = new T3.Box3().setFromObject(m), sz0 = box0.getSize(new T3.Vector3()), k = spec.L / (sz0.z || spec.L);
      // bo'yoq
      const pn = spec.paint || 'primary'; let painted = 0;
      m.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(mt => { if (mt.name === pn) { mt.color.set(color); painted++; } }); });
      // g'ildiraklar: Wheel_* -> pivot (burilish) + g'ildirak (aylanish)
      const wheels = [], steer = [];
      [['Wheel_FL', true], ['Wheel_FR', true], ['Wheel_RL', false], ['Wheel_RR', false]].forEach(([n, front]) => {
        const w = named[n]; if (!w) return;
        const pv = new T3.Group(); pv.position.copy(w.position); w.parent.add(pv); pv.add(w); w.position.set(0, 0, 0); w.rotation.set(0, 0, 0);
        w.userData.glbRoll = true; wheels.push(w); if (front) steer.push(pv);
      });
      if (wheels.length === 4) { u.wheels = wheels; u.steer = steer; }
      // chiroqlar
      const lm = (n, col) => { const nd = named[n]; if (!nd) return null; const arr = []; nd.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(mt => { if (mt.emissive) { mt.emissive.set(col); arr.push(mt); } }); }); return arr.length ? emitProxy(arr) : null; };
      const tl = lm('Taillights', 0xff1830), hl = lm('Headlights', 0xfff2d0); if (tl) u.tail = tl; if (hl) u.head = hl;
      // joylashtirish: model +z -> sim +x; o'qlar o'rtasi = (WB/2 - c)
      m.scale.setScalar(k); m.rotation.y = Math.PI / 2; m.position.set(spec.WB / 2 - spec.c, 0, 0);
      const wrap = new T3.Group(); wrap.add(m);
      g.children.forEach(c => { if (!c.userData.keep) c.visible = false; }); g.add(wrap); u.glb = true;
    }).catch(() => { /* model topilmasa, kodda yasalgan variant qoladi */ });
  }
  let shadowTex = null;
  function contactShadow(T3, L, W) {
    shadowTex = shadowTex || tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.7)'); r.addColorStop(.6, 'rgba(0,0,0,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, null);
    const m = new T3.Mesh(new T3.PlaneGeometry(L * 1.18, W * 1.3), new T3.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .015; return m;
  }
  function buildCar(spec, color, plate) {
    plate = plate || '01 A 777 AA'; const g = spec.kind === 'bus' ? buildBus(spec, color, plate) : spec.kind === 'boxtruck' ? buildBox(spec, color, plate) : spec.kind === 'semi' ? buildSemi(spec, color, plate) : spec.kind === 'angular' ? buildAngular(spec, color, plate) : buildPassenger(spec, color, plate);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; if (o.material && o.material.isMeshPhysicalMaterial) o.material.envMapIntensity = 1.5; });
    const sh = contactShadow(THREE, spec.L, spec.W); sh.position.x = 0; sh.userData.keep = true; g.add(sh);
    if (spec.glb) attachModel(g, spec, color); return g;
  }  const setCarFx = (car, o) => {
    const u = car.userData, R = u.R; u.wheels.forEach(w => { if (w.userData.glbRoll) w.rotation.x += o.v * o.dt / R; else w.rotation.z -= o.v * o.dt / R; }); u.steer.forEach(p => { p.rotation.y = -o.steer; });
    u.tail.emissiveIntensity = o.brake ? 1.6 : .25; u.head.emissiveIntensity = o.lights ? .9 : .2;
    const blink = (Math.floor(o.t * 2.8) % 2) === 0, on = (k) => { u.ind[k].emissiveIntensity = blink ? 2 : 0; };
    u.ind.forEach(m => { m.emissiveIntensity = 0; });
    if (o.ind === -1 || o.hazard) { on(0); on(2); } if (o.ind === 1 || o.hazard) { on(1); on(3); }
  };
  /* ================= Teksturalar ================= */
  const tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 8; return t; };
  const rnd = (a) => { let s = a; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const grassTex = () => tex(256, 256, (g, w, h) => { g.fillStyle = '#5da83a'; g.fillRect(0, 0, w, h); const r = rnd(7); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${40 + r() * 50 | 0},${120 + r() * 60 | 0},${30 + r() * 30 | 0},.35)`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); } }, [90, 90]);
  const roadTex = () => tex(256, 512, (g, w, h) => {
    g.fillStyle = '#3a3e47'; g.fillRect(0, 0, w, h); const r = rnd(3); for (let i = 0; i < 7000; i++) { const v = 45 + r() * 40 | 0; g.fillStyle = `rgba(${v},${v + 2},${v + 8},.5)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    g.fillStyle = '#f2f4f8'; g.fillRect(w * .035, 0, 7, h); g.fillRect(w * .965 - 7, 0, 7, h);               // chetki chiziqlar
    g.fillRect(w / 2 - 4, 0, 8, h * .34);                                                                       // uzuq o'rta chiziq
  }, null);
  const curbTex = () => tex(64, 128, (g, w, h) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#f2b705'; g.fillRect(0, h / 2, w, h / 2); }, null);
  const signTex = (kind) => tex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; const c = w / 2;
    if (kind === 'limit') { g.fillStyle = '#d9141e'; g.beginPath(); g.arc(c, c, 120, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, 92, 0, TAU); g.fill(); g.fillStyle = '#111'; g.font = '800 104px sans-serif'; g.fillText('20', c, c + 6); }
    else if (kind === 'stop') { g.fillStyle = '#d9141e'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(c + Math.cos(a) * 124, c + Math.sin(a) * 124); } g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke(); g.fillStyle = '#fff'; g.font = '800 70px sans-serif'; g.fillText('STOP', c, c + 4); }
    else if (kind === 'right') { g.fillStyle = '#1565c0'; g.beginPath(); g.arc(c, c, 120, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 18; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(80, 190); g.lineTo(80, 120); g.quadraticCurveTo(80, 90, 120, 90); g.lineTo(165, 90); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(150, 54); g.lineTo(204, 90); g.lineTo(150, 126); g.closePath(); g.fill(); }
    else if (kind === 'slalom') { g.fillStyle = '#f2b705'; g.beginPath(); g.moveTo(c, 12); g.lineTo(244, 232); g.lineTo(12, 232); g.closePath(); g.fill(); g.fillStyle = '#d9141e'; g.beginPath(); g.moveTo(c, 40); g.lineTo(222, 220); g.lineTo(34, 220); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#d9141e'; g.lineWidth = 16; g.stroke(); g.strokeStyle = '#111'; g.lineWidth = 14; g.beginPath(); g.moveTo(90, 200); g.lineTo(130, 150); g.lineTo(100, 120); g.lineTo(150, 80); g.stroke(); }
    else if (kind === 'park') { g.fillStyle = '#1565c0'; g.fillRect(14, 14, 228, 228); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(14, 14, 228, 228); g.fillStyle = '#fff'; g.font = '800 170px sans-serif'; g.fillText('P', c, c + 8); }
  }, null);
  const textTex = (txt, bg, fg) => tex(512, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = '800 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4); }, null);

  /* ================= DUNYO ================= */
  function ribbon(d0, d1, y, mat, s0, s1, vPer) {
    const T3 = THREE, pos = [], uv = [], idx = []; let k = 0;
    for (let s = s0; s <= s1 + .001; s += 1) { const a = sideOf(s, d0), b = sideOf(s, d1); pos.push(a.x, y, a.z, b.x, y, b.z); const v = s / vPer; uv.push(0, v, 1, v); if (k > 0) { const i = k * 2; idx.push(i - 2, i - 1, i, i - 1, i + 1, i); } k++; }
    const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T3.Mesh(g, mat); m.receiveShadow = true; return m;
  }
  const quadPlane = (x, z, w, d, y, color, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: .9 })); m.rotation.x = -Math.PI / 2; m.rotation.z = rot || 0; m.position.set(x, y, z); m.receiveShadow = true; return m; };

  function buildWorld(scene) {
    const T3 = THREE, W = { cones: [], parked: [], signs: [], light: null, objs: [] };
    // yer
    const gm = new T3.Mesh(new T3.PlaneGeometry(900, 900), new T3.MeshStandardMaterial({ map: grassTex(), roughness: 1 })); gm.rotation.x = -Math.PI / 2; gm.position.set(40, 0, 40); gm.receiveShadow = true; scene.add(gm);
    // yo'l va chetlar
    const roadM = new T3.MeshStandardMaterial({ map: roadTex(), roughness: .92 }); const road = ribbon(-4.5, 4.5, .02, roadM, 0, PATH.total, 9.6); scene.add(road);
    const curbM = new T3.MeshStandardMaterial({ map: curbTex(), roughness: .8 }); curbM.map.repeat.set(1, 1);
    scene.add(ribbon(4.5, 5.0, .06, curbM, 0, PATH.total, 1.2)); scene.add(ribbon(-5.0, -4.5, .06, curbM, 0, PATH.total, 1.2));
    // parkovka yo'lagi
    const pl = quadPlane(23, 5.4, 22, 2.8, .021, 0x3d424b); scene.add(pl);
    const lineM = new T3.MeshBasicMaterial({ color: 0xf2f4f8 }), line = (x, z, w, d) => { const m = new T3.Mesh(new T3.PlaneGeometry(w, d), lineM); m.rotation.x = -Math.PI / 2; m.position.set(x, .035, z); scene.add(m); };
    [12, 20, 26.4, 34].forEach(x => line(x, 5.4, .12, 2.7)); line(23, 6.78, 22, .12); line(23, 4.02, 22, .1);
    const kerbP = new T3.Mesh(new T3.BoxGeometry(22, .14, .4), new T3.MeshStandardMaterial({ color: 0xcfd3da })); kerbP.position.set(23, .07, 7.0); scene.add(kerbP);
    // to'xtash chiziqlari (svetofor, STOP) va marra
    const stopLine = (s) => { const p = sideOf(s, 2.25), m = new T3.Mesh(new T3.PlaneGeometry(.45, 4.5), lineM); m.rotation.x = -Math.PI / 2; m.rotation.z = -p.th; m.position.set(p.x, .04, p.z); scene.add(m); };
    const sLight = M.s2 + 18, sStop = M.s4 + 31; stopLine(sLight); stopLine(sStop);
    const fin = (() => { const g = new T3.Group(); for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) { const m = new T3.Mesh(new T3.PlaneGeometry(.5, .5), new T3.MeshBasicMaterial({ color: (i + j) % 2 ? 0x111111 : 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(j * .5, .04, -2.25 + i * .5); g.add(m); } return g; })(); fin.position.set(1, 0, 0); scene.add(fin);
    // start qutisi
    const sb = new T3.Mesh(new T3.PlaneGeometry(9, 3.4), new T3.MeshBasicMaterial({ color: 0x58cc02, transparent: true, opacity: .22 })); sb.rotation.x = -Math.PI / 2; sb.position.set(5.5, .036, 2.0); scene.add(sb);
    // belgilar
    const sign = (kind, s, d, rotY, size) => { const p = sideOf(s, d), g = new T3.Group(); const pole = new T3.Mesh(new T3.CylinderGeometry(.04, .04, 2.6, 8), new T3.MeshStandardMaterial({ color: 0x9aa3b0, metalness: .8, roughness: .4 })); pole.position.y = 1.3; pole.castShadow = true; g.add(pole); const sz = size || 0.95; const face = new T3.Mesh(new T3.PlaneGeometry(sz, sz), new T3.MeshBasicMaterial({ map: signTex(kind), transparent: true, side: T3.DoubleSide })); face.position.set(0, 2.5, .06); g.add(face); g.position.set(p.x, 0, p.z); g.rotation.y = -(p.th) + Math.PI / 2 + (rotY || 0); scene.add(g); return g; };
    sign('limit', 34, 5.9, 0); sign('right', M.a1 - 14, 5.9, 0); sign('slalom', M.s3 + 4, 5.9, 0); sign('stop', sStop - 2, 5.9, 0); sign('park', 13, 7.6, 0, 0.8); sign('right', M.a2 - 14, 5.9, 0); sign('right', M.a3 - 14, 5.9, 0); sign('right', M.a4 - 14, 5.9, 0);
    // svetofor
    { const p = sideOf(sLight + 1, 5.6), g = new T3.Group(); const pole = new T3.Mesh(new T3.CylinderGeometry(.07, .07, 4.2, 10), new T3.MeshStandardMaterial({ color: 0x2a2f3a, metalness: .7 })); pole.position.y = 2.1; g.add(pole); const box = new T3.Mesh(new T3.BoxGeometry(.42, 1.2, .3), new T3.MeshStandardMaterial({ color: 0x15181f })); box.position.y = 4.1; g.add(box);
      const mk = (y, col) => { const m = new T3.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .08 }); const l = new T3.Mesh(new T3.SphereGeometry(.14, 14, 14), m); l.position.set(0, y, .17); g.add(l); return m; };
      W.light = { r: mk(4.45, 0xff2a2a), y: mk(4.1, 0xffc400), g: mk(3.75, 0x22dd55), state: 'green', timer: 0, sStop: sLight }; g.position.set(p.x, 0, p.z); g.rotation.y = -p.th + Math.PI / 2; scene.add(g); }
    // konuslar (ilon)
    const coneG = new T3.ConeGeometry(.22, .6, 14), coneM = new T3.MeshStandardMaterial({ color: 0xff6a13, roughness: .6 });
    [M.s3 + 14, M.s3 + 22, M.s3 + 30, M.s3 + 38, M.s3 + 46].forEach((s, i) => { const p = sideOf(s, 0), m = new T3.Group(); const c = new T3.Mesh(coneG, coneM); c.position.y = .3; c.castShadow = true; const st = new T3.Mesh(new T3.CylinderGeometry(.14, .17, .12, 14), new T3.MeshStandardMaterial({ color: 0xffffff })); st.position.y = .3; const base = new T3.Mesh(new T3.BoxGeometry(.5, .04, .5), new T3.MeshStandardMaterial({ color: 0x222222 })); base.position.y = .02; m.add(c, st, base); m.position.set(p.x, 0, p.z); scene.add(m); W.cones.push({ x: p.x, z: p.z, r: .3, fallen: false, i, mesh: m, vx: 0, vz: 0, s, th: p.th }); });
    // to'xtab turgan mashinalar
    W.parkSpec = [{ x: 17.8, color: '#2B6CB0', spec: CARS[1] }, { x: 28.6, color: '#C62828', spec: CARS[2] }];
    W.parkSpec.forEach(pc => { const m = buildCar(pc.spec, pc.color); m.position.set(pc.x, 0, 5.4); scene.add(m); W.parked.push({ x: pc.x, z: 5.4, w: pc.spec.L, h: pc.spec.W }); });
    // daraxtlar (instance)
    { const r = rnd(11), N = 160, trunk = new T3.InstancedMesh(new T3.CylinderGeometry(.18, .26, 1.6, 6), new T3.MeshStandardMaterial({ color: 0x5a3d22 }), N), c1 = new T3.InstancedMesh(new T3.ConeGeometry(1.5, 3.2, 8), new T3.MeshStandardMaterial({ color: 0x1f6b2c, roughness: .9 }), N), c2 = new T3.InstancedMesh(new T3.ConeGeometry(1.1, 2.6, 8), new T3.MeshStandardMaterial({ color: 0x2a8a3a, roughness: .9 }), N), mat = new T3.Matrix4(); let n = 0;
      while (n < N) { const x = -60 + r() * 220, z = -50 + r() * 190; if (x > -26 && x < 96 && z > -26 && z < 90 && !(z > 18 && z < 44 && x > 8 && x < 62)) { if (r() < .75) continue; } const dd = (() => { let best = 1e9; for (let i = 0; i < PATH.pts.length; i += 6) { const p = PATH.pts[i], q = (p.x - x) ** 2 + (p.z - z) ** 2; if (q < best) best = q; } return Math.sqrt(best); })(); if (dd < 12) continue; const sc = .8 + r() * .8; mat.makeScale(sc, sc, sc); mat.setPosition(x, .8 * sc, z); trunk.setMatrixAt(n, mat); mat.setPosition(x, 2.6 * sc, z); c1.setMatrixAt(n, mat); mat.setPosition(x, 4.2 * sc, z); c2.setMatrixAt(n, mat); n++; }
      [trunk, c1, c2].forEach(m => { m.castShadow = true; scene.add(m); }); }
    // to'siq (panjara)
    { const fenceM = new T3.MeshStandardMaterial({ color: 0x9aa3b0, metalness: .6, roughness: .5 }), posts = new T3.InstancedMesh(new T3.CylinderGeometry(.04, .04, 1.6, 6), fenceM, 140), mat = new T3.Matrix4(); let n = 0; const X0 = -40, X1 = 112, Z0 = -34, Z1 = 100;
      const rail = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), r = new T3.Mesh(new T3.BoxGeometry(len, .05, .05), fenceM); r.position.set((x0 + x1) / 2, 1.3, (z0 + z1) / 2); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); scene.add(r); const r2 = r.clone(); r2.position.y = .7; scene.add(r2); for (let t = 0; t <= len && n < 140; t += 4) { mat.setPosition(x0 + (x1 - x0) * t / len, .8, z0 + (z1 - z0) * t / len); posts.setMatrixAt(n++, mat); } };
      rail(X0, Z0, X1, Z0); rail(X1, Z0, X1, Z1); rail(X1, Z1, X0, Z1); rail(X0, Z1, X0, Z0); posts.count = n; scene.add(posts); }
    // tom (soyabon) va bilbord
    { const g = new T3.Group(); const roof = new T3.Mesh(new T3.BoxGeometry(26, .5, 9), new T3.MeshStandardMaterial({ color: 0xf2f4f8, roughness: .5 })); roof.position.y = 6; roof.castShadow = true; g.add(roof); [-11, 11].forEach(x => [-3, 3].forEach(z => { const p = new T3.Mesh(new T3.CylinderGeometry(.25, .25, 6, 10), new T3.MeshStandardMaterial({ color: 0x1b2330 })); p.position.set(x, 3, z); g.add(p); }));
      const banner = new T3.Mesh(new T3.PlaneGeometry(14, 2), new T3.MeshBasicMaterial({ map: textTex(`YO'LDOSH AI · SIMULYATOR`, '#0b1220', '#9be83a') })); banner.position.set(0, 6.3, 4.6); g.add(banner); g.position.set(18, 0, -14); scene.add(g);
      const bb = new T3.Mesh(new T3.PlaneGeometry(10, 2.5), new T3.MeshBasicMaterial({ map: textTex(`Haydash — mashq bilan`, '#1565c0', '#ffffff'), side: T3.DoubleSide })); bb.position.set(70, 3.4, -9); scene.add(bb); const bp = new T3.Mesh(new T3.CylinderGeometry(.1, .1, 3.4, 8), new T3.MeshStandardMaterial({ color: 0x555b66 })); bp.position.set(70, 1.7, -9); scene.add(bp); }
    // ichki maydon (yashil, qizil-oq to'siq belgilari)
    W.sLight = sLight; W.sStop = sStop; return W;
  }

  /* ================= SIMULYATSIYA ================= */
  function nearest(sim, x, z) {
    const n = PATH.pts.length; let best = 1e12, bi = sim.idx;
    for (let k = -20; k <= 20; k++) { const i = ((sim.idx + k) % n + n) % n, p = PATH.pts[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; bi = i; } }
    sim.idx = bi; const p = PATH.pts[bi], rx = -Math.sin(p.th), rz = Math.cos(p.th); return { s: p.s, d: (x - p.x) * rx + (z - p.z) * rz, dist: Math.sqrt(best), th: p.th };
  }
  const TASKS = [
    { id: 'start', t: `Harakatni boshlang` },
    { id: 'park', t: `O'ng tomondagi ikki mashina orasiga parallel parkovka qiling (orqaga yurib)` },
    { id: 'speed', t: `20 km/soat belgisi: tezlikdan oshmang` },
    { id: 'turn1', t: `O'ngga burilish: oldindan o'ng ko'rsatkichni yoqing` },
    { id: 'light', t: `Svetofor: qizil chiroqda to'xtang, yashilda yuring` },
    { id: 'turn2', t: `O'ngga burilish: ko'rsatkichni yoqing` },
    { id: 'slalom', t: `Ilon: konuslar orasidan navbat bilan chap-o'ng o'ting` },
    { id: 'turn3', t: `O'ngga burilish: ko'rsatkichni yoqing` },
    { id: 'stop', t: `STOP belgisi: chiziq oldida to'liq to'xtang` },
    { id: 'turn4', t: `O'ngga burilish: ko'rsatkichni yoqing` },
    { id: 'finish', t: `Start qutisida to'xtang: tugatish` },
  ];
  /* mexanika: uzatmalar nisbati, dvigatel momenti */
  const RATIOS = (spec) => spec.heavy ? [7.2, 4.3, 2.8, 1.9, 1.35, 1.0].slice(0, spec.gears) : [3.9, 2.3, 1.5, 1.1, .88].slice(0, spec.gears);
  const FINAL = (spec) => spec.heavy ? 4.4 : 4.2, REVR = (spec) => spec.heavy ? 6.8 : 3.6;
  const tqCurve = (rpm) => rpm < 800 ? .35 + rpm / 800 * .25 : rpm < 3200 ? .6 + (rpm - 800) / 2400 * .4 : rpm < 5200 ? 1 : Math.max(0, 1 - (rpm - 5200) / 1200 * .7);
  function makeSim(spec, world, opt) {
    const o = opt || {}, p0 = sideOf(3, 2), manual = !!o.manual;
    const sim = { spec, WB: spec.WB, c: spec.c, w: world, x: p0.x - Math.cos(0) * 0, z: p0.z, th: 0, v: 0, steer: 0, gear: manual ? 0 : 1, manual, free: !!o.free, clutch: 0, engine: true, rpm: 900, ind: 0, hazard: false, t: 0, score: 100, errors: 0, events: [], flags: {}, done: {}, ti: 0, state: 'run', idx: 3, prog: 3, sPrev: 3, stopT: 0, msg: o.free ? `Erkin haydash: hech qanday cheklov yo'q` : TASKS[0].t, msgT: 8, brake: false, inp: { gas: 0, brake: 0, steer: 0, clutch: 0 }, minV: { stop: 9 }, slalomSide: {}, speedT: 0, skipped: {} };
    sim.x = p0.x - spec.c; sim.z = p0.z;                                                   // orqa o'q: markaz p0 da bo'lsin
    sim.cx = () => sim.x + Math.cos(sim.th) * spec.c; sim.cz = () => sim.z + Math.sin(sim.th) * spec.c;
    if (spec.trailer) { const tr = spec.trailer; sim.tr = { th: 0, x: 0, z: 0, L: tr.L, W: tr.W }; trailerPose(sim); }
    if (spec.heavy && !sim.free) { sim.done.park = true; sim.done.slalom = true; sim.skipped.park = sim.skipped.slalom = true; }
    return sim;
  }
  /* yarim tirkama: tortqich orqa o'qidan 0.25 m oldinda ulanish (kingpin); tirkama o'qi 'axle' masofada */
  function trailerPose(sim) {
    const tr = sim.spec.trailer, ux = Math.cos(sim.th), uz = Math.sin(sim.th), kx = sim.x + ux * .25, kz = sim.z + uz * .25, T = sim.tr, dx = Math.cos(T.th), dz = Math.sin(T.th);
    T.kx = kx; T.kz = kz; T.cx = kx - dx * (tr.L / 2 - tr.kp); T.cz = kz - dz * (tr.L / 2 - tr.kp);
  }
  const bodies = (sim) => { const L = sim.spec.L, W = sim.spec.W, out = [{ cx: sim.cx(), cz: sim.cz(), th: sim.th, L, W }]; if (sim.tr) out.push({ cx: sim.tr.cx, cz: sim.tr.cz, th: sim.tr.th, L: sim.tr.L, W: sim.tr.W }); return out; };
  const cornersOf = (b) => { const ux = Math.cos(b.th), uz = Math.sin(b.th), vx = -uz, vz = ux, hl = b.L / 2, hw = b.W / 2; return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, c]) => ({ x: b.cx + ux * hl * a + vx * hw * c, z: b.cz + uz * hl * a + vz * hw * c })); };
  const corners = (sim) => cornersOf(bodies(sim)[0]);
  function hitRect(pts, r) {
    const minx = r.x - r.w / 2, maxx = r.x + r.w / 2, minz = r.z - r.h / 2, maxz = r.z + r.h / 2;
    if (pts.every(p => p.x < minx) || pts.every(p => p.x > maxx) || pts.every(p => p.z < minz) || pts.every(p => p.z > maxz)) return false;
    const rc = [{ x: minx, z: minz }, { x: maxx, z: minz }, { x: maxx, z: maxz }, { x: minx, z: maxz }];
    for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4], ax = -(q.z - p.z), az = q.x - p.x, len = Math.hypot(ax, az) || 1, nx = ax / len, nz = az / len; const pr = (arr) => { let mn = 1e9, mx = -1e9; arr.forEach(t => { const d = t.x * nx + t.z * nz; if (d < mn) mn = d; if (d > mx) mx = d; }); return [mn, mx]; }; const a = pr(pts), b = pr(rc); if (a[1] < b[0] || b[1] < a[0]) return false; }
    return true;
  }
  function hitCone(b, k) {
    const dx = k.x - b.cx, dz = k.z - b.cz, ux = Math.cos(b.th), uz = Math.sin(b.th), lx = dx * ux + dz * uz, lz = -dx * uz + dz * ux;
    return Math.hypot(lx - Math.max(-b.L / 2, Math.min(b.L / 2, lx)), lz - Math.max(-b.W / 2, Math.min(b.W / 2, lz))) < k.r;
  }
  function pen(sim, key, label, pts, cool) {
    if (sim.free) return false;
    const last = sim.flags[key]; if (last != null && sim.t - last < (cool == null ? 2 : cool)) { sim.flags[key] = sim.t; return false; }
    sim.flags[key] = sim.t; sim.score = Math.max(0, sim.score - pts); sim.errors++; sim.events.push({ t: sim.t, label, pts }); sim.msg = `${label}: −${pts}`; sim.msgT = 3; sim.fx = (sim.fx || 0) + 1; return true;
  }
  const doneTask = (sim, id, msg) => { if (sim.done[id]) return; sim.done[id] = true; const i = TASKS.findIndex(x => x.id === id); sim.ti = Math.max(sim.ti, i + 1); const nx = TASKS.slice(i + 1).find(t => !sim.done[t.id]); sim.msg = nx ? nx.t : msg; sim.msgT = 6; sim.ok = (sim.ok || 0) + 1; };
  function stall(sim) { if (!sim.engine) return; sim.engine = false; sim.rpm = 0; sim.msg = `Dvigatel o'chdi: debriyajni bosib, Start ni bosing`; sim.msgT = 4; sim.fx = (sim.fx || 0) + 1; if (!sim.free) pen(sim, 'stall', `Dvigatel o'chdi`, 3, 5); }
  function startEngine(sim) { if (sim.engine) return; if (sim.gear !== 0 && sim.clutch < .6) { sim.msg = `Debriyajni bosing yoki neytralga o'ting (N)`; sim.msgT = 2.5; return; } sim.engine = true; sim.rpm = 900; sim.msg = `Dvigatel yondi`; sim.msgT = 1.5; }
  function step(sim, dt) {
    if (sim.state !== 'run') return;
    const i = sim.inp, W = sim.w, spec = sim.spec; sim.t += dt; if (sim.msgT > 0) sim.msgT -= dt;
    // rul
    const maxD = spec.steer / (1 + 0.025 * sim.v * sim.v * (spec.heavy ? 1.6 : 1)); const tgt = i.steer * maxD, rate = (spec.heavy ? 1.3 : 2.2) * dt; sim.steer += Math.max(-rate, Math.min(rate, tgt - sim.steer));
    // debriyaj pedali
    const ct = sim.manual ? (i.clutch || 0) : 0; sim.clutch += Math.max(-dt * 3.4, Math.min(dt * 8, ct - sim.clutch));
    if (i.gas) sim.moved = true;
    if (!sim.manual) {
      // AVTOMAT
      const vmax = sim.gear < 0 ? 2.4 : spec.vmax, dir = sim.gear < 0 ? -1 : 1;
      if (i.gas) { const room = Math.max(0, 1 - Math.abs(sim.v) / vmax); sim.v += dir * i.gas * spec.accel * room * dt; }
      if (i.brake) { const d = (spec.heavy ? 7 : 9.5) * i.brake * dt; sim.v = Math.abs(sim.v) <= d ? 0 : sim.v - Math.sign(sim.v) * d; }
      sim.v -= sim.v * 0.12 * dt; if (!i.gas && !i.brake) { const roll = (Math.abs(sim.v) < 1.2 ? 0.0 : 0.6) * dt; sim.v = Math.abs(sim.v) <= roll ? 0 : sim.v - Math.sign(sim.v) * roll; }
      if (sim.moved && !i.gas && !i.brake && sim.gear > 0 && Math.abs(sim.v) < 1.3) sim.v = Math.min(1.3, sim.v + 0.5 * dt);
      if (sim.moved && !i.gas && !i.brake && sim.gear < 0 && Math.abs(sim.v) < 1.1) sim.v = Math.max(-1.1, sim.v - 0.5 * dt);
      sim.v = Math.max(-2.4, Math.min(spec.vmax + .5, sim.v)); if (Math.abs(sim.v) > vmax && sim.gear > 0) sim.v -= (Math.abs(sim.v) - vmax) * 2 * dt;
      sim.rpm = 900 + Math.abs(sim.v) / spec.vmax * 4200 + i.gas * 600;
    } else {
      // MEXANIKA: debriyaj + uzatmalar + dvigatel aylanishlari
      const rat = RATIOS(spec), g = sim.gear, gr = g > 0 ? rat[g - 1] : g < 0 ? REVR(spec) : 0, fin = FINAL(spec), R = spec.R, eng = 1 - Math.min(1, sim.clutch * 1.15), dir = g < 0 ? -1 : 1;
      const wheelRpm = gr ? Math.abs(sim.v) / R * gr * fin * 60 / TAU : 0, th = i.gas;
      if (!sim.engine) { sim.rpm += (0 - sim.rpm) * Math.min(1, dt * 4); if (gr && eng > .5) { sim.v -= sim.v * 1.6 * dt; } }
      else {
        if (!gr || eng < .08) sim.rpm += ((900 + th * 5300) - sim.rpm) * Math.min(1, dt * 5);
        else if (eng > .85) { const target = Math.max(wheelRpm, th > .3 ? 1100 : 0); sim.rpm += (target - sim.rpm) * Math.min(1, dt * 20); if (sim.rpm < 560 && th < .45) stall(sim); }
        else { sim.rpm += (((900 + th * 5300) * (1 - eng) + wheelRpm * eng) - sim.rpm) * Math.min(1, dt * 6); if (sim.rpm < 480 && eng > .55) stall(sim); }
        if (sim.engine && gr) {
          const tq = sim.rpm > 6150 ? 0 : tqCurve(Math.max(sim.rpm, 700)), a = th * tq * spec.accel * 1.7 * Math.pow(gr / rat[0], .85) * Math.pow(eng, 1.5) * dir;
          sim.v += a * dt;
          if (th < .05 && eng > .85 && Math.abs(sim.v) > .15) sim.v -= Math.sign(sim.v) * 0.8 * (gr / rat[0]) * dt;     // dvigatel bilan tormozlash
          if (eng > .85 && wheelRpm > 6400) sim.v -= Math.sign(sim.v) * (wheelRpm - 6400) / 600 * dt;
        }
      }
      if (i.brake) { const d = (spec.heavy ? 7 : 9.5) * i.brake * dt; sim.v = Math.abs(sim.v) <= d ? 0 : sim.v - Math.sign(sim.v) * d; if (sim.engine && gr && eng > .85 && Math.abs(sim.v) < .3 && th < .2) { sim.rpm = Math.max(0, sim.rpm - 3000 * dt); if (sim.rpm < 560) stall(sim); } }
      sim.v -= sim.v * 0.05 * dt; if (!i.gas && !i.brake) { const roll = .5 * dt; sim.v = Math.abs(sim.v) <= roll ? 0 : sim.v - Math.sign(sim.v) * roll; }
      sim.v = Math.max(-2.4, Math.min(spec.vmax + 1, sim.v));
    }
    sim.brake = i.brake > .1;
    // yo'ldan chiqish
    const near0 = nearest(sim, sim.cx(), sim.cz()); const inPark = near0.s > 8 && near0.s < 36 && near0.s < M.a1 && near0.d < 7.4 && near0.d > -4.8;
    const off = Math.abs(near0.d) > (spec.heavy ? 5.8 : 5.2) && !inPark; if (off) sim.v -= sim.v * 1.4 * dt;
    // harakat (orqa o'q atrofida)
    const px = sim.x, pz = sim.z, pth = sim.th, ptr = sim.tr ? sim.tr.th : 0;
    sim.th += sim.v / spec.WB * Math.tan(sim.steer) * dt; sim.x += Math.cos(sim.th) * sim.v * dt; sim.z += Math.sin(sim.th) * sim.v * dt;
    if (sim.tr) { const T = sim.tr; T.th += sim.v * Math.sin(sim.th - T.th) / spec.trailer.axle * dt; trailerPose(sim); }
    // to'qnashuvlar
    let blocked = false; const bs = bodies(sim);
    for (const r of W.parked) if (bs.some(b => hitRect(cornersOf(b), r))) { blocked = true; pen(sim, 'pc' + r.x, `Turgan mashinaga tegdi`, 15, 1.5); }
    for (const k of W.cones) if (!k.fallen && bs.some(b => hitCone(b, k))) { k.fallen = true; const sp = Math.max(1, Math.abs(sim.v)); k.vx = Math.cos(sim.th) * sp * .7; k.vz = Math.sin(sim.th) * sp * .7; pen(sim, 'cone' + k.i, `Konusni yiqitdi`, 5, 99); }
    if (blocked) { sim.x = px; sim.z = pz; sim.th = pth; if (sim.tr) { sim.tr.th = ptr; trailerPose(sim); } sim.v = -sim.v * 0.2; }
    const near = nearest(sim, sim.cx(), sim.cz()); let d = near.s - sim.sPrev; if (d < -PATH.total / 2) d += PATH.total; if (d > PATH.total / 2) d -= PATH.total; sim.prog += d; sim.sPrev = near.s;
    const prog = sim.prog, v = Math.abs(sim.v), kmh = v * 3.6, onRoad = Math.abs(near.d) <= (spec.heavy ? 5.8 : 5.2) || inPark;
    W.cones.forEach(k => { if (k.fallen && (k.vx || k.vz)) { k.x += k.vx * dt; k.z += k.vz * dt; k.vx *= .92; k.vz *= .92; if (Math.abs(k.vx) + Math.abs(k.vz) < .03) k.vx = k.vz = 0; } });
    if (sim.free) { sim.prevProg = prog; return; }
    if (!onRoad) pen(sim, 'off', `Yo'ldan chiqdingiz`, 5, 3);
    const pts = corners(sim);
    // 0 start
    if (!sim.done.start && prog > 7 && v > 1) doneTask(sim, 'start');
    // 1 parkovka
    if (!sim.skipped.park) { const slot = { x0: 20.1, x1: 26.3, z0: 4.05, z1: 6.75 }, ok = pts.every(p => p.x >= slot.x0 - .15 && p.x <= slot.x1 + .15 && p.z >= slot.z0 - .1 && p.z <= slot.z1 + .15);
      const aOk = Math.abs(angDiff(sim.th, 0)) < rad(10) || Math.abs(angDiff(sim.th, Math.PI)) < rad(10);
      if (!sim.done.park && prog < 40) { if (ok && aOk && v < .12 && !i.gas) { sim.stopT += dt; sim.msg = `Ushlab turing…`; sim.msgT = .3; if (sim.stopT > 1) { sim.parkDone = true; doneTask(sim, 'park'); } } else sim.stopT = 0; if (prog > 38 && !sim.done.park && !sim.flags.parkSkip) { sim.flags.parkSkip = 1; pen(sim, 'parkskip', `Parkovka bajarilmadi`, 10, 99); sim.done.park = true; sim.ti = Math.max(sim.ti, 2); } } }
    // 2 tezlik zonasi
    if (prog > 36 && prog < 66) { if (kmh > 21.5) { sim.speedT += dt; if (sim.speedT > 1) pen(sim, 'spd', `Tezlik oshdi (20 km/soat)`, 5, 5); } else sim.speedT = Math.max(0, sim.speedT - dt); } if (!sim.done.speed && prog >= 66) doneTask(sim, 'speed');
    // burilishlar: ko'rsatkich
    [['a1', 'turn1'], ['a2', 'turn2'], ['a3', 'turn3'], ['a4', 'turn4']].forEach(([m, id]) => {
      const a = M[m], len = Math.PI / 2 * 16;
      if (prog > a - 8 && prog < a + 4 && sim.ind !== 1 && !sim.hazard && !sim.done[id] && !sim.flags['ind' + id]) { sim.flags['ind' + id] = 1; pen(sim, 'indp' + id, `Burilishda o'ng ko'rsatkich yoqilmadi`, 5, 99); }
      if (!sim.done[id] && prog > a + len) { doneTask(sim, id); if (sim.ind === 1) sim.ind = 0; }
    });
    // 4 svetofor
    { const L = W.light, sl = L.sStop;
      if (L.state === 'green' && !L.fired && prog > sl - 32 && prog < sl) { L.state = 'red'; L.timer = 7; L.fired = true; sim.msg = `Qizil chiroq: to'xtang`; sim.msgT = 3; }
      if (L.state === 'red') { L.timer -= dt; if (L.timer <= 0) { L.state = 'green'; sim.msg = `Yashil chiroq: yuring`; sim.msgT = 2; } }
      if (!sim.done.light && sim.prevProg != null && sim.prevProg < sl && prog >= sl) { if (L.state === 'red') pen(sim, 'red', `Qizil chiroqda o'tdingiz`, 20, 99); doneTask(sim, 'light'); } }
    // 6 ilon
    if (!sim.skipped.slalom) { W.cones.forEach(k => { if (sim.slalomSide[k.i] == null && prog > k.s) { const dd = nearest(sim, sim.cx(), sim.cz()).d; sim.slalomSide[k.i] = dd >= 0 ? 1 : -1; if (k.i > 0 && sim.slalomSide[k.i - 1] === sim.slalomSide[k.i] && !k.fallen) pen(sim, 'weave' + k.i, `Konuslar orasidan navbat bilan o'tmadingiz`, 5, 99); } }); }
    if (!sim.done.slalom && prog > M.s3 + 56) doneTask(sim, 'slalom');
    // 8 STOP
    { const ss = W.sStop; if (prog > ss - 14 && prog < ss) sim.minV.stop = Math.min(sim.minV.stop, v);
      if (!sim.done.stop && sim.prevProg != null && sim.prevProg < ss && prog >= ss) { if (sim.minV.stop > .5) pen(sim, 'stopx', `STOP belgisida to'xtamadingiz`, 10, 99); doneTask(sim, 'stop'); } }
    // 10 marra
    if (sim.done.turn4 && prog > PATH.total - 6) { const sf = nearest(sim, sim.cx(), sim.cz()); const inBox = sf.d > .2 && sf.d < 3.8; if (v < .15 && !i.gas && inBox) { sim.stopT += dt; sim.msg = `Ushlab turing…`; sim.msgT = .3; if (sim.stopT > 1.2) { doneTask(sim, 'finish', `Tugadi`); finish(sim, true); } } else sim.stopT = 0; }
    if (sim.t > 540) { pen(sim, 'time', `Vaqt tugadi`, 15, 99); finish(sim, false); }
    sim.prevProg = prog;
  }
  function finish(sim, ok) { if (sim.state !== 'run') return; sim.state = ok ? 'done' : 'fail'; sim.pass = ok && sim.score >= 70; }
  /* ================= SAHIFA: ro'yxat ================= */
  const baseDrive = V.drive;
  V.drive = () => {
    const v = baseDrive ? baseDrive() : { html: '' }, best = (Store.s.drive3 || {}).best || 0, left = Free.left();
    const card = `<a class="card d3-hero" href="#/app/drive/3d"><div class="d3-hi"><span class="chip ok">3D</span><h2>Simulyator 3D</h2><p>Haqiqiy mashina fizikasi: avtomat yoki mexanika (debriyaj va uzatmalar), rul, svetofor, STOP, parkovka. B, C, D va CE toifalari: ${CARS.length} ta transport vositasi.</p>
      <div class="d3-meta">${Free.premium() ? `<span class="chip ok">${ico('crown')} Premium: cheksiz, hamma transport</span>` : left > 0 ? `<span class="chip warn">Bepul: ${mmss(left)} qoldi · faqat Cobalt</span>` : `<span class="chip bad">Bepul vaqt tugadi · ${hhmm(Free.reopenAt())} da yangilanadi</span>`}${best ? `<span class="chip">Eng yaxshi: ${best}</span>` : ''}</div></div><span class="d3-go">${ico('play')}</span></a>`;
    const pro = `<a class="card d3-hero" href="sim/index.html?v=20261030"><div class="d3-hi"><span class="chip ok">YANGI</span><h2>Simulyator PRO</h2><p>Haqiqiy 3D mashinalar (Cobalt, Gentra, Porsche GT3 RS, Bugatti Divo, G-Class, Isuzu), avtomat quti P/R/N/D, 5 kamera, kun/tun. Uch dunyo: erkin shahar, AVTODROM mashq maydoni va IMTIHON AVTODROMI (12 nazorat nuqtasi, taymer, xatolar hisobi, o‘tdi/o‘tmadi natijasi).</p>
      <div class="d3-meta">${Free.premium() ? `<span class="chip ok">${ico('crown')} Premium: cheksiz, hamma transport</span>` : left > 0 ? `<span class="chip warn">Bepul: ${mmss(left)} qoldi · faqat Cobalt</span>` : `<span class="chip bad">Bepul vaqt tugadi · ${hhmm(Free.reopenAt())} da yangilanadi</span>`}</div></div><span class="d3-go">${ico('play')}</span></a>`;
    if (v.html) v.html = v.html.replace('<div class="stack">', pro + card + `<div class="h-sec mt"><span>Tezkor mashqlar (2D)</span></div><div class="stack">`);
    return v;
  };
  const baseDrivePlay = V.drivePlay;
  V.drivePlay = (id) => id === '3d' ? V.drive3d() : baseDrivePlay(id);

  /* ================= O'YIN ================= */
  V.drive3d = () => {
    let off = [], raf = 0, ENV = null, renderer, cam, wscene, gscene, gcam, W, sim, car, trG = null, mode = 'garage', selI = 0, spec = CARS[0], color = CARS[0].colors[0], last = 0, acc = 0, camMode = 0, camTh = 0, hudT = 0, soundOn = true, audio = null, wheelA = 0, keys = {}, press = { clutch: 0 }, ended = false, paused = false, sec = 0, saveT = 0, camPos = null, spin = 0, lockedFree = false;
    let trans = 'auto', modeSel = 'exam', plate = (Store.s.plate || '01 A 777 AA'), ctl = Store.s.simCtl || 'wheel', lev = 0, levDrag = false, stDrag = false, gcar = null, gwrap = null;
    const $ = (id) => document.getElementById(id);
    const html = `<div class="d3" id="d3"><canvas id="d3c" aria-label="Simulyator 3D"></canvas>
      <div class="d3-load" id="d3l"><div class="d3-spin"></div><b>Simulyator yuklanmoqda…</b><small>Xarita va transport vositalari</small></div>
      <div class="d3-garage" id="d3g" hidden></div>
      <div class="d3-ui" id="d3u" hidden>
        <div class="d3-tl"><button class="d3-b" id="d3p" aria-label="Pauza"><svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg></button>
          <div class="d3-score" id="d3sc"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19"/><circle id="d3ring" cx="22" cy="22" r="19" transform="rotate(-90 22 22)"/></svg><b id="h-s">100</b></div>
          <div class="d3-tm"><b id="h-t">0:00</b><small id="h-e">0 xato</small></div></div>
        <div class="d3-top" id="d3top"><div class="d3-ins" id="d3m"><span class="d3-ic" id="d3ic">1</span><p id="d3mt"></p></div><div class="d3-route" id="d3rt"><i class="rl"></i><i class="rf" id="d3rf"></i></div></div>
        <div class="d3-tr"><button class="d3-b" id="d3tl" aria-label="Mashqlar ro'yxati">${ico('list')}</button><button class="d3-b" id="d3cam" aria-label="Kamera">${ico('camera')}</button><button class="d3-b" id="h-snd" aria-label="Ovoz">${ico('bell')}</button></div>
        <div class="d3-tasks" id="d3tk" hidden></div><div class="d3-free" id="d3f" hidden></div>
        <div class="d3-stall" id="d3sb" hidden><b>Dvigatel o'chdi</b><span>Debriyajni bosing va dvigatelni yoqing</span><button class="btn primary" id="d3stt">Start (Enter)</button></div>
        <div class="d3-steer" id="d3st" aria-label="Rul"><div class="d3-wh" id="d3wh"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="86" fill="none" stroke="#10141b" stroke-width="24"/><circle cx="100" cy="100" r="86" fill="none" stroke="#2c3341" stroke-width="19"/><path d="M16 100h54M130 100h54M100 118v70" stroke="#10141b" stroke-width="15" stroke-linecap="round"/><path d="M16 100h54M130 100h54M100 118v70" stroke="#2c3341" stroke-width="10" stroke-linecap="round"/><circle cx="100" cy="100" r="28" fill="#161b24" stroke="#B8F53B" stroke-width="3"/><path d="M92 92l8 12 8-12M100 104v10" stroke="#B8F53B" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="95" y="8" width="10" height="20" rx="3" fill="#B8F53B"/></svg></div><div class="d3-trk"><i class="d3-mid"></i><div class="d3-knob" id="d3kn"></div></div><small>RUL</small></div>
        <div class="d3-dash"><button id="ind-l" aria-label="Chap ko'rsatkich">◀</button><div class="d3-spd"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="rgba(8,12,20,.8)" stroke="rgba(255,255,255,.12)" stroke-width="3"/><path id="d3a" d="M50 50" fill="none" stroke="#B8F53B" stroke-width="6" stroke-linecap="round"/></svg><b id="d3k">0</b><small>km/soat</small><em id="d3gl">D</em></div><button id="ind-r" aria-label="O'ng ko'rsatkich">▶</button><button id="ind-h" class="haz" aria-label="Avariya">⚠</button><div class="d3-rpm" id="d3rpm" hidden><i id="d3rp"></i></div></div>
        <div class="d3-right"><div class="d3-gear2" id="d3gr"><button data-g="1" class="on">D</button><button data-g="-1">R</button></div><div class="d3-shift" id="d3sh" hidden></div>
          <div class="d3-pedals"><button class="d3-clutch" id="d3cl" hidden aria-label="Debriyaj">DEBRIYAJ</button><div class="d3-lever" id="d3lv" aria-label="Gaz va tormoz"><span>GAZ</span><div class="d3-ltrk"><i class="d3-lmid"></i><div class="d3-lknob" id="d3lk"></div></div><span>TORMOZ</span></div></div></div>
        <div class="d3-pause" id="d3pa" hidden><div class="d3-card"><h3>Pauza</h3><div class="ai-acts" style="justify-content:center"><button class="btn primary" id="d3res">Davom etish</button><button class="btn soft" id="d3rst">Qaytadan</button><button class="btn soft" id="d3ctl">Boshqaruv: rul</button><button class="btn soft" id="d3fin">Tugatish</button><a class="btn soft" href="#/app/drive">Chiqish</a></div></div></div>
        <div class="d3-end" id="d3e" hidden></div>
        <div class="d3-rot">${ico('redo')} Telefonni yotqizing: qulayroq</div>
      </div></div>`;

    /* ----- renderer, garaj, dunyo ----- */
    function setupRenderer() {
      renderer = new THREE.WebGLRenderer({ canvas: $('d3c'), antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; resize(); window.addEventListener('resize', resize); off.push(() => window.removeEventListener('resize', resize));
    }
    function resize() { if (!renderer) return; const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); [cam, gcam].forEach(c => { if (c) { c.aspect = w / h; c.updateProjectionMatrix(); } }); }
    function sky() { const g = new THREE.SphereGeometry(500, 24, 12), m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: {}, vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: 'varying vec3 vp; void main(){ float h = normalize(vp).y; vec3 hor = vec3(0.80,0.90,0.98); vec3 top = vec3(0.30,0.58,0.90); vec3 c = mix(hor, top, smoothstep(0.0,0.55,h)); gl_FragColor = vec4(c,1.0); }' }); return new THREE.Mesh(g, m); }
    function lights(sc, shadow) {
      sc.add(new THREE.HemisphereLight(0xdff0ff, 0x4d6b3a, .85)); const sun = new THREE.DirectionalLight(0xfff1d6, 1.35); sun.position.set(40, 70, 25); if (shadow) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = -40; c.right = 40; c.top = 40; c.bottom = -40; c.near = 1; c.far = 200; sun.shadow.bias = -.0004; } sc.add(sun); sc.add(sun.target); return sun;
    }
    function envMap() {
      const es = new THREE.Scene(); es.add(sky()); const mat = (c, i) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) });
      const panel = (w, h, x, y, z, c, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(c, i)); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
      panel(60, 14, 0, 70, 0, 0xffffff, 3.2); panel(40, 20, 90, 25, 0, 0xfff4dd, 2.4); panel(40, 20, -90, 25, 20, 0xdbe9ff, 1.6); panel(80, 8, 0, 10, -100, 0xffffff, 1.4);
      const gnd = new THREE.Mesh(new THREE.CircleGeometry(300, 32), new THREE.MeshBasicMaterial({ color: 0x4a5a40 })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -2; es.add(gnd);
      const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(es, 0.02); pm.dispose(); return rt.texture;
    }
    function buildGarage() {
      gscene = new THREE.Scene(); gscene.environment = ENV; gscene.background = new THREE.Color(0x0b1220); gscene.fog = new THREE.Fog(0x0b1220, 18, 60);
      gcam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 120); gcam.position.set(0, 2.1, 10.6); gcam.lookAt(0, .75, 0);
      const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x141b2b, roughness: .55, metalness: .3 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; gscene.add(fl);
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.7, 2.78, 64), new THREE.MeshBasicMaterial({ color: 0x58cc02 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .01; gscene.add(ring); gscene.userData.ring = ring;
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, .12, 48), new THREE.MeshStandardMaterial({ color: 0x1b2438, roughness: .4, metalness: .5 })); pl.position.y = .06; pl.receiveShadow = true; gscene.add(pl); gscene.userData.plat = pl;
      const sun = new THREE.SpotLight(0xffffff, 1.6, 60, .6, .5); sun.position.set(5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); gscene.add(sun); gscene.add(new THREE.AmbientLight(0x6a7da8, .55)); const rim = new THREE.PointLight(0x58cc02, .3, 12); rim.position.set(-5, 2, -4); gscene.add(rim);
    }
    /* garajda: tanlangan transport (yarim tirkamali bo'lsa tirkama bilan) aylanma platformada */
    function showGarageCar() {
      if (gwrap) gscene.remove(gwrap); gcar = buildCar(spec, color, plate); gwrap = new THREE.Group(); gwrap.add(gcar);
      let front = spec.L / 2, rear = -spec.L / 2;
      if (spec.trailer) { const tr = spec.trailer, tg = buildTrailer(spec, color); setPlate(tg, plate); tg.position.x = (-spec.c + .25) - (tr.L / 2 - tr.kp); gcar.add(tg); rear = tg.position.x - tr.L / 2; }
      const mid = (front + rear) / 2, len = front - rear; gcar.position.x = -mid; gcar.position.y = .12; const sc = spec.heavy ? Math.min(1, 9 / len + .15) : 1.15; gwrap.scale.setScalar(sc); gscene.add(gwrap);
      const rr = Math.max(2.7, len * sc / 2 + .6); gscene.userData.ring.scale.setScalar(rr / 2.7); gscene.userData.plat.scale.set(rr / 2.6, 1, rr / 2.6);
      gcam.position.set(0, 2.1 + len * sc * .12, Math.max(10.6, len * sc * 1.25 + 5)); gcam.lookAt(0, .75 + (spec.H - 1.5) * .25, 0);
    }
    const cleanPlate = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 12);
    function garageUi() {
      const g = $('d3g'), prem = Free.premium(), left = Free.left(), locked = !prem && !spec.free;
      lockedFree = !prem && left <= 0;
      g.hidden = false; g.innerHTML = `<div class="d3-gtop"><a class="d3-b" href="#/app/drive" aria-label="Orqaga">${ico('home')}</a><div class="d3-gt">${prem ? `<span class="chip ok">${ico('crown')} Premium</span>` : lockedFree ? `<span class="chip bad">Bepul vaqt tugadi · ${hhmm(Free.reopenAt())} da qayta ochiladi</span>` : `<span class="chip warn">Bepul: ${mmss(left)} / 5 soatda 2:00</span>`}</div></div>
        <div class="d3-gname"><small>${selI + 1} / ${CARS.length}</small><h2>${esc(spec.name)}</h2><div class="d3-chips"><span class="chip">${CATN[spec.cat]}</span>${spec.free ? `<span class="chip ok">Bepul</span>` : `<span class="chip warn">${ico('crown')} Premium</span>`}</div></div>
        <button class="d3-arr l" id="g-l" aria-label="Oldingi">‹</button><button class="d3-arr r" id="g-r" aria-label="Keyingi">›</button>
        <div class="d3-gbot"><div class="d3-opts">
            <label class="d3-plate"><small>Davlat raqami</small><input id="g-plate" maxlength="12" value="${esc(plate)}" autocomplete="off" spellcheck="false" placeholder="01 A 777 AA"></label>
            <div class="seg" data-k="trans"><button data-v="auto" class="${trans === 'auto' ? 'on' : ''}">Avtomat</button><button data-v="manual" class="${trans === 'manual' ? 'on' : ''}">Mexanika</button></div>
            <div class="seg" data-k="mode"><button data-v="exam" class="${modeSel === 'exam' ? 'on' : ''}">Imtihon trassasi</button><button data-v="free" class="${modeSel === 'free' ? 'on' : ''}">Erkin haydash</button></div></div>
          <div class="d3-colors">${spec.colors.map((c, i) => `<button class="${c === color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="Rang ${i + 1}"></button>`).join('')}</div>
          ${locked ? `<button class="btn primary lg" id="g-prem">${ico('crown')} Premium olish</button>` : lockedFree ? `<a class="btn primary lg" href="#/app/premium">${ico('crown')} Premium: cheksiz</a>` : `<button class="btn primary lg" id="g-go">${ico('play')} Haydashni boshlash</button>`}
          <p class="mute">${prem ? 'Hamma transport ochiq, vaqt cheksiz.' : 'Bepul: 5 soat ichida jami 2 daqiqa, faqat Cobalt.'}</p></div>`;
      $('g-l').onclick = () => pick(-1); $('g-r').onclick = () => pick(1);
      g.querySelectorAll('.d3-colors button').forEach(b => b.onclick = () => { color = b.dataset.c; showGarageCar(); garageUi(); });
      g.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => { if (sg.dataset.k === 'trans') trans = b.dataset.v; else modeSel = b.dataset.v; garageUi(); }));
      const pi = $('g-plate'); pi.oninput = () => { const p = cleanPlate(pi.value); if (p !== pi.value) pi.value = p; plate = p || '01 A 777 AA'; Store.s.plate = p; if (gcar) gcar.traverse(o => { if (o.userData && o.userData.plateMat) setPlate(o, plate); }); };
      const gp = $('g-prem'); if (gp) gp.onclick = () => { V.acts.pay({ dataset: { what: 'premium' } }); };
      const gg = $('g-go'); if (gg) gg.onclick = startPlay;
    }
    function pick(d) { selI = (selI + d + CARS.length) % CARS.length; spec = CARS[selI]; color = spec.colors[0]; if (spec.heavy) trans = 'manual'; showGarageCar(); garageUi(); }

    /* ----- o'yinni boshlash ----- */
    function startPlay() {
      if (!Free.premium() && Free.left() <= 0) { toast(`Bepul vaqt tugadi`); return; }
      if (!Free.premium() && !spec.free) { toast(`Bu transport Premium uchun`); return; }
      try { audioInit(); } catch (e) { }
      try { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (r && r.catch) r.catch(() => { }); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { }
      if (!wscene) { wscene = new THREE.Scene(); wscene.environment = ENV; wscene.background = new THREE.Color(0xcfe6fb); wscene.fog = new THREE.Fog(0xcfe6fb, 70, 330); wscene.add(sky()); W = buildWorld(wscene); wscene.userData.sun = lights(wscene, true); cam = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 800); }
      mode = 'play'; $('d3g').hidden = true; $('d3u').hidden = false; ended = false; paused = false; sec = 0;
      resetWorld(); resize(); keys = {}; press = { clutch: 0 };
    }
    function buildShifter() {
      const n = spec.gears, items = []; for (let g = n; g >= 1; g--) items.push(g); items.push(0, -1);
      $('d3sh').innerHTML = items.map(g => `<button data-g="${g}" class="${g === sim.gear ? 'on' : ''}">${g === 0 ? 'N' : g < 0 ? 'R' : g}</button>`).join('');
    }
    function resetWorld() {
      W.cones.forEach(k => { k.fallen = false; k.x = sideOf(k.s, 0).x; k.z = sideOf(k.s, 0).z; k.vx = k.vz = 0; });
      W.light.state = 'green'; W.light.fired = false; W.light.timer = 0;
      sim = makeSim(spec, W, { manual: trans === 'manual', free: modeSel === 'free' });
      if (car) wscene.remove(car); if (trG) { wscene.remove(trG); trG = null; }
      car = buildCar(spec, color, plate); wscene.add(car); if (spec.trailer) { trG = buildTrailer(spec, color); setPlate(trG, plate); wscene.add(trG); }
      camPos = null; camTh = 0; camMode = 0; lev = 0; wheelA = 0; buildRoute(); buildShifter(); applyUiMode(); syncModels(0);
      if (sim.free) { sim.msg = `Erkin haydash: hech qanday cheklov va ball yo'q`; sim.msgT = 5; } else if (spec.heavy) { sim.msg = `${CATN[spec.cat]}: parkovka va ilon mashqlari o'tkazib yuboriladi`; sim.msgT = 5; }
      $('d3e').hidden = true; $('d3pa').hidden = true; ended = false;
    }
    function applyUiMode() {
      const u = $('d3u'); u.classList.toggle('freemode', sim.free); u.classList.toggle('manual', sim.manual);
      $('d3gr').hidden = sim.manual; $('d3sh').hidden = !sim.manual; $('d3cl').hidden = !sim.manual; $('d3rpm').hidden = !sim.manual; $('d3sb').hidden = true;
      $('d3st').className = 'd3-steer ' + (ctl === 'wheel' ? 'wheel' : 'slider'); $('d3ctl').textContent = `Boshqaruv: ${ctl === 'wheel' ? 'rul' : 'surgich'}`;
      document.querySelectorAll('.d3-gear2 button').forEach(b => b.classList.toggle('on', +b.dataset.g === sim.gear));
    }
    function syncModels(dt) {
      const cx = sim.cx(), cz = sim.cz(); car.position.set(cx, 0, cz); car.rotation.y = -sim.th;
      setCarFx(car, { v: sim.v, dt, steer: sim.steer, brake: sim.brake, lights: true, ind: sim.ind, hazard: sim.hazard, t: sim.t });
      if (trG && sim.tr) { const T = sim.tr; trG.position.set(T.cx, 0, T.cz); trG.rotation.y = -T.th; const u = trG.userData; u.wheels.forEach(w => { w.rotation.z -= sim.v * dt / u.R; }); u.tail.emissiveIntensity = sim.brake ? 1.6 : .25; u.ind.forEach(m => { m.emissiveIntensity = 0; }); }
      W.cones.forEach(k => { k.mesh.position.set(k.x, 0, k.z); if (k.fallen) { k.mesh.rotation.z = Math.PI / 2; k.mesh.position.y = .22; } else { k.mesh.rotation.z = 0; k.mesh.position.y = 0; } });
      const L = W.light; L.r.emissiveIntensity = L.state === 'red' ? 2.4 : .08; L.y.emissiveIntensity = .08; L.g.emissiveIntensity = L.state === 'green' ? 2.2 : .08;
    }
    function updateCam(dt) {
      const cx = sim.cx(), cz = sim.cz(); camTh += angDiff(sim.th, camTh) * Math.min(1, dt * 4.5); const ux = Math.cos(camTh), uz = Math.sin(camTh), sp = Math.min(1, Math.abs(sim.v) / 12), big = Math.max(0, spec.L - 4.6), hh = Math.max(0, spec.H - 1.5);
      let px, py, pz, lx, ly, lz;
      if (camMode === 0) { const d = 7.2 + sp * 1.4 + big * .75 + (spec.trailer ? 3 : 0); px = cx - ux * d; pz = cz - uz * d; py = 3.3 + hh * 1.3 + (spec.trailer ? 1.2 : 0); lx = cx + ux * 5; lz = cz + uz * 5; ly = .9 + hh * .5; }
      else if (camMode === 1) { const d = 5 + big * .5; px = cx - ux * d; pz = cz - uz * d; py = 2.1 + hh * 1.1; lx = cx + ux * 5; lz = cz + uz * 5; ly = 1.0 + hh * .5; }
      else { const hx = Math.cos(sim.th), hz = Math.sin(sim.th), ex = spec.heavy ? spec.L / 2 - 1.1 : .1, ey = spec.heavy ? spec.H * .68 : (spec.body === 'suv' || spec.kind === 'angular' ? 1.38 : 1.18); px = cx + hx * ex + hz * .4; pz = cz + hz * ex - hx * .4; py = ey; lx = px + hx * 10; lz = pz + hz * 10; ly = ey - .1; }
      if (!camPos) camPos = [px, py, pz]; const k = camMode === 2 ? 1 : Math.min(1, dt * 9); camPos[0] += (px - camPos[0]) * k; camPos[1] += (py - camPos[1]) * k; camPos[2] += (pz - camPos[2]) * k;
      cam.position.set(camPos[0], camPos[1], camPos[2]); cam.lookAt(lx, ly, lz); cam.fov = 56 + sp * 6; cam.updateProjectionMatrix();
      const sun = wscene.userData.sun; sun.position.set(cx + 40, 70, cz + 25); sun.target.position.set(cx, 0, cz); sun.target.updateMatrixWorld();
    }

    /* ----- kiritishlar ----- */
    function readInputs() {
      const k = keys, st = (k.arrowright || k.d ? 1 : 0) - (k.arrowleft || k.a ? 1 : 0), w = wheelA / 140;
      sim.inp.steer = Math.max(-1, Math.min(1, st || w));
      sim.inp.gas = (k.arrowup || k.w) ? 1 : Math.max(0, lev); sim.inp.brake = (k.arrowdown || k.s || k[' ']) ? 1 : Math.max(0, -lev);
      sim.inp.clutch = (k.shift || press.clutch) ? 1 : 0;
    }
    function setGear(g) {
      if (!sim) return;
      if (sim.manual) {
        if (g === sim.gear) return;
        if (g !== 0 && sim.clutch < .55) { sim.msg = `Uzatmani almashtirish uchun debriyajni bosing`; sim.msgT = 2; return; }
        if (g < 0 && sim.gear >= 0 && Math.abs(sim.v) > .5) { sim.msg = `Orqaga yurish uchun avval to'xtang`; sim.msgT = 2; return; }
        sim.gear = g; document.querySelectorAll('.d3-shift button').forEach(b => b.classList.toggle('on', +b.dataset.g === g)); return;
      }
      g = g < 0 ? -1 : 1; if (sim.gear !== g && Math.abs(sim.v) > .6) { sim.msg = `Avval to'xtang`; sim.msgT = 1.5; return; } sim.gear = g; document.querySelectorAll('.d3-gear2 button').forEach(b => b.classList.toggle('on', +b.dataset.g === g));
    }
    const setInd = (d) => { sim.hazard = false; sim.ind = sim.ind === d ? 0 : d; };
    const toggleHaz = () => { sim.hazard = !sim.hazard; if (sim.hazard) sim.ind = 0; };
    function onKey(e, d) {
      const k = e.key.toLowerCase(); if (mode !== 'play' || !sim) return; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); keys[k] = d;
      if (d && !e.repeat) {
        if (k === 'enter') startEngine(sim); else if (k === 'r') setGear(-1); else if (k === 'n' || k === '0') setGear(0); else if (/^[1-6]$/.test(k)) setGear(sim.manual ? +k : 1); else if (k === 'q') setInd(-1); else if (k === 'e') setInd(1); else if (k === 'h') toggleHaz(); else if (k === 'c') camMode = (camMode + 1) % 3; else if (k === 'p' || k === 'escape') pauseToggle();
      }
    }
    function drawTasks() { const tk = $('d3tk'); if (tk.hidden) return; const cur = TASKS.findIndex(t => !sim.done[t.id]); tk.innerHTML = `<b>Mashqlar</b>` + TASKS.map((t, i) => `<div class="${sim.skipped[t.id] ? 'sk' : sim.done[t.id] ? 'ok' : i === cur ? 'cur' : ''}"><i>${sim.skipped[t.id] ? '–' : sim.done[t.id] ? '✓' : i + 1}</i><span>${esc(t.t)}${sim.skipped[t.id] ? ' (o\'tkazildi)' : ''}</span></div>`).join(''); }
    function bindUi() {
      const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); off.push(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
      $('d3gr').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && sim) setGear(+b.dataset.g); });
      $('d3sh').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && sim) setGear(+b.dataset.g); });
      const cl = $('d3cl'), on = (e) => { e.preventDefault(); press.clutch = 1; cl.classList.add('on'); }, of = () => { press.clutch = 0; cl.classList.remove('on'); }; cl.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cl.addEventListener(ev, of));
      $('d3stt').onclick = () => sim && startEngine(sim);
      $('ind-l').onclick = () => sim && setInd(-1); $('ind-r').onclick = () => sim && setInd(1); $('ind-h').onclick = () => sim && toggleHaz(); $('d3cam').onclick = () => { camMode = (camMode + 1) % 3; };
      $('d3tl').onclick = () => { const tk = $('d3tk'); tk.hidden = !tk.hidden; drawTasks(); };
      $('d3p').onclick = pauseToggle; $('d3res').onclick = pauseToggle; $('d3rst').onclick = () => { resetWorld(); paused = false; };
      $('d3fin').onclick = () => { paused = false; $('d3pa').hidden = true; if (sim.free) { toGarage(); return; } if (sim && sim.state === 'run') finish(sim, false); };
      $('d3ctl').onclick = () => { ctl = ctl === 'wheel' ? 'slider' : 'wheel'; Store.s.simCtl = ctl; Store.save(); applyUiMode(); };
      $('h-snd').onclick = () => { soundOn = !soundOn; $('h-snd').classList.toggle('mute', !soundOn); if (audio) audio.g.gain.value = 0; };
      // rul: g'ildirakni aylantiring (yoki "surgich" rejimida chiziq bo'ylab suring); qo'yib yuborsangiz markazga qaytadi
      const st = $('d3st'), trk = st.querySelector('.d3-trk'), wh = $('d3wh'); let a0 = 0, w0 = 0;
      const ang = (e) => { const r = wh.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
      const setSt = (e, first) => { if (ctl === 'wheel') { if (first) { a0 = ang(e); w0 = wheelA; return; } let d = ang(e) - a0; if (d > 180) d -= 360; if (d < -180) d += 360; wheelA = Math.max(-140, Math.min(140, w0 + d)); } else { const r = trk.getBoundingClientRect(); wheelA = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2.2)) * 140; } };
      st.addEventListener('pointerdown', (e) => { stDrag = true; st.setPointerCapture(e.pointerId); setSt(e, true); e.preventDefault(); }); st.addEventListener('pointermove', (e) => { if (stDrag) setSt(e, false); }); ['pointerup', 'pointercancel'].forEach(ev => st.addEventListener(ev, () => { stDrag = false; }));
      // pedal dastagi: yuqoriga — gaz, pastga — tormoz
      const lv = $('d3lv'), lt = lv.querySelector('.d3-ltrk'), setLv = (e) => { const r = lt.getBoundingClientRect(); const n = Math.max(-1, Math.min(1, -((e.clientY - r.top) / r.height - .5) * 2.2)); lev = Math.abs(n) < .08 ? 0 : n; };
      lv.addEventListener('pointerdown', (e) => { levDrag = true; lv.setPointerCapture(e.pointerId); setLv(e); e.preventDefault(); }); lv.addEventListener('pointermove', (e) => { if (levDrag) setLv(e); }); ['pointerup', 'pointercancel'].forEach(ev => lv.addEventListener(ev, () => { levDrag = false; }));
    }
    function pauseToggle() { if (mode !== 'play' || ended) return; paused = !paused; $('d3pa').hidden = !paused; lev = 0; levDrag = false; press.clutch = 0; }
    /* ----- tovush ----- */
    function audioInit() { if (audio || !(window.AudioContext || window.webkitAudioContext)) return; const C = new (window.AudioContext || window.webkitAudioContext)(), o = C.createOscillator(), o2 = C.createOscillator(), f = C.createBiquadFilter(), g = C.createGain(); o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g); g.connect(C.destination); o.start(); o2.start(); audio = { C, o, o2, g, f }; off.push(() => { try { o.stop(); o2.stop(); C.close(); } catch (e) { } audio = null; }); }
    function audioStep() { if (!audio || !sim) return; const on = soundOn && mode === 'play' && !paused && sim.state === 'run' && sim.engine, r = Math.min(1.1, sim.rpm / 6500), heavy = spec.heavy ? .55 : 1; audio.o.frequency.value = (38 + r * 150) * heavy; audio.o2.frequency.value = (19 + r * 75) * heavy; audio.f.frequency.value = 280 + r * 800; audio.g.gain.value = on ? .035 + r * .03 + sim.inp.gas * .02 : 0; }
    function beep() { if (!audio || !soundOn) return; const o = audio.C.createOscillator(), g = audio.C.createGain(); o.type = 'square'; o.frequency.value = 330; g.gain.value = .06; o.connect(g); g.connect(audio.C.destination); o.start(); o.stop(audio.C.currentTime + .18); }

    /* ----- HUD ----- */
    const TS = [6, 28, 50, 95, 113, 141, 200, 236, 292, 332, 332];
    function buildRoute() { const r = $('d3rt'); r.querySelectorAll('.dt').forEach(n => n.remove()); TASKS.forEach((t, i) => { const d = document.createElement('i'); d.className = 'dt'; d.style.left = Math.min(98, TS[i] / PATH.total * 100) + '%'; d.dataset.i = i; r.appendChild(d); }); }
    function hud() {
      $('h-s').textContent = sim.score; $('h-t').textContent = mmss(sim.t); $('h-e').textContent = sim.free ? `erkin` : `${sim.errors} xato`;
      const ring = $('d3ring'); ring.style.strokeDasharray = 119.4; ring.style.strokeDashoffset = 119.4 * (1 - sim.score / 100); ring.style.stroke = sim.score >= 85 ? '#B8F53B' : sim.score >= 70 ? '#F7C600' : '#FF5C70';
      const ci = TASKS.findIndex(t => !sim.done[t.id]), cur = ci < 0 ? TASKS.length - 1 : ci;
      $('d3ic').textContent = sim.free ? '∞' : cur + 1; $('d3mt').textContent = sim.msg; $('d3m').classList.toggle('bad', sim.msgT > 0 && /−/.test(sim.msg));
      $('d3rf').style.width = Math.max(0, Math.min(100, sim.prog / PATH.total * 100)) + '%'; $('d3rt').querySelectorAll('.dt').forEach((d, i) => { d.classList.toggle('on', !!sim.done[TASKS[i].id]); d.classList.toggle('cur', i === cur); });
      const kmh = Math.round(Math.abs(sim.v) * 3.6); $('d3k').textContent = kmh; const f = Math.min(1, kmh / 50), a0 = Math.PI * .75, a1 = a0 + Math.PI * 1.5 * f; const P = (a) => `${50 + Math.cos(a) * 42} ${50 + Math.sin(a) * 42}`; $('d3a').setAttribute('d', f < .01 ? 'M50 50' : `M${P(a0)} A42 42 0 ${f > .67 ? 1 : 0} 1 ${P(a1)}`); $('d3a').setAttribute('stroke', kmh > 21 && sim.prog > 36 && sim.prog < 66 && !sim.free ? '#FF5C70' : '#B8F53B');
      $('d3gl').textContent = sim.manual ? (sim.gear === 0 ? 'N' : sim.gear < 0 ? 'R' : sim.gear) : (sim.gear < 0 ? 'R' : 'D'); if (sim.manual) { $('d3rp').style.width = Math.min(100, sim.rpm / 6500 * 100) + '%'; $('d3rp').style.background = sim.rpm > 5600 ? '#FF5C70' : '#B8F53B'; $('d3sb').hidden = sim.engine; }
      $('d3kn').style.left = (50 + wheelA / 140 * 44) + '%'; $('d3wh').style.transform = `rotate(${wheelA}deg)`; $('d3lk').style.top = (50 - lev * 44) + '%'; $('d3lk').className = 'd3-lknob' + (lev > 0 ? ' gas' : lev < 0 ? ' brk' : '');
      $('ind-l').classList.toggle('on', sim.ind === -1 && !sim.hazard); $('ind-r').classList.toggle('on', sim.ind === 1 && !sim.hazard); $('ind-h').classList.toggle('on', sim.hazard);
      const fr = $('d3f'); if (!Free.premium()) { fr.hidden = false; fr.textContent = `Bepul vaqt: ${mmss(Math.max(0, Free.left()))}`; fr.classList.toggle('low', Free.left() < 20); } else fr.hidden = true;
      drawTasks();
    }
    function endScreen() {
      if (ended) return; ended = true; const b = Store.s.drive3 = Store.s.drive3 || { best: 0, passed: false }, first = sim.pass && !b.passed; if (sim.score > b.best) b.best = sim.score; if (sim.pass) b.passed = true; if (first && Store.addPoints) Store.addPoints(30, `Simulyator 3D`); Store.save();
      const e = $('d3e'); e.hidden = false; e.innerHTML = `<div class="d3-card"><span class="chip ${sim.pass ? 'ok' : 'bad'}">${sim.pass ? 'Topshirdingiz' : sim.timeUp ? `Bepul vaqt tugadi` : `Bu safar bo'lmadi`}</span><div class="dv-big">${sim.score}</div><p class="mute">ball · ${mmss(sim.t)} · ${sim.errors} ta xato${first ? ' · +30 ball' : ''}</p>${sim.events.length ? `<div class="dv-ev">${sim.events.slice(0, 8).map(x => `<div><span>${esc(x.label)}</span><b>−${x.pts}</b></div>`).join('')}</div>` : `<p>Xatosiz! Barakalla.</p>`}<div class="ai-acts" style="justify-content:center"><button class="btn primary" id="e-re">Qayta urinish</button><button class="btn soft" id="e-gr">Garaj</button><a class="btn soft" href="#/app/drive">Chiqish</a></div></div>`;
      $('e-re').onclick = () => { if (!Free.premium() && Free.left() <= 0) { toast(`Bepul vaqt tugadi`); return; } resetWorld(); }; $('e-gr').onclick = toGarage;
    }
    function toGarage() { mode = 'garage'; $('d3u').hidden = true; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { }); showGarageCar(); garageUi(); }

    /* ----- tsikl ----- */
    function frame(ts) { raf = requestAnimationFrame(frame); if (!last) last = ts; const dt = Math.min(0.05, (ts - last) / 1000); last = ts; tick(dt); }
    function tick(dt) {
      if (mode === 'garage') { spin += dt * .5; if (gwrap) gwrap.rotation.y = spin; renderer.render(gscene, gcam); return; }
      if (mode !== 'play') return;
      if (!paused && sim.state === 'run') {
        acc += dt; while (acc >= 1 / 60) { readInputs(); step(sim, 1 / 60); acc -= 1 / 60; }
        if (!levDrag) lev *= Math.max(0, 1 - dt * 9); const kl = keys.arrowleft || keys.a, kr = keys.arrowright || keys.d;
        if (!stDrag && !kl && !kr) wheelA *= Math.max(0, 1 - dt * 7); else if (kl) wheelA = Math.max(-140, wheelA - 260 * dt); else if (kr) wheelA = Math.min(140, wheelA + 260 * dt);
        if (!Free.premium()) { sec += dt; saveT += dt; if (sec >= 1) { Free.use(sec); sec = 0; } if (saveT > 4) { saveT = 0; Store.save(); } if (Free.left() <= 0) { sim.timeUp = true; finish(sim, false); Store.save(); } }
        if (sim.fx) { sim.fx = 0; beep(); }
      }
      syncModels(paused ? 0 : dt); updateCam(dt); audioStep(); hudT += dt; if (hudT > .06) { hudT = 0; hud(); } renderer.render(wscene, cam);
      if (sim.state !== 'run') { if (sim.free) toGarage(); else endScreen(); }
    }
    return {
      html,
      mount() {
        loadThree().then(() => {
          if (!document.getElementById('d3c')) return; setupRenderer(); ENV = envMap(); buildGarage(); bindUi(); showGarageCar(); $('d3l').hidden = true; garageUi();
          const hh = () => { if (mode === 'play' && document.hidden && !paused) pauseToggle(); }; document.addEventListener('visibilitychange', hh); off.push(() => document.removeEventListener('visibilitychange', hh));
          raf = requestAnimationFrame(frame); window.__d3 = { get sim() { return sim; }, get W() { return W; }, tick, startPlay, pick, CARS, step, buildCar, get renderer() { return renderer; }, setMode: (m) => { mode = m; }, Free, setOpt: (o) => { if (o.trans) trans = o.trans; if (o.mode) modeSel = o.mode; if (o.plate) plate = o.plate; garageUi(); }, resetWorld, setGear, startEngine: () => startEngine(sim), get gcar() { return gcar; }, makeSim };
        }).catch(() => { const l = $('d3l'); if (l) l.innerHTML = `<b>Yuklab bo'lmadi</b><small>Internet aloqasini tekshiring va sahifani yangilang.</small><a class="btn soft" href="#/app/drive">Orqaga</a>`; });
        document.body.classList.add('dv-on');
      },
      unmount() { cancelAnimationFrame(raf); off.forEach(f => f()); off = []; document.body.classList.remove('dv-on'); try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) { } try { if (renderer) { renderer.dispose(); renderer.forceContextLoss(); } } catch (e) { } if (sim && !Free.premium() && sec > 0) { Free.use(sec); Store.save(); } window.__d3 = null; },
    };
  };
  V.drive3dLib = { CARS, PATH, Free, TASKS };
})();














