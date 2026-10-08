/**
 * Modulli binolar: bir xil "detal" modullaridan yig'iladi (uy, ko'p qavatli, ofis, do'kon, supermarket, ombor, zavod,
 * yoqilg'i quyish shoxobchasi, savdo markazi, stadion, ko'p qavatli garaj, osmono'par).
 * Hammasi chunk uchun BITTA birlashtirilgan geometriya ichiga yoziladi (ko'p unikal yuqori poligonli obyekt yo'q).
 * Tasodifiy tanlovlar lot.seed dan — shu sabab bir xil koordinata = bir xil bino.
 */
import { stream } from './seed'
import { GeoBuilder, lin, tint } from './geom'
import { TILE } from './worldMaterials'
import type { Lot } from './blocks'

export interface Parts { res: GeoBuilder; off: GeoBuilder; shop: GeoBuilder; ind: GeoBuilder; plain: GeoBuilder; asphalt: GeoBuilder; paint: GeoBuilder }
export type ColliderSpec =
  | { t: 'box'; x: number; y: number; z: number; hx: number; hy: number; hz: number; ry: number; tag: string }
  | { t: 'cyl'; x: number; y: number; z: number; r: number; hh: number; tag: string }
export interface ParkedCar { x: number; z: number; yaw: number; id: string; color: string }
export interface TreeSpec { x: number; z: number; s: number; kind: 0 | 1 }
export interface LampSpec { x: number; z: number; dx: number; dz: number }
export interface Props { cars: ParkedCar[]; trees: TreeSpec[]; lamps: LampSpec[]; colliders: ColliderSpec[] }

const WALL_RES = ['#f4eee3', '#ebded0', '#dccbb8', '#cdd7e0', '#ecd0bd', '#dcdcd7', '#c3ccb6', '#e6d9a8']
const WALL_OFF = ['#ffffff', '#dfe8f2', '#c9d6e4', '#e8e0d4']
const WALL_SHOP = ['#f1e7d0', '#e3d3bc', '#d6dde6', '#ecd9d4', '#d9e4d3']
const WALL_IND = ['#cfd3d9', '#d9d2c4', '#bcc6cf', '#d8dde3']
const ROOFS = ['#8a4b3a', '#6d4a3e', '#555a63', '#7a3f35', '#4c5360', '#6e5a48']
const SIGNS = ['#e63946', '#f4a261', '#2a9d8f', '#1d78d6', '#e9c46a', '#8e44ad', '#2ecc71']
const CAR_COLORS = ['#e9edf3', '#15171c', '#6e7886', '#8e1b1b', '#2b3a55', '#c9ced6', '#3d5a40', '#b8a37a']
const CAR_IDS = ['cobalt', 'cobalt', 'malibu', 'sedan', 'sedan', 'gclass']
const pick = <T,>(a: T[], r: number) => a[Math.min(a.length - 1, Math.floor(r * a.length))]

const GREY_ROOF = lin('#5d6168'), DARK = lin('#2a2d33'), CONCRETE = lin('#b8b9bd'), ASPHALT_C: [number, number, number] = [1, 1, 1], WHITE = lin('#f3f3f0'), YELLOW = lin('#f2c230')

class Ctx {
  constructor(public lot: Lot, public P: Parts, public out: Props) {}
  /** lokal (x,z) -> dunyo */
  world(lx: number, lz: number): [number, number] {
    const c = Math.cos(this.lot.yaw), s = Math.sin(this.lot.yaw)
    return [lx * c + lz * s + this.lot.x, -lx * s + lz * c + this.lot.z]
  }
  box(lx: number, y: number, lz: number, hx: number, hy: number, hz: number, tag: string) {
    const [x, z] = this.world(lx, lz)
    this.out.colliders.push({ t: 'box', x, y, z, hx, hy, hz, ry: this.lot.yaw, tag })
  }
}
const setT = (c: Ctx, gb: GeoBuilder) => gb.setTransform(c.lot.x, c.lot.z, c.lot.yaw)

