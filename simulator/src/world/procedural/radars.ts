import { SPEC, nearestRoad, rightOf, segPoint, segmentsInRect, crossing, crossingsInRect, type Crossing, type Seg } from './cityPlan'
import { onSeedChange, rnd } from './seed'

/**
 * RADARLAR (tezlik o'lchagich) va svetofor kameralari. Hammasi koordinatadan deterministik hisoblanadi (hech narsa saqlanmaydi).
 * Jarima FAQAT radar/kamera qayd etganda yechiladi (RulesMonitor). Magistral va asosiy ko'chalarda ko'proq, turar-joyda kam.
 */
export interface Radar { id: string; x: number; z: number; tx: number; tz: number; s: number; segKey: string; limit: number; side: 1 | -1 }

const cache = new Map<string, Radar[]>()
onSeedChange(() => cache.clear())
const PROB: Record<string, number> = { highway: 1, main: 0.85, secondary: 0.5, residential: 0.12 }

export function radarsOfSeg(seg: Seg): Radar[] {
  const key = `${seg.a}|${seg.i}|${seg.j}`
  const hit = cache.get(key); if (hit) return hit
  const out: Radar[] = []
  const len = seg.p1 - seg.p0
  if (seg.state === 'full' && len > 170) {
    const n = seg.cls === 'highway' && len > 330 ? 2 : 1
    for (let k = 0; k < n; k++) {
      if (rnd(seg.a * 31 + seg.i, seg.j, 90 + k) >= PROB[seg.cls]) continue
      const lo = seg.p0 + 62 + (len - 124) * (k / n), s = lo + rnd(seg.i, seg.j * 7 + seg.a, 91 + k) * ((len - 124) / n)
      const p = segPoint(seg, s), [rx, rz] = rightOf(p.tx, p.tz), side: 1 | -1 = rnd(seg.i, seg.j, 92 + k) < 0.5 ? 1 : -1, off = side * (seg.w / 2 + 1.6)
      out.push({ id: `${key}#${k}`, x: p.x + rx * off, z: p.z + rz * off, tx: p.tx, tz: p.tz, s, segKey: key, limit: SPEC[seg.cls].limit, side })
    }
  }
  if (cache.size > 4000) cache.clear()
  cache.set(key, out)
  return out
}

export function radarsInRect(x0: number, z0: number, x1: number, z1: number): Radar[] {
  const out: Radar[] = []
  for (const seg of segmentsInRect(x0, z0, x1, z1, 0)) for (const r of radarsOfSeg(seg)) if (r.x >= x0 && r.x <= x1 && r.z >= z0 && r.z <= z1) out.push(r)
  return out
}

/** svetofor chorrahasida qizil chiroq kamerasi bormi */
export const crossingHasCamera = (c: Pick<Crossing, 'i' | 'j' | 'ctrl'>) => c.ctrl === 'lights' && rnd(c.i, c.j, 77) > 0.35
export function camerasInRect(x0: number, z0: number, x1: number, z1: number): Array<{ x: number; z: number; id: string }> {
  const out: Array<{ x: number; z: number; id: string }> = []
  for (const c of crossingsInRect(x0, z0, x1, z1)) if (crossingHasCamera(c)) out.push({ x: c.x + c.w0 / 2 + 2.2, z: c.z + c.w1 / 2 + 2.2, id: `c${c.i}|${c.j}` })
  return out
}

/** mashina radar zonasidan o'tyaptimi: radarni qaytaradi (chaqiruvchi tezlik va sovitishni tekshiradi) */
export function radarUnder(x: number, z: number): Radar | null {
  const q = nearestRoad(x, z)
  if (!q || q.kind !== 'seg' || !q.seg || q.edge > 0) return null
  const sc = q.seg.a === 0 ? z : x
  for (const r of radarsOfSeg(q.seg)) if (Math.abs(sc - r.s) < 5.5) return r
  return null
}

/** oldinda (yo'nalish bo'yicha) eng yaqin radargacha masofa, m (0 = maxD ichida yo'q) */
export function radarAhead(x: number, z: number, fx: number, fz: number, maxD = 130): number {
  let best = 0
  for (const r of radarsInRect(x - maxD, z - maxD, x + maxD, z + maxD)) {
    const dx = r.x - x, dz = r.z - z, d = Math.hypot(dx, dz)
    if (d > maxD || d < 6) continue
    if ((dx * fx + dz * fz) / (d || 1) < 0.8) continue          // taxminan to'g'ri oldinda
    if (!best || d < best) best = d
  }
  return best
}
void crossing
