/**
 * Deterministik tasodifiylik. Bir xil koordinata + bir xil WORLD_SEED = har doim bir xil shahar.
 * WORLD_SEED o'zgarsa — butunlay boshqa shahar. Hech qanday global holat (Math.random) ishlatilmaydi.
 */
export let WORLD_SEED = 123456
const listeners: Array<() => void> = []
export function setWorldSeed(seed: number) { WORLD_SEED = seed | 0; listeners.forEach((f) => f()) }
export function onSeedChange(f: () => void) { listeners.push(f) }

export function hash(a: number, b = 0, c = 0, d = 0): number {
  let h = (WORLD_SEED ^ 0x9e3779b9) | 0
  h = Math.imul(h ^ (a | 0), 0x85ebca6b); h ^= h >>> 13
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35); h ^= h >>> 16
  h = Math.imul(h ^ (c | 0), 0x27d4eb2f); h ^= h >>> 15
  h = Math.imul(h ^ (d | 0), 0x165667b1); h ^= h >>> 13
  return h >>> 0
}
/** [0,1) */
export const rnd = (a: number, b = 0, c = 0, d = 0) => hash(a, b, c, d) / 4294967296

/** mulberry32 oqimi: bir kalitdan ketma-ket tasodifiy sonlar */
export function stream(a: number, b = 0, c = 0, d = 0): () => number {
  let s = hash(a, b, c, d) || 1
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const smooth = (t: number) => t * t * (3 - 2 * t)
/** 2D qiymat shovqini (0..1), uzluksiz */
export function noise2(x: number, y: number, salt = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const a = rnd(xi, yi, salt, 77), b = rnd(xi + 1, yi, salt, 77), c = rnd(xi, yi + 1, salt, 77), d = rnd(xi + 1, yi + 1, salt, 77)
  const u = smooth(xf), v = smooth(yf)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm2(x: number, y: number, salt = 0): number { return noise2(x, y, salt) * 0.65 + noise2(x * 2.1, y * 2.1, salt + 5) * 0.35 }
