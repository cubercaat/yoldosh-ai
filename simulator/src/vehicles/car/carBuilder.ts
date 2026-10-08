import {
  BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry, LOD, Material, Mesh, MeshStandardMaterial,
  PlaneGeometry, Shape, SphereGeometry, TorusGeometry, Vector2,
} from 'three'
import type { VehicleConfig } from '../VehicleConfig'
import { endClosure, halfWidthAt, loft, stations } from './loft'
import { designFor, GLASS, PAINT, type Design } from './carDesigns'
import { lampMaterial, paintMaterial, plateTexture, sharedMats, type SharedMats } from './carMaterials'

/**
 * PROTSEDURA TRANSPORT (GLB bo'lmaganda ishlatiladi). Bu "quti" emas — egri chiziqlardan loft qilingan silliq kuzov:
 * kapot, tom, old/orqa oyna, bagajnik, g'ildirak kamarlari, bamperlar, ko'zgular, panjara, faralar, g'ildiraklar alohida meshlar.
 * Lekin bu baribir kodda yasalgan model: fotorealistik emas. Haqiqiy GLB qo'yilsa, shu model avtomatik almashadi.
 *
 * Koordinata: +Z old, +Y yuqori, +X chap. Boshlang'ich nuqta: yer, o'qlar o'rtasi. 4 ta LOD darajasi (0 = eng batafsil).
 */
export type CarLOD = 0 | 1 | 2 | 3
interface Q { ringL: number; stL: number; ringC: number; stC: number; details: number; wheel: 'full' | 'simple' | 'cyl'; interior: boolean }
const QUALITY: Record<CarLOD, Q> = {
  0: { ringL: 28, stL: 46, ringC: 24, stC: 28, details: 2, wheel: 'full', interior: true },
  1: { ringL: 16, stL: 26, ringC: 14, stC: 14, details: 1, wheel: 'simple', interior: false },
  2: { ringL: 10, stL: 16, ringC: 10, stC: 8, details: 0, wheel: 'cyl', interior: false },
  3: { ringL: 6, stL: 8, ringC: 6, stC: 4, details: 0, wheel: 'cyl', interior: false },
}
export const LOD_DISTANCES = [0, 30, 80, 180]

/* ---------- geometriya keshi (bir xil model — bitta geometriya) ---------- */
const gcache = new Map<string, BufferGeometry>()
function cached(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = gcache.get(key)
  if (!g) { g = make(); gcache.set(key, g) }
  return g
}
export function disposeCarCache() { for (const g of gcache.values()) g.dispose(); gcache.clear() }
export function carCacheSize() { return gcache.size }

/** yumaloq quti: loft orqali (burchaklar silliq) */
function rbox(w: number, h: number, d: number, nx = 6): BufferGeometry {
  const cap = Math.min(w, h, d) * 0.35
  return loft({
    zs: [-d / 2, -d / 2 + cap * 0.4, -d / 2 + cap, d / 2 - cap, d / 2 - cap * 0.4, d / 2], ring: 16,
    sec: (z) => { const cl = endClosure(z, -d / 2, d / 2, cap, cap, 2.6); return { yb: (-h / 2) * cl, yt: (h / 2) * cl, hw: Math.max(0.001, (w / 2) * cl), hwTop: Math.max(0.001, (w / 2) * cl), nx, nyTop: nx, nyBot: nx } },
  })
}
const rb = (k: string, w: number, h: number, d: number, nx = 6) => cached(`rb|${k}|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${nx}`, () => rbox(w, h, d, nx))

function mesh(g: BufferGeometry, m: Material | Material[], x = 0, y = 0, z = 0, name = ''): Mesh {
  const o = new Mesh(g, m); o.position.set(x, y, z); if (name) o.name = name; o.castShadow = true; return o
}

