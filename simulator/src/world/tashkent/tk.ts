/**
 * TOSHKENT: haqiqiy yo'l ma'lumoti (OpenStreetMap, public/data/tashkent.json) asosida dunyo.
 * Koordinatalar metrda: x = sharqqa, z = janubga; (0,0) = Amir Temur xiyoboni. Hamma so'rov (eng yaqin yo'l, radar, yer turi) shu yerda.
 */
import type { Respawn, Surface } from '../procedural/cityPlan'

export interface TkWay { cls: number; link: boolean; oneway: boolean; limit: number; name: string; w: number; pts: Float32Array; len: number; cum: Float32Array; xs: Array<{ s: number; ci: number }> }
export interface TkCross { x: number; z: number; a: number; b: number; sa: number; sb: number; ta: [number, number]; tb: [number, number]; lit: boolean; cam: boolean; off: number; ha: number; hb: number }
export interface TkRadar { id: string; x: number; z: number; cx: number; cz: number; tx: number; tz: number; limit: number; name: string }
export interface TkHit { way: TkWay; wi: number; dist: number; cx: number; cz: number; tx: number; tz: number; along: number }

export const TK: { ready: boolean; ways: TkWay[]; radars: TkRadar[]; cross: TkCross[]; loading: Promise<void> | null; error: string } = { ready: false, ways: [], radars: [], cross: [], loading: null, error: '' }
const crGrid = new Map<number, number[]>()
const WIDTH = [14, 12, 9.5, 8, 6.2], LIMIT = [80, 70, 60, 60, 40]
const CELL = 80
const segGrid = new Map<number, number[]>()      // cell -> [wi, si, wi, si ...]
const radGrid = new Map<number, number[]>()      // cell -> radar indexlari
const ck = (i: number, j: number) => (i + 5000) * 10000 + (j + 5000)
const hash = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s) }

export function loadTashkent(): Promise<void> {
  if (TK.ready) return Promise.resolve()
  if (TK.loading) return TK.loading
  const base = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
  TK.loading = fetch(base + 'data/tashkent.json').then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() }).then((d: { names: string[]; ways: Array<[number, number, number, number[]]> }) => {
    for (const [code, sp, ni, arr] of d.ways) {
      const cls = code & 7, link = !!(code & 8), oneway = !!(code & 16), n = arr.length / 2
      const pts = new Float32Array(n * 2); let x = arr[0], z = arr[1]; pts[0] = x / 10; pts[1] = z / 10
      let len = 0; const cum = new Float32Array(n)
      for (let k = 1; k < n; k++) { x += arr[k * 2]; z += arr[k * 2 + 1]; pts[k * 2] = x / 10; pts[k * 2 + 1] = z / 10; len += Math.hypot(pts[k * 2] - pts[k * 2 - 2], pts[k * 2 + 1] - pts[k * 2 - 1]); cum[k] = len }
      const limit = link ? 40 : sp >= 20 && sp <= 90 ? sp : LIMIT[cls]
      TK.ways.push({ cls, link, oneway, limit, name: d.names[ni] || '', w: link ? WIDTH[cls] * 0.7 : WIDTH[cls], pts, len, cum, xs: [] })
    }
    TK.ways.forEach((w, wi) => {
      for (let k = 0; k < w.pts.length / 2 - 1; k++) {
        const x0 = w.pts[k * 2], z0 = w.pts[k * 2 + 1], x1 = w.pts[k * 2 + 2], z1 = w.pts[k * 2 + 3]
        const i0 = Math.floor(Math.min(x0, x1) / CELL), i1 = Math.floor(Math.max(x0, x1) / CELL), j0 = Math.floor(Math.min(z0, z1) / CELL), j1 = Math.floor(Math.max(z0, z1) / CELL)
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = ck(i, j); let a = segGrid.get(key); if (!a) segGrid.set(key, (a = [])); a.push(wi, k) }
      }
    })
    buildCrossings()
    // radarlar: odatda ~har 2 km; "qaynoq" joylarda har ~250 m (2–3 ta ketma-ket); chetda / sust joylarda 5 km gacha yo'q
    TK.ways.forEach((w, wi) => {
      if (w.cls > 2 || w.link || w.len < 140) return
      let s = 60 + hash(wi, 5) * 900
      while (s < w.len - 40) {
        let acc = 0, k = 0
        while (k < w.pts.length / 2 - 2 && acc + (w.cum[k + 1] - w.cum[k]) < s) { acc += w.cum[k + 1] - w.cum[k]; k++ }
        const x0 = w.pts[k * 2], z0 = w.pts[k * 2 + 1], x1 = w.pts[k * 2 + 2], z1 = w.pts[k * 2 + 3], l = Math.hypot(x1 - x0, z1 - z0) || 1, t = (s - acc) / l
        const cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t, tx = (x1 - x0) / l, tz = (z1 - z0) / l, dc = Math.hypot(cx, cz)
        const zone = hash(Math.floor(cx / 700), Math.floor(cz / 700) + 17)
        const dense = zone < 0.14 && dc < 9500, sparse = dc > 9000 || zone > 0.86
        const side = hash(wi, Math.floor(s)) < 0.5 ? 1 : -1, off = side * (w.w / 2 + 1.6)
        const idx = TK.radars.length
        TK.radars.push({ id: `t${wi}#${Math.floor(s)}`, x: cx + -tz * off, z: cz + tx * off, cx, cz, tx, tz, limit: w.limit, name: w.name })
        const key = ck(Math.floor(cx / CELL), Math.floor(cz / CELL)); let a2 = radGrid.get(key); if (!a2) radGrid.set(key, (a2 = [])); a2.push(idx)
        s += dense ? 200 + hash(wi, s) * 90 : sparse ? 3800 + hash(wi, s + 3) * 1600 : 1700 + hash(wi, s + 1) * 800
      }
    })
    TK.ready = true
  }).catch((e) => { TK.error = String(e); TK.loading = null; throw e })
  return TK.loading
}

