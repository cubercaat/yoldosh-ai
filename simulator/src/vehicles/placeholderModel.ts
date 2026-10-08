// @ts-nocheck — Yo'ldosh AI avtodrom kodidan ko'chirilgan (parametrik geometriya). Ichki tiplar erkin.
/**
 * PLACEHOLDER (vaqtincha) TRANSPORT MODELLARI.
 * ------------------------------------------------------------------
 * Bu HAQIQIY 3D modellar EMAS. Siz yuborgan 2D rasmlar 3D modelga aylantirilgan emas.
 * Bu faqat shakliga qarab kodda yasalgan vaqtinchalik kuzov: sedan / hetchbek / krossover / Cybertruck / G-klass / furgon.
 * Tayyor ishlab chiqarish modeli (GLB) public/models/vehicles/<id>/<id>.glb ga qo'yilsa, shu placeholder avtomatik almashadi
 * (qarang: components/simulator/VehicleModel.tsx).
 *
 * Tugun nomlari GLB talabiga mos: Body, Windows, Interior, SteeringWheel, Wheel_FL/FR/RL/RR, Headlights, Taillights, BrakeLights, Mirrors.
 * Koordinata: +Z old, +Y yuqori, +X chap. Koordinata boshi — yerdagi proyeksiya, o'qlar o'rtasida.
 */
import * as THREE from 'three'
import type { VehicleConfig } from './VehicleConfig'

const TAU = Math.PI * 2

/* ---------- yordamchilar ---------- */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
function smooth(geo) {
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, map = new Map(), key = (i) => `${Math.round(p.getX(i) * 400)}|${Math.round(p.getY(i) * 400)}|${Math.round(p.getZ(i) * 400)}`
  for (let i = 0; i < p.count; i++) { const k = key(i), a = map.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); map.set(k, a) }
  for (let i = 0; i < p.count; i++) { const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l) } n.needsUpdate = true
}
const chaikin = (pts, n) => { for (let it = 0; it < n; it++) { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]) } pts = out } return pts }
const poly2 = (pts) => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s }
function extrude(poly, depth, bev, mat, sm) {
  const g = new THREE.ExtrudeGeometry(poly2(poly), { depth: depth - 2 * bev.t, bevelEnabled: true, bevelThickness: bev.t, bevelSize: bev.s, bevelSegments: bev.n, curveSegments: 4 })
  g.translate(0, 0, -(depth - 2 * bev.t) / 2); if (sm) smooth(g); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m
}
function mats(color, metal = .5) {
  return {
    body: new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: metal > .8 ? .38 : .3, clearcoat: metal > .8 ? 0 : 1, clearcoatRoughness: .06, envMapIntensity: 1.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a1320, metalness: .9, roughness: .04, transparent: true, opacity: .84, side: THREE.DoubleSide }),
    black: new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: .7 }), trim: new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: .5, metalness: .3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd5dbe6, metalness: 1, roughness: .2 }), tire: new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: .9 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xaab2bf, metalness: 1, roughness: .28 }), disc: new THREE.MeshStandardMaterial({ color: 0x4b525e, metalness: .8, roughness: .5 }),
  }
}
const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m }
const cyl = (rt, rb, h, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), mat); m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; return m }
const plateTex = (txt) => canvasTex(520, 112, (g, w, h) => {
  g.fillStyle = '#f6f6f1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#141414'; g.lineWidth = 7; g.strokeRect(4, 4, w - 8, h - 8)
  g.fillStyle = '#1b4fa8'; g.fillRect(10, 10, 62, h - 20); g.fillStyle = '#fff'; g.fillRect(16, 22, 50, 9); g.fillStyle = '#1da93b'; g.fillRect(16, 31, 50, 9); g.fillStyle = '#fff'; g.font = '800 26px sans-serif'; g.textAlign = 'center'; g.fillText('UZ', 41, 78)
  g.fillStyle = '#111'; g.textBaseline = 'middle'; g.font = '700 70px "Arial Narrow",Arial,sans-serif'; g.fillText(String(txt || '').toUpperCase().slice(0, 12), 300, h / 2 + 4)
})