/* ---------- g'ildirak ---------- */
function tireGeo(R: number, W: number, seg: number): BufferGeometry {
  const rr = R * 0.66
  const pts = [[rr, -W * 0.46], [rr + 0.012, -W * 0.5], [R * 0.93, -W * 0.5], [R * 0.985, -W * 0.38], [R, -W * 0.2], [R, W * 0.2], [R * 0.985, W * 0.38], [R * 0.93, W * 0.5], [rr + 0.012, W * 0.5], [rr, W * 0.46]]
    .map(([r, y]) => new Vector2(r, y))
  const g = new LatheGeometry(pts, seg); g.rotateZ(Math.PI / 2); return g
}
function wheelGroup(name: string, cfg: VehicleConfig, q: Q, M: SharedMats, dual: boolean, outwardPosX: boolean): Group {
  const R = cfg.wheelRadius, W = cfg.wheelWidth, node = new Group(); node.name = name
  const heavy = cfg.body === 'boxtruck' || cfg.body === 'gclass'
  const inner = new Group(); if (!outwardPosX) inner.rotation.y = Math.PI; node.add(inner)
  const rr = R * 0.66
  if (q.wheel === 'cyl') {
    const g = cached(`cyl|${R}|${W}`, () => { const c = new CylinderGeometry(R, R, W, 12); c.rotateZ(Math.PI / 2); return c })
    inner.add(mesh(g, M.tire)); return node
  }
  const full = q.wheel === 'full'
  const tire = cached(`tire|${R}|${W}|${full ? 32 : 18}`, () => tireGeo(R, W, full ? 32 : 18))
  inner.add(mesh(tire, M.tire, 0, 0, 0, 'Tire'))
  if (dual) { const t2 = mesh(tire, M.tire, -W * 1.05, 0, 0, 'Tire2'); inner.add(t2) }
  const barrel = cached(`barrel|${R}|${W}`, () => { const c = new CylinderGeometry(rr, rr, W * 0.9, full ? 28 : 14); c.rotateZ(Math.PI / 2); return c })
  inner.add(mesh(barrel, M.disc, 0, 0, 0, 'RimBarrel'))
  const faceX = W * 0.47
  const face = cached(`face|${R}`, () => { const c = new CylinderGeometry(rr * 0.97, rr * 0.97, 0.03, full ? 28 : 14); c.rotateZ(Math.PI / 2); return c })
  inner.add(mesh(face, heavy ? M.steel : M.black, faceX, 0, 0, 'RimFace'))
  if (full) {
    const nSp = heavy ? 8 : 5
    const spoke = cached(`spoke|${R}|${nSp}`, () => new BoxGeometry(0.05, rr * 0.82, heavy ? 0.06 : 0.075))
    for (let i = 0; i < nSp; i++) {
      const a = (i * Math.PI * 2) / nSp
      const s = mesh(spoke, M.rim, faceX + 0.02, Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, 'Spoke'); s.rotation.x = a; inner.add(s)
    }
    const lip = cached(`lip|${R}`, () => { const t = new TorusGeometry(rr * 0.97, 0.014, 8, 36); t.rotateY(Math.PI / 2); return t })
    inner.add(mesh(lip, M.chrome, faceX + 0.015, 0, 0, 'RimLip'))
    const hub = cached(`hub|${R}`, () => { const c = new CylinderGeometry(R * 0.15, R * 0.15, 0.05, 14); c.rotateZ(Math.PI / 2); return c })
    inner.add(mesh(hub, M.chrome, faceX + 0.03, 0, 0, 'Hub'))
    const dsc = cached(`disc|${R}`, () => { const c = new CylinderGeometry(rr * 0.78, rr * 0.78, 0.025, 24); c.rotateZ(Math.PI / 2); return c })
    inner.add(mesh(dsc, M.disc, W * 0.22, 0, 0, 'BrakeDisc'))
  }
  return node
}

/* ---------- chiroq shakli ---------- */
function lampGeo(w: number, h: number, depth: number, kind: 'head' | 'tail'): BufferGeometry {
  const s = new Shape()
  if (kind === 'head') { s.moveTo(-w * 0.5, -h * 0.35); s.lineTo(w * 0.42, -h * 0.5); s.quadraticCurveTo(w * 0.55, -h * 0.05, w * 0.4, h * 0.45); s.lineTo(-w * 0.5, h * 0.5); s.closePath() }
  else { s.moveTo(-w * 0.5, -h * 0.5); s.lineTo(w * 0.5, -h * 0.35); s.lineTo(w * 0.5, h * 0.4); s.lineTo(-w * 0.5, h * 0.5); s.closePath() }
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 6 })
  g.translate(0, 0, -depth * 0.6); return g
}

interface Ctx {
  cfg: VehicleConfig; D: Design; M: SharedMats; q: Q; lod: CarLOD
  root: Group; body: Group; head: Group; tail: Group; brake: Group; mirrors: Group; interior: Group
  paint: Material
}

