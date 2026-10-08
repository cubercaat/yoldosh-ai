/**
 * CITY PLAN — cheksiz, deterministik yo'l tarmog'i (hech narsa oldindan saqlanmaydi, hammasi koordinatadan hisoblanadi).
 *
 * Tushuncha:
 *  - X o'qi bo'ylab "chiziqlar" (axis 0: x = X_i, Z bo'ylab ketadi) va Z bo'ylab (axis 1: z = Z_j, X bo'ylab ketadi).
 *  - Chiziq o'rni = i*SPACING + deterministik siljish => oraliqlar 100..200 m (panjara emas, har xil bloklar).
 *  - Har chiziqning klassi bor (highway / main / secondary / residential): kengligi, yo'laklar soni, tezlik chegarasi.
 *  - Ikki chorraha orasidagi bo'lak = SEGMENT. Turar-joy segmentlari yo'q bo'lishi (T-chorraha), "tupik" (cul-de-sac)
 *    bo'lishi, egilgan (bulge / S-shakl) bo'lishi mumkin.
 *  - Chorraha: 4-yo'l, T, burchak, tupik yoki AYLANA (roundabout).
 *  Hamma so'rov (surfaceAt, nearestRoad) O(1): atrofdagi 3x3 ta chiziq tekshiriladi.
 */
import { onSeedChange, rnd } from './seed'

export type Surface = 'road' | 'sidewalk' | 'grass'
export const SURFACE_GRIP: Record<Surface, number> = { road: 1.0, sidewalk: 0.78, grass: 0.42 }

export const CHUNK = 128
export const SPACING = 150
export const SIDEWALK_H = 0.14
export const RB_R_OUT = 19 // aylana tashqi radiusi (asfalt)
export const RB_R_IN = 9 // markaziy orolcha radiusi
export const BULB_R = 9 // tupik aylanasi radiusi

export type RoadClass = 'highway' | 'main' | 'secondary' | 'residential'
export const SPEC: Record<RoadClass, { w: number; sw: number; lanes: number; limit: number; rank: number }> = {
  highway: { w: 24, sw: 2.4, lanes: 6, limit: 90, rank: 3 },
  main: { w: 17, sw: 3.4, lanes: 4, limit: 60, rank: 3 },
  secondary: { w: 11, sw: 3.0, lanes: 2, limit: 50, rank: 2 },
  residential: { w: 8.5, sw: 2.6, lanes: 2, limit: 30, rank: 1 },
}

export type Axis = 0 | 1
export type SegState = 'absent' | 'full' | 'stub0' | 'stub1'

export interface Seg {
  a: Axis // 0: Z bo'ylab (x = X_i), 1: X bo'ylab (z = Z_i)
  i: number // chiziq indeksi
  j: number // segment indeksi (perpendikulyar chiziqlar j va j+1 orasida)
  cls: RoadClass
  w: number
  sw: number
  base: number // chiziqning o'q koordinatasi (a=0: x, a=1: z)
  s0: number // bo'lak boshi (uzunlik bo'ylab mutlaq koordinata)
  s1: number
  state: SegState
  p0: number // haqiqatda mavjud qism (stub bo'lsa qisqaradi)
  p1: number
  bendKind: 0 | 1 | 2 // 0 to'g'ri, 1 bulge, 2 S-shakl
  bendAmp: number
}

export interface Crossing {
  i: number
  j: number
  x: number
  z: number
  w0: number // axis 0 chizig'ining kengligi (plaza X o'lchami)
  w1: number // axis 1 chizig'ining kengligi (plaza Z o'lchami)
  cls0: RoadClass
  cls1: RoadClass
  armPZ: boolean
  armNZ: boolean
  armPX: boolean
  armNX: boolean
  arms: number
  roundabout: boolean
  ctrl: 'lights' | 'stop' | 'yield' | 'rb' | 'none'
  stopAxis: Axis // 'stop'/'yield' bo'lsa — qaysi chiziqda belgisi bor
  phase: number // svetofor fazasi siljishi (soniya)
}

/* ---------- keshlar ---------- */
const segCache = new Map<string, Seg>()
const crossCache = new Map<string, Crossing>()
onSeedChange(() => { segCache.clear(); crossCache.clear() })
const CACHE_MAX = 6000

