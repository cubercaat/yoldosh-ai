/**
 * AVTODROM (haydash maktabi maydoni) — haqiqiy avtodrom xaritasiga asosan qurilgan.
 * Hamma narsa "xarita pikseli" (516x387) koordinatasida beriladi: bitta joydan ham rasm (tekstura), ham fizika (maysa/asfalt),
 * ham konuslar, ham mini-xarita chiziladi — shuning uchun ular hech qachon bir-biridan farq qilmaydi.
 */
export const MAP_W = 516, MAP_H = 387
export const K = 0.31                 // 1 piksel = 0.31 m  (maydon ~160 x 120 m)
export const CX = MAP_W / 2, CY = MAP_H / 2
export const px2x = (x: number) => (x - CX) * K
export const px2z = (y: number) => (y - CY) * K
export const x2px = (X: number) => X / K + CX
export const z2px = (Z: number) => Z / K + CY
export const BOUNDS = { x0: 8, y0: 14, x1: 508, y1: 378 }   // asfalt maydon chegarasi (tashqarisi — o't va devor)

type RR = [number, number, number, number, number]          // x0, y0, x1, y1, radius
type Rect = [number, number, number, number]

/** o't (yashil) orollar */
export const ISLANDS: RR[] = [
  [35, 28, 90, 160, 17], [92, 26, 190, 170, 22], [188, 39, 252, 169, 32],           // chap yuqori: 3 ta orol (4 ta "krest" mashqi)
  [277, 37, 310, 169, 16], [315, 30, 485, 168, 28],                                    // o'ng yuqori: "ilon" (zmeyka)
  [27, 214, 233, 262, 6], [215, 199, 253, 262, 19],                                    // chap o'rta: parkovka yashiklari + yuk mashinasi zonasi
  [280, 196, 380, 256, 16], [293, 271, 408, 300, 14], [430, 257, 483, 331, 24], [290, 321, 483, 334, 6], // o'ng pastki: "zinapoya" mashqlari
]
/** orol ichidagi asfalt (kirish yo'lakchalari) */
export const CUTS: RR[] = []
/** beton (kulrang) mashq maydonlari */
export const ZONES: Rect[] = [
  [70, 42, 89, 136], [51, 61, 89, 81],                    // krest 1 (yengil)
  [99, 56, 116, 159], [116, 117, 138, 139],               // krest 2 (yengil)
  [161, 44, 186, 131], [130, 76, 186, 106],               // krest 3 (yuk)
  [200, 52, 219, 116], [219, 76, 236, 95],                // krest 4 (yengil)
  [37, 217, 74, 229], [103, 216, 138, 228], [165, 215, 203, 226],   // garaj yashiklari (yengil)
  [165, 240, 233, 257],                                    // yuk mashinasi yashigi
  [379, 204, 404, 270],                                    // zinapoya (yengil)
  [410, 235, 432, 320], [397, 300, 433, 320],              // zinapoya (yuk)
]
/** ilon (zmeyka) yo'llari — silliq egri chiziq nuqtalari */
export const SNAKES = [
  { w: 16, pts: [[305.4, 82.8], [313.2, 109.4], [336.6, 126.6], [361.6, 125], [374.1, 137.5], [372.6, 156.3]] as Array<[number, number]>, label: 'ЛЕГКОВОЙ', at: [323, 108] as [number, number], rot: 0.9 },
  { w: 16, pts: [[360.5, 31], [362.3, 64.1], [369.4, 87.5], [392.9, 106.3], [421, 111], [449.1, 103.1], [464.8, 121.9], [466.3, 140.6], [461.6, 156.3]] as Array<[number, number]>, label: 'ГРУЗОВОЙ', at: [378, 82], rot: 1.1 },
]
export const CENTER = { x: 268, y: 190 }          // markaziy chorraha
export const START = { x: 140, y: 357, yaw: Math.PI / 2 }    // "СТАРТ" chizig'idan oldin, +X (sharqqa) qarab