/** (x,z) ga eng yaqin yo'l (R metrgacha) */
export function nearestWay(x: number, z: number, R = 40): TkHit | null {
  if (!TK.ready) return null
  const i0 = Math.floor((x - R) / CELL), i1 = Math.floor((x + R) / CELL), j0 = Math.floor((z - R) / CELL), j1 = Math.floor((z + R) / CELL)
  let best: TkHit | null = null, bd = R * R
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const a = segGrid.get(ck(i, j)); if (!a) continue
    for (let q = 0; q < a.length; q += 2) {
      const w = TK.ways[a[q]], k = a[q + 1], x0 = w.pts[k * 2], z0 = w.pts[k * 2 + 1], dx = w.pts[k * 2 + 2] - x0, dz = w.pts[k * 2 + 3] - z0
      const l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2)), px = x0 + dx * t, pz = z0 + dz * t, d2 = (x - px) ** 2 + (z - pz) ** 2
      if (d2 < bd) { bd = d2; const l = Math.sqrt(l2); best = { way: w, wi: a[q], dist: Math.sqrt(d2), cx: px, cz: pz, tx: dx / l, tz: dz / l, along: t * l } }
    }
  }
  return best
}

export function surfaceAtTk(x: number, z: number): Surface {
  const h = nearestWay(x, z, 22); if (!h) return 'grass'
  const hw = h.way.w / 2
  return h.dist <= hw ? 'road' : h.dist <= hw + 3 ? 'sidewalk' : 'grass'
}
export function limitAtTk(x: number, z: number): number { const h = nearestWay(x, z, 14); return h && h.dist <= h.way.w / 2 + 1 ? h.way.limit : 0 }