/* ---------- chiziqlar ---------- */
export const linePos = (a: Axis, i: number) => i * SPACING + (rnd(a, i, 11) - 0.5) * 0.34 * SPACING
export function lineClass(a: Axis, i: number): RoadClass {
  if (i === 0) return a === 0 ? 'main' : 'secondary'
  const r = rnd(a, i, 12)
  if (r < 0.06) return 'highway'
  if (r < 0.26) return 'main'
  if (r < 0.6) return 'secondary'
  return 'residential'
}

/** c koordinata (perpendikulyar chiziqlar o'qida) qaysi segmentga tushadi: linePos(axis, j) <= c < linePos(axis, j+1) */
export function segIndexAt(axis: Axis, c: number): number {
  const k0 = Math.floor(c / SPACING)
  for (let k = k0 + 1; k >= k0 - 1; k--) if (linePos(axis, k) <= c) return k
  return k0 - 1
}

export function segment(a: Axis, i: number, j: number): Seg {
  const key = `${a}|${i}|${j}`
  let s = segCache.get(key)
  if (s) return s
  const cls = lineClass(a, i), sp = SPEC[cls]
  const s0 = linePos((1 - a) as Axis, j), s1 = linePos((1 - a) as Axis, j + 1), len = s1 - s0
  let state: SegState = 'full'
  if (cls === 'residential') {
    const r = rnd(a, i, j, 13)
    state = r < 0.2 ? 'absent' : r < 0.32 ? 'stub0' : r < 0.44 ? 'stub1' : 'full'
  }
  let bendKind: 0 | 1 | 2 = 0, bendAmp = 0
  if (cls === 'residential' || cls === 'secondary') {
    const r = rnd(a, i, j, 14), m = rnd(a, i, j, 15), sg = rnd(a, i, j, 16) < 0.5 ? -1 : 1
    if (r < (cls === 'residential' ? 0.42 : 0.25)) { bendKind = 1; bendAmp = sg * (5 + m * 8) }
    else if (r < (cls === 'residential' ? 0.66 : 0.4)) { bendKind = 2; bendAmp = sg * (4 + m * 5) }
  }
  const p0 = state === 'stub1' ? s1 - 0.58 * len : s0, p1 = state === 'stub0' ? s0 + 0.58 * len : s1
  s = { a, i, j, cls, w: sp.w, sw: sp.sw, base: linePos(a, i), s0, s1, state, p0, p1, bendKind, bendAmp }
  if (segCache.size > CACHE_MAX) segCache.clear()
  segCache.set(key, s)
  return s
}

/** markaz chizig'ining yon siljishi (egilish) */
export function segOffset(seg: Seg, s: number): number {
  if (seg.bendKind === 0) return 0
  const t = Math.max(0, Math.min(1, (s - seg.s0) / (seg.s1 - seg.s0)))
  if (seg.bendKind === 1) { const q = Math.sin(Math.PI * t); return seg.bendAmp * q * q }
  return seg.bendAmp * Math.sin(2 * Math.PI * t) * Math.sin(Math.PI * t)
}

export interface SegPoint { x: number; z: number; tx: number; tz: number }
/** s — uzunlik bo'ylab koordinata. Natija: markaz nuqta va birlik yo'nalish (s o'sish tomoniga) */
export function segPoint(seg: Seg, s: number): SegPoint {
  const o = segOffset(seg, s), e = 0.5, d = (segOffset(seg, s + e) - segOffset(seg, s - e)) / (2 * e)
  const l = Math.hypot(d, 1)
  return seg.a === 0 ? { x: seg.base + o, z: s, tx: d / l, tz: 1 / l } : { x: s, z: seg.base + o, tx: 1 / l, tz: d / l }
}
/** o'ng tomon (haydovchi yo'nalishi bo'yicha) normali */
export const rightOf = (tx: number, tz: number): [number, number] => [-tz, tx]