function surfZ(D: Design, x: number, y: number, front: boolean): number {
  const z0 = front ? D.zf : D.zr, dir = front ? -1 : 1
  for (let i = 0; i < 320; i++) {
    const z = z0 + dir * i * 0.01, s = D.lowerSec(z)
    if (y >= s.yb && y <= s.yt && halfWidthAt(s, y) >= Math.abs(x)) return z
  }
  return z0 + dir * 0.3
}
function surfYaw(D: Design, x: number, y: number, front: boolean): number {
  const e = 0.06, a = surfZ(D, x + e, y, front), b = surfZ(D, x - e, y, front), f = (a - b) / (2 * e)
  return front ? Math.atan2(-f, 1) : Math.atan2(f, -1)
}
function stick(c: Ctx, g: Group, geo: BufferGeometry, mat: Material, x: number, y: number, front: boolean, off = 0.004, name = ''): Mesh {
  const m = mesh(geo, mat, x, y, surfZ(c.D, x, y, front) + (front ? off : -off), name)
  m.rotation.y = surfYaw(c.D, x, y, front); g.add(m); return m
}

/* ---------- umumiy detallar ---------- */
function addPlates(c: Ctx, plate: string) {
  const pm = new MeshStandardMaterial({ map: plateTexture(plate), roughness: 0.5 }), geo = cached('plate', () => new PlaneGeometry(0.52, 0.112))
  const yF = Math.max(0.42, c.D.yGrille - 0.12), yR = Math.max(0.55, c.D.yTail - 0.3)
  const f = stick(c, c.body, geo, pm, 0, yF, true, 0.012, 'Plate'); f.castShadow = false
  const r = stick(c, c.body, geo, pm, 0, yR, false, 0.012, 'Plate'); r.rotation.y += Math.PI; r.castShadow = false
  c.root.userData.plateMat = pm
}

function addSteering(c: Ctx) {
  const eye = c.cfg.cameras.driver, sw = new Group(); sw.name = 'SteeringWheel'
  sw.add(mesh(cached('sw-ring', () => new TorusGeometry(0.17, 0.018, 8, 26)), c.M.black))
  sw.add(mesh(cached('sw-hub', () => new CylinderGeometry(0.045, 0.045, 0.03, 10).rotateX(Math.PI / 2)), c.M.trim))
  const sp = cached('sw-sp', () => new BoxGeometry(0.3, 0.02, 0.02)); sw.add(mesh(sp, c.M.black))
  sw.position.set(eye[0], eye[1] - 0.3, eye[2] + 0.42); sw.rotation.x = -0.5; c.root.add(sw)
}

function addInterior(c: Ctx) {
  const { cfg, M, interior } = c, eye = cfg.cameras.driver, W = cfg.dimensions.width
  const hw = W / 2 - 0.2, ez = eye[2]
  const floorY = 0.32
  interior.add(mesh(rb('floor', hw * 2, 0.06, 2.0, 3), M.floor, 0, floorY, ez - 0.2))
  for (const sx of [1, -1]) {
    interior.add(mesh(rb('seatb', 0.46, 0.14, 0.5, 4), M.seat, sx * 0.36, floorY + 0.28, ez - 0.14))
    const back = mesh(rb('seatk', 0.46, 0.62, 0.12, 4), M.seat, sx * 0.36, floorY + 0.62, ez - 0.4); back.rotation.x = -0.18; interior.add(back)
  }
  if (cfg.body !== 'cybertruck') {
    const cz0 = c.D.cabinZ ? c.D.cabinZ[0] : ez - 1.1
    interior.add(mesh(rb('bench', hw * 1.7, 0.16, 0.5, 4), M.seat, 0, floorY + 0.26, cz0 + 0.5))
    const bb = mesh(rb('benchk', hw * 1.7, 0.6, 0.12, 4), M.seat, 0, floorY + 0.58, cz0 + 0.3); bb.rotation.x = -0.16; interior.add(bb)
  }
  interior.add(mesh(rb('dash', hw * 2, 0.3, 0.42, 4), M.dash, 0, floorY + 0.58, ez + 0.62))
  interior.add(mesh(rb('cons', 0.24, 0.26, 0.9, 4), M.dash, 0, floorY + 0.2, ez + 0.1))
}

