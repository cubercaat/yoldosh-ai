import type { VehicleConfig } from '../VehicleConfig'
import { curve, endClosure, stations, type Pt, type Sec } from './loft'

/**
 * Har bir kuzov turi uchun yon profil / reja / kesim ma'lumotlari.
 * t = 0 (orqa bamper) .. 1 (old bamper). Balandliklar metrda (yer = 0).
 * Bu — "kuzov loyihasi": mashinaning o'ziga xos siluetini belgilaydi (sedan, fastback, pikap, SUV, kabina-ustida yuk mashinasi).
 */
export type MatFn = (t: number, h01: number, top: number, side: number, y: number) => number
export const PAINT = 0, GLASS = 1

export interface Design {
  zr: number
  zf: number
  lowerSec: (z: number) => Sec
  lowerFlat?: boolean
  lowerMat?: MatFn
  lowerCaps?: [number, number]
  lowerShade: (h01: number) => number
  cabinSec?: (z: number) => Sec
  cabinZ?: [number, number]
  cabinExtra?: number[]
  cabinMat?: MatFn
  cabinCaps?: [number, number]
  /** boshqa funksiyalarga: detallarning balandliklari */
  yHead: number
  yTail: number
  yGrille: number
  yBelt: number
  bTpos?: number
  zones: { sg: [number, number]; wf: [number, number]; rg: [number, number] } // t oralig'i
  roofY: number
  capF: number
  capR: number
}

interface LowerP { fw: Pt[]; yb: Pt[]; deck: Pt[]; nx: number; nyTop: number; nyBot: number; tumble: number; capR: number; capF: number; linear?: boolean; archK?: number; p?: number }

function lowerSecFn(cfg: VehicleConfig, zr: number, zf: number, P: LowerP) {
  const Lt = zf - zr, fw = curve(P.fw), ybC = curve(P.yb), deckC = curve(P.deck, P.linear)
  const R = cfg.wheelRadius, W2 = cfg.dimensions.width / 2
  const wz = [cfg.wheels.FL.position[2], cfg.wheels.RL.position[2]]
  const rw = R * 1.12 + 0.04
  return (z: number): Sec => {
    const t = (z - zr) / Lt
    const cl = endClosure(z, zr, zf, P.capR, P.capF, P.p ?? 2.6)
    const hw0 = W2 * fw(t)
    let yb = ybC(t)
    for (const w of wz) { const dz = Math.abs(z - w); if (dz < rw) yb = Math.max(yb, R + Math.sqrt(rw * rw - dz * dz) * (P.archK ?? 1)) }
    const yt = Math.max(deckC(t), yb + 0.06)
    const ym = (yb + yt) / 2, hh = ((yt - yb) / 2) * Math.pow(cl, 0.65)
    return { yb: ym - hh, yt: ym + hh, hw: Math.max(0.001, hw0 * cl), hwTop: Math.max(0.001, hw0 * cl * P.tumble), nx: P.nx, nyTop: P.nyTop, nyBot: P.nyBot }
  }
}

interface CabinP { roof: Pt[]; base: number; top: number; nx: number; nyTop: number; linear?: boolean; embed?: number }
function cabinSecFn(zr: number, zf: number, lower: (z: number) => Sec, P: CabinP) {
  const Lt = zf - zr, roofC = curve(P.roof, P.linear)
  return (z: number): Sec => {
    const t = (z - zr) / Lt, ls = lower(z)
    const yTop = roofC(t), yBase = Math.min(ls.yt - (P.embed ?? 0.1), yTop - 0.02)
    const hw = Math.max(0.001, ls.hw * P.base), hwTop = Math.max(0.001, ls.hw * P.top)
    return { yb: yBase, yt: Math.max(yTop, yBase + 0.01), hw, hwTop, nx: P.nx, nyTop: P.nyTop, nyBot: P.nyTop }
  }
}

const inR = (t: number, r: [number, number]) => t >= r[0] && t <= r[1]
const smooth01 = (a: number, b: number, v: number) => { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x) }

