/**
 * IMTIHON AVTODROMI (YHQ amaliy imtihoni uslubida) — yopiq maydon, bir yo'nalishli marshrut va 12 ta mashq:
 * Start, Stop-liniya, Estakada, 90° burilish, Ilon izi, Svetofor, Garaj (boks), Temir yo'l, Tezlanish, Avariya, Parallel parkovka, Finish.
 * Hamma narsa "metr" koordinatasida (xarita: 280 x 200 m, chap-yuqori burchak = 0,0) beriladi. Bitta joydan ham rasm (tekstura),
 * ham fizika (asfalt / bordyur / o't), ham mini-xarita chiziladi — shuning uchun ular hech qachon bir-biridan farq qilmaydi.
 */
export const MAP_W = 280, MAP_H = 200
export const px2x = (mx: number) => mx - MAP_W / 2
export const px2z = (mz: number) => mz - MAP_H / 2
export const x2px = (X: number) => X + MAP_W / 2
export const z2px = (Z: number) => Z + MAP_H / 2
export const HW = 3

export type Dir = 'E' | 'W' | 'N' | 'S'
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI, S = 0
export const YAW: Record<Dir, number> = { E, W, N, S }

/* ---------- marshrut: kesmalar (mashina yuradigan yo'l o'qi) ---------- */
export interface Seg { a: [number, number]; b: [number, number]; w: number; ctrl?: boolean }
export const SEGS: Seg[] = [
  { a: [24, 176], b: [138, 176], w: 6 },
  { a: [138, 176], b: [164, 176], w: 4, ctrl: true },          // 90° burilish: kirish va burchak
  { a: [164, 176], b: [164, 150], w: 4, ctrl: true },
  { a: [164, 150], b: [164, 136], w: 6 },
  { a: [164, 136], b: [160, 128], w: 4.2, ctrl: true },         // ilon izi
  { a: [160, 128], b: [168, 120], w: 4.2, ctrl: true },
  { a: [168, 120], b: [160, 112], w: 4.2, ctrl: true },
  { a: [160, 112], b: [168, 104], w: 4.2, ctrl: true },
  { a: [168, 104], b: [164, 98], w: 4.2, ctrl: true },
  { a: [164, 98], b: [164, 56], w: 6 },                         // svetofor chorrahasi shu yerda
  { a: [164, 56], b: [40, 56], w: 6 },                          // garaj va temir yo'l
  { a: [40, 56], b: [40, 24], w: 6 },
  { a: [40, 24], b: [250, 24], w: 6 },                          // tezlanish va avariya
  { a: [250, 24], b: [250, 172], w: 6 },                        // parallel parkovka va finish
]
/** qo'shimcha asfalt maydonlari: [x0,z0,x1,z1, marshrutga tegishlimi] */
export interface Pad { x0: number; z0: number; x1: number; z1: number; ok: boolean }
export const PADS: Pad[] = [
  { x0: 112, z0: 53, x1: 148, z1: 66, ok: true },               // garaj oldidagi keng maydon
  { x0: 121.0, z0: 47.5, x1: 124.2, z1: 53.5, ok: true },        // boks 1
  { x0: 128.4, z0: 47.5, x1: 131.6, z1: 53.5, ok: true },        // boks 2 (nishon)
  { x0: 135.8, z0: 47.5, x1: 139.0, z1: 53.5, ok: true },        // boks 3
  { x0: 243.6, z0: 80, x1: 247.5, z1: 88, ok: true },            // parallel parkovka joyi
  { x0: 140, z0: 81, x1: 190, z1: 87, ok: false },              // svetofor kesishuvidagi ko'ndalang yo'l (marshrut emas)
]
export const BOX = { x0: 128.4, x1: 131.6, z0: 47.5, z1: 53.5, backLine: 48.4 }
export const SLOT = { x0: 243.6, x1: 247.5, z0: 80, z1: 88 }
export const STOP_LINE = 72, ESTAKADA_LINE = 108, START_LINE = 40
export const LIGHT_LINE = 91      // svetofor to'xtash chizig'i (z), shimolga ketayotganlar uchun
export const RAIL = { x: 85, z0: 45, z1: 67, stopX: 94 }
export const ACCEL = { x0: 60, x1: 150 }
export const AVARIYA_X = 185
export const FINISH_Z = 160