function stalls(c: Ctx, cx: number, cz: number, w: number, d: number, rnd: () => number, fill = 0.5, trucks = false) {
  const { P } = c
  P.asphalt.setTransform(c.lot.x, c.lot.z, c.lot.yaw); P.paint.setTransform(c.lot.x, c.lot.z, c.lot.yaw)
  P.asphalt.flatRect(cx, cz, w, d, 0.012, ASPHALT_C, 6)
  const sw = 2.6, sd = 5.2, n = Math.floor((w - 2) / sw)
  const rows: number[] = d >= 16 ? [cz - d / 2 + sd / 2 + 0.6, cz + d / 2 - sd / 2 - 0.6] : [cz]
  if (d < 11) { P.asphalt.clearTransform(); P.paint.clearTransform(); return }
  for (const rz of rows) {
    const faceUp = rz > cz
    for (let k = 0; k <= n; k++) {
      const x = cx - (n * sw) / 2 + k * sw
      P.paint.quad([x - 0.05, 0.02, rz - sd / 2], [x + 0.05, 0.02, rz - sd / 2], [x + 0.05, 0.02, rz + sd / 2], [x - 0.05, 0.02, rz + sd / 2], [0, 1, 0], WHITE)
    }
    for (let k = 0; k < n; k++) {
      if (rnd() > fill) continue
      const x = cx - (n * sw) / 2 + (k + 0.5) * sw
      const [wx, wz] = c.world(x, rz)
      c.out.cars.push({ x: wx, z: wz, yaw: c.lot.yaw + (faceUp ? Math.PI : 0) + Math.PI / 2 * 0 + (rnd() < 0.5 ? 0 : Math.PI) * 0, id: trucks && rnd() < 0.6 ? 'isuzu' : pick(CAR_IDS, rnd()), color: pick(CAR_COLORS, rnd()) })
      c.out.colliders.push({ t: 'box', x: wx, y: 0.75, z: wz, hx: 0.9, hy: 0.75, hz: 2.2, ry: c.lot.yaw, tag: 'to\'xtagan mashina' })
    }
    void faceUp
  }
  P.asphalt.clearTransform(); P.paint.clearTransform()
}

function lampPost(c: Ctx, lx: number, lz: number) {
  const [x, z] = c.world(lx, lz)
  const dx = -Math.sin(c.lot.yaw) * 0, dz = 0
  void dx; void dz
  c.out.lamps.push({ x, z, dx: Math.sin(c.lot.yaw), dz: Math.cos(c.lot.yaw) })
  c.out.colliders.push({ t: 'cyl', x, y: 3.5, z, r: 0.16, hh: 3.5, tag: 'chiroq ustuni' })
}

/* ================================================================= modullar */
function house(c: Ctx, r: () => number) {
  const { lot, P } = c, f = lot.floors, bw = lot.w, bd = Math.min(lot.d * 0.78, 12), zc = -(lot.d - bd) / 2 + 0.2
  const hh = f * 3 + 0.2, wall = pick(WALL_RES, r()), roof = pick(ROOFS, r())
  const offU = Math.floor(r() * 4) / 4, offV = 0
  setT(c, P.res); P.res.wallBox(0, 0, zc, bw, hh, bd, TILE.res.w, TILE.res.h, lin(wall), offU, offV)
  setT(c, P.plain)
  const ridgeX = bw >= bd
  if (ridgeX) P.plain.gable(0, hh, zc, bd + 0.8, 2.2 + r() * 0.8, bw + 0.8, lin(roof), true)
  else P.plain.gable(0, hh, zc, bw + 0.8, 2.2 + r() * 0.8, bd + 0.8, lin(roof))
  P.plain.box(bw * 0.25, hh + 2.2, zc - bd * 0.2, 0.7, 1.8, 0.7, lin('#8a6a58'))
  P.plain.box(0, 1.1, zc + bd / 2 + 0.02, 1.1, 2.2, 0.08, lin('#5b3a29')) // eshik
  P.plain.box(-bw / 2 + 2.4, 1.25, zc + bd / 2 + 0.03, 2.6, 2.5, 0.08, tint(lin(wall), 0.85)) // garaj eshigi
  P.res.clearTransform(); P.plain.clearTransform()
  c.box(0, hh / 2 + 1, zc, bw / 2, hh / 2 + 1, bd / 2, 'bino')
  // old bog'ida daraxt
  if (r() < 0.6) c.out.trees.push({ x: c.world(bw / 2 + 1.5, lot.d / 2 - 2)[0], z: c.world(bw / 2 + 1.5, lot.d / 2 - 2)[1], s: 0.7 + r() * 0.6, kind: r() < 0.5 ? 0 : 1 })
}