function glassMat(zones: Design['zones'], bT: number, bHalf: number): MatFn {
  return (t, _h, top) => {
    if (inR(t, zones.wf)) return top > 0.1 ? GLASS : PAINT          // old oyna (A ustun — yon tomonda bo'yoq)
    if (inR(t, zones.rg)) return top > 0.1 ? GLASS : PAINT          // orqa oyna (C ustun)
    if (inR(t, zones.sg)) { if (Math.abs(t - bT) < bHalf) return PAINT; return top < 0.8 ? GLASS : PAINT } // eshik oynalari; tom — bo'yoq
    return PAINT
  }
}

/* ---------------------------------------------------------------- SEDAN / HATCH / SUV */
function carDesign(cfg: VehicleConfig, v: 'cobalt' | 'malibu' | 'hatch' | 'suv'): Design {
  const L = cfg.dimensions.length, zf = cfg.wheelBase / 2 + cfg.frontOverhang, zr = zf - L
  const H = cfg.dimensions.height
  let deck: Pt[], roof: Pt[], zones: Design['zones'], bT: number, yb: Pt[], fw: Pt[]
  const k = H / 1.5
  if (v === 'malibu') {
    deck = [[0, .83], [0.03, .95], [0.14, 1.0], [0.25, .99], [0.66, .975], [0.76, .96], [0.88, .93], [0.97, .85], [1, .77]]
    roof = [[0.22, .96], [0.255, 1.1], [0.32, 1.32], [0.40, 1.42], [0.52, 1.455], [0.60, 1.44], [0.66, 1.29], [0.725, .965]]
    zones = { rg: [0.22, 0.36], sg: [0.28, 0.655], wf: [0.595, 0.725] }; bT = 0.47
  } else if (v === 'hatch') {
    deck = [[0, .86], [0.03, 1.0], [0.10, 1.04], [0.62, 1.0], [0.72, .98], [0.88, .93], [0.97, .83], [1, .75]]
    roof = [[0.07, 1.04], [0.085, 1.22], [0.12, 1.45], [0.20, 1.52], [0.52, 1.55], [0.60, 1.52], [0.66, 1.34], [0.72, .985]]
    zones = { rg: [0.06, 0.15], sg: [0.10, 0.655], wf: [0.595, 0.72] }; bT = 0.40
  } else if (v === 'suv') {
    deck = [[0, 1.05], [0.02, 1.15], [0.10, 1.18], [0.66, 1.15], [0.78, 1.12], [0.92, 1.02], [1, .9]]
    roof = [[0.03, 1.15], [0.05, 1.5], [0.10, 1.74], [0.55, 1.78], [0.63, 1.72], [0.70, 1.42], [0.76, 1.15]]
    zones = { rg: [0.03, 0.10], sg: [0.07, 0.69], wf: [0.63, 0.76] }; bT = 0.44
  } else {
    deck = [[0, .80], [0.025, .92], [0.14, .975], [0.30, .97], [0.66, .965], [0.74, .95], [0.86, .915], [0.93, .83], [0.975, .72], [1, .6]]
    roof = [[0.28, .955], [0.30, 1.1], [0.36, 1.38], [0.43, 1.47], [0.54, 1.49], [0.60, 1.46], [0.655, 1.29], [0.715, .95]]
    zones = { rg: [0.28, 0.385], sg: [0.33, 0.635], wf: [0.595, 0.715] }; bT = 0.495
  }
  if (v !== 'suv') { deck = deck.map(([t, y]) => [t, y * (0.5 + 0.5 * k)] as Pt); roof = roof.map(([t, y]) => [t, y * k] as Pt) }
  yb = [[0, .38], [0.06, .27], [0.5, .19], [0.92, .21], [1, .29]]
  fw = [[0, .86], [0.1, .96], [0.5, 1.0], [0.9, .975], [1, .9]]
  if (v === 'suv') yb = [[0, .5], [0.06, .38], [0.5, .3], [0.92, .33], [1, .42]]
  const P: LowerP = { fw, yb, deck, nx: 4.8, nyTop: 5.4, nyBot: 8, tumble: 0.95, capR: 0.14, capF: 0.2, p: 3.4 }
  const lowerSec = lowerSecFn(cfg, zr, zf, P)
  const cabinSec = cabinSecFn(zr, zf, lowerSec, { roof, base: 0.93, top: 0.8, nx: 3.6, nyTop: 2.6 })
  const roofT0 = roof[0][0], roofT1 = roof[roof.length - 1][0]
  return {
    zr, zf, lowerSec, lowerShade: (h) => 0.16 + 0.84 * smooth01(0.0, 0.2, h),
    cabinSec, cabinZ: [zr + roofT0 * L, zr + roofT1 * L], cabinMat: glassMat(zones, bT, 0.011), cabinExtra: [zones.rg[1], zones.sg[0], zones.sg[1], zones.wf[0], bT - 0.012, bT + 0.012].map((t) => zr + t * L),
    yHead: 0.66, yTail: deck[0][1] * 0.98, yGrille: 0.52, yBelt: 0.9 * (0.5 + 0.5 * k), bTpos: zr + bT * L, zones,
    roofY: Math.max(...roof.map((p) => p[1])), capF: P.capF, capR: P.capR,
  }
}

