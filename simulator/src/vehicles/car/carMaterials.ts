import { CanvasTexture, Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace } from 'three'
import type { BodyKind } from '../VehicleConfig'

/** Fizik asosli (PBR) materiallar. Umumiy materiallar bir marta yaratiladi va hamma mashina ular bilan ishlaydi (xotira tejaladi). */
export interface SharedMats {
  glass: MeshPhysicalMaterial
  black: MeshStandardMaterial
  trim: MeshStandardMaterial
  chrome: MeshStandardMaterial
  tire: MeshStandardMaterial
  rim: MeshStandardMaterial
  disc: MeshStandardMaterial
  seat: MeshStandardMaterial
  dash: MeshStandardMaterial
  floor: MeshStandardMaterial
  steel: MeshStandardMaterial
  boxWhite: MeshStandardMaterial
  rubber: MeshStandardMaterial
}
let shared: SharedMats | null = null
export function sharedMats(): SharedMats {
  if (shared) return shared
  shared = {
    glass: new MeshPhysicalMaterial({ color: 0x070c14, metalness: 0.1, roughness: 0.03, transparent: true, opacity: 0.88, envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.02, side: DoubleSide, vertexColors: true }),
    black: new MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.62, metalness: 0.15 }),
    trim: new MeshStandardMaterial({ color: 0x1a1d23, roughness: 0.45, metalness: 0.35 }),
    chrome: new MeshStandardMaterial({ color: 0xe2e7f0, metalness: 1, roughness: 0.12, envMapIntensity: 1.6 }),
    tire: new MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.92, metalness: 0 }),
    rim: new MeshStandardMaterial({ color: 0xb7bfcc, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 }),
    disc: new MeshStandardMaterial({ color: 0x555c68, metalness: 0.85, roughness: 0.45 }),
    seat: new MeshStandardMaterial({ color: 0x23262e, roughness: 0.85 }),
    dash: new MeshStandardMaterial({ color: 0x15171c, roughness: 0.6 }),
    floor: new MeshStandardMaterial({ color: 0x090a0d, roughness: 1 }),
    steel: new MeshStandardMaterial({ color: 0x9aa1ab, metalness: 0.9, roughness: 0.4 }),
    boxWhite: new MeshStandardMaterial({ color: 0xf1f3f7, roughness: 0.42, metalness: 0.08, vertexColors: true }),
    rubber: new MeshStandardMaterial({ color: 0x15161a, roughness: 0.95 }),
  }
  return shared
}

/** Kuzov bo'yog'i: metallik + clearcoat (yaltiroq lak). Qora rang uchun chuqur, ko'zguday qatlam. */
export function paintMaterial(hex: string, kind: BodyKind): MeshPhysicalMaterial {
  const c = new Color(hex)
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
  const dark = lum < 0.06
  if (kind === 'cybertruck') {
    return new MeshPhysicalMaterial({ color: c, metalness: 1, roughness: 0.34, envMapIntensity: 1.5, vertexColors: true })
  }
  return new MeshPhysicalMaterial({
    color: c, metalness: dark ? 0.55 : 0.78, roughness: dark ? 0.2 : 0.32,
    clearcoat: 1, clearcoatRoughness: dark ? 0.02 : 0.05, envMapIntensity: dark ? 1.9 : 1.3, vertexColors: true,
  })
}

export function lampMaterial(kind: 'head' | 'tail' | 'brake' | 'amber'): MeshStandardMaterial {
  const map = {
    head: { color: 0xb8c4d6, emissive: 0xfff1c4 }, tail: { color: 0x5a0a12, emissive: 0xff1830 },
    brake: { color: 0x7a0f18, emissive: 0xff1020 }, amber: { color: 0xc98a1a, emissive: 0xffa030 },
  }[kind]
  return new MeshStandardMaterial({ color: map.color, emissive: map.emissive, emissiveIntensity: kind === 'head' ? 0.12 : 0.08, roughness: 0.15, metalness: 0.3 })
}

const plateCache = new Map<string, CanvasTexture>()
export function plateTexture(txt: string): CanvasTexture {
  const key = String(txt || '').toUpperCase().slice(0, 12)
  const hit = plateCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas'); c.width = 520; c.height = 112
  const g = c.getContext('2d')!, w = 520, h = 112
  g.fillStyle = '#f6f6f1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#141414'; g.lineWidth = 7; g.strokeRect(4, 4, w - 8, h - 8)
  g.fillStyle = '#1b4fa8'; g.fillRect(10, 10, 62, h - 20); g.fillStyle = '#fff'; g.fillRect(16, 22, 50, 9); g.fillStyle = '#1da93b'; g.fillRect(16, 31, 50, 9)
  g.fillStyle = '#fff'; g.font = '800 26px sans-serif'; g.textAlign = 'center'; g.fillText('UZ', 41, 78)
  g.fillStyle = '#111'; g.textBaseline = 'middle'; g.font = '700 70px "Arial Narrow",Arial,sans-serif'; g.fillText(key, 300, h / 2 + 4)
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8
  plateCache.set(key, t)
  return t
}