/** burilish ko'rsatkichi talab qilinadigan burchaklar */
export const TURNS: Array<{ x: number; z: number; dir: -1 | 1 }> = [
  { x: 164, z: 176, dir: -1 }, { x: 164, z: 56, dir: -1 }, { x: 40, z: 56, dir: 1 }, { x: 40, z: 24, dir: 1 }, { x: 250, z: 24, dir: 1 },
]
/** konuslar (ko'rinish uchun va urilish tekshiruvi) */
export const CONES: Array<[number, number]> = [
  [157.4, 128.6], [170.6, 119.4], [157.4, 111.4], [170.6, 104.2], [166.9, 178.9], [161.1, 173.4], [166.9, 173.1],
  [128.4, 53.9], [131.6, 53.9], [243.0, 79.2], [243.0, 88.8],
]

/* ---------- nazorat nuqtalari (12 ta mashq) ---------- */
export type Turn = '' | 'L' | 'R'
export interface Checkpoint { x: number; z: number; yaw: number; r: number; text: string; turn: Turn; name: string }
export const CHECKPOINTS: Checkpoint[] = [
  { name: 'Start', x: START_LINE, z: 176, yaw: E, r: 4, text: "START: kamarni taqing (B), chap ko'rsatkichni yoqing (Q) va chiziqdan o'ting", turn: '' },
  { name: 'Stop-liniya', x: STOP_LINE - 1, z: 176, yaw: E, r: 4, text: "STOP chizig'i oldida to'xtang (1 m dan uzoq emas), 3 soniya kuting", turn: '' },
  { name: 'Estakada', x: ESTAKADA_LINE - 1, z: 176, yaw: E, r: 4, text: "Estakada: chiziq oldida to'xtang, 30 soniyada orqaga siljimay yuring", turn: '' },
  { name: '90° burilish', x: 164, z: 168, yaw: N, r: 4, text: "90° burilish: chapga burilib, nazorat chiziqlariga tegmang", turn: 'L' },
  { name: 'Ilon izi', x: 164, z: 118, yaw: N, r: 4, text: "Ilon izi: chiziqlarga tegmasdan o'ting", turn: '' },
  { name: 'Svetofor', x: 164, z: LIGHT_LINE, yaw: N, r: 4, text: "Svetofor: qizil chiroqda to'xtang, yashilda o'ting", turn: '' },
  { name: 'Garaj (boks)', x: 130, z: 50.5, yaw: S, r: 4, text: "Garaj: orqaga yurib boksga kiring va chiziq oldida to'xtang", turn: '' },
  { name: "Temir yo'l", x: RAIL.stopX, z: 56, yaw: W, r: 4, text: "Temir yo'l: kesishma oldida to'liq to'xtang", turn: '' },
  { name: 'Tezlanish', x: 105, z: 24, yaw: E, r: 4, text: "Tezlanish: 2-uzatmaga o'ting, tezlik 40 km/s dan oshmasin", turn: '' },
  { name: 'Avariya', x: AVARIYA_X + 12, z: 24, yaw: E, r: 4, text: "Avariya signalida to'xtang va avariya chirog'ini (H) yoqing", turn: '' },
  { name: 'Parallel parkovka', x: 245.5, z: 84, yaw: S, r: 4, text: "Parallel parkovka: orqaga yurib joyga to'xtang", turn: '' },
  { name: 'Finish', x: 250, z: FINISH_Z, yaw: S, r: 4, text: "Finish: o'ng ko'rsatkichni (E) yoqing va chiziqdan o'ting", turn: 'R' },
]
export const START = { x: 28, z: 176, yaw: E }
/** 'R' bosilganda har bir mashq boshidan tiklash nuqtalari */
const RESPAWNS: Array<{ x: number; z: number; yaw: number }> = [
  START, { x: 54, z: 176, yaw: E }, { x: 92, z: 176, yaw: E }, { x: 122, z: 176, yaw: E }, { x: 164, z: 146, yaw: N }, { x: 164, z: 112, yaw: N },
  { x: 156, z: 56, yaw: W }, { x: 114, z: 56, yaw: W }, { x: 46, z: 24, yaw: E }, { x: 170, z: 24, yaw: E }, { x: 250, z: 62, yaw: S }, { x: 250, z: 130, yaw: S },
]

