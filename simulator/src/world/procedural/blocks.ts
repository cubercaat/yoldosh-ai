/**
 * Bloklar va uchastkalar (lot). Blok = ikki qo'shni X chizig'i va ikki qo'shni Z chizig'i orasidagi maydon.
 * Har blokning "zona"si bor (zich markaz, tijorat, turar-joy, shahar chekkasi, sanoat, park) — shovqin xaritasidan.
 * Uchastkalar blok perimetri bo'ylab qatorlar bilan joylashadi; markaz (core) maydoni park / katta bino / avtoturargoh bo'ladi.
 * Hamma narsa deterministik: bir xil (bi, bj) + WORLD_SEED = bir xil blok.
 */
import { fbm2, onSeedChange, rnd, stream } from './seed'
import { RB_R_OUT, SPEC, crossing, drivewaysOf, linePos, nearestRoad, segment, type Seg } from './cityPlan'

export type Zone = 'dense' | 'commercial' | 'residential' | 'suburban' | 'industrial' | 'park'
export type LotKind =
  | 'house' | 'house2' | 'apartment' | 'office' | 'tower' | 'shop' | 'supermarket' | 'warehouse' | 'factory'
  | 'fuel' | 'mall' | 'stadium' | 'garage' | 'parking' | 'yard' | 'park' | 'empty'

export interface Lot {
  kind: LotKind
  x: number
  z: number
  /** dunyo o'qlari bo'ylab o'lchamlar (AABB) */
  wx: number
  wz: number
  /** bino o'lchamlari (lokal): w = yo'l bo'ylab, d = chuqurlik */
  w: number
  d: number
  yaw: number // old tomon (yo'lga qarab) yo'nalishi
  floors: number
  h: number // metr
  zone: Zone
  seed: number
  hue: number
  landmark?: boolean
  /** supermarket/mall: old tomondagi avtoturargoh chuqurligi */
  lotDepth?: number
  /** park uchun: shakl */
  poly?: Array<[number, number]>
}

export interface BlockData { bi: number; bj: number; zone: Zone; x0: number; x1: number; z0: number; z1: number; lots: Lot[] }

const blockCache = new Map<string, BlockData>()
onSeedChange(() => blockCache.clear())

export function zoneOf(bi: number, bj: number): Zone {
  const r = rnd(bi, bj, 21)
  if (r < 0.1) return 'park'
  const n = fbm2(bi * 0.33 + 7.1, bj * 0.33 - 3.3, 1), m = fbm2(bi * 0.5 + 31, bj * 0.5 + 17, 2)
  if (m > 0.74 && (Math.abs(bi) > 0 || Math.abs(bj) > 0)) return 'industrial'
  if (n > 0.6) return 'dense'
  if (n > 0.48) return 'commercial'
  if (n > 0.34) return 'residential'
  return 'suburban'
}

const FLOOR_H = 3.2
interface KindSpec { w: [number, number]; d: [number, number] }
const KS: Record<string, KindSpec> = {
  house: { w: [11, 16], d: [11, 15] }, house2: { w: [12, 17], d: [11, 15] }, apartment: { w: [22, 34], d: [14, 19] },
  office: { w: [24, 38], d: [20, 26] }, tower: { w: [26, 34], d: [24, 30] }, shop: { w: [12, 22], d: [12, 18] },
  supermarket: { w: [38, 50], d: [34, 36] }, warehouse: { w: [34, 58], d: [26, 36] }, factory: { w: [40, 58], d: [28, 38] },
  fuel: { w: [26, 32], d: [22, 26] }, parking: { w: [24, 40], d: [18, 26] }, yard: { w: [30, 46], d: [24, 32] }, empty: { w: [14, 30], d: [14, 22] },
  garage: { w: [30, 42], d: [22, 28] },
}

function pickKind(zone: Zone, r: number): LotKind {
  switch (zone) {
    case 'dense': return r < 0.45 ? 'office' : r < 0.62 ? 'tower' : r < 0.86 ? 'apartment' : 'shop'
    case 'commercial': return r < 0.3 ? 'shop' : r < 0.52 ? 'office' : r < 0.66 ? 'supermarket' : r < 0.8 ? 'apartment' : r < 0.88 ? 'fuel' : 'parking'
    case 'residential': return r < 0.5 ? 'house' : r < 0.72 ? 'house2' : r < 0.94 ? 'apartment' : 'shop'
    case 'suburban': return r < 0.55 ? 'house' : r < 0.77 ? 'house2' : 'empty'
    case 'industrial': return r < 0.5 ? 'warehouse' : r < 0.75 ? 'factory' : 'yard'
    default: return 'empty'
  }
}