/* ---------------------------------------------------------------- CYBERTRUCK */
function cyberDesign(cfg: VehicleConfig): Design {
  const L = cfg.dimensions.length, zf = cfg.wheelBase / 2 + cfg.frontOverhang, zr = zf - L, H = cfg.dimensions.height
  const deck: Pt[] = [[0, 1.42], [0.04, 1.46], [0.47, H - 0.01], [0.54, H], [0.965, 0.98], [1, 0.9]]
  const P: LowerP = {
    fw: [[0, .92], [0.2, 1], [0.55, 1], [0.97, .96], [1, .9]], yb: [[0, .5], [0.08, .4], [0.5, .36], [0.93, .38], [1, .44]],
    deck, nx: 14, nyTop: 12, nyBot: 12, tumble: 0.74, capR: 0.06, capF: 0.1, linear: true, archK: 1,
  }
  const lowerSec = lowerSecFn(cfg, zr, zf, P)
  const zones = { rg: [0, 0] as [number, number], sg: [0.36, 0.70] as [number, number], wf: [0.55, 0.965] as [number, number] }
  const lowerMat: MatFn = (t, h01, top) => {
    if (top > 0.2 && t > 0.545 && t < 0.955) return GLASS                    // uzun old oyna
    if (top > 0.2 && t > 0.40 && t < 0.545 && h01 > 0.9) return GLASS         // tom oynasi
    if (top <= 0.2 && t > 0.42 && t < 0.66 && h01 > 0.62 && h01 < 0.95) return GLASS // yon oyna
    return PAINT
  }
  return {
    zr, zf, lowerSec, lowerFlat: true, lowerMat, lowerCaps: [PAINT, PAINT], lowerShade: (h) => 0.2 + 0.8 * smooth01(0.0, 0.16, h),
    yHead: 0.93, yTail: 1.38, yGrille: 0.55, yBelt: 1.2, zones, roofY: H, capF: P.capF, capR: P.capR,
  }
}