function apartment(c: Ctx, r: () => number) {
  const { lot, P } = c, f = lot.floors, bw = lot.w, bd = Math.min(lot.d, 18), zc = -(lot.d - bd) / 2
  const hh = f * 3.2, wall = pick(WALL_RES, r())
  setT(c, P.res); P.res.wallBox(0, 0, zc, bw, hh, bd, TILE.res.w, TILE.res.h, lin(wall), Math.floor(r() * 4) / 4, 0)
  setT(c, P.plain)
  P.plain.box(0, hh + 0.25, zc, bw + 0.5, 0.5, bd + 0.5, GREY_ROOF)
  P.plain.box(bw * 0.2, hh + 1.5, zc, 3.2, 2.2, 3.2, lin('#8c8f96'))
  P.plain.box(0, 3.3, zc + bd / 2 + 0.6, 4.4, 0.25, 1.4, lin('#9aa0a8')) // kirish soyaboni
  P.res.clearTransform(); P.plain.clearTransform()
  c.box(0, hh / 2, zc, bw / 2, hh / 2, bd / 2, 'bino')
}

function tallBuilding(c: Ctx, r: () => number, glassy: boolean) {
  const { lot, P } = c, H = lot.h, bw = Math.min(lot.w, 40), bd = Math.min(lot.d, 30), zc = -(lot.d - bd) / 2
  const wall = pick(WALL_OFF, r()), G = glassy ? P.off : P.res, tile = glassy ? TILE.off : TILE.res
  // podium (do'kon qavati) + minora (zinapoyalar)
  setT(c, P.shop); P.shop.wallBox(0, 0, zc, bw + 1.6, 4.2, bd + 1.6, TILE.shop.w, TILE.shop.h, lin(pick(WALL_SHOP, r()))); P.shop.clearTransform()
  setT(c, P.plain); P.plain.box(0, 4.3, zc, bw + 2, 0.25, bd + 2, lin('#6d7077')); P.plain.clearTransform()
  const levels = H > 60 ? 3 : H > 30 ? 2 : 1
  let y = 4.4, w = bw, d = bd
  const fr = levels === 3 ? [0.55, 0.3, 0.15] : levels === 2 ? [0.7, 0.3] : [1]
  fr.forEach((k, i) => {
    const h = Math.max(5, (H - 4.4) * k), hh = Math.round(h / 3.5) * 3.5
    setT(c, G); G.wallBox(0, y, zc, w, hh, d, tile.w, tile.h, lin(wall), Math.floor(r() * 6) / 6, 0); G.clearTransform()
    setT(c, P.plain); P.plain.box(0, y + hh + 0.2, zc, w + 0.3, 0.4, d + 0.3, GREY_ROOF)
    if (i === fr.length - 1) { P.plain.box(0, y + hh + 1.4, zc, 4, 2, 4, lin('#8c8f96')); if (H > 50) P.plain.cylinder(0, y + hh + 2, zc, 0.25, 14, 6, lin('#d9dde3')) }
    P.plain.clearTransform()
    y += hh; w *= 0.78; d *= 0.8
  })
  c.box(0, (H + 4) / 2, zc, bw / 2 + 0.8, (H + 4) / 2, bd / 2 + 0.8, 'bino')
}

function shop(c: Ctx, r: () => number) {
  const { lot, P } = c, bw = lot.w, bd = Math.min(lot.d, 16), zc = -(lot.d - bd) / 2, hh = lot.floors * 3.6 + 0.6
  setT(c, P.shop); P.shop.wallBox(0, 0, zc, bw, hh, bd, TILE.shop.w, TILE.shop.h, lin(pick(WALL_SHOP, r())), Math.floor(r() * 4) / 4, 0); P.shop.clearTransform()
  setT(c, P.plain)
  const sign = lin(pick(SIGNS, r()))
  P.plain.box(0, hh + 0.2, zc, bw + 0.3, 0.4, bd + 0.3, GREY_ROOF)
  P.plain.box(0, 3.35, zc + bd / 2 + 0.8, bw * 0.92, 0.12, 1.7, tint(sign, 0.9)) // soyabon
  P.plain.box(0, 4.35, zc + bd / 2 + 0.06, bw * 0.7, 0.95, 0.14, sign) // iskala
  P.plain.clearTransform()
  c.box(0, hh / 2, zc, bw / 2, hh / 2, bd / 2, 'bino')
}

