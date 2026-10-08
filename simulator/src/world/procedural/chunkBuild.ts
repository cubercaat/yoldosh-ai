/**
 * CHUNK QURILISHI — bitta 128x128 m chunk uchun hamma narsa (yo'l, belgilar, yo'laklar, binolar, parklar, daraxtlar...)
 * deterministik ravishda koordinatadan hosil qilinadi. Natija: material bo'yicha BIRLASHTIRILGAN geometriyalar,
 * fizika collider ro'yxati va "prop" (instancing uchun) ro'yxatlari.
 * Hech qanday React/Three sahna obyekti yaratilmaydi — faqat ma'lumot. Sahnaga ulash WorldChunkManager vazifasi.
 *
 * Qoida: obyekt o'z MARKAZI qaysi chunkka tushsa, o'sha chunk uni quradi (dublikat yo'q). Yo'l lentalari esa
 * dunyo-hizalangan nuqtalar bilan kesiladi, shuning uchun chunk chegarasida uzilish bo'lmaydi.
 */
import type { BufferGeometry } from 'three'
import { GeoBuilder, lin, tint } from './geom'
import { stream, rnd } from './seed'
import {
  BULB_R, CHUNK, RB_R_IN, RB_R_OUT, SIDEWALK_H, SPEC, crossing, crossingsInRect, drivewaysOf, rightOf, segIndexAt, segPoint, segment, segmentsInRect,
  type Crossing, type Seg,
} from './cityPlan'
import { blocksInRect, getBlock } from './blocks'
import { addLot, type ColliderSpec, type LampSpec, type ParkedCar, type Parts, type Props, type TreeSpec } from './buildings'
import type { SignKind } from './worldMaterials'

export type MatKey = 'asphalt' | 'paint' | 'sidewalk' | 'plain' | 'grass' | 'res' | 'off' | 'shop' | 'ind'
export interface SignSpec { kind: SignKind; x: number; z: number; rot: number }
export interface LightHead { x: number; z: number; rot: number; axis: 0 | 1; i: number; j: number }
export interface BenchSpec { x: number; z: number; rot: number }
export interface ChunkBuild {
  key: string
  cx: number
  cz: number
  x0: number
  z0: number
  x1: number
  z1: number
  geos: Partial<Record<MatKey, BufferGeometry>>
  colliders: ColliderSpec[]
  trees: TreeSpec[]
  lamps: LampSpec[]
  signs: SignSpec[]
  benches: BenchSpec[]
  lights: LightHead[]
  cars: ParkedCar[]
  tris: number
  roundabouts: number
  buildings: number
}

const ROAD_Y = 0.010, PAINT_Y = 0.018
const WHITE = lin('#f2f3f0'), YEL = lin('#f2c230'), ONE: [number, number, number] = [1, 1, 1]
const SW_C = lin('#c9cacf'), CURB_C = lin('#dcdde0')
const inChunk = (x: number, z: number, x0: number, z0: number, x1: number, z1: number) => x >= x0 && x < x1 && z >= z0 && z < z1

interface P2 { x: number; z: number; nx: number; nz: number }

function trimOf(c: Crossing, a: 0 | 1): number {
  if (c.roundabout) return RB_R_OUT - 1.5
  return (a === 0 ? c.w1 : c.w0) / 2
}
function endTrims(seg: Seg): [number, number] {
  const a = seg.a
  const cS = a === 0 ? crossing(seg.i, seg.j) : crossing(seg.j, seg.i)
  const cE = a === 0 ? crossing(seg.i, seg.j + 1) : crossing(seg.j + 1, seg.i)
  return [seg.state === 'stub1' ? 0 : trimOf(cS, a), seg.state === 'stub0' ? 0 : trimOf(cE, a)]
}
function sampleS(seg: Seg, pa: number, pb: number): number[] {
  if (seg.bendKind === 0) return [pa, pb]
  const out = [pa]
  for (let k = Math.floor(pa / 6) * 6 + 6; k < pb - 1.5; k += 6) if (k > pa + 1.5) out.push(k)
  out.push(pb); return out
}
function ptsFor(seg: Seg, ss: number[]): P2[] {
  return ss.map((s) => { const p = segPoint(seg, s), [nx, nz] = rightOf(p.tx, p.tz); return { x: p.x, z: p.z, nx, nz } })
}

