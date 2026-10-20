/**
 * IMTIHON AVTODROMI — yopiq o'quv shaharchasi: chorrahalar, aylanma yo'l, svetofor, STOP, piyodalar o'tish joyi.
 * Hamma narsa "metr" koordinatasida (xarita: 240 x 180 m, chap-yuqori burchak = 0,0) beriladi. Bitta joydan ham rasm (tekstura),
 * ham fizika (asfalt / bordyur / o't), ham mini-xarita chiziladi — shuning uchun ular hech qachon bir-biridan farq qilmaydi.
 * Harakat o'ng tomonlama: sharqqa ketayotgan mashina yo'lning janubiy (z+) yarmida, shimolga ketayotgan — sharqiy (x+) yarmida.
 */
export const MAP_W = 240, MAP_H = 180
export const px2x = (mx: number) => mx - MAP_W / 2
export const px2z = (mz: number) => mz - MAP_H / 2
export const x2px = (X: number) => X + MAP_W / 2
export const z2px = (Z: number) => Z + MAP_H / 2
export const RW = 7                 // yo'l kengligi (2 ta polosa)
export const HW = RW / 2
export const LN = RW / 4            // polosa markazi yo'l o'qidan
export const BOUND = { x0: 4, z0: 4, x1: MAP_W - 4, z1: MAP_H - 4 }

export interface Road { a: [number, number]; b: [number, number]; name: string }
export const ROADS: Road[] = [
  { name: 'HA', a: [22, 22], b: [154, 22] },
  { name: 'HB', a: [22, 90], b: [218, 90] },
  { name: 'HC', a: [22, 158], b: [218, 158] },
  { name: 'VA', a: [22, 22], b: [22, 158] },
  { name: 'VB', a: [88, 22], b: [88, 158] },
  { name: 'VC', a: [154, 22], b: [154, 158] },
  { name: 'VD', a: [218, 90], b: [218, 158] },
]
const isH = (r: Road) => r.a[1] === r.b[1]
export const ROUND = { x: 88, z: 90, ro: 16, ri: 8 }          // aylanma yo'l: tashqi va ichki (orol) radius
export const LIGHT_X = { x: 154, z: 90 }                       // svetoforli chorraha

/* ---------- marshrut (12 nazorat nuqtasi) ---------- */
export type Turn = '' | 'L' | 'R'
export interface Checkpoint { x: number; z: number; yaw: number; r: number; text: string; turn: Turn }
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI, S = 0
export const CHECKPOINTS: Checkpoint[] = [
  { x: 62, z: 158 + LN, yaw: E, r: 6, text: "To'g'ri yuring", turn: '' },
  { x: 88 + LN, z: 136, yaw: N, r: 6, text: "Chorrahada chapga buriling, piyodalar o'tish joyida sekinlang", turn: 'L' },
  { x: 88 + ROUND.ro + 3, z: 90 + LN, yaw: E, r: 6, text: "Aylanma yo'l: 1-chiqishdan (o'ngga) chiqing", turn: '' },
  { x: 154 - LN, z: 112, yaw: S, r: 6, text: "Svetoforda o'ngga buriling", turn: 'R' },
  { x: 154 - LN, z: 147, yaw: S, r: 5, text: "STOP belgisi: to'liq to'xtang", turn: '' },
  { x: 178, z: 158 + LN, yaw: E, r: 6, text: "Chapga buriling", turn: 'L' },
  { x: 218 + LN, z: 128, yaw: N, r: 6, text: "Chapga buriling", turn: 'L' },
  { x: 188, z: 90 - LN, yaw: W, r: 6, text: "Chapga buriling, svetoforga e'tibor bering", turn: 'L' },
  { x: 154 + LN, z: 60, yaw: N, r: 6, text: "Svetofordan keyin o'ngga buriling", turn: 'R' },
  { x: 120, z: 22 - LN, yaw: W, r: 6, text: "Chapga buriling", turn: 'L' },
  { x: 22 - LN, z: 60, yaw: S, r: 6, text: "Chapga buriling", turn: 'L' },
  { x: 76, z: 158 + LN, yaw: E, r: 6, text: "Chapga buriling va marraga yeting", turn: 'L' },
]
export const START = { x: 32, z: 158 + LN, yaw: E }