function supermarket(c: Ctx, r: () => number) {
  const { lot, P } = c, ld = lot.lotDepth ?? 14, bd = Math.max(12, lot.d - ld), bw = lot.w, zc = -lot.d / 2 + bd / 2, hh = lot.h
  setT(c, P.shop); P.shop.wallBox(0, 0, zc, bw, hh, bd, TILE.shop.w, TILE.shop.h, lin(pick(WALL_SHOP, r())), Math.floor(r() * 4) / 4, 0); P.shop.clearTransform()
  setT(c, P.off); P.off.wallBox(-bw * 0.18, 0, zc + bd / 2 + 1.5, 12, 5, 3, TILE.off.w, TILE.off.h, lin('#ffffff')); P.off.clearTransform()
  setT(c, P.plain)
  const sign = lin(pick(SIGNS, r()))
  P.plain.box(0, hh + 0.25, zc, bw + 0.3, 0.5, bd + 0.3, GREY_ROOF)
  P.plain.box(-bw * 0.18, 5.2, zc + bd / 2 + 1.5, 13, 0.3, 3.4, lin('#c9ccd2'))
  P.plain.box(bw * 0.15, hh - 1.2, zc + bd / 2 + 0.12, bw * 0.4, 2, 0.2, sign)
  for (let k = 0; k < 3; k++) P.plain.box(-bw * 0.3 + k * 7, hh + 1.2, zc - 2, 3, 1.4, 3, lin('#9aa0a8'))
  P.plain.clearTransform()
  c.box(0, hh / 2, zc, bw / 2, hh / 2, bd / 2, 'bino')
  stalls(c, 0, lot.d / 2 - ld / 2, bw, ld, r, 0.5)
  lampPost(c, -bw / 2 + 2, lot.d / 2 - 2); lampPost(c, bw / 2 - 2, lot.d / 2 - 2)
}

function warehouse(c: Ctx, r: () => number, factory: boolean) {
  const { lot, P } = c, bw = lot.w, bd = Math.min(lot.d, 36), zc = -(lot.d - bd) / 2, hh = lot.h, wall = pick(WALL_IND, r())
  setT(c, P.ind); P.ind.wallBox(0, 0, zc, bw, hh, bd, TILE.ind.w, TILE.ind.h, lin(wall), Math.floor(r() * 4) / 4, 0); P.ind.clearTransform()
  setT(c, P.plain)
  P.plain.box(0, hh + 0.3, zc, bw + 0.4, 0.6, bd + 0.4, lin('#7b8088'))
  const docks = Math.max(2, Math.floor(bw / 12))
  for (let k = 0; k < docks; k++) P.plain.box(-bw / 2 + (k + 0.5) * (bw / docks), 2.2, zc + bd / 2 + 0.06, 3.6, 3.6, 0.12, lin('#3b4452'))
  if (factory) {
    P.plain.cylinder(bw * 0.3, hh, zc - bd * 0.2, 1.0, 16, 10, lin('#c0472f'), 0.8); P.plain.cylinder(bw * 0.3 + 3, hh, zc - bd * 0.2, 0.8, 12, 10, lin('#c0472f'), 0.65)
    P.plain.cylinder(-bw * 0.35, 0, zc - bd * 0.3, 3.5, 11, 14, lin('#b9bec6'), 3.2)
  }
  P.plain.clearTransform()
  c.box(0, hh / 2, zc, bw / 2, hh / 2, bd / 2, 'bino')
  if (factory) { const [sx, sz] = c.world(-bw * 0.35, zc - bd * 0.3); c.out.colliders.push({ t: 'cyl', x: sx, y: 5.5, z: sz, r: 3.5, hh: 5.5, tag: 'silos' }) }
  if (lot.d > bd + 8) stalls(c, 0, lot.d / 2 - (lot.d - bd) / 2, bw * 0.8, lot.d - bd - 1, r, 0.2, true)
}