/* ---------- belgilar ---------- */
export interface Sign { x: number; z: number; face: Dir; kind: 'stop' | 'yield' | 'limit20' | 'limit40' | 'zebra' | 'round' | 'noentry' | 'park' }
/** face — belgi yuzi qaysi tomonga qaragan (kelayotgan haydovchi qaysi tomondan kelayotgani) */
const sg = (x: number, z: number, face: Dir, kind: Sign['kind']): Sign => ({ x, z, face, kind })
export const SIGNS: Sign[] = [
  sg(34, 180.2, 'W', 'limit20'), sg(72, 180.2, 'W', 'stop'), sg(104, 180.2, 'W', 'zebra'),
  sg(134, 180.2, 'W', 'limit20'), sg(160.5, 148, 'S', 'zebra'),
  sg(168.6, 94, 'S', 'zebra'), sg(160.6, 62, 'S', 'limit20'),
  sg(100, 52.6, 'E', 'limit20'), sg(94, 52.6, 'E', 'stop'),
  sg(44, 20.3, 'S', 'limit20'), sg(56, 27.8, 'W', 'limit40'), sg(154, 27.8, 'W', 'limit20'),
  sg(254.6, 40, 'N', 'limit20'), sg(254.6, 78, 'N', 'park'), sg(254.6, 150, 'N', 'stop'),
]
/** svetofor boshlari: shimolga ketayotganlar uchun, o'ng tomonda */
export const LIGHT_HEADS: Array<{ x: number; z: number; dir: Dir; axis: 'x' | 'z' }> = [
  { x: 168.4, z: 92.6, dir: 'N', axis: 'z' },
]

/* ---------- tezlik zonalari ---------- */
export const limitAt = (mx: number, mz: number): number => (mz < 30 && mz > 18 && mx > ACCEL.x0 - 4 && mx < ACCEL.x1 + 6 ? 40 : 20)

/* ---------- geometriya yordamchilari ---------- */
export const distSeg = (px: number, pz: number, a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz
  const t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2)) : 0
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz))
}
/** nuqtadan eng yaqin marshrut kesmasigacha masofa va o'sha kesma */
export function nearestSeg(mx: number, mz: number, onlyCtrl = false) {
  let best = 1e9, seg: Seg | null = null
  for (const s of SEGS) { if (onlyCtrl && !s.ctrl) continue; const d = distSeg(mx, mz, s.a, s.b); if (d < best) { best = d; seg = s } }
  return { d: best, seg }
}
/** marshrut zonasida (yo'l yoki ruxsat etilgan maydon) mi */
export function onRoute(mx: number, mz: number): boolean {
  for (const s of SEGS) if (distSeg(mx, mz, s.a, s.b) <= s.w / 2 + 0.6) return true
  for (const p of PADS) if (p.ok && mx >= p.x0 - 0.6 && mx <= p.x1 + 0.6 && mz >= p.z0 - 0.6 && mz <= p.z1 + 0.6) return true
  return false
}

/* ---------- geometriya: asfalt maskasi ---------- */
function strokeSeg(g: CanvasRenderingContext2D, s: number, sg2: Seg, w: number) {
  g.lineWidth = w * s; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(sg2.a[0] * s, sg2.a[1] * s); g.lineTo(sg2.b[0] * s, sg2.b[1] * s); g.stroke()
}
/** asfalt maskasini chizadi: oq = asfalt. s — piksel/metr */
export function drawMask(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = '#000'; g.fillRect(0, 0, MAP_W * s, MAP_H * s)
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'
  for (const sg2 of SEGS) strokeSeg(g, s, sg2, sg2.w)
  for (const p of PADS) g.fillRect(p.x0 * s, p.z0 * s, (p.x1 - p.x0) * s, (p.z1 - p.z0) * s)
}