/* ---------------------------------------------------------------- G-CLASS */
function gDesign(cfg: VehicleConfig): Design {
  const L = cfg.dimensions.length, zf = cfg.wheelBase / 2 + cfg.frontOverhang, zr = zf - L, H = cfg.dimensions.height
  const deck: Pt[] = [[0, 1.12], [0.03, 1.15], [0.70, 1.15], [0.82, 1.15], [0.975, 1.1], [1, 1.04]]
  const P: LowerP = {
    fw: [[0, .98], [0.2, 1], [0.8, 1], [1, .97]], yb: [[0, .56], [0.05, .44], [0.5, .42], [0.95, .46], [1, .52]],
    deck, nx: 8, nyTop: 7, nyBot: 9, tumble: 0.97, capR: 0.08, capF: 0.1, archK: 1,
  }
  const lowerSec = lowerSecFn(cfg, zr, zf, P)
  const roof: Pt[] = [[0.02, 1.13], [0.035, H - 0.06], [0.065, H], [0.60, H], [0.635, H - 0.06], [0.70, 1.16]]
  const cabinSec = cabinSecFn(zr, zf, lowerSec, { roof, base: 0.93, top: 0.88, nx: 8, nyTop: 7 })
  const zones = { rg: [0.0, 0.0] as [number, number], sg: [0.06, 0.65] as [number, number], wf: [0.6, 0.705] as [number, number] }
  return {
    zr, zf, lowerSec, lowerShade: (h) => 0.2 + 0.8 * smooth01(0.0, 0.2, h),
    cabinSec, cabinZ: [zr + 0.02 * L, zr + 0.705 * L], cabinMat: (t, h, top, side) => {
      if (inR(t, zones.wf)) return top > 0.1 ? GLASS : PAINT
      if (inR(t, zones.sg)) { if (Math.abs(t - 0.34) < 0.012) return PAINT; return top < 0.75 && h > 0.18 ? GLASS : PAINT }
      return PAINT
    }, cabinCaps: [PAINT, PAINT], cabinExtra: [zones.sg[0], zones.sg[1], 0.34 - 0.013, 0.34 + 0.013].map((t) => zr + t * L),
    yHead: 1.02, yTail: 1.1, yGrille: 0.88, yBelt: 1.12, zones, roofY: H, capF: P.capF, capR: P.capR,
  }
}

/* ---------------------------------------------------------------- ISUZU (kabina) */
function truckDesign(cfg: VehicleConfig): Design {
  const L = cfg.dimensions.length, zf = cfg.wheelBase / 2 + cfg.frontOverhang
  const zCabR = zf - 2.0, cabH = 2.55
  const R = cfg.wheelRadius, W2 = cfg.dimensions.width / 2
  const rw = R * 1.12 + 0.05
  const wzF = cfg.wheels.FL.position[2]
  const lowerSec = (z: number): Sec => {
    const t = (z - zCabR) / (zf - zCabR)
    const cl = endClosure(z, zCabR, zf, 0.1, 0.32, 4.2)
    let yb = 0.62
    const dz = Math.abs(z - wzF); if (dz < rw) yb = Math.max(yb, R + Math.sqrt(rw * rw - dz * dz))
    const yt = cabH - 0.18 * Math.pow(Math.max(0, t - 0.55) / 0.45, 3)
    const ym = (yb + yt) / 2, hh = ((yt - yb) / 2) * Math.pow(cl, 0.22)
    const hw = (W2 - 0.04) * cl
    return { yb: ym - hh, yt: ym + hh, hw: Math.max(0.001, hw), hwTop: Math.max(0.001, hw * 0.95), nx: 6, nyTop: 5, nyBot: 8 }
  }
  const lowerMat: MatFn = (t, _h, _top, _s, y) => {
    const z = zf - L + t * L
    if (z > zf - 0.55 && y > 1.5 && y < 2.42) return GLASS                    // old oyna
    if (z > zf - 1.62 && z < zf - 0.4 && y > 1.62 && y < 2.4) return GLASS     // yon oynalar
    return PAINT
  }
  return {
    zr: zf - L, zf, lowerSec, lowerMat, lowerCaps: [PAINT, PAINT], lowerShade: (h) => 0.25 + 0.75 * smooth01(0.0, 0.14, h),
    yHead: 1.12, yTail: 1.0, yGrille: 1.0, yBelt: 1.6, zones: { sg: [0, 0], wf: [0, 0], rg: [0, 0] }, roofY: cabH, capF: 0.5, capR: 0.1,
    cabinZ: [zCabR, zf],
  }
}

export function designFor(cfg: VehicleConfig): Design {
  switch (cfg.body) {
    case 'cybertruck': return cyberDesign(cfg)
    case 'gclass': return gDesign(cfg)
    case 'boxtruck': return truckDesign(cfg)
    case 'hatch': return carDesign(cfg, 'hatch')
    case 'suv': return carDesign(cfg, 'suv')
    default: return carDesign(cfg, cfg.id === 'malibu' ? 'malibu' : 'cobalt')
  }
}

export { stations }