/** qayta tiklash nuqtalari (xavfsiz asfalt): [x, y, yaw] */
export const RESPAWNS: Array<[number, number, number]> = [
  [140, 357, Math.PI / 2], [60, 357, Math.PI / 2], [330, 357, Math.PI / 2], [430, 357, Math.PI / 2],
  [150, 21, -Math.PI / 2], [330, 21, -Math.PI / 2], [30, 190, Math.PI / 2], [320, 190, Math.PI / 2],
]

/* ---------- yordamchilar ---------- */
export function catmull(pts: Array<[number, number]>, per = 12): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const P = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2)
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

function rr(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, r: number) {
  const w = x1 - x0, h = y1 - y0, R = Math.max(0, Math.min(r, w / 2, h / 2))
  g.beginPath(); g.moveTo(x0 + R, y0); g.arcTo(x1, y0, x1, y1, R); g.arcTo(x1, y1, x0, y1, R); g.arcTo(x0, y1, x0, y0, R); g.arcTo(x0, y0, x1, y0, R); g.closePath()
}
let seed = 1234567
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

function arrow(g: CanvasRenderingContext2D, x: number, y: number, ang: number, kind: 'f' | 'l' | 'r' = 'f') {
  g.save(); g.translate(x, y); g.rotate(ang); g.strokeStyle = '#e8ebee'; g.fillStyle = '#e8ebee'; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(-9, 0)
  if (kind === 'f') g.lineTo(5, 0); else { g.lineTo(0, 0); g.quadraticCurveTo(5, 0, 5, kind === 'l' ? -5 : 5); }
  g.stroke(); g.beginPath()
  if (kind === 'f') { g.moveTo(9, 0); g.lineTo(3, -3.6); g.lineTo(3, 3.6) } else { const s = kind === 'l' ? -1 : 1; g.moveTo(5, s * 9); g.lineTo(1.4, s * 4); g.lineTo(8.6, s * 4) }
  g.closePath(); g.fill(); g.restore()
}

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, rot = 0, color = '#e23b4e') {
  g.save(); g.translate(x, y); g.rotate(rot); g.font = `800 ${size}px Arial, sans-serif`; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 0); g.restore()
}

function zebra(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, horizontalStripes: boolean) {
  g.fillStyle = '#eceff1'
  if (horizontalStripes) for (let y = y0; y < y1 - 1; y += 5) g.fillRect(x0, y, x1 - x0, 2.8)
  else for (let x = x0; x < x1 - 1; x += 5) g.fillRect(x, y0, 2.8, y1 - y0)
}