/* ---------- chorrahalar ---------- */
export function crossing(i: number, j: number): Crossing {
  const key = `${i}|${j}`
  let c = crossCache.get(key)
  if (c) return c
  const cls0 = lineClass(0, i), cls1 = lineClass(1, j)
  const armPZ = ((st) => st === 'full' || st === 'stub0')(segment(0, i, j).state)
  const armNZ = ((st) => st === 'full' || st === 'stub1')(segment(0, i, j - 1).state)
  const armPX = ((st) => st === 'full' || st === 'stub0')(segment(1, j, i).state)
  const armNX = ((st) => st === 'full' || st === 'stub1')(segment(1, j, i - 1).state)
  const arms = +armPZ + +armNZ + +armPX + +armNX
  const roundabout = arms >= 3 && cls0 !== 'highway' && cls1 !== 'highway' && rnd(i, j, 31) < 0.22
  const r0 = SPEC[cls0].rank, r1 = SPEC[cls1].rank
  let ctrl: Crossing['ctrl'] = 'none', stopAxis: Axis = 0
  if (roundabout) ctrl = 'rb'
  else if (arms >= 3) {
    if (r0 >= 2 && r1 >= 2) ctrl = 'lights'
    else if (r0 !== r1) { ctrl = 'stop'; stopAxis = r0 < r1 ? 0 : 1 }
    else { ctrl = 'yield'; stopAxis = rnd(i, j, 32) < 0.5 ? 0 : 1 }
  }
  c = { i, j, x: linePos(0, i), z: linePos(1, j), w0: SPEC[cls0].w, w1: SPEC[cls1].w, cls0, cls1, armPZ, armNZ, armPX, armNX, arms, roundabout, ctrl, stopAxis, phase: rnd(i, j, 41) * 40 }
  if (crossCache.size > CACHE_MAX) crossCache.clear()
  crossCache.set(key, c)
  return c
}

/* ---------- svetofor ---------- */
export const TRAFFIC_CYCLE = { green: 10, yellow: 2.5, allRed: 1.5 }
export type Light = 'green' | 'yellow' | 'red'
/** axis 0 = Z bo'ylab harakat (NS), axis 1 = X bo'ylab (EW) */
export function lightState(c: Pick<Crossing, 'phase'>, axis: Axis, t: number): Light {
  const { green: g, yellow: y, allRed: r } = TRAFFIC_CYCLE, T = 2 * (g + y + r), x = (((t + c.phase) % T) + T) % T
  const half = g + y + r
  const inHalf = axis === 0 ? x : (x - half + T) % T
  if (axis === 0 ? x >= half : x < half) return 'red'
  if (inHalf < g) return 'green'
  if (inHalf < g + y) return 'yellow'
  return 'red'
}

/* ---------- so'rovlar ---------- */
export interface RoadQuery {
  edge: number // < 0: yo'l ichida (asfalt); 0..sw: yo'lak
  sw: number
  cls: RoadClass
  kind: 'seg' | 'plaza' | 'ring' | 'bulb'
  cx: number
  cz: number // yo'l markazidagi eng yaqin nuqta (taxminan)
  tx: number
  tz: number
  seg?: Seg
  cross?: Crossing
}