const rightOf = (tx: number, tz: number): [number, number] => [-tz, tx]
const lane = (h: TkHit, dir: 1 | -1): Respawn => { const hx = h.tx * dir, hz = h.tz * dir, [rx, rz] = rightOf(hx, hz), off = h.way.oneway ? 0 : h.way.w / 4; return { x: h.cx + rx * off, z: h.cz + rz * off, yaw: Math.atan2(hx, hz) } }
export function startTk(): Respawn {
  // markazga eng yaqin asosiy (primary/trunk) yo'l
  for (let R = 60; R <= 900; R += 120) {
    const h = nearestWay(0, 0, R)
    if (h && h.way.cls <= 2 && !h.way.link) return lane(h, 1)
  }
  return { x: 0, z: 0, yaw: 0 }
}
export function respawnTk(x: number, z: number, hintYaw?: number): Respawn {
  const h = nearestWay(x, z, 400); if (!h) return startTk()
  let dir: 1 | -1 = 1
  if (hintYaw !== undefined && h.tx * Math.sin(hintYaw) + h.tz * Math.cos(hintYaw) < 0) dir = -1
  return lane(h, dir)
}

/* ---- radarlar ---- */
export function radarsInRectTk(x0: number, z0: number, x1: number, z1: number): TkRadar[] {
  const out: TkRadar[] = []
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
    const a = radGrid.get(ck(i, j)); if (a) for (const idx of a) { const r = TK.radars[idx]; if (r.x >= x0 && r.x <= x1 && r.z >= z0 && r.z <= z1) out.push(r) }
  }
  return out
}
export function radarUnderTk(x: number, z: number): TkRadar | null {
  for (const r of radarsInRectTk(x - 9, z - 9, x + 9, z + 9)) {
    const dx = x - r.cx, dz = z - r.cz
    if (Math.abs(dx * r.tx + dz * r.tz) < 5.5 && Math.abs(dx * -r.tz + dz * r.tx) < 8) return r
  }
  return null
}
export function radarAheadTk(x: number, z: number, fx: number, fz: number, maxD = 130): number {
  let best = 0
  for (const r of radarsInRectTk(x - maxD, z - maxD, x + maxD, z + maxD)) {
    const dx = r.cx - x, dz = r.cz - z, d = Math.hypot(dx, dz)
    if (d > maxD || d < 6) continue
    if ((dx * fx + dz * fz) / (d || 1) < 0.8) continue
    if (!best || d < best) best = d
  }
  return best
}

export function waysInRect(x0: number, z0: number, x1: number, z1: number): TkWay[] {
  const s = new Set<number>()
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const a = segGrid.get(ck(i, j)); if (a) for (let q = 0; q < a.length; q += 2) s.add(a[q]) }
  return [...s].map((i) => TK.ways[i])
}