/* ---------- belgilar va to'siqlar ro'yxati ---------- */
/** zebra: (cx,cz) markaz; ori 'h' — gorizontal yo'l (chiziqlar x bo'ylab), 'v' — vertikal yo'l */
export const ZEBRAS: Array<{ x: number; z: number; o: 'h' | 'v' }> = [
  { x: 190, z: 158, o: 'h' }, { x: 88, z: 125, o: 'v' }, { x: 120, z: 90, o: 'h' }, { x: 100, z: 22, o: 'h' }, { x: 22, z: 125, o: 'v' },
]
export type Dir = 'E' | 'W' | 'N' | 'S'
/** to'xtash chizig'i: (cx,cz) — chorraha markazi, dir — kelayotgan mashina yo'nalishi */
export const STOPLINES: Array<{ cx: number; cz: number; dir: Dir; dashed?: boolean }> = [
  { cx: 154, cz: 90, dir: 'E' }, { cx: 154, cz: 90, dir: 'W' }, { cx: 154, cz: 90, dir: 'N' }, { cx: 154, cz: 90, dir: 'S' },
  { cx: 154, cz: 158, dir: 'S' }, { cx: 22, cz: 90, dir: 'W', dashed: true }, { cx: 88, cz: 158, dir: 'S', dashed: true }, { cx: 88, cz: 22, dir: 'N', dashed: true },
]
export interface Sign { x: number; z: number; face: Dir; kind: 'stop' | 'yield' | 'limit20' | 'limit40' | 'zebra' | 'round' | 'noentry' }
/** face — belgi yuzi qaysi tomonga qaragan (ya'ni kelayotgan haydovchi qaysi tomonga qarab ketayotganining teskarisi) */
const sg = (x: number, z: number, face: Dir, kind: Sign['kind']): Sign => ({ x, z, face, kind })
export const SIGNS: Sign[] = [
  sg(154 - HW - 1.1, 148, 'N', 'stop'),
  sg(30, 90 - HW - 1.1, 'E', 'yield'), sg(88 - HW - 1.1, 150, 'N', 'yield'), sg(88 + HW + 1.1, 30, 'S', 'yield'),
  /* aylanma yo'l */
  sg(88 + HW + 1.2, 90 + ROUND.ro + 9, 'N', 'round'), sg(88 - ROUND.ro - 9, 90 - HW - 1.2, 'E', 'round'), sg(88 - HW - 1.2, 90 - ROUND.ro - 9, 'S', 'round'), sg(88 + ROUND.ro + 9, 90 + HW + 1.2, 'W', 'round'),
  /* zebra va tezlik */
  sg(190 - 14, 158 + HW + 1.2, 'W', 'limit20'), sg(190 - 3.6, 158 + HW + 1.1, 'W', 'zebra'), sg(190 + 3.6, 158 - HW - 1.1, 'E', 'zebra'), sg(190 + 14, 158 + HW + 1.2, 'W', 'limit40'),
  sg(88 + HW + 1.2, 125 + 14, 'N', 'limit20'), sg(88 + HW + 1.1, 125 + 3.6, 'N', 'zebra'), sg(88 - HW - 1.1, 125 - 3.6, 'S', 'zebra'),
  sg(120 - 14, 90 + HW + 1.2, 'W', 'limit20'), sg(120 - 3.6, 90 + HW + 1.1, 'W', 'zebra'), sg(120 + 3.6, 90 - HW - 1.1, 'E', 'zebra'), sg(120 + 14, 90 + HW + 1.2, 'W', 'limit40'),
  sg(100 + 14, 22 - HW - 1.2, 'E', 'limit20'), sg(100 + 3.6, 22 - HW - 1.1, 'E', 'zebra'), sg(100 - 3.6, 22 + HW + 1.1, 'W', 'zebra'),
  sg(22 - HW - 1.2, 125 - 14, 'S', 'limit20'), sg(22 - HW - 1.1, 125 - 3.6, 'S', 'zebra'), sg(22 + HW + 1.1, 125 + 3.6, 'N', 'zebra'),
  /* boshqa */
  sg(40, 158 + HW + 1.2, 'W', 'limit40'), sg(60, 22 - HW - 1.2, 'E', 'limit40'), sg(154 + HW + 1.2, 40, 'S', 'limit40'),
  sg(218 + HW + 1.2, 150, 'S', 'noentry'),
]
/** svetofor boshlari: chorraha markazidan yaqinlashish tomoni */
export const LIGHT_HEADS: Array<{ x: number; z: number; dir: Dir; axis: 'x' | 'z' }> = (() => {
  const { x, z } = LIGHT_X, d = HW + 2.6, o = HW + 1.0
  return [
    { x: x - d, z: z + o, dir: 'E', axis: 'x' as const }, { x: x + d, z: z - o, dir: 'W', axis: 'x' as const },
    { x: x - o, z: z - d, dir: 'S', axis: 'z' as const }, { x: x + o, z: z + d, dir: 'N', axis: 'z' as const },
  ]
})()
/** to'xtash joylari (STOP): zona va kesib o'tish maydoni */
export const STOPZONES = [{ axis: 'z' as const, x0: 154 - HW, x1: 154, z0: 148, z1: 155.2, cross: { x0: 154 - HW, x1: 154 + HW, z0: 155.2, z1: 158 + HW } }]