function addWheelWells(c: Ctx) {
  const { cfg, M } = c, R = cfg.wheelRadius, track = Math.abs(cfg.wheels.FL.position[0]) * 2
  const inner = track / 2 - cfg.wheelWidth / 2 - 0.02
  const zf = cfg.wheels.FL.position[2], zr = cfg.wheels.RL.position[2]
  // g'ildirak orasi — qora "pol" (tomondan qaraganda orqasi ko'rinib qolmasligi uchun)
  const g = cached(`under|${inner.toFixed(2)}|${(zf - zr).toFixed(2)}|${R}`, () => new BoxGeometry(inner * 2, R * 1.5, c.D.zf - c.D.zr - 1.5))
  const m = mesh(g, M.floor, 0, R * 1.35 + 0.12, (c.D.zf + c.D.zr) / 2, 'Underbody'); m.castShadow = false; c.body.add(m)
  // g'ildirak kamari ichidagi qora disk
  const liner = cached(`liner|${R}`, () => { const d = new CylinderGeometry(R * 1.1, R * 1.1, 0.02, 18); d.rotateZ(Math.PI / 2); return d })
  for (const w of [cfg.wheels.FL, cfg.wheels.FR, cfg.wheels.RL, cfg.wheels.RR]) {
    const l = mesh(liner, M.floor, Math.sign(w.position[0]) * inner, R, w.position[2]); l.castShadow = false; c.body.add(l)
  }
}

function addMirrors(c: Ctx, zA: number, y: number, size = 1) {
  const hw = c.cfg.dimensions.width / 2
  const hous = cached(`mir|${size}`, () => new SphereGeometry(0.075 * size, 14, 10).scale(1, 0.75, 1.5))
  const glass = cached(`mirg|${size}`, () => new PlaneGeometry(0.12 * size, 0.09 * size))
  for (const sx of [1, -1]) {
    const m = mesh(hous, c.paint, sx * (hw + 0.07 * size), y, zA, 'MirrorHousing'); c.mirrors.add(m)
    const g = mesh(glass, c.M.chrome, sx * (hw + 0.07 * size), y, zA - 0.1 * size); g.rotation.y = Math.PI; g.castShadow = false; c.mirrors.add(g)
    const arm = mesh(cached('mirarm', () => new BoxGeometry(0.08, 0.02, 0.04)), c.M.black, sx * (hw - 0.01), y - 0.03, zA + 0.02); c.mirrors.add(arm)
  }
}

/* ---------- SEDAN / HATCH / SUV detallari ---------- */
function carDetails(c: Ctx, plate: string) {
  const { cfg, D, M, q } = c, W = cfg.dimensions.width
  const lensH = lampMaterial('head'), lensT = lampMaterial('tail'), lensB = lampMaterial('brake'), amber = lampMaterial('amber')
  const hx = W * 0.5 * 0.56
  // old: panjara, pastki havo kirishi, faralar
  const grilleW = W * 0.34
  stick(c, c.body, rb('grille', grilleW, 0.1, 0.05, 4), M.black, 0, D.yGrille + 0.12, true, -0.012, 'Grille')
  stick(c, c.body, rb('grilleC', grilleW * 0.96, 0.018, 0.03, 3), M.chrome, 0, D.yGrille + 0.185, true, -0.004, 'GrilleChrome')
  if (q.details >= 1) stick(c, c.body, rb('intake', W * 0.5, 0.08, 0.05, 4), M.black, 0, D.yGrille - 0.14, true, -0.014, 'Intake')
  const lh = lampGeo(0.32, 0.085, 0.05, 'head')
  for (const sx of [1, -1]) {
    const m = stick(c, c.head, lh, lensH, sx * hx, D.yHead, true, -0.012, 'HeadLamp')
    if (sx < 0) m.scale.x = -1
    const f = stick(c, c.body, cached('fog', () => new SphereGeometry(0.035, 8, 6).scale(1.4, 1, 0.5)), amber, sx * hx * 0.9, D.yGrille - 0.2, true, 0, 'FogLamp'); f.castShadow = false
    const th = lampGeo(0.3, 0.085, 0.05, 'tail')
    const tm = stick(c, c.tail, th, lensT, sx * hx * 0.98, D.yTail - 0.02, false, -0.012, 'TailLamp'); if (sx < 0) tm.scale.x = -1
  }
  const bl = stick(c, c.brake, rb('bar', W * 0.36, 0.02, 0.025, 3), lensB, 0, D.yTail + 0.06, false, 0.004, 'BrakeBar'); void bl
  if (q.details >= 1) {
    // orqa bamper pastki qismi va chiqindi quvuri
    stick(c, c.body, rb('rbump', W * 0.6, 0.1, 0.05, 4), M.black, 0, 0.36, false, -0.012, 'RearDiffuser')
    const ex = mesh(cached('exh', () => new CylinderGeometry(0.03, 0.03, 0.12, 10).rotateX(Math.PI / 2)), M.chrome, W * 0.3, 0.3, D.zr + 0.02); c.body.add(ex)
  }
  addPlates(c, plate)
  // yon: eshik chiziqlari, tutqichlar, bo'sag'a
  if (q.details >= 2) {
    const seam = cached('seam', () => new BoxGeometry(0.006, 0.5, 0.006))
    const L = D.zf - D.zr, zs = [D.zr + (D.bTpos! - D.zr) , D.bTpos!, D.zf - L * 0.3]
    void zs
    const doorZ = [D.bTpos! - L * 0.2, D.bTpos!, D.bTpos! + L * 0.18]
    for (const sx of [1, -1]) {
      for (const z of doorZ) { const s = D.lowerSec(z), x = halfWidthAt(s, D.yBelt - 0.35); c.body.add(mesh(seam, M.black, sx * (x + 0.002), D.yBelt - 0.38, z)) }
      for (const z of [D.bTpos! - L * 0.08, D.bTpos! + L * 0.1]) { const s = D.lowerSec(z), x = halfWidthAt(s, D.yBelt - 0.12); c.body.add(mesh(cached('handle', () => new BoxGeometry(0.02, 0.025, 0.12)), M.chrome, sx * (x + 0.006), D.yBelt - 0.1, z)) }
      const sk = D.lowerSec(0), xs = halfWidthAt(sk, 0.4); c.body.add(mesh(cached('skirt', () => new BoxGeometry(0.03, 0.07, (D.zf - D.zr) * 0.42)), M.black, sx * (xs - 0.01), 0.27, 0))
    }
  }
  addMirrors(c, D.bTpos! + (D.zf - D.zr) * 0.2, D.yBelt + 0.1)
}