function fuel(c: Ctx, r: () => number) {
  const { lot, P } = c, w = lot.w, d = lot.d
  setT(c, P.asphalt); P.asphalt.flatRect(0, 0, w, d, 0.012, ASPHALT_C, 6); P.asphalt.clearTransform()
  const red = lin(pick(SIGNS, r()))
  const cz = d / 2 - 8
  setT(c, P.plain)
  P.plain.box(0, 5.4, cz, 14, 0.5, 9, lin('#f1f1ee')); P.plain.box(0, 5.2, cz + 4.55, 14.1, 0.6, 0.1, red)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.plain.box(sx * 6, 2.7, cz + sz * 3.4, 0.5, 5.4, 0.5, lin('#d9dde3'))
  for (const sx of [-1, 1]) { P.plain.box(sx * 3.5, 0.2, cz, 1.2, 0.4, 5.6, lin('#9aa0a8')); P.plain.box(sx * 3.5, 1.0, cz - 0.9, 0.7, 1.6, 0.6, red); P.plain.box(sx * 3.5, 1.0, cz + 0.9, 0.7, 1.6, 0.6, red) }
  P.plain.box(w / 2 - 2, 5.5, d / 2 - 1.5, 0.5, 11, 0.5, lin('#3a404b')); P.plain.box(w / 2 - 2, 10.3, d / 2 - 1.5, 3.2, 2.4, 0.4, red)
  P.plain.clearTransform()
  setT(c, P.shop); P.shop.wallBox(0, 0, -d / 2 + 4, 12, 3.8, 6.5, TILE.shop.w, TILE.shop.h, lin('#e6e0d2')); P.shop.clearTransform()
  setT(c, P.plain); P.plain.box(0, 4.0, -d / 2 + 4, 12.4, 0.4, 6.9, GREY_ROOF); P.plain.clearTransform()
  c.box(0, 1.9, -d / 2 + 4, 6, 1.9, 3.25, 'bino')
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [px, pz] = c.world(sx * 6, cz + sz * 3.4); c.out.colliders.push({ t: 'cyl', x: px, y: 2.7, z: pz, r: 0.3, hh: 2.7, tag: 'ustun' }) }
  for (const sx of [-1, 1]) c.box(sx * 3.5, 0.9, cz, 0.6, 0.9, 2.8, 'yoqilg\'i kolonkasi')
  P.paint.setTransform(c.lot.x, c.lot.z, c.lot.yaw)
  P.paint.quad([-w / 2 + 1, 0.02, cz - 6], [-w / 2 + 1.2, 0.02, cz - 6], [-w / 2 + 1.2, 0.02, cz + 6], [-w / 2 + 1, 0.02, cz + 6], [0, 1, 0], YELLOW)
  P.paint.clearTransform()
  void r
}

function mall(c: Ctx, r: () => number) {
  const { lot, P } = c, ld = Math.max(16, lot.d * 0.42), bd = lot.d - ld, bw = lot.w, zc = -lot.d / 2 + bd / 2, hh = 16
  setT(c, P.shop); P.shop.wallBox(0, 0, zc, bw, hh, bd, TILE.shop.w, 4.2 * 2, lin('#e8dcc2'), 0, 0); P.shop.clearTransform()
  setT(c, P.off); P.off.wallBox(0, 0, zc + bd / 2 + 2, 24, 13, 4, TILE.off.w, TILE.off.h, lin('#ffffff')); P.off.clearTransform()
  setT(c, P.plain)
  const sign = lin(pick(SIGNS, r()))
  P.plain.box(0, hh + 0.4, zc, bw + 0.4, 0.8, bd + 0.4, GREY_ROOF)
  P.plain.box(0, 13.4, zc + bd / 2 + 2, 25, 0.5, 5, lin('#b9bdc6'))
  P.plain.box(0, hh - 3, zc + bd / 2 + 0.2, bw * 0.5, 3, 0.3, sign)
  for (let k = 0; k < 5; k++) P.plain.box(-bw * 0.35 + k * (bw * 0.18), hh + 1.6, zc, 4, 2.4, 4, lin('#9aa0a8'))
  P.plain.clearTransform()
  c.box(0, hh / 2, zc, bw / 2, hh / 2, bd / 2, 'savdo markazi')
  stalls(c, 0, lot.d / 2 - ld / 2, bw, ld, r, 0.55)
  for (let k = -1; k <= 1; k++) lampPost(c, k * bw * 0.32, lot.d / 2 - 2)
}