function floorsFor(kind: LotKind, zone: Zone, r: number): number {
  switch (kind) {
    case 'house': return 1 + (r < 0.3 ? 1 : 0)
    case 'house2': return 2
    case 'apartment': return zone === 'dense' ? 6 + Math.floor(r * 6) : 4 + Math.floor(r * 4)
    case 'office': return zone === 'dense' ? 7 + Math.floor(r * 12) : 3 + Math.floor(r * 5)
    case 'tower': return 20 + Math.floor(r * 18)
    case 'shop': return 1 + (r < 0.4 ? 1 : 0)
    case 'supermarket': case 'fuel': return 1
    case 'warehouse': return 1
    case 'factory': return 1
    case 'garage': return 5
    default: return 1
  }
}
function heightFor(kind: LotKind, floors: number, r: number): number {
  switch (kind) {
    case 'warehouse': return 8 + r * 4
    case 'factory': return 10 + r * 5
    case 'supermarket': return 7 + r * 1.5
    case 'shop': return floors * 3.6 + 0.6
    case 'fuel': return 5
    case 'office': case 'tower': return floors * 3.5
    case 'garage': return floors * 3.1
    case 'mall': return 16
    case 'stadium': return 18
    case 'house': case 'house2': return floors * 3 + 2.4
    default: return floors * FLOOR_H
  }
}

interface Side { seg: Seg; n: [number, number]; margin: number; present: boolean }

export function getBlock(bi: number, bj: number): BlockData {
  const key = `${bi}|${bj}`
  const hit = blockCache.get(key)
  if (hit) return hit
  const b = genBlock(bi, bj)
  if (blockCache.size > 500) blockCache.clear()
  blockCache.set(key, b)
  return b
}