/* ---------- fizik sirt: maska bo'yicha ---------- */
const LO = 2   // 2 piksel / metr
let lo: Uint8Array | null = null
let loBand: Uint8Array | null = null
function buildLo() {
  const cv = document.createElement('canvas'); cv.width = MAP_W * LO; cv.height = MAP_H * LO
  const g = cv.getContext('2d', { willReadFrequently: true })!; drawMask(g, LO)
  const d = g.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height
  lo = new Uint8Array(n); for (let i = 0; i < n; i++) lo[i] = d[i * 4] > 127 ? 1 : 0
  const w = cv.width, h = cv.height; loBand = new Uint8Array(n)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (lo[y * w + x]) continue
    let near = false
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && lo[yy * w + xx]) { near = true; break } }
    if (near) loBand[y * w + x] = 1
  }
}
export type Surf = 'road' | 'sidewalk' | 'grass'
export function surfaceAtMap(mx: number, mz: number): Surf {
  if (!lo) buildLo()
  const w = MAP_W * LO, h = MAP_H * LO, x = Math.floor(mx * LO), y = Math.floor(mz * LO)
  if (x < 0 || y < 0 || x >= w || y >= h) return 'grass'
  const i = y * w + x
  return lo![i] ? 'road' : loBand![i] ? 'sidewalk' : 'grass'
}
export const examSurface = (X: number, Z: number): Surf => surfaceAtMap(x2px(X), z2px(Z))

/* ---------- boshlanish va tiklash ---------- */
export const examStart = () => ({ x: px2x(START.x), z: px2z(START.z), yaw: START.yaw })
/** 'cp' ta mashq bajarilgan: keyingi mashq boshidan tiklash */
export function examRespawn(cp: number) {
  const r = RESPAWNS[Math.max(0, Math.min(RESPAWNS.length - 1, cp))]
  return { x: px2x(r.x), z: px2z(r.z), yaw: r.yaw }
}

/* ---------- rasm (tekstura) ---------- */
const hash = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s) }
/** butun maydon rasmi. s — piksel/metr (10 yaxshi, 6 yengil) */
export function drawExam(cv: HTMLCanvasElement, s: number, opts: { markings?: boolean } = {}) {
  const w = Math.round(MAP_W * s), h = Math.round(MAP_H * s); cv.width = w; cv.height = h
  const g = cv.getContext('2d', { willReadFrequently: true })!
  const mk = document.createElement('canvas'); mk.width = w; mk.height = h
  const mg = mk.getContext('2d', { willReadFrequently: true })!; drawMask(mg, s)
  const md = mg.getImageData(0, 0, w, h).data
  const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = md[i * 4] > 127 ? 1 : 0
  // bordyur zonasi: asfaltdan ~0.6 m masofa
  const r = Math.max(2, Math.round(0.62 * s)), tmp = new Uint8Array(w * h), band = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) { const row = y * w; for (let x = 0; x < w; x++) { let v = 0; const a = Math.max(0, x - r), b = Math.min(w - 1, x + r); for (let k = a; k <= b; k++) if (m[row + k]) { v = 1; break } tmp[row + x] = v } }
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) { let v = 0; const a = Math.max(0, y - r), b = Math.min(h - 1, y + r); for (let k = a; k <= b; k++) if (tmp[k * w + x]) { v = 1; break } band[y * w + x] = v } }
  const img = g.createImageData(w, h), o = img.data, stripe = Math.max(4, Math.round(1.0 * s))
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4, n = hash(x * 0.37, y * 0.41)
    let R: number, G: number, B: number
    if (m[i]) { const t = 54 + n * 7; R = t; G = t + 2; B = t + 8 }
    else if (band[i]) { const yel = ((Math.floor(x / stripe) + Math.floor(y / stripe)) & 1) === 0; if (yel) { R = 238; G = 192; B = 38 } else { R = 236; G = 236; B = 228 } }
    else { const t = n * 18, big = hash(Math.floor(x / 14), Math.floor(y / 14)) * 14; R = 66 + t * 0.5 + big * 0.4; G = 128 + t + big; B = 56 + t * 0.4 }
    o[p] = R; o[p + 1] = G; o[p + 2] = B; o[p + 3] = 255
  }
  g.putImageData(img, 0, 0)
  if (opts.markings === false) return
  paintMarkings(g, s)
}

