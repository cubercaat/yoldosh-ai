import { CanvasTexture, DoubleSide, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'
import { stream } from './seed'

/**
 * Dunyo materiallari — hammasi UMUMIY (singleton): chunklar faqat geometriya yaratadi/yo'q qiladi, material va tekstura bir marta.
 * Shu tufayli xotira doimiy qoladi (texture atlas / material qayta ishlatish).
 */
function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, wrap = true): CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8
  if (wrap) t.wrapS = t.wrapT = RepeatWrapping
  return t
}

const noiseDots = (g: CanvasRenderingContext2D, w: number, h: number, n: number, lo: number, hi: number, seed: number) => {
  const r = stream(seed)
  for (let i = 0; i < n; i++) { const v = (lo + r() * (hi - lo)) | 0; g.fillStyle = `rgba(${v},${v},${v + 4},.5)`; g.fillRect(r() * w, r() * h, 1.6, 1.6) }
}

/** Fasad plitkalari: har biri takrorlanadi. rows*floorH = plitka balandligi. */
export const TILE = {
  res: { w: 12, h: 9.6 }, // 4 ustun x 3 qavat
  off: { w: 12, h: 10.5 }, // 6 ustun x 3 qavat (shisha)
  shop: { w: 8, h: 4.2 },
  ind: { w: 8, h: 6 },
}

function windowsTexture(kind: 'res' | 'off' | 'shop' | 'ind', lit: boolean): CanvasTexture {
  const W = 512, H = kind === 'res' ? 410 : kind === 'off' ? 448 : kind === 'shop' ? 269 : 384
  const r = stream(kind.length * 31 + (lit ? 7 : 3))
  return tex(W, H, (g, w, h) => {
    if (kind === 'res') {
      g.fillStyle = lit ? '#000' : '#eeeae2'; g.fillRect(0, 0, w, h)
      const cw = w / 4, ch = h / 3
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
        const x = col * cw + cw * 0.2, y = row * ch + ch * 0.22, ww = cw * 0.6, hh = ch * 0.56
        if (lit) { if (r() < 0.5) { g.fillStyle = r() < 0.6 ? '#ffd58a' : '#fff0c9'; g.fillRect(x, y, ww, hh) } }
        else {
          g.fillStyle = '#c9c4b8'; g.fillRect(x - 5, y - 5, ww + 10, hh + 10)
          const gr = g.createLinearGradient(x, y, x, y + hh); gr.addColorStop(0, '#6f8398'); gr.addColorStop(1, '#2b3a4c'); g.fillStyle = gr; g.fillRect(x, y, ww, hh)
          g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, ww, hh * 0.18); g.fillStyle = '#b9b3a6'; g.fillRect(x - 6, y + hh, ww + 12, 7)
          g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + ww / 2 - 1, y, 2, hh)
        }
      }
      if (!lit) { g.fillStyle = 'rgba(0,0,0,.10)'; for (let row = 0; row < 3; row++) g.fillRect(0, row * ch, w, 3); noiseDots(g, w, h, 1500, 180, 235, 1) }
    } else if (kind === 'off') {
      g.fillStyle = lit ? '#000' : '#9fb4c8'; g.fillRect(0, 0, w, h)
      const cols = 6, cw = w / cols, ch = h / 3
      for (let row = 0; row < 3; row++) for (let col = 0; col < cols; col++) {
        const x = col * cw + 3, y = row * ch + 5, ww = cw - 6, hh = ch * 0.74
        if (lit) { if (r() < 0.42) { g.fillStyle = r() < 0.5 ? '#ffe4a8' : '#cfe2ff'; g.fillRect(x, y, ww, hh) } }
        else {
          const gr = g.createLinearGradient(x, y, x + ww, y + hh); gr.addColorStop(0, '#9dc0e0'); gr.addColorStop(0.5, '#4d7aa5'); gr.addColorStop(1, '#2a4668'); g.fillStyle = gr; g.fillRect(x, y, ww, hh)
          g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x, y, ww, hh * 0.12)
          g.fillStyle = '#7d8793'; g.fillRect(x - 3, y + hh, ww + 6, ch - hh - 5)
        }
      }
    } else if (kind === 'shop') {
      g.fillStyle = lit ? '#000' : '#e8e2d6'; g.fillRect(0, 0, w, h)
      if (lit) { g.fillStyle = '#ffeab8'; g.fillRect(14, h * 0.12, w - 28, h * 0.5) }
      else {
        const gr = g.createLinearGradient(0, h * 0.1, 0, h * 0.62); gr.addColorStop(0, '#9ab6cc'); gr.addColorStop(1, '#3a5068'); g.fillStyle = gr; g.fillRect(14, h * 0.12, w - 28, h * 0.5)
        g.fillStyle = '#d6d1c5'; for (let k = 0; k <= 4; k++) g.fillRect(14 + (k * (w - 28)) / 4 - 3, h * 0.12, 6, h * 0.5)
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(14, h * 0.12, w - 28, h * 0.08)
        g.fillStyle = '#c4beb0'; g.fillRect(0, h * 0.68, w, h * 0.06)
      }
    } else {
      g.fillStyle = lit ? '#000' : '#c5c9cf'; g.fillRect(0, 0, w, h)
      if (!lit) { g.fillStyle = 'rgba(0,0,0,.14)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,255,255,.14)'; for (let x = 8; x < w; x += 16) g.fillRect(x, 0, 2, h) }
      for (let col = 0; col < 4; col++) {
        const x = col * (w / 4) + 20, y = h * 0.28, ww = w / 4 - 40, hh = h * 0.16
        if (lit) { if (r() < 0.4) { g.fillStyle = '#ffe9b0'; g.fillRect(x, y, ww, hh) } } else { g.fillStyle = '#2f3b4a'; g.fillRect(x, y, ww, hh) }
      }
    }
  })
}