/* ------------------------------------------------ yo'l belgilari */
interface Mark { lat: number; w: number; color: [number, number, number]; dash?: [number, number] }
function marksFor(cls: Seg['cls'], w: number): Mark[] {
  const e = w / 2 - 0.3
  switch (cls) {
    case 'residential': return [{ lat: 0, w: 0.12, color: WHITE, dash: [3, 6] }]
    case 'secondary': return [{ lat: 0, w: 0.15, color: WHITE, dash: [4, 8] }, { lat: e, w: 0.12, color: WHITE }, { lat: -e, w: 0.12, color: WHITE }]
    case 'main': return [{ lat: 0.14, w: 0.11, color: YEL }, { lat: -0.14, w: 0.11, color: YEL }, { lat: w / 4, w: 0.12, color: WHITE, dash: [4, 8] }, { lat: -w / 4, w: 0.12, color: WHITE, dash: [4, 8] }, { lat: e, w: 0.14, color: WHITE }, { lat: -e, w: 0.14, color: WHITE }]
    default: return [{ lat: 0.2, w: 0.11, color: YEL }, { lat: -0.2, w: 0.11, color: YEL }, { lat: w / 6 + 0.1, w: 0.12, color: WHITE, dash: [4, 8] }, { lat: -(w / 6 + 0.1), w: 0.12, color: WHITE, dash: [4, 8] }, { lat: w / 3 + 0.2, w: 0.12, color: WHITE, dash: [4, 8] }, { lat: -(w / 3 + 0.2), w: 0.12, color: WHITE, dash: [4, 8] }, { lat: e, w: 0.16, color: WHITE }, { lat: -e, w: 0.16, color: WHITE }]
  }
}