/* ---------- g'ildirak (o'q = X) ---------- */
function wheelMesh(R, W, M, heavy) {
  const w = new THREE.Group(); w.name = 'WheelMesh'
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 32), M.tire); tire.rotation.z = Math.PI / 2; tire.castShadow = true; w.add(tire)
  const side = new THREE.Mesh(new THREE.CylinderGeometry(R * .93, R * .93, W + .01, 32), M.trim); side.rotation.z = Math.PI / 2; w.add(side)
  ;[1, -1].forEach((sd) => {
    const x = sd * W * .5
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(R * .66, R * .66, .04, 24), M.rim); rim.rotation.z = Math.PI / 2; rim.position.x = x; w.add(rim)
    if (!heavy) {
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5, sp = new THREE.Mesh(new THREE.BoxGeometry(.035, R * .58, .05), M.rim); sp.position.set(x + sd * .01, Math.cos(a) * R * .34, Math.sin(a) * R * .34); sp.rotation.x = -a; w.add(sp) }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * .64, .018, 8, 28), M.chrome); ring.rotation.y = Math.PI / 2; ring.position.x = x; w.add(ring)
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * .16, R * .16, .07, 12), heavy ? M.rim : M.black); hub.rotation.z = Math.PI / 2; hub.position.x = x + sd * .02; w.add(hub)
  })
  if (!heavy) { const dsc = new THREE.Mesh(new THREE.CylinderGeometry(R * .52, R * .52, .03, 20), M.disc); dsc.rotation.z = Math.PI / 2; dsc.position.x = W * .3; w.add(dsc) }
  return w
}

/* ---------- yengil avtomobil profili ---------- */
const PARAMS = {
  cobalt: { hood: .25, rake: .13, roof: .30, rwin: .14, trunk: .98 }, sedan: { hood: .27, rake: .14, roof: .28, rwin: .16, trunk: .96 },
  malibu: { hood: .3, rake: .18, roof: .22, rwin: .24, trunk: .94 },
}
function carProfile(L, H, kind, P) {
  const h = L / 2
  if (kind === 'sedan') {
    const wbx = h - (P.hood || .27) * L, wtx = wbx - (P.rake || .13) * L, roofEnd = wtx - (P.roof || .27) * L, rwx = roofEnd - (P.rwin || .15) * L, xm = (wtx + roofEnd) / 2, ty = P.trunk || .98
    return { body: [[-h, .36], [h, .36], [h, .6], [h - .09, .8], [wbx, .9], [wtx, H], [roofEnd, H], [rwx, ty], [-h + .03, ty - .02], [-h, .7]],
      win: [[[wbx - .15, 1.0], [wtx - .04, H - .07], [xm - .04, H - .07], [xm - .04, 1.0]], [[xm + .04, 1.0], [xm + .04, H - .07], [roofEnd + .02, H - .07], [rwx + .25, 1.0]]],
      gf: [[wbx + .02, .91], [wtx + .02, H - .03]], gr: [[rwx - .02, ty + .01], [roofEnd - .02, H - .03]], hood: wbx, cab: [roofEnd, wtx] }
  }
  const wbx = h - .25 * L, wtx = wbx - .12 * L, roofEnd = -h + .1 * L, xm = (wtx + roofEnd) / 2, dr = .3
  return { body: [[-h, .48], [h, .48], [h, .85], [h - .1, 1.02], [wbx, 1.1], [wtx, H], [roofEnd, H], [-h + .02, H - dr], [-h, .75]],
    win: [[[wbx - .15, 1.18], [wtx - .04, H - .08], [xm - .04, H - .08], [xm - .04, 1.18]], [[xm + .04, 1.18], [xm + .04, H - .08], [roofEnd + .05, H - .08], [-h + .22, 1.18]]],
    gf: [[wbx + .02, 1.11], [wtx + .02, H - .03]], gr: [[-h + .03, H - dr], [roofEnd - .01, H - .03]], hood: wbx, cab: [roofEnd, wtx] }
}