/* ---------- CYBERTRUCK ---------- */
function cyberDetails(c: Ctx, plate: string) {
  const { cfg, D, M, q } = c, W = cfg.dimensions.width
  const led = new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.2 })
  const bar = mesh(rb('cbar', W * 0.9, 0.035, 0.04, 3), led, 0, D.yHead, surfZ(D, 0, D.yHead, true) - 0.02, 'HeadBar'); c.head.add(bar)
  const tbar = new MeshStandardMaterial({ color: 0x5a0a12, emissive: 0xff1830, emissiveIntensity: 0.1, roughness: 0.2 })
  c.tail.add(mesh(rb('ctbar', W * 0.8, 0.045, 0.04, 3), tbar, 0, D.yTail, surfZ(D, 0, D.yTail, false) + 0.02, 'TailBar'))
  const bb = new MeshStandardMaterial({ color: 0x7a0f18, emissive: 0xff1020, emissiveIntensity: 0.05 })
  c.brake.add(mesh(rb('cbb', W * 0.7, 0.02, 0.03, 3), bb, 0, D.yTail - 0.12, surfZ(D, 0, D.yTail - 0.12, false) + 0.02, 'BrakeBar'))
  stick(c, c.body, rb('cint', W * 0.7, 0.1, 0.05, 3), M.black, 0, 0.5, true, -0.016, 'Intake')
  addPlates(c, plate)
  if (q.details >= 1) for (const sx of [1, -1]) {
    c.body.add(mesh(cached('csk', () => new BoxGeometry(0.04, 0.16, 2.4)), M.black, sx * (W / 2 - 0.1), 0.42, 0.05))
    const flare = mesh(cached('cfl', () => new BoxGeometry(0.05, 0.05, cfg.wheelRadius * 2.9)), M.black, sx * (W / 2 - 0.1), cfg.wheelRadius * 2.05, cfg.wheels.FL.position[2]); c.body.add(flare)
    const flare2 = mesh(flare.geometry, M.black, sx * (W / 2 - 0.1), cfg.wheelRadius * 2.05, cfg.wheels.RL.position[2]); c.body.add(flare2)
  }
  addMirrors(c, D.zf - 1.55, 1.27, 0.9)
}