/* ------------------------------------------------ asosiy */
export function buildChunk(cx: number, cz: number): ChunkBuild {
  const x0 = cx * CHUNK, z0 = cz * CHUNK, x1 = x0 + CHUNK, z1 = z0 + CHUNK
  const G: Record<MatKey, GeoBuilder> = { asphalt: new GeoBuilder(), paint: new GeoBuilder(), sidewalk: new GeoBuilder(), plain: new GeoBuilder(), grass: new GeoBuilder(), res: new GeoBuilder(), off: new GeoBuilder(), shop: new GeoBuilder(), ind: new GeoBuilder() }
  const colliders: ColliderSpec[] = [], trees: TreeSpec[] = [], lamps: LampSpec[] = [], signs: SignSpec[] = [], benches: BenchSpec[] = [], lights: LightHead[] = [], cars: ParkedCar[] = []
  let roundabouts = 0, buildings = 0
  const mine = (x: number, z: number) => inChunk(x, z, x0, z0, x1, z1)
  const poleCol = (x: number, z: number, r: number, hh: number, tag: string) => colliders.push({ t: 'cyl', x, y: hh, z, r, hh, tag })
  const boxCol = (x: number, z: number, hx: number, hz: number, ry: number, hy = SIDEWALK_H / 2, tag = 'yo\'lak') => colliders.push({ t: 'box', x, y: hy, z, hx, hy, hz, ry, tag })

  /** bir tomonlama yo'lak bo'lagi (to'g'ri yoki egri) + kerb + collider */
  const sidewalkPiece = (pts: P2[], side: 1 | -1, w: number, sw: number) => {
    const l0 = side > 0 ? w / 2 : -w / 2 - sw, l1 = side > 0 ? w / 2 + sw : -w / 2
    G.sidewalk.strip(pts, l0, l1, SIDEWALK_H, ONE, 3)
    G.sidewalk.strip_wall(pts, side > 0 ? w / 2 : -w / 2, 0, SIDEWALK_H, side > 0 ? -1 : 1, CURB_C)
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz)
      const nx = (a.nx + b.nx) / 2, nz = (a.nz + b.nz) / 2, lc = side > 0 ? w / 2 + sw / 2 : -w / 2 - sw / 2
      const px = mx + nx * lc, pz = mz + nz * lc
      if (mine(px, pz)) boxCol(px, pz, sw / 2, len / 2 + 0.15, Math.atan2(dx, dz))
    }
  }

  /* ---------- 1) yo'l segmentlari ---------- */
  const segs = segmentsInRect(x0, z0, x1, z1, 2)
  for (const seg of segs) {
    const [t0, t1] = endTrims(seg)
    const along0 = seg.a === 0 ? z0 : x0, along1 = seg.a === 0 ? z1 : x1
    const fa = seg.p0 + t0, fb = seg.p1 - t1
    const pa = Math.max(fa, along0), pb = Math.min(fb, along1)
    if (pb - pa < 0.3) continue
    const ss = sampleS(seg, pa, pb), pts = ptsFor(seg, ss), w = seg.w, sw = seg.sw
    G.asphalt.strip(pts, -w / 2, w / 2, ROAD_Y, ONE, 6)
    // chiziqlar
    for (const m of marksFor(seg.cls, w)) {
      if (!m.dash) { G.paint.strip(pts, m.lat - m.w / 2, m.lat + m.w / 2, PAINT_Y, m.color); continue }
      const per = m.dash[0] + m.dash[1]
      for (let k = Math.floor((pa - seg.s0) / per) - 1; seg.s0 + k * per < pb; k++) {
        const sa = Math.max(seg.s0 + k * per, pa), sb = Math.min(seg.s0 + k * per + m.dash[0], pb)
        if (sb - sa < 0.4) continue
        if (sa < fa + 1.5 || sb > fb - 1.5) continue
        G.paint.strip(ptsFor(seg, sampleS(seg, sa, sb)), m.lat - m.w / 2, m.lat + m.w / 2, PAINT_Y, m.color)
      }
    }
    // yo'laklar (kirish yo'llari uchun uzilishlar bilan)
    const drives = drivewaysOf(seg)
    for (const side of [1, -1] as const) {
      const gaps = drives.filter((d) => d.side === side).map((d) => [d.s - d.w / 2, d.s + d.w / 2] as [number, number]).sort((a, b) => a[0] - b[0])
      let cur = pa
      const ivs: Array<[number, number]> = []
      for (const [ga, gb] of gaps) { if (gb < cur || ga > pb) continue; if (ga > cur) ivs.push([cur, Math.min(ga, pb)]); cur = Math.max(cur, gb) }
      if (cur < pb) ivs.push([cur, pb])
      for (const [ia, ib] of ivs) if (ib - ia > 0.2) sidewalkPiece(ptsFor(seg, sampleS(seg, ia, ib)), side, w, sw)
      for (const d of drives.filter((q) => q.side === side)) {
        if (d.s < pa - 5 || d.s > pb + 5) continue
        const dp = ptsFor(seg, [Math.max(d.s - d.w / 2, pa), Math.min(d.s + d.w / 2, pb)])
        const l0 = side > 0 ? w / 2 - 0.1 : -w / 2 - sw - 0.6, l1 = side > 0 ? w / 2 + sw + 0.6 : -w / 2 + 0.1
        if (dp[1] && mine(dp[0].x, dp[0].z)) G.asphalt.strip(dp, l0, l1, ROAD_Y + 0.002, ONE, 6)
      }
    }
  }

  /* ---------- 2) chorrahalar ---------- */
  const crosses = crossingsInRect(x0, z0, x1, z1)
  for (const c of crosses) {
    const hx = c.w0 / 2, hz = c.w1 / 2
    const sw0 = SPEC[c.cls0].sw, sw1 = SPEC[c.cls1].sw
    const arms = [
      { on: c.armPZ, seg: segment(0, c.i, c.j), start: true, dx: 0, dz: 1, a: 0 as const },
      { on: c.armNZ, seg: segment(0, c.i, c.j - 1), start: false, dx: 0, dz: -1, a: 0 as const },
      { on: c.armPX, seg: segment(1, c.j, c.i), start: true, dx: 1, dz: 0, a: 1 as const },
      { on: c.armNX, seg: segment(1, c.j, c.i - 1), start: false, dx: -1, dz: 0, a: 1 as const },
    ]
    if (c.roundabout) {
      roundabouts++
      const N = 48, Ro = RB_R_OUT, Ri = RB_R_IN
      // asfalt halqa
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2
        const p = (r: number, a: number): [number, number, number] => [c.x + Math.cos(a) * r, ROAD_Y, c.z + Math.sin(a) * r]
        const A = p(Ri, a0), B = p(Ro, a0), C = p(Ro, a1), D = p(Ri, a1)
        G.asphalt.quad(A, D, C, B, [0, 1, 0], ONE, [[A[0] / 6, A[2] / 6], [D[0] / 6, D[2] / 6], [C[0] / 6, C[2] / 6], [B[0] / 6, B[2] / 6]])
      }
      // markaziy dashed aylana
      const rm = (Ri + Ro) / 2
      for (let k = 0; k < 36; k += 2) {
        const a0 = (k / 36) * Math.PI * 2, a1 = ((k + 1.1) / 36) * Math.PI * 2
        const pp = (r: number, a: number): [number, number, number] => [c.x + Math.cos(a) * r, PAINT_Y, c.z + Math.sin(a) * r]
        G.paint.quad(pp(rm - 0.07, a0), pp(rm - 0.07, a1), pp(rm + 0.07, a1), pp(rm + 0.07, a0), [0, 1, 0], WHITE)
      }
      // orolcha: kerb halqasi + o'tloq
      const isl: Array<[number, number]> = []
      for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; isl.push([c.x + Math.cos(a) * (Ri - 0.5), c.z + Math.sin(a) * (Ri - 0.5)]) }
      G.grass.fan(c.x, c.z, isl, 0.2, tint(lin('#5da043'), 1.0), 4)
      const ringPts: P2[] = []
      for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 2; ringPts.push({ x: c.x + Math.cos(a) * Ri, z: c.z + Math.sin(a) * Ri, nx: Math.cos(a), nz: Math.sin(a) }) }
      G.sidewalk.strip(ringPts, -0.55, 0.0, 0.22, ONE, 3)
      G.sidewalk.strip_wall(ringPts, 0, 0, 0.22, 1, CURB_C)
      colliders.push({ t: 'cyl', x: c.x, y: 0.12, z: c.z, r: Ri, hh: 0.12, tag: 'aylana orolchasi' })
      // orolchada daraxtlar
      const rr = stream(c.i, c.j, 90)
      trees.push({ x: c.x, z: c.z, s: 1.4, kind: 1 })
      for (let k = 0; k < 3; k++) { const a = rr() * 6.28, d = 3 + rr() * 3; trees.push({ x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d, s: 0.8 + rr() * 0.5, kind: rr() < 0.5 ? 0 : 1 }) }
      poleCol(c.x, c.z, 0.45, 2, 'daraxt')
      // tashqi yo'lak halqasi (yo'llar kirgan joylar ochiq)
      const gaps = arms.filter((q) => q.on).map((q) => ({ ang: Math.atan2(q.dz, q.dx), half: Math.asin(Math.min(0.95, (q.seg.w / 2 + 0.4) / (Ro + 1.5))) }))
      const NS = 96
      const inGap = (a: number) => gaps.some((g) => { let d = Math.abs(a - g.ang) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d; return d < g.half })
      let run: P2[] = []
      const flush = () => {
        if (run.length > 1) {
          const sw = Math.max(sw0, sw1)
          G.sidewalk.strip(run, 0, sw, SIDEWALK_H, ONE, 3); G.sidewalk.strip_wall(run, 0, 0, SIDEWALK_H, -1, CURB_C)
          for (let k = 0; k < run.length - 1; k++) { const a = run[k], b = run[k + 1], mx = (a.x + b.x) / 2 + (a.nx + b.nx) / 2 * sw / 2, mz = (a.z + b.z) / 2 + (a.nz + b.nz) / 2 * sw / 2; boxCol(mx, mz, sw / 2, Math.hypot(b.x - a.x, b.z - a.z) / 2 + 0.1, Math.atan2(b.x - a.x, b.z - a.z)) }
        }
        run = []
      }
      for (let k = 0; k <= NS; k++) {
        const a = (k / NS) * Math.PI * 2 - Math.PI
        if (inGap(a)) { flush(); continue }
        run.push({ x: c.x + Math.cos(a) * Ro, z: c.z + Math.sin(a) * Ro, nx: Math.cos(a), nz: Math.sin(a) })
      }
      flush()
      // lampalar (aylana atrofida)
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, lx = c.x + Math.cos(a) * (Ro + 2.3), lz = c.z + Math.sin(a) * (Ro + 2.3); if (!inGap(a - Math.PI)) { lamps.push({ x: lx, z: lz, dx: -Math.cos(a), dz: -Math.sin(a) }); poleCol(lx, lz, 0.16, 3.5, 'chiroq ustuni') } }
      // kirish: yield + roundabout belgisi + zebra
      for (const q of arms) if (q.on) addApproach(c, q, true)
    } else {
      G.asphalt.flatRect(c.x, c.z, c.w0, c.w1, ROAD_Y, ONE, 6)
      // yo'lak: ochiq tomonlar bo'ylab "o'tish" bo'laklari va burchak maydonchalari
      const pad = (px: number, pz: number, w: number, d: number) => {
        G.sidewalk.flatRect(px, pz, w, d, SIDEWALK_H, ONE, 3)
        const ex = Math.sign(px - c.x) || 0, ez = Math.sign(pz - c.z) || 0
        void ex; void ez
        if (w > 0 && d > 0) boxCol(px, pz, w / 2, d / 2, 0)
      }
      if (!c.armPX) pad(c.x + hx + sw0 / 2, c.z, sw0, c.w1)
      if (!c.armNX) pad(c.x - hx - sw0 / 2, c.z, sw0, c.w1)
      if (!c.armPZ) pad(c.x, c.z + hz + sw1 / 2, c.w0, sw1)
      if (!c.armNZ) pad(c.x, c.z - hz - sw1 / 2, c.w0, sw1)
      for (const sx of [1, -1]) for (const sz of [1, -1]) {
        const xArm = sx > 0 ? c.armPX : c.armNX, zArm = sz > 0 ? c.armPZ : c.armNZ
        if (!xArm && !zArm) pad(c.x + sx * (hx + sw0 / 2), c.z + sz * (hz + sw1 / 2), sw0, sw1)
      }
      for (const q of arms) if (q.on) addApproach(c, q, false)
      // svetofor ustunlari
      if (c.ctrl === 'lights') {
        const px = hx + 0.9, pz = hz + 0.9
        const posts: Array<{ x: number; z: number; rot: number; axis: 0 | 1; on: boolean }> = [
          { x: -px, z: -pz, rot: Math.PI, axis: 0, on: c.armNZ }, { x: px, z: pz, rot: 0, axis: 0, on: c.armPZ },
          { x: -px, z: pz, rot: -Math.PI / 2, axis: 1, on: c.armNX }, { x: px, z: -pz, rot: Math.PI / 2, axis: 1, on: c.armPX },
        ]
        for (const p of posts) if (p.on) { lights.push({ x: c.x + p.x, z: c.z + p.z, rot: p.rot, axis: p.axis, i: c.i, j: c.j }); poleCol(c.x + p.x, c.z + p.z, 0.14, 2.8, 'svetofor') }
      }
    }
  }

  /** chorraha kirishi: zebra, stop chizig'i, belgi */
  function addApproach(c: Crossing, q: { seg: Seg; start: boolean; a: 0 | 1 }, rb: boolean) {
    const seg = q.seg, trim = trimOf(c, q.a), w = seg.w
    const sZ = q.start ? seg.s0 + trim + 2.4 : seg.s1 - trim - 2.4
    const sStop = q.start ? seg.s0 + trim + 5.4 : seg.s1 - trim - 5.4
    const stopApplies = c.ctrl === 'lights' || c.ctrl === 'rb' || ((c.ctrl === 'stop' || c.ctrl === 'yield') && q.a === c.stopAxis)
    const zebra = c.ctrl !== 'none' || rnd(c.i, c.j, q.a * 2 + (q.start ? 1 : 0), 9) < 0.5
    const p = segPoint(seg, sZ), [rx, rz] = rightOf(p.tx, p.tz)
    const mineC = (x: number, z: number) => mine(x, z) || mine(c.x, c.z)
    if (zebra && mineC(p.x, p.z)) {
      for (let k = -Math.floor((w - 1) / 1.0 / 2); k <= Math.floor((w - 1) / 1.0 / 2); k++) {
        const lat = k * 1.0, ss = [sZ - 1.6, sZ + 1.6], pp = ptsFor(seg, ss)
        G.paint.strip(pp, lat - 0.25, lat + 0.25, PAINT_Y, WHITE)
      }
    }
    if (stopApplies && c.ctrl !== 'rb') {
      const pp = ptsFor(seg, [sStop - 0.2, sStop + 0.2])
      // keluvchi harakat tomoni: start bo'lsa -s yo'nalish (lat < 0), aks holda +s (lat > 0)
      const a0 = q.start ? -w / 2 + 0.2 : 0.2, a1 = q.start ? -0.2 : w / 2 - 0.2
      if (mineC(p.x, p.z)) G.paint.strip(pp, a0, a1, PAINT_Y, WHITE)
    }
    // belgilar
    const dirSign = q.start ? -1 : 1 // keluvchi harakat yo'nalishi (s bo'yicha)
    const signLat = (q.start ? -1 : 1) * (w / 2 + 1.1)
    const sSign = q.start ? seg.s0 + trim + 4 : seg.s1 - trim - 4
    const sp = segPoint(seg, sSign)
    const sx = sp.x + rx * signLat, sz = sp.z + rz * signLat
    const rot = Math.atan2(-dirSign * sp.tx, -dirSign * sp.tz)
    if (mine(sx, sz)) {
      if (c.ctrl === 'rb') { signs.push({ kind: 'yield', x: sx, z: sz, rot }); poleCol(sx, sz, 0.07, 1.4, 'belgi') }
      else if (stopApplies && (c.ctrl === 'stop' || c.ctrl === 'yield')) { signs.push({ kind: c.ctrl === 'stop' ? 'stop' : 'yield', x: sx, z: sz, rot }); poleCol(sx, sz, 0.07, 1.4, 'belgi') }
    }
    if (rb) {
      const s2 = q.start ? seg.s0 + trim + 22 : seg.s1 - trim - 22, p2 = segPoint(seg, s2), x2 = p2.x + rx * signLat, z2 = p2.z + rz * signLat
      if (mine(x2, z2)) { signs.push({ kind: 'roundabout', x: x2, z: z2, rot: Math.atan2(-dirSign * p2.tx, -dirSign * p2.tz) }); poleCol(x2, z2, 0.07, 1.4, 'belgi') }
    }
    if (zebra && !rb) {
      const s3 = q.start ? seg.s0 + trim + 7.5 : seg.s1 - trim - 7.5, p3 = segPoint(seg, s3), x3 = p3.x - rx * signLat * 0 + rx * ((q.start ? 1 : -1) * (w / 2 + 1.1)), z3 = p3.z + rz * ((q.start ? 1 : -1) * (w / 2 + 1.1))
      void x3; void z3
    }
  }

  /* ---------- 3) bulblar (tupik aylanalari) ---------- */
  for (const seg of segs) {
    if (seg.state !== 'stub0' && seg.state !== 'stub1') continue
    const se = seg.state === 'stub0' ? seg.p1 : seg.p0, pe = segPoint(seg, se)
    if (!mine(pe.x, pe.z)) continue
    const N = 28, pts: Array<[number, number]> = []
    for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2; pts.push([pe.x + Math.cos(a) * BULB_R, pe.z + Math.sin(a) * BULB_R]) }
    G.asphalt.fan(pe.x, pe.z, pts, ROAD_Y, ONE, 6)
    // yo'l kirib kelayotgan yo'nalish (bulb markazidan krossingga qarab)
    const dirIn = seg.state === 'stub0' ? -1 : 1, ang = Math.atan2(dirIn * pe.tz, dirIn * pe.tx)
    const half = Math.asin(Math.min(0.95, (seg.w / 2 + 0.3) / (BULB_R + 1.5)))
    let run: P2[] = []
    const flush = () => {
      if (run.length > 1) {
        const sw = seg.sw
        G.sidewalk.strip(run, 0, sw, SIDEWALK_H, ONE, 3); G.sidewalk.strip_wall(run, 0, 0, SIDEWALK_H, -1, CURB_C)
        for (let k = 0; k < run.length - 1; k++) { const a = run[k], b = run[k + 1]; boxCol((a.x + b.x) / 2 + (a.nx + b.nx) / 2 * sw / 2, (a.z + b.z) / 2 + (a.nz + b.nz) / 2 * sw / 2, sw / 2, Math.hypot(b.x - a.x, b.z - a.z) / 2 + 0.1, Math.atan2(b.x - a.x, b.z - a.z)) }
      }
      run = []
    }
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * Math.PI * 2 - Math.PI
      let d = Math.abs(a - ang) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d
      if (d < half) { flush(); continue }
      run.push({ x: pe.x + Math.cos(a) * BULB_R, z: pe.z + Math.sin(a) * BULB_R, nx: Math.cos(a), nz: Math.sin(a) })
    }
    flush()
    trees.push({ x: pe.x, z: pe.z, s: 1.0, kind: 1 }); poleCol(pe.x, pe.z, 0.4, 1.8, 'daraxt')
  }

  /* ---------- 4) ko'cha jihozlari: chiroqlar, daraxtlar, tezlik belgilari ---------- */
  for (const seg of segs) {
    const [t0, t1] = endTrims(seg), fa = seg.p0 + t0, fb = seg.p1 - t1, w = seg.w, sw = seg.sw
    if (fb - fa < 14) continue
    const drives = drivewaysOf(seg)
    const nearDrive = (s: number, side: number) => drives.some((d) => d.side === side && Math.abs(d.s - s) < d.w / 2 + 3)
    // chiroqlar: har 34 m, navbatma-navbat tomonlarda (main/highway — ikkala tomonda)
    for (let k = 0, s = fa + 14; s < fb - 8; k++, s += 34) {
      const sides: Array<1 | -1> = seg.cls === 'main' || seg.cls === 'highway' ? [1, -1] : [k % 2 ? 1 : -1]
      for (const sd of sides) {
        const p = segPoint(seg, s), [rx, rz] = rightOf(p.tx, p.tz), lat = sd * (w / 2 + sw * 0.45)
        const x = p.x + rx * lat, z = p.z + rz * lat
        if (!mine(x, z) || nearDrive(s, sd)) continue
        lamps.push({ x, z, dx: -rx * sd, dz: -rz * sd }); poleCol(x, z, 0.16, 3.5, 'chiroq ustuni')
      }
    }
    // daraxtlar
    const prob = seg.cls === 'residential' ? 0.8 : seg.cls === 'secondary' ? 0.55 : seg.cls === 'main' ? 0.4 : 0
    if (prob > 0) for (let s = fa + 6; s < fb - 5; s += 11) for (const sd of [1, -1] as const) {
      const r = rnd(seg.a * 5 + seg.i, seg.j * 997 + Math.floor(s), sd > 0 ? 3 : 4, 61)
      if (r > prob) continue
      const ss = s + (rnd(seg.i, Math.floor(s), 62) - 0.5) * 3, p = segPoint(seg, ss), [rx, rz] = rightOf(p.tx, p.tz), lat = sd * (w / 2 + sw - 0.8)
      const x = p.x + rx * lat, z = p.z + rz * lat
      if (!mine(x, z) || nearDrive(ss, sd)) continue
      // chiroq bilan to'qnashmasin
      let clash = false
      for (const L of lamps) if ((L.x - x) ** 2 + (L.z - z) ** 2 < 6) { clash = true; break }
      if (clash) continue
      trees.push({ x, z, s: 0.8 + rnd(seg.i, Math.floor(s), 63) * 0.6, kind: rnd(seg.j, Math.floor(s), 64) < 0.5 ? 0 : 1 }); poleCol(x, z, 0.3, 1.6, 'daraxt')
    }
    // tezlik chegarasi belgilari
    if (fb - fa > 70 && (seg.cls !== 'residential' || rnd(seg.a, seg.i, seg.j, 65) < 0.4)) {
      const kind = ({ highway: 'l90', main: 'l60', secondary: 'l50', residential: 'l30' } as const)[seg.cls] as SignKind
      const place = (s: number, sd: 1 | -1, face: 1 | -1) => {
        const p = segPoint(seg, s), [rx, rz] = rightOf(p.tx, p.tz), lat = sd * (w / 2 + 1.1)
        const x = p.x + rx * lat, z = p.z + rz * lat
        if (mine(x, z) && !nearDrive(s, sd)) { signs.push({ kind, x, z, rot: Math.atan2(face * p.tx, face * p.tz) }); poleCol(x, z, 0.07, 1.4, 'belgi') }
      }
      place(fa + 12, 1, -1); place(fb - 12, -1, 1)
    }
  }

  /* ---------- 5) bloklar: binolar, parklar, avtoturargohlar ---------- */
  const parts: Parts = { res: G.res, off: G.off, shop: G.shop, ind: G.ind, plain: G.plain, asphalt: G.asphalt, paint: G.paint }
  const props: Props = { cars, trees, lamps, colliders }
  for (const [bi, bj] of blocksInRect(x0, z0, x1, z1)) {
    const blk = getBlock(bi, bj)
    for (const lot of blk.lots) {
      if (!mine(lot.x, lot.z)) continue
      if (lot.kind === 'park') { buildPark(lot); continue }
      addLot(lot, parts, props)
      if (lot.kind !== 'empty' && lot.kind !== 'parking' && lot.kind !== 'yard') buildings++
    }
  }

  function buildPark(lot: { x: number; z: number; poly?: Array<[number, number]>; seed: number; wx: number; wz: number }) {
    const poly = lot.poly!, r = stream(lot.seed)
    G.grass.fan(lot.x, lot.z, poly, 0.03, tint(lin('#4f9a3c'), 0.95 + r() * 0.1), 4)
    // chegara (yengil yo'lak)
    const edge: P2[] = poly.concat([poly[0]]).map(([x, z]) => { const dx = x - lot.x, dz = z - lot.z, l = Math.hypot(dx, dz) || 1; return { x, z, nx: dx / l, nz: dz / l } })
    G.sidewalk.strip(edge, -0.1, 0.5, 0.06, ONE, 3)
    // yo'lkalar: ikkita egri chiziq
    const paths: Array<Array<[number, number]>> = []
    for (let k = 0; k < 2; k++) {
      const a0 = r() * 6.28 + k * 1.57, A = poly[Math.floor(((a0 % 6.28) / 6.28) * poly.length) % poly.length], B = poly[Math.floor((((a0 + Math.PI) % 6.28) / 6.28) * poly.length) % poly.length]
      const mx = (A[0] + B[0]) / 2 + (r() - 0.5) * 12, mz = (A[1] + B[1]) / 2 + (r() - 0.5) * 12
      const pp: Array<[number, number]> = []
      for (let t = 0; t <= 1.001; t += 1 / 14) pp.push([(1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * mx + t * t * B[0], (1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * mz + t * t * B[1]])
      paths.push(pp)
      const pts: P2[] = pp.map((p, i) => { const q = pp[Math.min(pp.length - 1, i + 1)], o = pp[Math.max(0, i - 1)], tx = q[0] - o[0], tz = q[1] - o[1], l = Math.hypot(tx, tz) || 1; return { x: p[0], z: p[1], nx: -tz / l, nz: tx / l } })
      G.plain.strip(pts, -1.2, 1.2, 0.045, lin('#d3c7a2'), 3)
      for (let i = 3; i < pp.length - 2; i += 5) {
        const p = pts[i]; benches.push({ x: p.x + p.nx * 1.9, z: p.z + p.nz * 1.9, rot: Math.atan2(-p.nx, -p.nz) })
        lamps.push({ x: p.x - p.nx * 1.9, z: p.z - p.nz * 1.9, dx: p.nx, dz: p.nz })
        poleCol(p.x - p.nx * 1.9, p.z - p.nz * 1.9, 0.16, 3.5, 'chiroq ustuni')
        colliders.push({ t: 'box', x: p.x + p.nx * 1.9, y: 0.45, z: p.z + p.nz * 1.9, hx: 0.9, hy: 0.45, hz: 0.3, ry: Math.atan2(-p.nx, -p.nz), tag: 'o\'rindiq' })
      }
    }
    // daraxtlar
    const n = Math.floor((lot.wx * lot.wz) / 120)
    const inside = (x: number, z: number) => { const dx = x - lot.x, dz = z - lot.z, a = Math.atan2(dz, dx), k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * poly.length) % poly.length, q = poly[k], rr = Math.hypot(q[0] - lot.x, q[1] - lot.z); return Math.hypot(dx, dz) < rr * 0.93 }
    for (let k = 0; k < n; k++) {
      const x = lot.x + (r() - 0.5) * lot.wx, z = lot.z + (r() - 0.5) * lot.wz
      if (!inside(x, z)) continue
      if (paths.some((pp) => pp.some((q) => (q[0] - x) ** 2 + (q[1] - z) ** 2 < 6.5))) continue
      trees.push({ x, z, s: 0.8 + r() * 0.9, kind: r() < 0.45 ? 0 : 1 }); poleCol(x, z, 0.3, 1.6, 'daraxt')
    }
  }

  const geos: Partial<Record<MatKey, BufferGeometry>> = {}
  let tris = 0
  for (const k of Object.keys(G) as MatKey[]) { const g = G[k].toGeometry(); if (g) { geos[k] = g; tris += g.index!.count / 3 } }
  return { key: `${cx},${cz}`, cx, cz, x0, z0, x1, z1, geos, colliders, trees, lamps, signs, benches, lights, cars, tris, roundabouts, buildings }
}
void segIndexAt