function genBlock(bi: number, bj: number): BlockData {
  const X0 = linePos(0, bi), X1 = linePos(0, bi + 1), Z0 = linePos(1, bj), Z1 = linePos(1, bj + 1)
  const zone = zoneOf(bi, bj)
  const st = stream(bi, bj, 60)
  const segW = segment(0, bi, bj), segE = segment(0, bi + 1, bj), segS = segment(1, bj, bi), segN = segment(1, bj + 1, bi)
  const mk = (seg: Seg, n: [number, number], towardAmp: number): Side => ({
    seg, n, present: seg.state !== 'absent',
    margin: SPEC[seg.cls].w / 2 + SPEC[seg.cls].sw + 2.6 + Math.max(0, towardAmp) * 0.9,
  })
  const sW = mk(segW, [-1, 0], segW.bendAmp), sE = mk(segE, [1, 0], -segE.bendAmp), sS = mk(segS, [0, -1], segS.bendAmp), sN = mk(segN, [0, 1], -segN.bendAmp)
  // aylana (roundabout) burchaklarda blokga kirib keladi — qo'shimcha chekinish
  const rbPad = (i: number, j: number) => (crossing(i, j).roundabout ? 0 : 0)
  void rbPad
  const xa = X0 + sW.margin, xb = X1 - sE.margin, za = Z0 + sS.margin, zb = Z1 - sN.margin
  const lots: Lot[] = []
  const out: BlockData = { bi, bj, zone, x0: xa, x1: xb, z0: za, z1: zb, lots }
  if (xb - xa < 24 || zb - za < 24) return out

  const rowDepth = (zn: Zone): number => (zn === 'dense' ? 26 + st() * 6 : zn === 'commercial' ? 22 + st() * 12 : zn === 'residential' ? 15 + st() * 6 : zn === 'suburban' ? 15 + st() * 6 : zn === 'industrial' ? 30 + st() * 8 : 12)
  const rdW = sW.present ? rowDepth(zone) : 0, rdE = sE.present ? rowDepth(zone) : 0, rdS = sS.present ? rowDepth(zone) : 0, rdN = sN.present ? rowDepth(zone) : 0

  const clear = (l: Lot): boolean => {
    const hx = l.wx / 2, hz = l.wz / 2
    const pts: Array<[number, number]> = [[l.x, l.z], [l.x - hx, l.z - hz], [l.x + hx, l.z - hz], [l.x - hx, l.z + hz], [l.x + hx, l.z + hz], [l.x, l.z - hz], [l.x, l.z + hz], [l.x - hx, l.z], [l.x + hx, l.z]]
    for (const [px, pz] of pts) { const q = nearestRoad(px, pz); if (q && q.edge < q.sw + 1.2) return false }
    return true
  }
  const push = (l: Lot) => { if (l.wx >= 6 && l.wz >= 6 && clear(l)) lots.push(l) }

  /** qator: front — old tekislik koordinatasi, [a0,a1] — yo'l bo'ylab oraliq */
  const fillRow = (side: 'W' | 'E' | 'S' | 'N', a0: number, a1: number, front: number, rd: number, sd: Side) => {
    if (!sd.present || rd <= 0 || a1 - a0 < 8) return
    const yaw = Math.atan2(sd.n[0], sd.n[1])
    const horiz = side === 'S' || side === 'N' // yo'l X bo'ylab
    const dir = (side === 'W' || side === 'S') ? 1 : -1 // blok ichiga yo'nalish
    const place = (kind: LotKind, aC: number, w: number, d: number, extra: Partial<Lot> = {}) => {
      const cF = front + dir * d / 2
      const x = horiz ? aC : cF, z = horiz ? cF : aC
      const wx = horiz ? w : d, wz = horiz ? d : w
      const fl = floorsFor(kind, zone, st())
      push({ kind, x, z, wx, wz, w, d, yaw, floors: fl, h: heightFor(kind, fl, st()), zone, seed: Math.floor(st() * 1e9), hue: st(), ...extra })
    }
    // kirish yo'llari (driveway)
    const sideSign = (side === 'W' || side === 'S') ? 1 : -1
    const drives = drivewaysOf(sd.seg).filter((d) => d.side === sideSign).map((d) => [d.s - d.w / 2 - 5, d.s + d.w / 2 + 5] as [number, number]).filter(([p, q]) => q > a0 && p < a1).sort((a, b) => a[0] - b[0])
    const spans: Array<[number, number, boolean]> = []
    let cur = a0
    for (const [p, q] of drives) { if (p > cur + 6) spans.push([cur, p, false]); spans.push([Math.max(p, a0), Math.min(q, a1), true]); cur = q }
    if (a1 > cur + 6) spans.push([cur, a1, false])
    for (const [p, q, isDrive] of spans) {
      if (isDrive) { place('parking', (p + q) / 2, q - p, Math.min(rd, 20)); continue }
      let pos = p + 1.5
      let guard = 0
      while (pos < q - 6 && guard++ < 40) {
        let kind = pickKind(zone, st())
        if (zone === 'park') kind = 'empty'
        const sp = KS[kind] ?? KS.empty
        let w = sp.w[0] + st() * (sp.w[1] - sp.w[0])
        if (pos + w > q) w = q - pos
        if (w < 9) break
        if ((kind === 'tower' || kind === 'office') && w < 20) kind = 'shop'
        if ((kind === 'supermarket' || kind === 'warehouse' || kind === 'factory') && w < 30) kind = zone === 'industrial' ? 'yard' : 'shop'
        let d = Math.min(rd, KS[kind].d[0] + st() * (KS[kind].d[1] - KS[kind].d[0]))
        const extra: Partial<Lot> = {}
        if (kind === 'supermarket') { d = Math.min(rd, 36); extra.lotDepth = Math.max(10, d - 17) }
        place(kind, pos + w / 2, w - (kind === 'house' || kind === 'house2' ? 3 + st() * 4 : 1.5), d, extra)
        pos += w + 1
      }
    }
  }
  // W/E qatorlar (z bo'ylab), S/N qatorlar (x bo'ylab). S/N to'liq uzunlikda, W/E ular orasida
  fillRow('S', xa, xb, za, rdS, sS)
  fillRow('N', xa, xb, zb, rdN, sN)
  const wz0 = za + (sS.present ? rdS : 0), wz1 = zb - (sN.present ? rdN : 0)
  fillRow('W', wz0, wz1, xa, rdW, sW)
  fillRow('E', wz0, wz1, xb, rdE, sE)

  // markaz (core)
  const cx0 = xa + (sW.present ? rdW : 0) + 2.5, cx1 = xb - (sE.present ? rdE : 0) - 2.5, cz0 = wz0 + 2.5, cz1 = wz1 - 2.5
  const cw = cx1 - cx0, cd = cz1 - cz0
  if (cw >= 20 && cd >= 20) {
    const cx = (cx0 + cx1) / 2, cz = (cz0 + cz1) / 2
    const lm = rnd(bi, bj, 22) < 0.045 && zone !== 'industrial'
    const r = rnd(bi, bj, 23)
    const core = (kind: LotKind, w: number, d: number, extra: Partial<Lot> = {}) => {
      const ww = Math.min(w, cw - 2), dd = Math.min(d, cd - 2), fl = floorsFor(kind, zone, st())
      push({ kind, x: cx, z: cz, wx: ww, wz: dd, w: ww, d: dd, yaw: rnd(bi, bj, 24) < 0.5 ? 0 : Math.PI / 2, floors: fl, h: heightFor(kind, fl, st()), zone, seed: Math.floor(st() * 1e9), hue: st(), ...extra })
    }
    if (lm) {
      if (r < 0.3 && cw >= 62 && cd >= 52) core('mall', Math.min(cw - 4, 90), Math.min(cd - 4, 70), { landmark: true })
      else if (r < 0.5 && cw >= 70 && cd >= 70) core('stadium', Math.min(cw - 4, 100), Math.min(cd - 4, 84), { landmark: true })
      else if (r < 0.75) core('tower', Math.min(30, cw - 4), Math.min(30, cd - 4), { landmark: true, floors: 44, h: 44 * 3.6 })
      else if (cw >= 40 && cd >= 36) core('garage', Math.min(cw - 4, 46), Math.min(cd - 4, 36), { landmark: true })
      else core('tower', Math.min(26, cw - 4), Math.min(26, cd - 4), { landmark: true, floors: 36, h: 36 * 3.6 })
    } else if (zone === 'park') {
      push({ kind: 'park', x: cx, z: cz, wx: cw, wz: cd, w: cw, d: cd, yaw: 0, floors: 0, h: 0, zone, seed: Math.floor(st() * 1e9), hue: st(), poly: parkPoly(bi, bj, cx, cz, cw, cd) })
    } else if (zone === 'residential' || zone === 'suburban') {
      if (r < 0.4) push({ kind: 'park', x: cx, z: cz, wx: cw, wz: cd, w: cw, d: cd, yaw: 0, floors: 0, h: 0, zone, seed: Math.floor(st() * 1e9), hue: st(), poly: parkPoly(bi, bj, cx, cz, cw, cd) })
      else if (r < 0.62) core('apartment', Math.min(cw - 6, 36), Math.min(cd - 6, 22))
      else core('empty', cw, cd)
    } else if (zone === 'commercial') {
      if (r < 0.35) core('parking', Math.min(cw, 56), Math.min(cd, 40))
      else if (r < 0.65) core('office', Math.min(cw - 8, 40), Math.min(cd - 8, 30))
      else if (r < 0.8) push({ kind: 'park', x: cx, z: cz, wx: cw, wz: cd, w: cw, d: cd, yaw: 0, floors: 0, h: 0, zone, seed: Math.floor(st() * 1e9), hue: st(), poly: parkPoly(bi, bj, cx, cz, cw, cd) })
      else core('supermarket', Math.min(cw - 6, 46), Math.min(cd - 6, 34), { lotDepth: 12 })
    } else if (zone === 'dense') {
      if (r < 0.45) core('tower', Math.min(cw - 8, 32), Math.min(cd - 8, 28))
      else if (r < 0.75) core('office', Math.min(cw - 8, 40), Math.min(cd - 8, 30))
      else core('parking', Math.min(cw, 44), Math.min(cd, 34))
    } else { // industrial
      if (r < 0.5) core('warehouse', Math.min(cw - 6, 64), Math.min(cd - 6, 38))
      else if (r < 0.8) core('factory', Math.min(cw - 6, 58), Math.min(cd - 6, 40))
      else core('yard', cw - 4, cd - 4)
    }
  }
  return out
}