/* ---------- G-CLASS ---------- */
function gDetails(c: Ctx, plate: string) {
  const { cfg, D, M, q } = c, W = cfg.dimensions.width, R = cfg.wheelRadius
  const lensH = lampMaterial('head'), lensT = lampMaterial('tail'), amber = lampMaterial('amber')
  // yumaloq faralar (G-klassning "imzosi")
  const ring = cached('ghring', () => new TorusGeometry(0.105, 0.016, 8, 22)), lens = cached('ghlens', () => new CylinderGeometry(0.1, 0.1, 0.05, 20).rotateX(Math.PI / 2))
  for (const sx of [1, -1]) {
    const x = sx * (W / 2 - 0.3), y = D.yHead
    const z = surfZ(D, x, y, true)
    c.head.add(mesh(lens, lensH, x, y, z - 0.01, 'HeadLamp'))
    c.body.add(mesh(ring, M.chrome, x, y, z + 0.005))
    const turn = stick(c, c.body, rb('gturn', 0.08, 0.07, 0.04, 4), amber, sx * (W / 2 - 0.3), y - 0.2, true, -0.01, 'Turn'); turn.castShadow = false
    c.tail.add(mesh(rb('gtl', 0.1, 0.3, 0.05, 4), lensT, sx * (W / 2 - 0.17), D.yTail - 0.08, surfZ(D, sx * (W / 2 - 0.17), D.yTail, false) - 0.004, 'TailLamp'))
    // fender flare + fender turn signals
    for (const wz of [cfg.wheels.FL.position[2], cfg.wheels.RL.position[2]]) {
      c.body.add(mesh(cached('gflare', () => new BoxGeometry(0.09, 0.07, R * 3.0)), M.black, sx * (W / 2 + 0.01), R * 2.05, wz))
    }
    if (q.details >= 1) c.body.add(mesh(cached('gstep', () => new BoxGeometry(0.16, 0.05, 1.9)), M.steel, sx * (W / 2 - 0.02), 0.34, 0.05))
    const fl = mesh(rb('gfl', 0.06, 0.05, 0.12, 3), amber, sx * (W / 2 - 0.15), 1.2, D.zf - 1.65); c.body.add(fl)
  }
  // panjara: vertikal chiziqlar + yulduz
  const gr = stick(c, c.body, rb('ggrille', W * 0.32, 0.36, 0.05, 4), M.black, 0, 0.82, true, -0.01, 'Grille')
  void gr
  const slat = cached('gslat', () => new BoxGeometry(0.02, 0.3, 0.02))
  for (let i = -3; i <= 3; i++) stick(c, c.body, slat, M.chrome, i * W * 0.04, 0.82, true, 0.012)
  stick(c, c.body, cached('gstar', () => new TorusGeometry(0.075, 0.012, 8, 22)), M.chrome, 0, 0.82, true, 0.02, 'Badge')
  stick(c, c.body, rb('gbump', W * 0.97, 0.18, 0.1, 4), M.black, 0, 0.58, true, -0.02, 'Bumper')
  stick(c, c.body, rb('gbumpR', W * 0.97, 0.2, 0.1, 4), M.black, 0, 0.55, false, -0.02, 'RearBumper')
  addPlates(c, plate)
  // zaxira g'ildirak (orqa eshikda)
  if (q.details >= 1) {
    const spare = new Group(); spare.name = 'SpareWheel'
    spare.add(mesh(cached('gspt', () => new CylinderGeometry(R * 0.97, R * 0.97, 0.26, 24).rotateX(Math.PI / 2)), M.tire))
    spare.add(mesh(cached('gspc', () => new CylinderGeometry(R * 0.62, R * 0.62, 0.27, 20).rotateX(Math.PI / 2)), M.black))
    spare.position.set(-0.15, 1.1, D.zr - 0.15); c.body.add(spare)
    c.body.add(mesh(cached('grack', () => new BoxGeometry(W * 0.8, 0.04, 2.1)), M.black, 0, cfg.dimensions.height + 0.03, -0.35))
  }
  // yon "tutqich" va eshik chiziqlari
  if (q.details >= 2) for (const sx of [1, -1]) {
    for (const z of [0.12, -0.78]) c.body.add(mesh(cached('gseam', () => new BoxGeometry(0.008, 0.92, 0.008)), M.black, sx * (W / 2 + 0.002), 1.15, z))
    c.body.add(mesh(cached('ghand', () => new BoxGeometry(0.03, 0.03, 0.14)), M.chrome, sx * (W / 2 + 0.012), 1.2, -0.05))
  }
  addMirrors(c, D.zf - 1.55, 1.38, 1.1)
}