function dashed(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  g.save(); g.strokeStyle = '#e8ebee'; g.lineWidth = 1.5; g.setLineDash([7, 7]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore()
}

/** Butun avtodrom rasmi (canvas, S — masshtab: 1 xarita pikseli = S canvas pikseli) */
export function drawAutodrom(cv: HTMLCanvasElement, S: number) {
  seed = 1234567
  cv.width = Math.round(MAP_W * S); cv.height = Math.round(MAP_H * S)
  const g = cv.getContext('2d')!
  g.save(); g.scale(S, S)
  // tashqi o't
  g.fillStyle = '#243f27'; g.fillRect(0, 0, MAP_W, MAP_H)
  // asfalt
  g.fillStyle = '#2c2f34'; g.fillRect(BOUNDS.x0, BOUNDS.y0, BOUNDS.x1 - BOUNDS.x0, BOUNDS.y1 - BOUNDS.y0)
  for (let i = 0; i < 9000; i++) { const a = rnd() * 0.06; g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.6})`; g.fillRect(BOUNDS.x0 + rnd() * (BOUNDS.x1 - BOUNDS.x0), BOUNDS.y0 + rnd() * (BOUNDS.y1 - BOUNDS.y0), 1.2, 1.2) }
  // tashqi chegara chizig'i
  g.strokeStyle = '#e8ebee'; g.lineWidth = 1.8; g.strokeRect(BOUNDS.x0 + 3, BOUNDS.y0 + 3, BOUNDS.x1 - BOUNDS.x0 - 6, BOUNDS.y1 - BOUNDS.y0 - 6)

  // o't orollari
  for (const [x0, y0, x1, y1, r] of ISLANDS) {
    rr(g, x0, y0, x1, y1, r); g.fillStyle = '#34612e'; g.fill()
    g.save(); rr(g, x0, y0, x1, y1, r); g.clip()
    for (let i = 0; i < (x1 - x0) * (y1 - y0) / 6; i++) { g.fillStyle = rnd() > 0.5 ? 'rgba(120,190,90,.10)' : 'rgba(10,40,10,.14)'; g.fillRect(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 1.4, 1.4) }
    g.restore()
  }
  for (const [x0, y0, x1, y1, r] of CUTS) { rr(g, x0, y0, x1, y1, r); g.fillStyle = '#2c2f34'; g.fill() }

  // beton zonalar
  const zoneFill = '#a29d8d', zoneEdge = '#e9e3cf'
  const drawZone = (x0: number, y0: number, x1: number, y1: number) => { g.fillStyle = zoneFill; g.fillRect(x0, y0, x1 - x0, y1 - y0) }
  for (const [x0, y0, x1, y1] of ZONES) drawZone(x0, y0, x1, y1)
  for (const sn of SNAKES) {
    const d = catmull(sn.pts, 14)
    g.lineJoin = 'round'; g.lineCap = 'butt'
    for (const [wd, col] of [[sn.w + 3.2, zoneEdge], [sn.w, zoneFill]] as Array<[number, string]>) {
      g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); d.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
    }
  }
  for (let i = 0; i < 6000; i++) { g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'; const [x0, y0, x1, y1] = ZONES[Math.floor(rnd() * ZONES.length)]; g.fillRect(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 1, 1) }
  g.strokeStyle = zoneEdge; g.lineWidth = 1.2
  for (const [x0, y0, x1, y1] of ZONES) g.strokeRect(x0 + 0.6, y0 + 0.6, x1 - x0 - 1.2, y1 - y0 - 1.2)

  // orollar atrofidagi oq chiziqlar (ikkita: orol chegarasi va yo'l chizig'i)
  g.strokeStyle = '#eef1f3'
  for (const [x0, y0, x1, y1, r] of ISLANDS) {
    g.lineWidth = 1.7; rr(g, x0, y0, x1, y1, r); g.stroke()
    g.lineWidth = 1.2; rr(g, x0 - 4, y0 - 4, x1 + 4, y1 + 4, r + 4); g.stroke()
  }
  // U-aylanma yo'l chiziqlari (pastki chap)
  g.strokeStyle = '#eef1f3'; g.lineWidth = 1.8
  g.beginPath(); g.moveTo(250, 287); g.lineTo(62, 287); g.arc(62, 314.4, 27.4, -Math.PI / 2, Math.PI / 2, true); g.lineTo(245, 341.8); g.stroke()
  g.lineWidth = 1.3; g.beginPath(); g.moveTo(60, 262); g.lineTo(60, 287); g.stroke()
  // yo'l o'rta chiziqlari
  dashed(g, 26, 199.5, 210, 199.5); dashed(g, 70, 273, 245, 273); dashed(g, 300, 181, 480, 181); dashed(g, 28, 21, 480, 21)
  // pastki yo'l: ajratuvchi
  g.strokeStyle = '#eef1f3'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(195, 358); g.lineTo(486, 358); g.stroke()
  // chorraha yo'llari: markaziy qism ochiq asfalt (chiziqsiz), zebra va to'xtash chiziqlari
  const C = CENTER
  zebra(g, C.x - 40, C.y - 18, C.x - 30, C.y + 18, true); zebra(g, C.x + 30, C.y - 18, C.x + 40, C.y + 18, true)
  zebra(g, C.x - 18, C.y - 40, C.x + 18, C.y - 30, false); zebra(g, C.x - 18, C.y + 30, C.x + 18, C.y + 40, false)
  g.fillStyle = '#eef1f3'
  g.fillRect(C.x - 44, C.y - 18, 2.2, 17); g.fillRect(C.x + 42, C.y + 1, 2.2, 17); g.fillRect(C.x + 1, C.y - 44, 17, 2.2); g.fillRect(C.x - 18, C.y + 42, 17, 2.2)
  // START
  g.fillStyle = '#f2f4f6'; g.fillRect(175, 343, 3, 32)
  label(g, 'СТАРТ', 168, 359, 9, Math.PI / 2, '#f2f4f6')
  // taqiqlangan hudud (shtrixlangan)
  g.save(); g.beginPath(); g.rect(9, 215, 14, 47); g.clip(); g.strokeStyle = '#eef1f3'; g.lineWidth = 1.4
  for (let i = -60; i < 60; i += 5) { g.beginPath(); g.moveTo(9 + i, 262); g.lineTo(23 + i, 215); g.stroke() } g.restore()
  // parkovka (qiya, 11 ta o'rin)
  g.strokeStyle = '#eef1f3'; g.lineWidth = 1.3
  for (let i = 0; i < 11; i++) {
    const cx = 72 + i * 17, cy = 329 - i * 0.45
    g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 4); g.strokeRect(-4.3, -9.5, 8.6, 19); g.restore()
  }
  // strelkalar
  const E = 0, W = Math.PI, N = -Math.PI / 2, Sd = Math.PI / 2
  for (const [x, y, a, k] of [
    [30, 21, W, 'f'], [330, 21, W, 'f'], [455, 21, W, 'l'], [90, 192, E, 'f'], [150, 192, E, 'f'], [60, 207, E, 'r'], [120, 207, E, 'r'], [200, 207, E, 'f'],
    [180, 270, W, 'f'], [120, 270, W, 'l'], [210, 280, W, 'f'], [60, 349, E, 'f'], [110, 349, E, 'f'], [90, 366, E, 'f'], [230, 349, E, 'f'], [300, 349, E, 'f'], [400, 349, E, 'r'], [250, 366, E, 'f'], [340, 366, E, 'f'],
    [268, 120, Sd, 'f'], [268, 245, N, 'f'], [268, 300, N, 'f'], [320, 187, E, 'f'], [330, 205, W, 'f'], [455, 200, E, 'l'], [440, 346, E, 'f'], [455, 340, E, 'r'],
    [14, 100, Sd, 'f'], [14, 250, N, 'f'], [500, 90, Sd, 'f'], [500, 280, N, 'f'],
  ] as Array<[number, number, number, 'f' | 'l' | 'r']>) arrow(g, x, y, a, k)

  // yozuvlar
  label(g, 'ЛЕГКОВОЙ', 79.5, 89, 11, -Math.PI / 2); label(g, 'ЛЕГКОВОЙ', 107.5, 108, 11, -Math.PI / 2)
  label(g, 'ГРУЗОВОЙ', 173.5, 88, 11, -Math.PI / 2); label(g, 'ЛЕГКОВОЙ', 209.5, 84, 11, -Math.PI / 2)
  for (const [x, y] of [[55.5, 223], [120.5, 222], [184, 220.5]]) label(g, 'ЛЕГКОВОЙ', x, y, 6.5, 0, '#d0405a')
  label(g, 'ГРУЗОВОЙ', 199, 248.5, 11)
  label(g, 'ЛЕГКОВОЙ', 391.5, 237, 10, -Math.PI / 2); label(g, 'ГРУЗОВОЙ', 421, 277, 10, -Math.PI / 2)
  for (const sn of SNAKES) label(g, sn.label, sn.at[0], sn.at[1], 7.5, sn.rot - 0.1 + (sn.rot > 1 ? 0.1 : 0))
  label(g, 'ПЕШЕХОД', C.x + 40, C.y + 26, 5.5, 0, '#e9ecef')
  g.restore()
}

/* ---------- sirt (maysa / asfalt) niqobi: fizika va mini-xarita uchun ---------- */
let maskData: Uint8ClampedArray | null = null
function buildMask() {
  const cv = document.createElement('canvas'); cv.width = MAP_W; cv.height = MAP_H
  const g = cv.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#000'; g.fillRect(0, 0, MAP_W, MAP_H)
  g.fillStyle = '#f00'
  for (const [x0, y0, x1, y1, r] of ISLANDS) { rr(g, x0, y0, x1, y1, r); g.fill() }
  g.fillStyle = '#000'
  for (const [x0, y0, x1, y1, r] of CUTS) { rr(g, x0, y0, x1, y1, r); g.fill() }
  for (const [x0, y0, x1, y1] of ZONES) g.fillRect(x0, y0, x1 - x0, y1 - y0)
  for (const sn of SNAKES) { const d = catmull(sn.pts, 14); g.strokeStyle = '#000'; g.lineWidth = sn.w; g.lineJoin = 'round'; g.beginPath(); d.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke() }
  maskData = g.getImageData(0, 0, MAP_W, MAP_H).data
}
export type AutoSurface = 'road' | 'sidewalk' | 'grass'
export function autodromSurface(x: number, z: number): AutoSurface {
  const px = x2px(x), py = z2px(z)
  if (px < BOUNDS.x0 || px > BOUNDS.x1 || py < BOUNDS.y0 || py > BOUNDS.y1) return 'grass'
  if (!maskData) buildMask()
  const i = ((Math.floor(py) * MAP_W) + Math.floor(px)) * 4
  return maskData![i] > 128 ? 'grass' : 'road'
}

/** konuslar joylashuvi (xarita pikseli): krestlar burchaklari, yashiklar burchaklari, ilon chetlari, zinapoya burchaklari */
export function coneSpots(): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const add = (x: number, y: number) => out.push([x, y])
  const rectCorners = (x0: number, y0: number, x1: number, y1: number) => { add(x0, y0); add(x1, y0); add(x0, y1); add(x1, y1) }
  // krest 1: vertikal [70,42,89,136], arm chapga [51,61,70,81]
  for (const [x, y] of [[70, 42], [89, 42], [89, 136], [70, 136], [51, 61], [51, 81], [70, 61], [70, 81]]) add(x, y)
  // krest 2: vertikal [99,56,116,159], arm o'ngga [116,117,138,139]
  for (const [x, y] of [[99, 56], [116, 56], [99, 159], [116, 159], [138, 117], [138, 139], [116, 117], [116, 139]]) add(x, y)
  // krest 3: vertikal [161,44,186,131], arm chapga [130,76,161,106]
  for (const [x, y] of [[161, 44], [186, 44], [186, 131], [161, 131], [130, 76], [130, 106], [161, 76], [161, 106]]) add(x, y)
  // krest 4: vertikal [200,52,219,116], arm o'ngga [219,76,236,95]
  for (const [x, y] of [[200, 52], [219, 52], [200, 116], [219, 116], [236, 76], [236, 95], [219, 76], [219, 95]]) add(x, y)
  // garaj yashiklari
  for (const r of [[37, 217, 74, 229], [103, 216, 138, 228], [165, 215, 203, 226], [165, 240, 233, 257]] as Rect[]) rectCorners(...r)
  // zinapoya
  for (const [x, y] of [[379, 204], [404, 204], [379, 270], [404, 270], [410, 235], [432, 235], [432, 320], [397, 320], [397, 300], [410, 300]]) add(x, y)
  // ilon: yo'l chetlari bo'ylab (har ~14 px da)
  for (const sn of SNAKES) {
    const d = catmull(sn.pts, 14); let acc = 0
    for (let i = 1; i < d.length; i++) {
      const dx = d[i][0] - d[i - 1][0], dy = d[i][1] - d[i - 1][1], L = Math.hypot(dx, dy) || 1; acc += L
      if (acc >= 14) { acc = 0; const nx = -dy / L, ny = dx / L, o = sn.w / 2 + 2.2; add(d[i][0] + nx * o, d[i][1] + ny * o); add(d[i][0] - nx * o, d[i][1] - ny * o) }
    }
  }
  return out
}

/* ---------- boshlang'ich va qayta tiklash (dunyo koordinatasida) ---------- */
export const autodromStart = () => ({ x: px2x(START.x), z: px2z(START.y), yaw: START.yaw })
export function autodromRespawn(x: number, z: number) {
  let best = RESPAWNS[0], bd = Infinity
  for (const r of RESPAWNS) { const d = (px2x(r[0]) - x) ** 2 + (px2z(r[1]) - z) ** 2; if (d < bd) { bd = d; best = r } }
  return { x: px2x(best[0]), z: px2z(best[1]), yaw: best[2] }
}