/* ---- chorrahalar (yo'llar kesishgan joylar) va svetoforlar ---- */
const segX = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): [number, number] | null => {
  const r = [bx - ax, bz - az], q = [dx - cx, dz - cz], den = r[0] * q[1] - r[1] * q[0]
  if (Math.abs(den) < 1e-6) return null
  const t = ((cx - ax) * q[1] - (cz - az) * q[0]) / den, u = ((cx - ax) * r[1] - (cz - az) * r[0]) / den
  const e = 0.03
  return t > -e && t < 1 + e && u > -e && u < 1 + e ? [t, u] : null
}
function buildCrossings() {
  const seen = new Set<string>()
  for (const [key, arr] of segGrid) {
    for (let p = 0; p < arr.length; p += 2) for (let q = p + 2; q < arr.length; q += 2) {
      const wa = arr[p], wb = arr[q]; if (wa === wb) continue
      const A = TK.ways[wa], B = TK.ways[wb]; if (A.cls > 3 || B.cls > 3) continue
      const ka = arr[p + 1], kb = arr[q + 1]
      const ax = A.pts[ka * 2], az = A.pts[ka * 2 + 1], bx = A.pts[ka * 2 + 2], bz = A.pts[ka * 2 + 3], cx = B.pts[kb * 2], cz = B.pts[kb * 2 + 1], dx = B.pts[kb * 2 + 2], dz = B.pts[kb * 2 + 3]
      const r = segX(ax, az, bx, bz, cx, cz, dx, dz); if (!r) continue
      const x = ax + (bx - ax) * r[0], z = az + (bz - az) * r[0]
      const id = `${Math.min(wa, wb)}|${Math.max(wa, wb)}|${Math.round(x / 22)}|${Math.round(z / 22)}`
      if (seen.has(id)) continue; seen.add(id)
      const la = Math.hypot(bx - ax, bz - az) || 1, lb = Math.hypot(dx - cx, dz - cz) || 1
      const i = TK.cross.length
      const lit = A.cls <= 2 && B.cls <= 2 && !A.link && !B.link
      TK.cross.push({ x, z, a: wa, b: wb, sa: A.cum[ka] + r[0] * la, sb: B.cum[kb] + r[1] * lb, ta: [(bx - ax) / la, (bz - az) / la], tb: [(dx - cx) / lb, (dz - cz) / lb], lit, cam: lit && hash(i, 77) < 0.75, off: hash(i, 3) * 64, ha: A.w / 2, hb: B.w / 2 })
      A.xs.push({ s: A.cum[ka] + r[0] * la, ci: i }); B.xs.push({ s: B.cum[kb] + r[1] * lb, ci: i })
      const k2 = ck(Math.floor(x / CELL), Math.floor(z / CELL)); let g = crGrid.get(k2); if (!g) crGrid.set(k2, (g = [])); g.push(i)
    }
  }
  for (const w of TK.ways) w.xs.sort((a, b) => a.s - b.s)
}
export function crossingsInRect(x0: number, z0: number, x1: number, z1: number): number[] {
  const out: number[] = []
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const g = crGrid.get(ck(i, j)); if (g) for (const c of g) { const q = TK.cross[c]; if (q.x >= x0 && q.x <= x1 && q.z >= z0 && q.z <= z1) out.push(c) } }
  return out
}
/** svetofor fazasi: 'a' yo'li uchun holat. Sikl 64 s: A yashil 0–27, sariq 27–30, hamma qizil 30–32, B yashil 32–59, sariq 59–62, qizil 62–64 */
export type Light = 'g' | 'y' | 'r'
export function lightFor(c: TkCross, roadIsA: boolean, tSec: number): Light {
  const t = (tSec + c.off) % 64
  const aState: Light = t < 27 ? 'g' : t < 30 ? 'y' : 'r', bState: Light = t < 32 ? 'r' : t < 59 ? 'g' : t < 62 ? 'y' : 'r'
  return roadIsA ? aState : bState
}
/** yo'l bo'yicha s masofadagi nuqta va yo'nalish */
export function wayPoint(w: TkWay, s: number): { x: number; z: number; tx: number; tz: number } {
  const n = w.pts.length / 2
  s = Math.max(0, Math.min(w.len, s))
  let lo = 0, hi = n - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (w.cum[m] <= s) lo = m; else hi = m }
  const x0 = w.pts[lo * 2], z0 = w.pts[lo * 2 + 1], x1 = w.pts[hi * 2], z1 = w.pts[hi * 2 + 1], l = Math.hypot(x1 - x0, z1 - z0) || 1, t = (s - w.cum[lo]) / l
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, tx: (x1 - x0) / l, tz: (z1 - z0) / l }
}
/** yo'l oxirida davom etuvchi yo'l (uchi 8 m ichida): [yangi yo'l, yo'nalish(+1/-1)] */
export function continuation(wi: number, atEnd: boolean): [number, 1 | -1] | null {
  const w = TK.ways[wi], n = w.pts.length / 2, x = atEnd ? w.pts[(n - 1) * 2] : w.pts[0], z = atEnd ? w.pts[(n - 1) * 2 + 1] : w.pts[1]
  const cand: Array<[number, 1 | -1]> = []
  for (const o of waysInRect(x - 9, z - 9, x + 9, z + 9)) {
    const oi = TK.ways.indexOf(o); if (oi === wi || o.cls > 3) continue
    const m = o.pts.length / 2
    if (Math.hypot(o.pts[0] - x, o.pts[1] - z) < 8 && !(o.oneway && false)) cand.push([oi, 1])
    else if (Math.hypot(o.pts[(m - 1) * 2] - x, o.pts[(m - 1) * 2 + 1] - z) < 8 && !o.oneway) cand.push([oi, -1])
  }
  if (!cand.length) return null
  return cand[Math.floor(Math.random() * cand.length)]
}

export const tkTime = () => performance.now() / 1000