/* ---------- ISUZU ---------- */
function truckDetails(c: Ctx, plate: string) {
  const { cfg, D, M, q } = c, W = cfg.dimensions.width, L = cfg.dimensions.length
  const lensH = lampMaterial('head'), lensT = lampMaterial('tail'), lensB = lampMaterial('brake'), amber = lampMaterial('amber')
  // yuk quti: yumaloq, qovurg'ali, orqa eshik
  const zCabR = D.zf - 2.0, boxL = (zCabR - 0.05) - D.zr, boxH = 2.3, boxY = 1.2 + boxH / 2
  const boxG = cached(`cargo|${boxL.toFixed(2)}|${W}`, () => rbox(W - 0.04, boxH, boxL, 14))
  const boxM = new MeshStandardMaterial({ color: 0xf1f3f7, roughness: 0.42, metalness: 0.08 })
  const box = mesh(boxG, boxM, 0, boxY, D.zr + boxL / 2, 'CargoBox'); c.body.add(box)
  const stripe = new MeshStandardMaterial({ color: new MeshStandardMaterial({ color: c.cfg.colors[1] ?? '#1b3f8f' }).color, roughness: 0.5 })
  for (const sx of [1, -1]) {
    c.body.add(mesh(cached(`cstr|${boxL.toFixed(2)}`, () => new BoxGeometry(0.012, 0.28, boxL - 0.2)), stripe, sx * (W / 2 - 0.018), 1.75, D.zr + boxL / 2))
    if (q.details >= 1) for (let i = 1; i < 6; i++) c.body.add(mesh(cached('crib', () => new BoxGeometry(0.014, boxH - 0.2, 0.04)), M.trim, sx * (W / 2 - 0.018), boxY, D.zr + (boxL * i) / 6))
  }
  c.body.add(mesh(cached(`cdoor|${W}`, () => new BoxGeometry(W - 0.5, boxH - 0.5, 0.02)), M.disc, 0, boxY, D.zr - 0.0))
  c.body.add(mesh(cached(`cframe|${boxL.toFixed(2)}`, () => new BoxGeometry(W - 0.5, 0.22, L * 0.86)), M.black, 0, 0.78, (D.zf + D.zr) / 2 - 0.3, 'Chassis'))
  // old: panjara, bamper, faralar
  stick(c, c.body, rb('ibump', W * 0.98, 0.26, 0.12, 4), M.trim, 0, 0.72, true, -0.02, 'Bumper')
  stick(c, c.body, rb('igrille', W * 0.5, 0.3, 0.06, 4), M.black, 0, 1.12, true, -0.015, 'Grille')
  stick(c, c.body, rb('ibadge', 0.22, 0.05, 0.03, 3), M.chrome, 0, 1.12, true, 0.012)
  for (const sx of [1, -1]) {
    stick(c, c.head, rb('ihead', 0.38, 0.2, 0.06, 4), lensH, sx * (W / 2 - 0.32), 1.14, true, -0.014, 'HeadLamp')
    stick(c, c.body, rb('iturn', 0.2, 0.09, 0.05, 4), amber, sx * (W / 2 - 0.15), 0.95, true, -0.014)
    c.tail.add(mesh(rb('itl', 0.12, 0.3, 0.06, 4), lensT, sx * (W / 2 - 0.12), 1.0, D.zr - 0.02, 'TailLamp'))
    c.body.add(mesh(cached('mud', () => new BoxGeometry(0.02, 0.35, 0.32)), M.rubber, sx * (W / 2 - 0.3), 0.4, cfg.wheels.RL.position[2] - 0.45))
    c.body.add(mesh(cached('istep', () => new BoxGeometry(0.2, 0.04, 0.5)), M.steel, sx * (W / 2 - 0.1), 0.52, D.zf - 1.5))
  }
  c.brake.add(mesh(rb('ibr', W * 0.4, 0.06, 0.04, 3), lensB, 0, 1.3, D.zr - 0.025, 'BrakeBar'))
  addPlates(c, plate)
  addMirrors(c, D.zf - 0.7, 2.0, 2.2)
}

