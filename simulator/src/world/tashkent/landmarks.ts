import { TK, nearestWay } from './tk'

/** Toshkentning taniqli joylari. lat/lon — ochiq manbalardan (Vikipediya/turizm saytlari) olingan taxminiy koordinatalar; qurilgan model esa soddalashtirilgan. */
export type LmKind = 'amirtemur' | 'tower' | 'minor' | 'arena' | 'city' | 'chorsu' | 'imam' | 'kukeldash' | 'mustaqil' | 'museum' | 'theatre' | 'circus' | 'palace' | 'church' | 'cathedral' | 'mosque' | 'hotel' | 'airport'
export interface LmDef { id: string; name: string; kind: LmKind; lat: number; lon: number; r: number; fixed?: boolean; junction?: [RegExp, RegExp] }
export interface Lm { id: string; name: string; kind: LmKind; x: number; z: number; r: number; yaw: number }

const LAT0 = 41.3112, LON0 = 69.2797
export const proj = (lat: number, lon: number): [number, number] => [(lon - LON0) * 111320 * Math.cos((LAT0 * Math.PI) / 180), -(lat - LAT0) * 110574]

export const LM_DEFS: LmDef[] = [
  { id: 'amirtemur', name: 'Amir Temur xiyoboni', kind: 'amirtemur', lat: 41.3112, lon: 69.2797, r: 26, fixed: true },
  { id: 'tower', name: 'Toshkent teleminorasi', kind: 'tower', lat: 41.3456, lon: 69.2847, r: 22 },
  { id: 'minor', name: 'Minor masjidi', kind: 'minor', lat: 41.3323, lon: 69.2662, r: 24 },
  { id: 'arena', name: 'Humo Arena', kind: 'arena', lat: 41.30778, lon: 69.25167, r: 48 },
  { id: 'city', name: 'Tashkent City', kind: 'city', lat: 41.31667, lon: 69.24861, r: 70 },
  { id: 'chorsu', name: 'Chorsu bozori', kind: 'chorsu', lat: 41.3262, lon: 69.2340, r: 42 },
  { id: 'imam', name: 'Hazrati Imom majmuasi', kind: 'imam', lat: 41.3375, lon: 69.2401, r: 38 },
  { id: 'kukeldash', name: 'Ko\'kaldosh madrasasi', kind: 'kukeldash', lat: 41.3233, lon: 69.2362, r: 22 },
  { id: 'mustaqil', name: 'Mustaqillik maydoni', kind: 'mustaqil', lat: 41.31513, lon: 69.26718, r: 40, fixed: true },
  { id: 'amtmuseum', name: 'Amir Temur muzeyi', kind: 'museum', lat: 41.3139, lon: 69.2790, r: 24 },
  { id: 'navoi', name: 'Navoiy teatri', kind: 'theatre', lat: 41.3105, lon: 69.2632, r: 32 },
  { id: 'circus', name: 'Toshkent davlat sirki', kind: 'circus', lat: 41.3256, lon: 69.2445, r: 44, junction: [/Navoi|Навои/i, /Furqat|Фурк/i] },
  { id: 'friendship', name: 'Xalqlar do\'stligi saroyi', kind: 'palace', lat: 41.3262, lon: 69.2430, r: 40 },
  { id: 'nevsky', name: 'Aleksandr Nevskiy sobori', kind: 'church', lat: 41.29094, lon: 69.27869, r: 18 },
  { id: 'heart', name: 'Muqaddas Yurak sobori', kind: 'cathedral', lat: 41.3056, lon: 69.2959, r: 18 },
  { id: 'tillya', name: 'Tillya Shayx masjidi', kind: 'mosque', lat: 41.32778, lon: 69.22398, r: 24 },
  { id: 'barak', name: 'Baroqxon madrasasi', kind: 'mosque', lat: 41.3368, lon: 69.2389, r: 22 },
  { id: 'juma', name: 'Juma masjidi', kind: 'mosque', lat: 41.3235, lon: 69.2372, r: 22 },
  { id: 'uzbekistan', name: 'O\'zbekiston mehmonxonasi', kind: 'hotel', lat: 41.3125, lon: 69.2830, r: 40 },
  { id: 'airport', name: 'Toshkent xalqaro aeroporti', kind: 'airport', lat: 41.2613, lon: 69.2820, r: 90 },
]

export const LM: Lm[] = []

function junction(a: RegExp, b: RegExp): [number, number] | null {
  const A = TK.ways.filter((w) => a.test(w.name)), B = TK.ways.filter((w) => b.test(w.name))
  let best: [number, number] | null = null, bd = 1e12
  for (const wa of A) for (let i = 0; i < wa.pts.length / 2; i++) for (const wb of B) for (let j = 0; j < wb.pts.length / 2; j++) {
    const d = (wa.pts[i * 2] - wb.pts[j * 2]) ** 2 + (wa.pts[i * 2 + 1] - wb.pts[j * 2 + 1]) ** 2
    if (d < bd && d < 3000 * 3000) { bd = d; best = [(wa.pts[i * 2] + wb.pts[j * 2]) / 2, (wa.pts[i * 2 + 1] + wb.pts[j * 2 + 1]) / 2] }
  }
  return best
}

/** yo'lga tushib qolmasligi uchun: r radiusli bo'sh joy topiladi (yo'ldan uzoqlashtirib) */
function clearSpot(x: number, z: number, r: number): [number, number, number] {
  for (let rad = 0; rad <= 260; rad += 10) for (let a = 0; a < 6.28; a += 0.5) {
    const px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad, h = nearestWay(px, pz, r + 24)
    if (!h || h.dist > h.way.w / 2 + r * 0.9) {
      // yo'nalish: eng yaqin yo'lga parallel
      return [px, pz, h ? Math.atan2(h.tx, h.tz) : 0]
    }
    if (rad === 0) break
  }
  return [x, z, 0]
}

export function placeLandmarks() {
  if (LM.length) return
  for (const d of LM_DEFS) {
    let [x, z] = proj(d.lat, d.lon)
    if (d.junction) { const j = junction(d.junction[0], d.junction[1]); if (j) { x = j[0]; z = j[1] } }
    let yaw = 0
    if (d.fixed) { const h = nearestWay(x, z, 60); yaw = h ? Math.atan2(h.tx, h.tz) : 0 }
    else { const c = clearSpot(x, z, d.r * 0.7); x = c[0]; z = c[1]; yaw = c[2] }
    LM.push({ id: d.id, name: d.name, kind: d.kind, x, z, r: d.r, yaw })
  }
}