const ROT: Record<Dir, number> = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 }
function paintMarkings(g: CanvasRenderingContext2D, s: number) {
  const rect = (x0: number, z0: number, x1: number, z1: number) => g.fillRect(x0 * s, z0 * s, (x1 - x0) * s, (z1 - z0) * s)
  const ASPH = '#37393f'
  /* yo'l chekkasidagi chiziqlar: oq kontur ustiga asfalt */
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'
  for (const sg2 of SEGS) { g.strokeStyle = 'rgba(247,247,242,.9)'; strokeSeg(g, s, sg2, sg2.w - (sg2.ctrl ? 0.05 : 0.4)) }
  for (const sg2 of SEGS) { g.strokeStyle = ASPH; strokeSeg(g, s, sg2, sg2.w - (sg2.ctrl ? 0.5 : 0.8)) }
  /* tutashgan joylardagi dog'larni yopish */
  g.fillStyle = ASPH
  for (const [x, z] of [[138, 176], [164, 150], [164, 136], [164, 98]]) { g.beginPath(); g.arc(x * s, z * s, 2.75 * s, 0, 7); g.fill() }
  g.restore()
  /* qo'shimcha maydonlar: kontur */
  g.strokeStyle = 'rgba(247,247,242,.9)'; g.lineWidth = 0.14 * s
  g.fillStyle = ASPH; rect(PADS[0].x0, PADS[0].z0 - 0.3, PADS[0].x1, PADS[0].z1 + 0.3)
  g.lineCap = 'butt'
  for (const p of [PADS[1], PADS[2], PADS[3]]) {   // boks: 3 tomonli chiziq (yo'l tomoni ochiq)
    g.beginPath(); g.moveTo((p.x0 + 0.1) * s, (p.z1 + 0.2) * s); g.lineTo((p.x0 + 0.1) * s, (p.z0 + 0.1) * s); g.lineTo((p.x1 - 0.1) * s, (p.z0 + 0.1) * s); g.lineTo((p.x1 - 0.1) * s, (p.z1 + 0.2) * s); g.stroke()
  }
  g.beginPath(); g.moveTo((SLOT.x1 + 0.2) * s, (SLOT.z0 + 0.1) * s); g.lineTo((SLOT.x0 + 0.1) * s, (SLOT.z0 + 0.1) * s); g.lineTo((SLOT.x0 + 0.1) * s, (SLOT.z1 - 0.1) * s); g.lineTo((SLOT.x1 + 0.2) * s, (SLOT.z1 - 0.1) * s); g.stroke()
  /* ko'ndalang yo'lning o'rta chizig'i */
  g.fillStyle = 'rgba(250,250,245,.85)'
  for (let x = 142; x < 188; x += 3) rect(x, 83.93, x + 1.6, 84.07)
  g.fillStyle = ASPH; rect(160.2, 80.6, 167.8, 87.4)
  /* garaj maydoni: xira chiziqlar */
  g.fillStyle = 'rgba(247,247,242,.85)'
  rect(BOX.x0 + 0.05, BOX.backLine - 0.12, BOX.x1 - 0.05, BOX.backLine + 0.12)         // boks orqa chizig'i (qalin)
  g.fillStyle = 'rgba(255,196,0,.9)'; rect(BOX.x0 + 0.05, BOX.backLine + 0.6, BOX.x1 - 0.05, BOX.backLine + 0.75)
  /* yo'nalish strelkalari */
  g.fillStyle = 'rgba(250,250,245,.9)'
  const arrow = (x: number, z: number, dir: Dir) => {
    g.save(); g.translate(x * s, z * s); g.rotate({ N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }[dir]); g.scale(s, s)
    g.beginPath(); g.rect(-1.6, -0.14, 2.6, 0.28); g.fill(); g.beginPath(); g.moveTo(1.0, -0.62); g.lineTo(2.1, 0); g.lineTo(1.0, 0.62); g.closePath(); g.fill(); g.restore()
  }
  for (const [a, b, d] of [[48, 176, 'E'], [96, 176, 'E'], [124, 176, 'E'], [164, 80, 'N'], [164, 66, 'N'], [150, 56, 'W'], [60, 56, 'W'], [40, 40, 'N'], [80, 24, 'E'], [120, 24, 'E'], [160, 24, 'E'], [210, 24, 'E'], [250, 50, 'S'], [250, 110, 'S'], [250, 140, 'S']] as Array<[number, number, Dir]>) arrow(a, b, d)
  /* chiziqlar */
  const bar = (x0: number, z0: number, x1: number, z1: number) => { g.fillStyle = 'rgba(252,252,248,.96)'; rect(x0, z0, x1, z1) }
  bar(STOP_LINE, 173.2, STOP_LINE + 0.55, 178.8)                          // STOP chizig'i
  bar(164 - 2.8, LIGHT_LINE - 0.55, 164 + 2.8, LIGHT_LINE)                // svetofor chizig'i
  bar(RAIL.stopX, 53.2, RAIL.stopX + 0.55, 58.8)                           // temir yo'l oldidagi chiziq
  g.fillStyle = 'rgba(255,196,0,.95)'; rect(ESTAKADA_LINE, 173.2, ESTAKADA_LINE + 0.55, 178.8)   // estakada chizig'i
  /* estakada: sariq-qora yo'llar */
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? 'rgba(20,20,20,.9)' : 'rgba(255,196,0,.9)'; rect(ESTAKADA_LINE + 1 + k * 1.4, 173.4, ESTAKADA_LINE + 1 + k * 1.4 + 0.7, 178.6) }
  /* start va finish: shaxmat chizig'i */
  const chess = (x0: number, z0: number, x1: number, z1: number) => { const c = 0.5; for (let i = 0; i * c < x1 - x0; i++) for (let j = 0; j * c < z1 - z0; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#111'; rect(x0 + i * c, z0 + j * c, Math.min(x1, x0 + (i + 1) * c), Math.min(z1, z0 + (j + 1) * c)) } }
  chess(START_LINE, 173.1, START_LINE + 1, 178.9)
  chess(247.1, FINISH_Z, 252.9, FINISH_Z + 1)
  /* temir yo'l: shpal va relslar */
  for (let z = RAIL.z0; z < RAIL.z1; z += 0.8) { g.fillStyle = 'rgba(74,52,34,.95)'; rect(RAIL.x - 2.3, z, RAIL.x + 2.3, z + 0.35) }
  g.fillStyle = 'rgba(176,180,188,.98)'; rect(RAIL.x - 1.2, RAIL.z0, RAIL.x - 0.95, RAIL.z1); rect(RAIL.x + 0.95, RAIL.z0, RAIL.x + 1.2, RAIL.z1)
  /* parallel parkovka belgilari */
  g.fillStyle = 'rgba(252,252,248,.95)'
  rect(SLOT.x0 + 0.1, SLOT.z0 + 0.1, SLOT.x1 - 0.1, SLOT.z0 + 0.28); rect(SLOT.x0 + 0.1, SLOT.z1 - 0.28, SLOT.x1 - 0.1, SLOT.z1 - 0.1)
  /* yozuvlar (haydovchi o'qiydigan tomonga qaragan) */
  g.save(); g.fillStyle = 'rgba(250,250,245,.88)'; g.textAlign = 'center'; g.textBaseline = 'middle'
  const label = (txt: string, x: number, z: number, dir: Dir, size = 1.7, stretch = 2.4) => { g.save(); g.translate(x * s, z * s); g.rotate(ROT[dir]); g.font = `bold ${size * s}px Arial Narrow, Arial`; g.scale(1, stretch); g.fillText(txt, 0, 0); g.restore() }
  label('START', 34, 176, 'E', 1.5); label('STOP', STOP_LINE - 6, 176, 'E', 1.5); label('ESTAKADA', 100, 176, 'E', 1.2)
  label('20', 132, 176, 'E', 1.8); label('20', 164, 70, 'N', 1.8); label('40', 70, 24, 'E', 2.2); label('2', 140, 24, 'E', 2.4)
  label('FINISH', 250, 150, 'S', 1.4); label('STOP', 86 + 14, 56, 'W', 1.4)
  label('P', 245.5, 84, 'S', 2.4, 1.4); label('B', 130, 50.7, 'S', 2.0, 1.2)
  g.restore()
}

/** mini-xarita uchun: marshrut yo'l nuqtalari */
export const ROUTE_PTS: Array<[number, number]> = [[START.x, START.z], ...SEGS.map((q) => q.b)]