function garage(c: Ctx, r: () => number) {
  const { lot, P } = c, w = lot.w, d = lot.d, lv = 5, lh = 3.1
  setT(c, P.plain)
  const slab = lin('#a6a9af'), pil = lin('#8e9199')
  for (let k = 0; k <= lv; k++) P.plain.box(0, k * lh, 0, w, 0.35, d, slab)
  for (let k = 0; k < lv; k++) {
    const y = k * lh + lh / 2 + 0.2
    for (let ix = -2; ix <= 2; ix++) for (const sz of [-1, 1]) P.plain.box((ix * w) / 5, y, sz * (d / 2 - 0.4), 0.6, lh, 0.6, pil)
    P.plain.box(0, k * lh + 0.95, d / 2 - 0.15, w, 1.1, 0.3, tint(slab, 0.92)); P.plain.box(0, k * lh + 0.95, -d / 2 + 0.15, w, 1.1, 0.3, tint(slab, 0.92))
    P.plain.box(w / 2 - 0.15, k * lh + 0.95, 0, 0.3, 1.1, d, tint(slab, 0.92)); P.plain.box(-w / 2 + 0.15, k * lh + 0.95, 0, 0.3, 1.1, d, tint(slab, 0.92))
  }
  P.plain.box(0, lv * lh + 0.6, 0, w * 0.4, 1.2, 4, lin(pick(SIGNS, r())))
  P.plain.clearTransform()
  c.box(0, (lv * lh) / 2, 0, w / 2, (lv * lh) / 2, d / 2, 'garaj')
}

function stadium(c: Ctx, r: () => number) {
  const { lot, P } = c, rx = lot.w / 2, rz = lot.d / 2, N = 28
  setT(c, P.plain)
  const wallC = lin('#c9ccd3'), seatA = lin('#2b5fa8'), seatB = lin('#d9dde3')
  const ring = (k: number, sc: number): [number, number] => [Math.cos((k / N) * Math.PI * 2) * rx * sc, Math.sin((k / N) * Math.PI * 2) * rz * sc]
  for (let k = 0; k < N; k++) {
    const [ox0, oz0] = ring(k, 1), [ox1, oz1] = ring(k + 1, 1), [ix0, iz0] = ring(k, 0.62), [ix1, iz1] = ring(k + 1, 0.62)
    const [mx0, mz0] = ring(k, 0.8), [mx1, mz1] = ring(k + 1, 0.8)
    const nOut: [number, number, number] = [Math.cos(((k + 0.5) / N) * Math.PI * 2), 0, Math.sin(((k + 0.5) / N) * Math.PI * 2)]
    P.plain.quad([ox0, 0, oz0], [ox0, 17, oz0], [ox1, 17, oz1], [ox1, 0, oz1], nOut, wallC)
    // tribuna (qiya)
    const sc = k % 2 ? seatA : seatB
    P.plain.quad([ix0, 2, iz0], [ox0, 15, oz0], [ox1, 15, oz1], [ix1, 2, iz1], [0, 0.6, 0], sc)
    P.plain.quad([ox0, 17, oz0], [ix0 * 1.18, 17, iz0 * 1.18], [ix1 * 1.18, 17, iz1 * 1.18], [ox1, 17, oz1], [0, 1, 0], tint(wallC, 0.9))
    void mx0; void mz0; void mx1; void mz1
  }
  // maydon
  const pts: Array<[number, number]> = []
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; pts.push([Math.cos(a) * rx * 0.6, Math.sin(a) * rz * 0.6]) }
  P.plain.fan(0, 0, pts, 0.05, lin('#3f8f3a'))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { P.plain.box(sx * rx * 0.92, 14, sz * rz * 0.92, 0.7, 28, 0.7, lin('#4a4f58')); P.plain.box(sx * rx * 0.92, 28.5, sz * rz * 0.92, 4, 1.2, 1.4, lin('#f4f1da')) }
  P.plain.clearTransform()
  for (let k = 0; k < N; k++) { const [x0, z0] = ring(k, 0.97), [px, pz] = c.world(x0, z0); const a = ((k + 0.5) / N) * Math.PI * 2; c.out.colliders.push({ t: 'box', x: px, y: 8, z: pz, hx: 2.2 + (rx * Math.PI) / N * 0.6, hy: 8, hz: 3, ry: c.lot.yaw + Math.PI / 2 - a * 1 + 0, tag: 'stadion' }) }
  void r
}