export interface WorldMats {
  asphalt: MeshStandardMaterial
  paint: MeshStandardMaterial
  sidewalk: MeshStandardMaterial
  plain: MeshStandardMaterial
  grass: MeshStandardMaterial
  res: MeshStandardMaterial
  off: MeshStandardMaterial
  shop: MeshStandardMaterial
  ind: MeshStandardMaterial
  night: MeshStandardMaterial[] // tunda emissive boshqariladigan materiallar
}
let M: WorldMats | null = null
export function worldMats(): WorldMats {
  if (M) return M
  const asph = tex(256, 256, (g, w, h) => { g.fillStyle = '#34373d'; g.fillRect(0, 0, w, h); noiseDots(g, w, h, 9000, 38, 80, 13) })
  const sw = tex(128, 128, (g, w, h) => {
    g.fillStyle = '#a9aab0'; g.fillRect(0, 0, w, h); noiseDots(g, w, h, 1200, 140, 200, 3)
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke() }
  })
  const gr = tex(256, 256, (g, w, h) => { g.fillStyle = '#5da043'; g.fillRect(0, 0, w, h); const r = stream(5); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${40 + r() * 50 | 0},${110 + r() * 70 | 0},${25 + r() * 35 | 0},.35)`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3) } })
  const mk = (kind: 'res' | 'off' | 'shop' | 'ind', rough: number, metal: number) => new MeshStandardMaterial({ map: windowsTexture(kind, false), emissiveMap: windowsTexture(kind, true), emissive: '#ffd9a0', emissiveIntensity: 0, roughness: rough, metalness: metal, vertexColors: true })
  const res = mk('res', 0.85, 0), off = mk('off', 0.28, 0.35), shop = mk('shop', 0.6, 0.05), ind = mk('ind', 0.7, 0.2)
  M = {
    asphalt: new MeshStandardMaterial({ map: asph, roughness: 0.93, metalness: 0, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    paint: new MeshStandardMaterial({ roughness: 0.65, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5, side: DoubleSide }),
    sidewalk: new MeshStandardMaterial({ map: sw, roughness: 0.92, vertexColors: true }),
    plain: new MeshStandardMaterial({ roughness: 0.85, metalness: 0.02, vertexColors: true }),
    grass: new MeshStandardMaterial({ map: gr, roughness: 1, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    res, off, shop, ind, night: [res, off, shop, ind],
  }
  return M
}
export function setWorldNight(n: number) {
  const m = worldMats()
  for (const x of m.night) x.emissiveIntensity = n * 1.5
}

/** yer (cheksiz) o'tloq teksturasi, dunyo koordinatasiga tekis */
let groundTex: CanvasTexture | null = null
export function groundTexture(): CanvasTexture {
  if (!groundTex) groundTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#4f9a38'; g.fillRect(0, 0, w, h); const r = stream(9); for (let i = 0; i < 4500; i++) { g.fillStyle = `rgba(${35 + r() * 50 | 0},${110 + r() * 70 | 0},${25 + r() * 35 | 0},.35)`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3) } })
  return groundTex
}

/** yo'l belgilari plastinkalari */
export type SignKind = 'stop' | 'yield' | 'l30' | 'l40' | 'l50' | 'l60' | 'l90' | 'roundabout' | 'ped' | 'park' | 'noentry'
export const SIGN_KINDS: SignKind[] = ['stop', 'yield', 'l30', 'l40', 'l50', 'l60', 'l90', 'roundabout', 'ped', 'park', 'noentry']
const signCache = new Map<SignKind, MeshStandardMaterial>()
export function signMaterial(kind: SignKind): MeshStandardMaterial {
  let m = signCache.get(kind)
  if (m) return m
  const t = tex(256, 256, (g, w) => {
    g.clearRect(0, 0, 256, 256); g.textAlign = 'center'; g.textBaseline = 'middle'; const c = w / 2
    if (kind.startsWith('l')) {
      g.fillStyle = '#d9141e'; g.beginPath(); g.arc(c, c, 124, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, 94, 0, 7); g.fill()
      g.fillStyle = '#111'; g.font = '800 104px sans-serif'; g.fillText(kind.slice(1), c, c + 6)
    } else if (kind === 'stop') {
      g.fillStyle = '#d9141e'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; g.lineTo(c + Math.cos(a) * 126, c + Math.sin(a) * 126) } g.closePath(); g.fill()
      g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke(); g.fillStyle = '#fff'; g.font = '800 70px sans-serif'; g.fillText('STOP', c, c + 4)
    } else if (kind === 'yield') {
      g.fillStyle = '#d9141e'; g.beginPath(); g.moveTo(10, 30); g.lineTo(246, 30); g.lineTo(c, 240); g.closePath(); g.fill()
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(48, 56); g.lineTo(208, 56); g.lineTo(c, 192); g.closePath(); g.fill()
    } else if (kind === 'roundabout') {
      g.fillStyle = '#1565c0'; g.beginPath(); g.arc(c, c, 124, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 16
      for (let k = 0; k < 3; k++) { const a0 = (k * 2 * Math.PI) / 3 - 0.2; g.beginPath(); g.arc(c, c, 56, a0, a0 + 1.5); g.stroke(); const ex = c + Math.cos(a0 + 1.5) * 56, ey = c + Math.sin(a0 + 1.5) * 56; g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 14, 0, 7); g.fill() }
    } else if (kind === 'ped') {
      g.fillStyle = '#1565c0'; g.fillRect(14, 14, 228, 228); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(14, 242); g.lineTo(242, 242); g.lineTo(128, 150); g.closePath(); g.fill()
      g.fillStyle = '#111'; g.beginPath(); g.arc(c, 78, 22, 0, 7); g.fill(); g.fillRect(c - 12, 98, 24, 60); g.fillRect(c - 36, 104, 72, 12)
    } else if (kind === 'park') { g.fillStyle = '#1565c0'; g.fillRect(14, 14, 228, 228); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(14, 14, 228, 228); g.fillStyle = '#fff'; g.font = '800 170px sans-serif'; g.fillText('P', c, c + 8) }
    else { g.fillStyle = '#d9141e'; g.beginPath(); g.arc(c, c, 124, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(52, 108, 152, 40) }
  }, false)
  m = new MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, roughness: 0.5, side: DoubleSide })
  signCache.set(kind, m)
  return m
}
