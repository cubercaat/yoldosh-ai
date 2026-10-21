import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace, BackSide } from 'three'

/**
 * Yo'l belgilari to'plami (Vienna konvensiyasi uslubida: ogohlantiruvchi — qizil hoshiyali uchburchak, taqiqlovchi — qizil halqa,
 * buyuruvchi — ko'k doira, ma'lumot — ko'k kvadrat, ustuvor yo'l — sariq romb, STOP — qizil sakkizburchak).
 * Har bir belgi o'z shaklida chiziladi (orqasida kvadrat plastinka yo'q); orqa tomoni kulrang metall.
 */
export type ExamSignKind =
  | 'stop' | 'yield' | 'limit20' | 'limit40' | 'zebra' | 'park' | 'bump' | 'narrow' | 'steep' | 'rail' | 'tlight' | 'priority'
  | 'turnLeft' | 'turnRight' | 'straight' | 'noparking' | 'curve'

const S = 256, C = 128

function tri(g: CanvasRenderingContext2D) {
  const path = (inset: number, round: number) => {
    const a = [C, 12 + inset * 1.9], b = [S - 8 - inset * 1.7, S - 38 - inset * 0.55], c = [8 + inset * 1.7, S - 38 - inset * 0.55]
    g.beginPath(); g.lineJoin = 'round'; g.lineWidth = round
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath()
  }
  g.fillStyle = '#ffffff'; path(0, 0); g.fill()
  g.strokeStyle = '#ffffff'; g.lineWidth = 14; path(0, 14); g.stroke()
  g.fillStyle = '#d4141c'; path(5, 0); g.fill()
  g.strokeStyle = '#d4141c'; g.lineWidth = 18; path(5, 18); g.stroke()
  g.fillStyle = '#ffffff'; path(32, 0); g.fill()
  g.strokeStyle = '#ffffff'; g.lineWidth = 12; path(32, 12); g.stroke()
}

function blueSquare(g: CanvasRenderingContext2D) {
  g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(6, 6, S - 12, S - 12, 22); g.fill()
  g.fillStyle = '#0f5bb5'; g.beginPath(); g.roundRect(14, 14, S - 28, S - 28, 16); g.fill()
}
function blueCircle(g: CanvasRenderingContext2D) {
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(C, C, 124, 0, 7); g.fill()
  g.fillStyle = '#0f5bb5'; g.beginPath(); g.arc(C, C, 115, 0, 7); g.fill()
}

const DRAW: Record<ExamSignKind, (g: CanvasRenderingContext2D) => void> = {
  stop(g) {
    const oct = (r: number) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; g.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r) } g.closePath() }
    g.fillStyle = '#fff'; oct(126); g.fill(); g.fillStyle = '#d4141c'; oct(114); g.fill()
    g.fillStyle = '#fff'; g.font = '900 78px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', C, C + 4)
  },
  yield(g) {
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(4, 26); g.lineTo(S - 4, 26); g.lineTo(C, 246); g.closePath(); g.fill()
    g.fillStyle = '#d4141c'; g.beginPath(); g.moveTo(16, 34); g.lineTo(S - 16, 34); g.lineTo(C, 226); g.closePath(); g.fill()
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(66, 66); g.lineTo(S - 66, 66); g.lineTo(C, 178); g.closePath(); g.fill()
  },
  limit20(g) { limit(g, '20') },
  limit40(g) { limit(g, '40') },
  zebra(g) {
    blueSquare(g)
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(C, 38); g.lineTo(S - 34, S - 44); g.lineTo(34, S - 44); g.closePath(); g.fill()
    g.fillStyle = '#111'
    g.beginPath(); g.arc(C - 4, 98, 13, 0, 7); g.fill()                                     // bosh
    g.beginPath(); g.moveTo(C - 14, 114); g.lineTo(C + 8, 114); g.lineTo(C + 14, 150); g.lineTo(C + 2, 150); g.lineTo(C - 2, 132); g.lineTo(C - 12, 160); g.lineTo(C - 24, 156); g.closePath(); g.fill()
    for (let i = 0; i < 5; i++) g.fillRect(52 + i * 36, 176, 20, 22)                       // zebra chiziqlari
  },
  park(g) { blueSquare(g); g.fillStyle = '#fff'; g.font = '900 170px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', C, C + 10) },
  bump(g) {
    tri(g); g.fillStyle = '#111'
    g.beginPath(); g.moveTo(70, 190); g.lineTo(96, 190); g.quadraticCurveTo(C, 120, S - 96, 190); g.lineTo(S - 70, 190); g.lineTo(S - 70, 200); g.lineTo(70, 200); g.closePath(); g.fill()
    g.beginPath(); g.moveTo(C - 38, 188); g.quadraticCurveTo(C, 132, C + 38, 188); g.closePath(); g.fill()
  },
  narrow(g) {
    tri(g); g.fillStyle = '#111'
    g.beginPath(); g.moveTo(88, 90); g.lineTo(106, 90); g.quadraticCurveTo(116, 148, 106, 196); g.lineTo(88, 196); g.quadraticCurveTo(100, 150, 88, 90); g.closePath(); g.fill()
    g.beginPath(); g.moveTo(S - 88, 90); g.lineTo(S - 106, 90); g.quadraticCurveTo(S - 116, 148, S - 106, 196); g.lineTo(S - 88, 196); g.quadraticCurveTo(S - 100, 150, S - 88, 90); g.closePath(); g.fill()
  },
  steep(g) {
    tri(g); g.fillStyle = '#111'
    g.beginPath(); g.moveTo(70, 196); g.lineTo(S - 70, 196); g.lineTo(S - 70, 120); g.closePath(); g.fill()
    g.fillStyle = '#111'; g.font = '800 40px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('10%', C - 14, 110)
  },
  rail(g) {
    tri(g); g.fillStyle = '#111'
    g.fillRect(88, 100, 80, 70); g.fillStyle = '#fff'; g.fillRect(98, 110, 22, 22); g.fillRect(136, 110, 22, 22)
    g.fillStyle = '#111'; g.fillRect(80, 170, 96, 10); g.fillRect(104, 84, 48, 18)
    g.beginPath(); g.arc(104, 192, 8, 0, 7); g.arc(152, 192, 8, 0, 7); g.fill()
  },
  tlight(g) {
    tri(g); g.fillStyle = '#111'; g.beginPath(); g.roundRect(100, 76, 56, 118, 10); g.fill()
    const lamp = (y: number, c: string) => { g.fillStyle = c; g.beginPath(); g.arc(C, y, 15, 0, 7); g.fill() }
    lamp(103, '#e02020'); lamp(135, '#f0c020'); lamp(167, '#27b24a')
  },
  priority(g) {
    const dia = (r: number) => { g.beginPath(); g.moveTo(C, C - r); g.lineTo(C + r, C); g.lineTo(C, C + r); g.lineTo(C - r, C); g.closePath() }
    g.lineJoin = 'round'
    g.fillStyle = '#111'; dia(128); g.fill(); g.fillStyle = '#fff'; dia(118); g.fill(); g.fillStyle = '#f7c614'; dia(92); g.fill()
  },
  turnLeft(g) { blueCircle(g); arrow(g, -1) },
  turnRight(g) { blueCircle(g); arrow(g, 1) },
  straight(g) { blueCircle(g); arrow(g, 0) },
  noparking(g) {
    g.fillStyle = '#d4141c'; g.beginPath(); g.arc(C, C, 126, 0, 7); g.fill()
    g.fillStyle = '#0f5bb5'; g.beginPath(); g.arc(C, C, 100, 0, 7); g.fill()
    g.strokeStyle = '#d4141c'; g.lineWidth = 22; g.lineCap = 'butt'; g.beginPath(); g.moveTo(C - 70, C + 70); g.lineTo(C + 70, C - 70); g.stroke()
  },
  curve(g) {
    tri(g); g.strokeStyle = '#111'; g.lineWidth = 16; g.lineCap = 'butt'
    g.beginPath(); g.moveTo(C + 22, 198); g.quadraticCurveTo(C + 22, 150, C - 6, 130); g.quadraticCurveTo(C - 36, 110, C - 22, 86); g.stroke()
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(C - 44, 92); g.lineTo(C - 22, 62); g.lineTo(C, 92); g.closePath(); g.fill()
  },
}