export function nearestRoad(x: number, z: number): RoadQuery | null {
  let best: RoadQuery | null = null
  const ix = Math.round(x / SPACING), iz = Math.round(z / SPACING)
  const consider = (q: RoadQuery) => { if (!best || q.edge < best.edge) best = q }
  // Z bo'ylab chiziqlar
  const jz = segIndexAt(1, z)
  for (let i = ix - 1; i <= ix + 1; i++) {
    const seg = segment(0, i, jz)
    if (seg.state === 'absent') continue
    const sc = Math.max(seg.p0, Math.min(seg.p1, z)), p = segPoint(seg, sc)
    if (z >= seg.p0 && z <= seg.p1) {
      const o = seg.base + segOffset(seg, z)
      consider({ edge: Math.abs(x - o) - seg.w / 2, sw: seg.sw, cls: seg.cls, kind: 'seg', cx: o, cz: z, tx: p.tx, tz: p.tz, seg })
    }

    if ((seg.state === 'stub0' || seg.state === 'stub1') ) {
      const se = seg.state === 'stub0' ? seg.p1 : seg.p0, pe = segPoint(seg, se)
      consider({ edge: Math.hypot(x - pe.x, z - pe.z) - BULB_R, sw: seg.sw, cls: seg.cls, kind: 'bulb', cx: pe.x, cz: pe.z, tx: pe.tx, tz: pe.tz, seg })
    }
  }
  // X bo'ylab chiziqlar
  const ix2 = segIndexAt(0, x)
  for (let j = iz - 1; j <= iz + 1; j++) {
    const seg = segment(1, j, ix2)
    if (seg.state === 'absent') continue
    if (x >= seg.p0 && x <= seg.p1) {
      const o = seg.base + segOffset(seg, x), p = segPoint(seg, x)
      consider({ edge: Math.abs(z - o) - seg.w / 2, sw: seg.sw, cls: seg.cls, kind: 'seg', cx: x, cz: o, tx: p.tx, tz: p.tz, seg })
    }
    if (seg.state === 'stub0' || seg.state === 'stub1') {
      const se = seg.state === 'stub0' ? seg.p1 : seg.p0, pe = segPoint(seg, se)
      consider({ edge: Math.hypot(x - pe.x, z - pe.z) - BULB_R, sw: seg.sw, cls: seg.cls, kind: 'bulb', cx: pe.x, cz: pe.z, tx: pe.tx, tz: pe.tz, seg })
    }
  }
  // chorraha maydonlari
  for (let i = ix - 1; i <= ix + 1; i++) for (let j = iz - 1; j <= iz + 1; j++) {
    const c = crossing(i, j)
    if (c.arms === 0) continue
    const sw = Math.max(SPEC[c.cls0].sw, SPEC[c.cls1].sw)
    if (c.roundabout) {
      const r = Math.hypot(x - c.x, z - c.z)
      consider({ edge: r - RB_R_OUT, sw, cls: c.cls0, kind: 'ring', cx: c.x, cz: c.z, tx: 0, tz: 1, cross: c })
    } else {
      const dx = Math.abs(x - c.x) - c.w0 / 2, dz = Math.abs(z - c.z) - c.w1 / 2
      const e = dx > 0 && dz > 0 ? Math.hypot(dx, dz) : Math.max(dx, dz)
      consider({ edge: e, sw, cls: c.cls0, kind: 'plaza', cx: c.x, cz: c.z, tx: 0, tz: 1, cross: c })
    }
  }
  return best
}

export function surfaceAt(x: number, z: number): Surface {
  const q = nearestRoad(x, z)
  if (!q) return 'grass'
  if (q.kind === 'ring' && q.cross) {
    const r = Math.hypot(x - q.cross.x, z - q.cross.z)
    if (r < RB_R_IN) return 'grass'
  }
  if (q.edge <= 0) return 'road'
  if (q.edge <= q.sw) return 'sidewalk'
  return 'grass'
}

/* ---------- boshlang'ich va qayta tiklash nuqtalari ---------- */
export interface Respawn { x: number; z: number; yaw: number }
export function laneStart(seg: Seg, s: number, forward = true): Respawn {
  const p = segPoint(seg, s), dir = forward ? 1 : -1
  const hx = p.tx * dir, hz = p.tz * dir, [rx, rz] = rightOf(hx, hz)
  const off = seg.w / 4
  return { x: p.x + rx * off, z: p.z + rz * off, yaw: Math.atan2(hx, hz) }
}
let startCache: Respawn | null = null
onSeedChange(() => { startCache = null })
export function getStart(): Respawn {
  if (startCache) return startCache
  const seg = segment(0, 0, -1)
  startCache = laneStart(seg, seg.s1 - 62, true)
  return startCache
}
/** (x,z) ga eng yaqin xavfsiz yo'l nuqtasi (o'ng polosa) */
export function nearestRespawn(x: number, z: number, hintYaw?: number): Respawn {
  const q = nearestRoad(x, z)
  const fallback = getStart()
  if (!q) return fallback
  let seg = q.seg
  if (!seg) {
    // chorraha ichida: eng yaqin qo'shni segmentni topamiz
    const c = q.cross!, cands: Array<{ seg: Seg; s: number; fwd: boolean }> = []
    if (c.armPZ) { const sg = segment(0, c.i, c.j); cands.push({ seg: sg, s: sg.s0 + 28, fwd: true }) }
    if (c.armNZ) { const sg = segment(0, c.i, c.j - 1); cands.push({ seg: sg, s: sg.s1 - 28, fwd: false }) }
    if (c.armPX) { const sg = segment(1, c.j, c.i); cands.push({ seg: sg, s: sg.s0 + 28, fwd: true }) }
    if (c.armNX) { const sg = segment(1, c.j, c.i - 1); cands.push({ seg: sg, s: sg.s1 - 28, fwd: false }) }
    if (!cands.length) return fallback
    let bestD = Infinity, bestR = fallback
    for (const cd of cands) { const r = laneStart(cd.seg, cd.s, cd.fwd), d = (r.x - x) ** 2 + (r.z - z) ** 2; if (d < bestD) { bestD = d; bestR = r } }
    return bestR
  }
  const s = Math.max(seg.p0 + 26, Math.min(seg.p1 - 26, (seg.a === 0 ? z : x)))
  let fwd = true
  if (hintYaw !== undefined) { const p = segPoint(seg, s); fwd = Math.sin(hintYaw) * p.tx + Math.cos(hintYaw) * p.tz >= 0 }
  return laneStart(seg, s, fwd)
}