function parkPoly(bi: number, bj: number, cx: number, cz: number, cw: number, cd: number): Array<[number, number]> {
  const N = 16, pts: Array<[number, number]> = []
  const rx = cw / 2 * 0.96, rz = cd / 2 * 0.96, ph = rnd(bi, bj, 70) * 6.28
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2
    const n = 0.8 + 0.2 * Math.sin(a * 3 + ph) * Math.cos(a * 2 - ph) + (rnd(bi, bj, 71, k) - 0.5) * 0.12
    pts.push([cx + Math.cos(a) * rx * n, cz + Math.sin(a) * rz * n])
  }
  return pts
}

/** (bi, bj) bloklar oralig'i berilgan to'rtburchakka tushadigan */
export function blocksInRect(x0: number, z0: number, x1: number, z1: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const SPACING = 150
  const iA = Math.floor(x0 / SPACING) - 1, iB = Math.ceil(x1 / SPACING) + 1, jA = Math.floor(z0 / SPACING) - 1, jB = Math.ceil(z1 / SPACING) + 1
  for (let i = iA; i <= iB; i++) for (let j = jA; j <= jB; j++) {
    if (linePos(0, i + 1) > x0 - 30 && linePos(0, i) < x1 + 30 && linePos(1, j + 1) > z0 - 30 && linePos(1, j) < z1 + 30) out.push([i, j])
  }
  return out
}
export { RB_R_OUT }