function limit(g: CanvasRenderingContext2D, n: string) {
  g.fillStyle = '#d4141c'; g.beginPath(); g.arc(C, C, 126, 0, 7); g.fill()
  g.fillStyle = '#fff'; g.beginPath(); g.arc(C, C, 90, 0, 7); g.fill()
  g.fillStyle = '#111'; g.font = '900 108px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, C, C + 6)
}
/** dir: -1 chap, 0 to'g'ri, 1 o'ng */
function arrow(g: CanvasRenderingContext2D, dir: -1 | 0 | 1) {
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 26; g.lineCap = 'butt'; g.lineJoin = 'miter'
  if (dir === 0) {
    g.beginPath(); g.moveTo(C, 196); g.lineTo(C, 100); g.stroke()
    g.beginPath(); g.moveTo(C - 44, 112); g.lineTo(C, 54); g.lineTo(C + 44, 112); g.closePath(); g.fill()
    return
  }
  g.beginPath(); g.moveTo(C - dir * 6, 198); g.lineTo(C - dir * 6, 118); g.lineTo(C + dir * 40, 118); g.stroke()
  g.beginPath(); g.moveTo(C + dir * 34, 80); g.lineTo(C + dir * 92, 118); g.lineTo(C + dir * 34, 156); g.closePath(); g.fill()
}

export interface SignMats { front: MeshStandardMaterial; back: MeshStandardMaterial }
const cache = new Map<ExamSignKind, SignMats>()
export function examSignMats(kind: ExamSignKind): SignMats {
  let m = cache.get(kind)
  if (m) return m
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = S; return cv }
  const a = mk(), ag = a.getContext('2d')!
  ag.clearRect(0, 0, S, S); DRAW[kind](ag)
  const t = new CanvasTexture(a); t.colorSpace = SRGBColorSpace; t.anisotropy = 8
  // orqa tomon uchun: shakl maskasi (yashil kanal = ko'rinish)
  const w = mk(), wg = w.getContext('2d')!
  wg.drawImage(a, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, S, S)
  const b = mk(), bg = b.getContext('2d')!
  bg.fillStyle = '#000'; bg.fillRect(0, 0, S, S); bg.drawImage(w, 0, 0)
  const am = new CanvasTexture(b)
  m = {
    front: new MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, roughness: 0.45, metalness: 0.1 }),
    back: new MeshStandardMaterial({ color: '#8d949d', alphaMap: am, transparent: true, alphaTest: 0.4, roughness: 0.6, metalness: 0.5, side: BackSide }),
  }
  cache.set(kind, m)
  return m
}