/* ---------- ro'yxatlar (chunk generatsiyasi, minimap, trafik) ---------- */
export function segmentsInRect(x0: number, z0: number, x1: number, z1: number, margin = 16): Seg[] {
  const out: Seg[] = []
  const iA = Math.floor((x0 - margin) / SPACING) - 1, iB = Math.ceil((x1 + margin) / SPACING) + 1
  for (let i = iA; i <= iB; i++) {
    const X = linePos(0, i)
    if (X < x0 - margin - 16 || X > x1 + margin + 16) continue
    for (let j = segIndexAt(1, z0 - margin); j <= segIndexAt(1, z1 + margin); j++) { const s = segment(0, i, j); if (s.state !== 'absent') out.push(s) }
  }
  const jA = Math.floor((z0 - margin) / SPACING) - 1, jB = Math.ceil((z1 + margin) / SPACING) + 1
  for (let j = jA; j <= jB; j++) {
    const Z = linePos(1, j)
    if (Z < z0 - margin - 16 || Z > z1 + margin + 16) continue
    for (let i = segIndexAt(0, x0 - margin); i <= segIndexAt(0, x1 + margin); i++) { const s = segment(1, j, i); if (s.state !== 'absent') out.push(s) }
  }
  return out
}
export function crossingsInRect(x0: number, z0: number, x1: number, z1: number): Crossing[] {
  const out: Crossing[] = []
  const iA = Math.floor(x0 / SPACING) - 1, iB = Math.ceil(x1 / SPACING) + 1, jA = Math.floor(z0 / SPACING) - 1, jB = Math.ceil(z1 / SPACING) + 1
  for (let i = iA; i <= iB; i++) for (let j = jA; j <= jB; j++) {
    const c = crossing(i, j)
    if (c.arms > 0 && c.x >= x0 && c.x < x1 && c.z >= z0 && c.z < z1) out.push(c)
  }
  return out
}

/** tezlik chegarasi (km/soat) — nuqta qaysi yo'lda bo'lsa */
export function speedLimitAt(x: number, z: number): number {
  const q = nearestRoad(x, z)
  if (!q || q.edge > 1) return 0
  return SPEC[q.cls].limit
}

/** Segmentdagi tomonlarda yo'laklar bo'ylab kirish yo'llari (driveway): faqat to'g'ri segmentlarda */
export interface Driveway { side: 1 | -1; s: number; w: number }
export function drivewaysOf(seg: Seg): Driveway[] {
  if (seg.bendKind !== 0 || seg.state === 'absent') return []
  const out: Driveway[] = []
  const lo = seg.p0 + SPEC[seg.cls].w / 2 + 34, hi = seg.p1 - SPEC[seg.cls].w / 2 - 34
  if (hi - lo < 40) return out
  for (const side of [1, -1] as const) {
    for (let s = lo; s < hi - 20; s += 64) {
      const r = rnd(seg.a * 7919 + seg.i, seg.j * 131 + Math.floor(s), 50 + (side > 0 ? 0 : 7))
      if (r < (seg.cls === 'main' ? 0.34 : seg.cls === 'secondary' ? 0.4 : seg.cls === 'residential' ? 0.1 : 0)) out.push({ side, s: s + rnd(seg.i, seg.j, Math.floor(s), 55) * 24, w: 9 })
    }
  }
  return out
}