/* ---------- yig'ish ---------- */
export function buildCar(cfg: VehicleConfig, colorHex: string, plate = '01 A 777 AA', lod: CarLOD = 0, paintOverride?: Material): Group {
  const q = QUALITY[lod], M = sharedMats(), D = designFor(cfg)
  const root = new Group(); root.name = `Car_${cfg.id}_LOD${lod}`; root.userData.procedural = true
  const body = new Group(); body.name = 'Body'; root.add(body)
  const mk = (n: string) => { const g = new Group(); g.name = n; root.add(g); return g }
  const c: Ctx = { cfg, D, M, q, lod, root, body, head: mk('Headlights'), tail: mk('Taillights'), brake: mk('BrakeLights'), mirrors: mk('Mirrors'), interior: mk('Interior'), paint: paintOverride ?? paintMaterial(colorHex, cfg.body) }
  root.userData.paint = c.paint
  const L = D.zf - D.zr
  const tOf = (z: number) => (z - D.zr) / L
  const wheelZ = [cfg.wheels.FL.position[2], cfg.wheels.RL.position[2]]
  const rw = cfg.wheelRadius * 1.12 + 0.045
  const archPts: number[] = []
  for (const w of wheelZ) for (const k of [-1, -0.85, -0.6, -0.3, 0, 0.3, 0.6, 0.85, 1]) archPts.push(w + k * rw)

  // pastki kuzov
  const zLo = cfg.body === 'boxtruck' ? D.zf - 2.0 : D.zr, zHi = D.zf
  const zsL = stations(zLo, zHi, q.stL, archPts)
  const lowerGeo = cached(`low|${cfg.id}|${lod}`, () => loft({ zs: zsL, ring: q.ringL, sec: D.lowerSec, flat: D.lowerFlat, caps: D.lowerCaps, mat: (z, h, t, s, y) => { if (h < 0.08 && t < -0.5) return 2; return D.lowerMat ? D.lowerMat(tOf(z), h, t, s, y) : 0 }, shade: (_z, h) => D.lowerShade(h) }))
  const isBoxTruck = cfg.body === 'boxtruck', isWhiteBox = false
  void isWhiteBox
  const lowerMesh = mesh(lowerGeo, [c.paint, M.glass, M.black], 0, 0, 0, 'Body_Lower'); body.add(lowerMesh)
  // kabina (shisha + tom)
  if (D.cabinSec && D.cabinZ) {
    const zsC = stations(D.cabinZ[0], D.cabinZ[1], q.stC, D.cabinExtra ?? [])
    const cabGeo = cached(`cab|${cfg.id}|${lod}`, () => loft({ zs: zsC, ring: q.ringC, sec: D.cabinSec!, caps: D.cabinCaps, mat: (z, h, t, s, y) => D.cabinMat!(tOf(z), h, t, s, y), shade: () => 1 }))
    body.add(mesh(cabGeo, [c.paint, M.glass], 0, 0, 0, 'Body_Cabin'))
  }
  if (lod <= 1 || cfg.body === 'boxtruck') {
    // detallar
    if (cfg.body === 'cybertruck') cyberDetails(c, plate)
    else if (cfg.body === 'gclass') gDetails(c, plate)
    else if (isBoxTruck) truckDetails(c, plate)
    else carDetails(c, plate)
    if (lod === 0) { addWheelWells(c); if (q.interior) { addInterior(c); addSteering(c) } }
  } else if (lod === 2) {
    // faqat chiroqlar belgisi (kichik yorqin nuqtalar)
    const W = cfg.dimensions.width
    const hl = lampMaterial('head'), tl = lampMaterial('tail')
    for (const sx of [1, -1]) { c.head.add(mesh(rb('l2h', 0.3, 0.08, 0.05, 3), hl, sx * W * 0.3, D.yHead, D.zf - 0.04)); c.tail.add(mesh(rb('l2t', 0.3, 0.08, 0.05, 3), tl, sx * W * 0.3, D.yTail, D.zr + 0.04)) }
  }
  // g'ildiraklar (tugun markazi = g'ildirak markazi)
  const R = cfg.wheelRadius
  const names: Array<['FL' | 'FR' | 'RL' | 'RR', string]> = [['FL', 'Wheel_FL'], ['FR', 'Wheel_FR'], ['RL', 'Wheel_RL'], ['RR', 'Wheel_RR']]
  for (const [k, nm] of names) {
    const p = cfg.wheels[k].position
    const w = wheelGroup(nm, cfg, q, M, isBoxTruck && (k === 'RL' || k === 'RR'), p[0] >= 0)
    w.position.set(p[0], R, p[2]); root.add(w)
  }
  root.traverse((o) => { const m = o as Mesh; if (m.isMesh) { m.castShadow = lod <= 2; m.receiveShadow = lod === 0 } })
  return root
}

/** Masofaga qarab avtomatik darajalar (traffic va uzoq mashinalar uchun). Hamma darajalar bitta bo'yoq materialini bo'lishadi. */
export function buildCarLOD(cfg: VehicleConfig, colorHex: string, plate = '01 A 777 AA'): LOD {
  const lod = new LOD(); lod.name = `CarLOD_${cfg.id}`
  const paint = paintMaterial(colorHex, cfg.body)
  ;([0, 1, 2, 3] as CarLOD[]).forEach((lv) => { lod.addLevel(buildCar(cfg, colorHex, plate, lv, paint), LOD_DISTANCES[lv]) })
  lod.userData.paint = paint
  return lod
}
/** Rangni o'zgartirish (LOD yoki oddiy guruh) */
export function recolor(root: { userData: Record<string, unknown> }, hex: string) {
  const p = root.userData.paint as { color: { set: (h: string) => void } } | undefined
  p?.color.set(hex)
}





