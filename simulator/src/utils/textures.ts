import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { rng } from './math'

/** Hamma tekstura kodda yaratiladi (tashqi fayl yo'q) — keyin haqiqiy tekstura bilan almashtirish oson. */
function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace; t.anisotropy = 8
  if (repeat) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(repeat[0], repeat[1]) }
  return t
}

export const grassTexture = (rep = 120) => tex(256, 256, (g, w, h) => {
  g.fillStyle = '#4f9a38'; g.fillRect(0, 0, w, h)
  const r = rng(5)
  for (let i = 0; i < 4500; i++) { g.fillStyle = `rgba(${35 + r() * 50 | 0},${110 + r() * 70 | 0},${25 + r() * 35 | 0},.35)`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3) }
}, [rep, rep])

/** Yo'l: asfalt + chetki chiziqlar + uzuq markaziy chiziq. U = kenglik, V = uzunlik. */
export const roadTexture = (rep: number) => tex(256, 512, (g, w, h) => {
  g.fillStyle = '#34383f'; g.fillRect(0, 0, w, h)
  const r = rng(9)
  for (let i = 0; i < 9000; i++) { const v = 40 + r() * 38 | 0; g.fillStyle = `rgba(${v},${v + 2},${v + 8},.5)`; g.fillRect(r() * w, r() * h, 1.6, 1.6) }
  g.fillStyle = '#eef1f6'; g.fillRect(w * 0.04, 0, 6, h); g.fillRect(w * 0.96 - 6, 0, 6, h)
  g.fillStyle = '#f2c230'; for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 3, y + 20, 6, 70)
}, [1, rep])

export const asphaltTexture = (rep = 12) => tex(256, 256, (g, w, h) => {
  g.fillStyle = '#31353c'; g.fillRect(0, 0, w, h)
  const r = rng(13)
  for (let i = 0; i < 7000; i++) { const v = 38 + r() * 40 | 0; g.fillStyle = `rgba(${v},${v + 2},${v + 8},.5)`; g.fillRect(r() * w, r() * h, 1.5, 1.5) }
}, [rep, rep])

export const zebraTexture = () => tex(128, 128, (g, w, h) => {
  g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h)
  g.fillStyle = '#f1f3f7'; for (let x = 0; x < w; x += 32) g.fillRect(x + 4, 0, 18, h)
})

export const sidewalkTexture = () => tex(128, 128, (g, w, h) => {
  g.fillStyle = '#9a9ea6'; g.fillRect(0, 0, w, h)
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2
  for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke() }
}, [1, 1])

/** Bino fasadi: derazalar. lit=true bo'lsa tunda yonadigan (emissive) xarita */
export function facadeTexture(seed: number, base: string, lit: boolean) {
  const r = rng(seed)
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = lit ? '#000' : base; g.fillRect(0, 0, w, h)
    for (let y = 18; y < h - 20; y += 40) for (let x = 14; x < w - 20; x += 36) {
      const on = r() < 0.55
      if (lit) { g.fillStyle = on ? (r() < 0.5 ? '#ffd98a' : '#fff1c9') : '#000'; g.fillRect(x, y, 24, 24) }
      else { g.fillStyle = '#1b2638'; g.fillRect(x, y, 24, 24); g.fillStyle = 'rgba(180,210,255,.18)'; g.fillRect(x, y, 24, 9) }
    }
  })
}

export type SignKind = 'limit40' | 'stop' | 'park' | 'yield' | 'noentry'
export const signTexture = (kind: SignKind) => tex(256, 256, (g, w) => {
  g.clearRect(0, 0, 256, 256); g.textAlign = 'center'; g.textBaseline = 'middle'; const c = w / 2
  if (kind === 'limit40') { g.fillStyle = '#d9141e'; g.beginPath(); g.arc(c, c, 120, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, 92, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = '800 104px sans-serif'; g.fillText('40', c, c + 6) }
  else if (kind === 'stop') { g.fillStyle = '#d9141e'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(c + Math.cos(a) * 124, c + Math.sin(a) * 124) } g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke(); g.fillStyle = '#fff'; g.font = '800 70px sans-serif'; g.fillText('STOP', c, c + 4) }
  else if (kind === 'park') { g.fillStyle = '#1565c0'; g.fillRect(14, 14, 228, 228); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(14, 14, 228, 228); g.fillStyle = '#fff'; g.font = '800 170px sans-serif'; g.fillText('P', c, c + 8) }
  else if (kind === 'yield') { g.fillStyle = '#d9141e'; g.beginPath(); g.moveTo(12, 28); g.lineTo(244, 28); g.lineTo(c, 238); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(48, 54); g.lineTo(208, 54); g.lineTo(c, 190); g.closePath(); g.fill() }
  else { g.fillStyle = '#d9141e'; g.beginPath(); g.arc(c, c, 120, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(52, 108, 152, 40) }
})

export const bannerTexture = (text: string, bg = '#0b1220', fg = '#9be83a') => tex(512, 128, (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = '800 58px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4)
})