/** tezlik zonalari (20 km/s) va umumiy chegara */
export const LIMIT_DEFAULT = 40
export const LIMIT_ZONES: Array<{ x0: number; z0: number; x1: number; z1: number; limit: number }> = [
  ...ZEBRAS.map((q) => (q.o === 'h' ? { x0: q.x - 16, z0: q.z - HW - 1, x1: q.x + 16, z1: q.z + HW + 1, limit: 20 } : { x0: q.x - HW - 1, z0: q.z - 16, x1: q.x + HW + 1, z1: q.z + 16, limit: 20 })),
  { x0: ROUND.x - ROUND.ro - 14, z0: ROUND.z - ROUND.ro - 14, x1: ROUND.x + ROUND.ro + 14, z1: ROUND.z + ROUND.ro + 14, limit: 20 },
]
export function limitAt(mx: number, mz: number): number {
  let l = LIMIT_DEFAULT
  for (const q of LIMIT_ZONES) if (mx >= q.x0 && mx <= q.x1 && mz >= q.z0 && mz <= q.z1) l = Math.min(l, q.limit)
  return l
}

/* ---------- geometriya: asfalt maskasi ---------- */
function roadRect(r: Road): [number, number, number, number] {
  const x0 = Math.min(r.a[0], r.b[0]), x1 = Math.max(r.a[0], r.b[0]), z0 = Math.min(r.a[1], r.b[1]), z1 = Math.max(r.a[1], r.b[1])
  return isH(r) ? [x0 - HW, z0 - HW, x1 + HW, z0 + HW] : [x0 - HW, z0 - HW, x0 + HW, z1 + HW]
}
interface Fillet { px: number; pz: number; sx: number; sz: number; convex: boolean }
function fillets(): Fillet[] {
  const out: Fillet[] = []
  for (const h of ROADS.filter(isH)) for (const v of ROADS.filter((r) => !isH(r))) {
    const xv = v.a[0], zh = h.a[1]
    const hMin = Math.min(h.a[0], h.b[0]), hMax = Math.max(h.a[0], h.b[0]), vMin = Math.min(v.a[1], v.b[1]), vMax = Math.max(v.a[1], v.b[1])
    if (xv < hMin || xv > hMax || zh < vMin || zh > vMax) continue
    const west = hMin < xv, east = hMax > xv, north = vMin < zh, south = vMax > zh
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      const hArm = sx > 0 ? east : west, vArm = sz > 0 ? south : north
      const px = xv + sx * HW, pz = zh + sz * HW
      if (hArm && vArm) out.push({ px, pz, sx, sz, convex: false })
      else if (!hArm && !vArm) out.push({ px, pz, sx, sz, convex: true })
    }
  }
  return out
}
const FR = 6
/** asfalt maskasini chizadi: oq = asfalt. s — piksel/metr */
export function drawMask(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = '#000'; g.fillRect(0, 0, MAP_W * s, MAP_H * s)
  g.fillStyle = '#fff'
  for (const r of ROADS) { const [x0, z0, x1, z1] = roadRect(r); g.fillRect(x0 * s, z0 * s, (x1 - x0) * s, (z1 - z0) * s) }
  g.beginPath(); g.arc(ROUND.x * s, ROUND.z * s, ROUND.ro * s, 0, Math.PI * 2); g.fill()
  for (const f of fillets()) {
    if (f.convex) {
      // burchakni yumaloqlash: asfaltdan (ichkariga) kesib tashlaymiz
      const cx = f.px - f.sx * FR, cz = f.pz - f.sz * FR
      g.save(); g.globalCompositeOperation = 'destination-out'
      g.beginPath(); g.rect(Math.min(f.px, cx) * s, Math.min(f.pz, cz) * s, FR * s, FR * s); g.arc(cx * s, cz * s, FR * s, 0, Math.PI * 2, true); g.fill('evenodd'); g.restore()
      g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(Math.min(f.px, cx) * s, Math.min(f.pz, cz) * s, FR * s, FR * s); g.arc(cx * s, cz * s, FR * s, 0, Math.PI * 2, true); g.fill('evenodd'); g.restore()
    } else {
      const cx = f.px + f.sx * FR, cz = f.pz + f.sz * FR
      g.beginPath(); g.rect(Math.min(f.px, cx) * s, Math.min(f.pz, cz) * s, FR * s, FR * s); g.arc(cx * s, cz * s, FR * s, 0, Math.PI * 2, true); g.fill('evenodd')
    }
  }
  g.fillStyle = '#000'; g.beginPath(); g.arc(ROUND.x * s, ROUND.z * s, ROUND.ri * s, 0, Math.PI * 2); g.fill()
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
/** oxirgi o'tilgan nazorat nuqtasidan (yoki startdan) tiklash */
export function examRespawn(cpIndex: number) {
  if (cpIndex <= 0) return examStart()
  const c = CHECKPOINTS[Math.min(CHECKPOINTS.length, cpIndex) - 1]
  return { x: px2x(c.x), z: px2z(c.z), yaw: c.yaw }
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
  // bordyur zonasi: asfaltdan ~0.6 m masofa (ajratiladigan max-filtr)
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

function paintMarkings(g: CanvasRenderingContext2D, s: number) {
  const rect = (x0: number, z0: number, x1: number, z1: number) => g.fillRect(x0 * s, z0 * s, (x1 - x0) * s, (z1 - z0) * s)
  g.fillStyle = 'rgba(250,250,245,.92)'
  /* o'q chiziq: uzuq oq */
  const blockedH: Array<[number, number]>[] = [], cross = ROADS
  for (const rd of ROADS) {
    const h = isH(rd), c = h ? rd.a[1] : rd.a[0], a0 = h ? Math.min(rd.a[0], rd.b[0]) : Math.min(rd.a[1], rd.b[1]), a1 = h ? Math.max(rd.a[0], rd.b[0]) : Math.max(rd.a[1], rd.b[1])
    const block: Array<[number, number]> = []
    for (const o of cross) { if (o === rd || isH(o) === h) continue; const oc = h ? o.a[0] : o.a[1]; const lo2 = h ? Math.min(o.a[1], o.b[1]) : Math.min(o.a[0], o.b[0]), hi2 = h ? Math.max(o.a[1], o.b[1]) : Math.max(o.a[0], o.b[0]); if (c >= lo2 && c <= hi2) block.push([oc - HW - 0.3, oc + HW + 0.3]) }
    if (Math.abs((h ? ROUND.z : ROUND.x) - c) < 0.1) { const rc = h ? ROUND.x : ROUND.z; block.push([rc - ROUND.ro - 0.3, rc + ROUND.ro + 0.3]) }
    for (const q of ZEBRAS) { if ((q.o === 'h') !== h) continue; const qc = h ? q.x : q.z, qo = h ? q.z : q.x; if (Math.abs(qo - c) < 0.1) block.push([qc - 3.4, qc + 3.4]) }
    for (const sl of STOPLINES) { const near = h ? Math.abs(sl.cz - c) < 0.1 : Math.abs(sl.cx - c) < 0.1; if (near) { const sc = h ? sl.cx : sl.cz; block.push([sc - HW - 5, sc + HW + 5]) } }
    blockedH.push(block)
    const lw = 0.16
    for (let t = a0 + 1; t < a1 - 1; t += 6) {
      const e = Math.min(t + 3, a1 - 1); if (block.some(([u, v]) => e > u && t < v)) continue
      if (h) rect(t, c - lw / 2, e, c + lw / 2); else rect(c - lw / 2, t, c + lw / 2, e)
    }
  }
  /* yo'l chetidagi uzluksiz chiziq (asfalt chekkasidan 0.35 m ichkarida) — faqat to'g'ri qismlarda */
  g.fillStyle = 'rgba(245,245,240,.8)'
  for (const rd of ROADS) {
    const h = isH(rd), c = h ? rd.a[1] : rd.a[0], a0 = h ? Math.min(rd.a[0], rd.b[0]) : Math.min(rd.a[1], rd.b[1]), a1 = h ? Math.max(rd.a[0], rd.b[0]) : Math.max(rd.a[1], rd.b[1])
    const block: Array<[number, number]> = []
    for (const o of ROADS) { if (o === rd || isH(o) === h) continue; const lo2 = h ? Math.min(o.a[1], o.b[1]) : Math.min(o.a[0], o.b[0]), hi2 = h ? Math.max(o.a[1], o.b[1]) : Math.max(o.a[0], o.b[0]); if (c >= lo2 - 0.01 && c <= hi2 + 0.01) { const oc = h ? o.a[0] : o.a[1]; block.push([oc - HW - 0.4, oc + HW + 0.4]) } }
    const rcAlong = h ? ROUND.x : ROUND.z, rcAcross = h ? ROUND.z : ROUND.x
    if (Math.abs(rcAcross - c) < ROUND.ro + HW) block.push([rcAlong - ROUND.ro - 6, rcAlong + ROUND.ro + 6])
    const edges = [c - HW + 0.4, c + HW - 0.4]
    for (const e of edges) {
      let t = a0 - HW + 2
      const stops = [a0 - HW + 2, ...block.flatMap(([u, v]) => [u, v]).sort((p, q) => p - q), a1 + HW - 2]
      for (let k = 0; k + 1 < stops.length; k += 2) {
        const u = stops[k], v = stops[k + 1]; if (v <= u) continue; t = u
        if (h) rect(u, e - 0.07, v, e + 0.07); else rect(e - 0.07, u, e + 0.07, v)
      }
    }
  }
  void blockedH
  /* zebra: sariq-oq o'rniga oq keng chiziqlar (bo'yoq) */
  g.fillStyle = 'rgba(252,252,248,.95)'
  for (const q of ZEBRAS) {
    for (let k = -HW + 0.35; k < HW - 0.2; k += 1.0) {
      if (q.o === 'h') rect(q.x - 2.2, q.z + k, q.x + 2.2, q.z + k + 0.55); else rect(q.x + k, q.z - 2.2, q.x + k + 0.55, q.z + 2.2)
    }
  }
  /* to'xtash chiziqlari */
  for (const sl of STOPLINES) {
    const d = HW + 2.2, t = 0.5
    g.fillStyle = 'rgba(252,252,248,.96)'
    const draw = (x0: number, z0: number, x1: number, z1: number) => {
      if (!sl.dashed) { rect(x0, z0, x1, z1); return }
      const horiz = (x1 - x0) > (z1 - z0), len = horiz ? x1 - x0 : z1 - z0
      for (let u = 0; u < len; u += 0.8) { if (horiz) rect(x0 + u, z0, Math.min(x1, x0 + u + 0.45), z1); else rect(x0, z0 + u, x1, Math.min(z1, z0 + u + 0.45)) }
    }
    if (sl.dir === 'E') draw(sl.cx - d - t, sl.cz + 0.15, sl.cx - d, sl.cz + HW - 0.15)
    if (sl.dir === 'W') draw(sl.cx + d, sl.cz - HW + 0.15, sl.cx + d + t, sl.cz - 0.15)
    if (sl.dir === 'S') draw(sl.cx - HW + 0.15, sl.cz - d - t, sl.cx - 0.15, sl.cz - d)
    if (sl.dir === 'N') draw(sl.cx + 0.15, sl.cz + d, sl.cx + HW - 0.15, sl.cz + d + t)
  }
  /* aylanma yo'l: kirish chizig'i (uzuq yoy) va burilish strelkalari */
  g.strokeStyle = 'rgba(250,250,245,.85)'; g.lineWidth = 0.22 * s; g.setLineDash([0.9 * s, 0.9 * s])
  g.beginPath(); g.arc(ROUND.x * s, ROUND.z * s, (ROUND.ri + ROUND.ro) / 2 * s, 0, Math.PI * 2); g.stroke(); g.setLineDash([])
  /* pol strelkalari */
  g.fillStyle = 'rgba(250,250,245,.9)'
  const arrow = (x: number, z: number, dir: Dir, kind: 'S' | 'L' | 'R') => {
    g.save(); g.translate(x * s, z * s); g.rotate({ N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }[dir]); g.scale(s, s)
    g.beginPath(); g.rect(-1.6, -0.14, 2.6, 0.28); g.fill()
    g.beginPath(); g.moveTo(1.0, -0.62); g.lineTo(2.1, 0); g.lineTo(1.0, 0.62); g.closePath(); g.fill()
    if (kind !== 'S') { const k = kind === 'L' ? -1 : 1; g.beginPath(); g.rect(-0.14, 0, 0.28, 0); g.fill(); g.save(); g.translate(-0.2, 0); g.rotate(k * Math.PI / 2.4); g.beginPath(); g.rect(0, -0.14, 1.6, 0.28); g.fill(); g.beginPath(); g.moveTo(1.5, -0.62); g.lineTo(2.6, 0); g.lineTo(1.5, 0.62); g.closePath(); g.fill(); g.restore() }
    g.restore()
  }
  arrow(154 - HW - 12, 90 + LN, 'E', 'S'); arrow(154 + HW + 12, 90 - LN, 'W', 'L'); arrow(154 - LN, 90 - HW - 12, 'S', 'S'); arrow(154 + LN, 90 + HW + 12, 'N', 'R')
  arrow(88 + LN, 158 - HW - 10, 'N', 'S'); arrow(62, 158 + LN, 'E', 'S'); arrow(154 - LN, 158 - HW - 10, 'S', 'L')
  arrow(218 - HW - 10, 158 + LN, 'E', 'L'); arrow(22 - LN, 90 - HW - 10, 'S', 'S')
  /* "STOP" yozuvi va 20 / 40 belgilari yo'lda */
  g.save(); g.fillStyle = 'rgba(250,250,245,.88)'; g.font = `bold ${2.4 * s}px Arial Narrow, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'
  const label = (txt: string, x: number, z: number, rot: number) => { g.save(); g.translate(x * s, z * s); g.rotate(rot); g.scale(1, 2.2); g.fillText(txt, 0, 0); g.restore() }
  label('STOP', 154 - LN, 158 - HW - 7.5, -Math.PI / 2 + Math.PI)
  label('20', 190 - 20, 158 + LN, -Math.PI / 2 * 0 + Math.PI / 2 * 0); label('20', 120 + 20, 90 - LN, Math.PI)
  g.restore()
  /* start/marra chizig'i (shaxmat) */
  const chess = (x0: number, z0: number, x1: number, z1: number) => { const c = 0.5; for (let i = 0; i * c < x1 - x0; i++) for (let j = 0; j * c < z1 - z0; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#111'; rect(x0 + i * c, z0 + j * c, Math.min(x1, x0 + (i + 1) * c), Math.min(z1, z0 + (j + 1) * c)) } }
  chess(76 - 0.5, 158 + 0.05, 76 + 0.5, 158 + HW - 0.05)
  g.fillStyle = 'rgba(250,250,245,.9)'; rect(32 - 0.2, 158 + 0.15, 32 + 0.2, 158 + HW - 0.15)
}

/** mini-xarota uchun: marshrutning yo'l nuqtalari (mashina yuradigan ketma-ket yo'l) */
export const ROUTE_PTS: Array<[number, number]> = [
  [START.x, START.z], [88 + LN, 158 + LN], [88 + LN, 100], [ROUND.x + ROUND.ro - 4, 90 + LN], [154 - LN, 90 + LN], [154 - LN, 158 - LN], [154 - LN, 158 + LN], [218 + LN, 158 + LN], [218 + LN, 90 - LN],
  [154, 90 - LN], [154 + LN, 90 - LN], [154 + LN, 22 - LN], [22 - LN, 22 - LN], [22 - LN, 158 + LN], [76, 158 + LN],
]