function emptyLot(c: Ctx, r: () => number) {
  const { lot } = c, n = Math.floor((lot.wx * lot.wz) / 260 * (lot.zone === 'suburban' ? 1.4 : 0.8))
  for (let k = 0; k < n; k++) {
    const lx = (r() - 0.5) * (lot.w - 3), lz = (r() - 0.5) * (lot.d - 3), [x, z] = c.world(lx, lz)
    c.out.trees.push({ x, z, s: 0.7 + r() * 0.8, kind: r() < 0.45 ? 0 : 1 })
  }
}

function yard(c: Ctx, r: () => number) {
  const { lot, P } = c
  setT(c, P.asphalt); P.asphalt.flatRect(0, 0, lot.w, lot.d, 0.012, ASPHALT_C, 6); P.asphalt.clearTransform()
  setT(c, P.plain)
  const cols = ['#c0472f', '#2a6fb0', '#e0a82e', '#4a8f5a', '#8a8f98']
  const n = 3 + Math.floor(r() * 4)
  for (let k = 0; k < n; k++) {
    const lx = (r() - 0.5) * (lot.w - 14), lz = -lot.d / 2 + 5 + r() * (lot.d * 0.4), hgt = 2.6 * (1 + (r() < 0.4 ? 1 : 0))
    P.plain.box(lx, hgt / 2, lz, 6.1, hgt, 2.5, lin(pick(cols, r())))
    c.box(lx, hgt / 2, lz, 3.05, hgt / 2, 1.25, 'konteyner')
  }
  P.plain.box(0, 1.2, lot.d / 2, lot.w, 0.12, 0.12, lin('#7b8088'))
  P.plain.clearTransform()
  const [x, z] = c.world(0, lot.d / 2 - 5), [x2, z2] = c.world(lot.w * 0.25, lot.d / 2 - 5)
  c.out.cars.push({ x, z, yaw: c.lot.yaw + Math.PI / 2, id: 'isuzu', color: '#f2f4f8' }, { x: x2, z: z2, yaw: c.lot.yaw + Math.PI / 2, id: 'isuzu', color: '#1b3f8f' })
  c.out.colliders.push({ t: 'box', x, y: 1.6, z, hx: 1.1, hy: 1.6, hz: 3.4, ry: c.lot.yaw + Math.PI / 2, tag: 'yuk mashinasi' }, { t: 'box', x: x2, y: 1.6, z: z2, hx: 1.1, hy: 1.6, hz: 3.4, ry: c.lot.yaw + Math.PI / 2, tag: 'yuk mashinasi' })
}

/** Lot turi bo'yicha modulni tanlaydi. Chunk generatsiyasidan chaqiriladi. */
export function addLot(lot: Lot, P: Parts, out: Props) {
  const r = stream(lot.seed)
  const c = new Ctx(lot, P, out)
  switch (lot.kind) {
    case 'house': case 'house2': house(c, r); break
    case 'apartment': apartment(c, r); break
    case 'office': tallBuilding(c, r, true); break
    case 'tower': tallBuilding(c, r, true); break
    case 'shop': shop(c, r); break
    case 'supermarket': supermarket(c, r); break
    case 'warehouse': warehouse(c, r, false); break
    case 'factory': warehouse(c, r, true); break
    case 'fuel': fuel(c, r); break
    case 'mall': mall(c, r); break
    case 'garage': garage(c, r); break
    case 'stadium': stadium(c, r); break
    case 'parking': stalls(c, 0, 0, lot.w, lot.d, r, 0.5); lampPost(c, -lot.w / 2 + 1.5, lot.d / 2 - 1.5); lampPost(c, lot.w / 2 - 1.5, lot.d / 2 - 1.5); break
    case 'yard': yard(c, r); break
    case 'empty': emptyLot(c, r); break
    default: break // 'park' — chunkGeo da
  }
}