/** @param cfg VehicleConfig @param colorHex string @param plate string */
export function buildPlaceholder(cfg: VehicleConfig, colorHex: string, plate = '01 A 777 AA'): THREE.Group {
  const root = new THREE.Group(); root.name = 'PlaceholderVehicle'; root.userData.placeholder = true
  const { length: L, width: W, height: H } = cfg.dimensions, R = cfg.wheelRadius, WB = cfg.wheelBase
  const ovF = cfg.frontOverhang, ovR = L - WB - ovF, bodyZ = (ovF - ovR) / 2   // kuzov markazining o'qlar o'rtasidan siljishi
  const M = mats(colorHex, cfg.body === 'cybertruck' ? .95 : .5)
  const inner = new THREE.Group(); inner.name = 'Body'; inner.rotation.y = -Math.PI / 2; inner.position.z = bodyZ; root.add(inner)   // inner: +X = old
  const windows = new THREE.Group(); windows.name = 'Windows'; inner.add(windows)
  const interior = new THREE.Group(); interior.name = 'Interior'; inner.add(interior)
  const mirrors = new THREE.Group(); mirrors.name = 'Mirrors'; inner.add(mirrors)
  const head = new THREE.Group(); head.name = 'Headlights'; inner.add(head)
  const tail = new THREE.Group(); tail.name = 'Taillights'; inner.add(tail)
  const brake = new THREE.Group(); brake.name = 'BrakeLights'; inner.add(brake)
  const lamp = (col, em, k) => new THREE.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: k, roughness: .25 })
  const headM = lamp(0xfff3c4, 0xffe9a0, .15), tailM = lamp(0x6a0d14, 0xff1830, .1), brakeM = lamp(0x7a0f18, 0xff1830, .05)
  const rearX = -(WB / 2 + bodyZ) // kuzov (inner) koordinatasida orqa o'q x
  const axF = WB / 2 - bodyZ, axR = -WB / 2 - bodyZ
  const half = L / 2

  if (cfg.body === 'sedan' || cfg.body === 'hatch' || cfg.body === 'suv') {
    const P = PARAMS[cfg.id] || {}, kind = cfg.body === 'sedan' ? 'sedan' : 'suv', pr = carProfile(L, H, kind, P), ra = R + .06, base = .26
    const arch = (xc) => { const a = [[xc - ra, base]]; for (let k = 0; k <= 10; k++) { const t = Math.PI - k * Math.PI / 10; a.push([xc + Math.cos(t) * ra, R + Math.sin(t) * ra * .95]) } a.push([xc + ra, base]); return a }
    let poly = [[-half, base], ...arch(axR), ...arch(axF), [half, base], ...pr.body.slice(2).map((p) => p.slice())]; poly = chaikin(poly, 1)
    inner.add(extrude(poly, W - .02, { t: .08, s: .06, n: 4 }, M.body, true))
    pr.win.forEach((pl) => { const gg = new THREE.ShapeGeometry(poly2(pl)); [1, -1].forEach((sd) => { const m = new THREE.Mesh(gg, M.glass); m.position.z = sd * (W / 2 + .004); windows.add(m) }) })
    const quad = (A, B, wid, sg) => { const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new THREE.PlaneGeometry(len, wid); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const m = new THREE.Mesh(pg, M.glass); m.position.set((A[0] + B[0]) / 2 + sg * dy / len * .016, (A[1] + B[1]) / 2 - sg * dx / len * .016, 0); windows.add(m) }
    quad(pr.gf[0], pr.gf[1], W * .8, 1); quad(pr.gr[0], pr.gr[1], W * .78, -1)
    const cb = pr.cab, ih = Math.max(.15, H - 1.14); interior.add(box((cb[1] - cb[0]) * .8, ih, W * .74, M.black, (cb[0] + cb[1]) / 2, 1.0 + ih / 2, 0))
    const xm = (cb[0] + cb[1]) / 2; [1, -1].forEach((sd) => { [xm - .02, cb[1] + .45, cb[0] - .12].forEach((x) => inner.add(box(.014, .62, .006, M.black, x, .72, sd * (W / 2 + .003)))); [xm - .3, xm + .5].forEach((x) => inner.add(box(.13, .028, .02, M.chrome, x, .96, sd * (W / 2 + .012)))); inner.add(box(L * .5, .06, .04, M.trim, 0, .36, sd * (W / 2 - .02))) })
    inner.add(box(.12, .2, W * .88, M.trim, half + .015, .43, 0)); inner.add(box(.12, .2, W * .88, M.trim, -half - .015, .43, 0))
    inner.add(box(.05, .15, W * .4, M.black, half + .04, .66, 0)); inner.add(box(.06, .03, W * .4, M.chrome, half + .06, .7, 0)); inner.add(box(.07, .06, .24, new THREE.MeshStandardMaterial({ color: 0xd6b25a, metalness: 1, roughness: .25 }), half + .07, .68, 0))
    ;[1, -1].forEach((sd) => { head.add(box(.08, .14, .42, headM, half + .02, .72, sd * (W / 2 - .36))); head.add(box(.09, .15, .5, M.chrome, half + .02, .76, sd * (W / 2 - .36))); tail.add(box(.07, .14, .36, tailM, -half - .01, .8, sd * (W / 2 - .3))) })
    brake.add(box(.06, .05, W * .5, brakeM, -half - .02, .94, 0))
    ;[1, -1].forEach((sd) => { const m = box(.1, .1, .2, M.body, pr.hood - .35, 1.0, sd * (W / 2 + .1)); m.castShadow = true; mirrors.add(m) })
    if (cfg.body === 'hatch') [1, -1].forEach((sd) => inner.add(cyl(.018, .018, (cb[1] - cb[0]) * .92, M.black, (cb[0] + cb[1]) / 2, H + .02, sd * (W / 2 - .2), 0, Math.PI / 2)))
  } else if (cfg.body === 'cybertruck') {
    const poly = [[-half, .55], [half, .55], [half, .92], [half - .5, 1.05], [-.06 * L, H], [-.3 * L, 1.64], [-.33 * L, 1.5], [-half, 1.5]]
    inner.add(extrude(poly, W, { t: .03, s: .03, n: 1 }, M.body, false))
    ;[1, -1].forEach((sd) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(poly2([[half - .6, 1.1], [-.06 * L - .05, H - .1], [-.3 * L + .05, 1.6], [-.3 * L + .05, 1.12]])), M.glass); m.position.z = sd * (W / 2 + .004); windows.add(m) })
    const A = [half - .5, 1.06], B = [-.06 * L, H - .02], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new THREE.PlaneGeometry(len, W * .84); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new THREE.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); windows.add(ws)
    head.add(box(.04, .06, W * .94, lamp(0xffffff, 0xffffff, .5), half + .02, .93, 0)); tail.add(box(.05, .07, W * .8, tailM, -half - .02, 1.4, 0)); brake.add(box(.06, .05, W * .5, brakeM, -half - .03, 1.3, 0))
    ;[1, -1].forEach((sd) => inner.add(box(1.5, .1, .06, M.black, 0, .6, sd * (W / 2 + .02)))); inner.add(box(.2, .14, W * .9, M.black, half + .02, .6, 0))
    interior.add(box(1.2, .4, W * .7, M.black, -.1, 1.15, 0)); mirrors.add(box(.1, .1, .2, M.body, half - .8, 1.12, W / 2 + .1), box(.1, .1, .2, M.body, half - .8, 1.12, -W / 2 - .1))
  } else if (cfg.body === 'gclass') {
    const wbx = half - .24 * L, wtx = wbx - .07 * L, poly = [[-half, .55], [half, .55], [half, .98], [half - .12, 1.1], [wbx, 1.14], [wtx, H], [-half + .12, H], [-half, H - .14]]
    inner.add(extrude(poly, W, { t: .05, s: .05, n: 2 }, M.body, false))
    ;[1, -1].forEach((sd) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(poly2([[wbx - .2, 1.22], [wtx - .03, H - .1], [-half + .2, H - .1], [-half + .2, 1.22]])), M.glass); m.position.z = sd * (W / 2 + .004); windows.add(m) })
    const A = [wbx, 1.15], B = [wtx, H - .03], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new THREE.PlaneGeometry(len, W * .86); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new THREE.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); windows.add(ws)
    inner.add(box(.1, .22, W * .96, M.black, half + .03, .68, 0)); inner.add(box(.06, .3, W * .5, M.black, half + .02, .96, 0))
    for (let i = 0; i < 6; i++) inner.add(box(.03, .26, .03, M.chrome, half + .06, .96, -W * .21 + i * W * .084)); inner.add(cyl(.13, .13, .03, M.chrome, half + .07, .96, 0, 0, Math.PI / 2))
    ;[1, -1].forEach((sd) => { head.add(cyl(.15, .15, .09, headM, half - .01, 1.02, sd * (W / 2 - .3), 0, Math.PI / 2)); inner.add(cyl(.18, .18, .06, M.chrome, half - .02, 1.02, sd * (W / 2 - .3), 0, Math.PI / 2)); inner.add(box(.5, .14, .16, M.black, axF, R + .22, sd * (W / 2 + .06))); inner.add(box(.5, .14, .16, M.black, axR, R + .22, sd * (W / 2 + .06))); tail.add(box(.06, .24, .16, tailM, -half - .02, 1.1, sd * (W / 2 - .2))) })
    brake.add(box(.06, .05, W * .4, brakeM, -half - .03, 1.3, 0)); inner.add(box(.7, .06, W * .8, M.black, 0, H + .03, 0)); interior.add(box(1.2, .5, W * .74, M.black, -.1, 1.2, 0))
    ;[1, -1].forEach((sd) => mirrors.add(box(.1, .14, .16, M.body, wbx - .1, 1.28, sd * (W / 2 + .1))))
  } else { // boxtruck (Isuzu)
    const cab = [[half - 1.95, .65], [half, .65], [half, 1.5], [half - .06, 1.62], [half - .45, 2.55], [half - 1.9, 2.6]]
    inner.add(extrude(cab, W - .04, { t: .06, s: .08, n: 3 }, M.body, true))
    const A = [half - .08, 1.64], B = [half - .46, 2.5], dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), pg = new THREE.PlaneGeometry(len, W * .84); pg.rotateX(-Math.PI / 2); pg.rotateZ(Math.atan2(dy, dx)); const ws = new THREE.Mesh(pg, M.glass); ws.position.set((A[0] + B[0]) / 2 + dy / len * .02, (A[1] + B[1]) / 2 - dx / len * .02, 0); windows.add(ws)
    ;[1, -1].forEach((sd) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(poly2([[half - .35, 1.7], [half - .62, 2.46], [half - 1.45, 2.46], [half - 1.45, 1.7]])), M.glass); m.position.z = sd * (W / 2 + .004); windows.add(m) })
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: .45, metalness: .1 }), boxL = L - 1.95 - .05, bx = new THREE.Mesh(new THREE.BoxGeometry(boxL, 2.25, W), boxMat); bx.position.set(-half + boxL / 2, 2.075, 0); bx.castShadow = true; inner.add(bx)
    ;[1, -1].forEach((sd) => { for (let i = 1; i < 4; i++) inner.add(box(.04, 2.25, .01, M.trim, -half + i * boxL / 4, 2.07, sd * (W / 2 + .004))); inner.add(box(boxL, .16, .02, new THREE.MeshStandardMaterial({ color: colorHex }), -half + boxL / 2, 1.4, sd * (W / 2 + .006))) })
    inner.add(box(L - .3, .22, W - .5, M.black, 0, .7, 0)); inner.add(box(.08, .5, W * .7, M.black, half + .01, .98, 0)); inner.add(box(.12, .24, W * .9, M.trim, half + .02, .62, 0)); inner.add(box(.1, .05, W * .5, M.chrome, half + .04, 1.18, 0))
    ;[1, -1].forEach((sd) => { head.add(box(.08, .22, .4, headM, half + .01, 1.16, sd * (W / 2 - .3))); tail.add(box(.07, .3, .2, tailM, -half - .01, 1.0, sd * (W / 2 - .2))); mirrors.add(box(.16, .34, .22, M.body, half - .6, 2.0, sd * (W / 2 + .2))) })
    brake.add(box(.06, .06, W * .4, brakeM, -half - .02, 1.4, 0)); interior.add(box(1.0, .8, W * .7, M.black, half - 1.2, 1.7, 0))
  }
  // davlat raqami (old/orqa)
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex(plate), roughness: .5 }), pl = (x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.03, .11, .52), plateMat); m.position.set(x, .55, 0); m.name = 'Plate'; return m }
  inner.add(pl(half + .09), pl(-half - .09)); root.userData.plateMat = plateMat
  head.traverse((o) => { o.userData.lightMat = headM }); root.userData.mats = { head: headM, tail: tailM, brake: brakeM }
  // rul (SteeringWheel): haydovchi oldida (chap, +X)
  const sw = new THREE.Group(); sw.name = 'SteeringWheel'; const eye = cfg.cameras.driver
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.17, .017, 8, 24), M.black); sw.add(ring); sw.position.set(eye[0], eye[1] - .28, eye[2] + .42); sw.rotation.x = -.5; root.add(sw)
  // g'ildiraklar (o'q = X, tugun markazi = g'ildirak markazi)
  const names = { FL: 'Wheel_FL', FR: 'Wheel_FR', RL: 'Wheel_RL', RR: 'Wheel_RR' }
  ;(['FL', 'FR', 'RL', 'RR'] as const).forEach((k) => {
    const p = cfg.wheels[k].position, node = new THREE.Group(); node.name = names[k]
    const mesh = wheelMesh(R, cfg.wheelWidth, M, cfg.body === 'boxtruck'); if (p[0] < 0) mesh.rotation.y = Math.PI
    node.add(mesh)
    // g'ildirak markazi: erdan R balandlikda
    node.position.set(p[0], R, p[2]); root.add(node)
  })
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true } })
  return root
}

