/**
 * TOSHKENT: haqiqiy yo'l ma'lumoti (OpenStreetMap, public/data/tashkent.json) asosida dunyo.
 * Koordinatalar metrda: x = sharqqa, z = janubga; (0,0) = Amir Temur xiyoboni. Hamma so'rov (eng yaqin yo'l, radar, yer turi) shu yerda.
 */
import type { Respawn, Surface } from '../procedural/cityPlan'

export interface TkWay { cls: number; link: boolean; oneway: boolean; limit: number; name: string; w: number; pts: Float32Array; len: number }
export interface TkRadar { id: string; x: number; z: number; cx: number; cz: number; tx: number; tz: number; limit: number; name: string }
export interface TkHit { way: TkWay; wi: number; dist: number; cx: number; cz: number; tx: number; tz: number; along: number }

export const TK: { ready: boolean; ways: TkWay[]; radars: TkRadar[]; loading: Promise<void> | null; error: string } = { ready: false, ways: [], radars: [], loading: null, error: '' }
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
      let len = 0
      for (let k = 1; k < n; k++) { x += arr[k * 2]; z += arr[k * 2 + 1]; pts[k * 2] = x / 10; pts[k * 2 + 1] = z / 10; len += Math.hypot(pts[k * 2] - pts[k * 2 - 2], pts[k * 2 + 1] - pts[k * 2 - 1]) }
      const limit = link ? 40 : sp >= 20 && sp <= 90 ? sp : LIMIT[cls]
      TK.ways.push({ cls, link, oneway, limit, name: d.names[ni] || '', w: link ? WIDTH[cls] * 0.7 : WIDTH[cls], pts, len })
    }
    TK.ways.forEach((w, wi) => {
      for (let k = 0; k < w.pts.length / 2 - 1; k++) {
        const x0 = w.pts[k * 2], z0 = w.pts[k * 2 + 1], x1 = w.pts[k * 2 + 2], z1 = w.pts[k * 2 + 3]
        const i0 = Math.floor(Math.min(x0, x1) / CELL), i1 = Math.floor(Math.max(x0, x1) / CELL), j0 = Math.floor(Math.min(z0, z1) / CELL), j1 = Math.floor(Math.max(z0, z1) / CELL)
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = ck(i, j); let a = segGrid.get(key); if (!a) segGrid.set(key, (a = [])); a.push(wi, k) }
      }
    })
    // radarlar: magistral/asosiy/ikkinchi darajali yo'llarda ~har 600-700 m ga bittadan (deterministik)
    TK.ways.forEach((w, wi) => {
      if (w.cls > 2 || w.link || w.len < 140) return
      const n = Math.max(1, Math.round(w.len / 650))
      for (let r = 0; r < n; r++) {
        if (hash(wi, r + 3) > (w.cls <= 1 ? 0.95 : 0.6)) continue
        const target = w.len * ((r + 0.25 + hash(wi, r + 9) * 0.5) / n)
        let acc = 0
        for (let k = 0; k < w.pts.length / 2 - 1; k++) {
          const x0 = w.pts[k * 2], z0 = w.pts[k * 2 + 1], x1 = w.pts[k * 2 + 2], z1 = w.pts[k * 2 + 3], l = Math.hypot(x1 - x0, z1 - z0)
          if (acc + l >= target && l > 1) {
            const t = (target - acc) / l, tx = (x1 - x0) / l, tz = (z1 - z0) / l, cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t
            const side = hash(wi, r + 17) < 0.5 ? 1 : -1, off = side * (w.w / 2 + 1.6)
            const idx = TK.radars.length
            TK.radars.push({ id: `t${wi}#${r}`, x: cx + -tz * off, z: cz + tx * off, cx, cz, tx, tz, limit: w.limit, name: w.name })
            const key = ck(Math.floor(cx / CELL), Math.floor(cz / CELL)); let a = radGrid.get(key); if (!a) radGrid.set(key, (a = [])); a.push(idx)
            break
          }
          acc += l
        }
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
