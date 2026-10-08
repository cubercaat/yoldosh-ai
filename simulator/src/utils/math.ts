export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** kadr tezligidan mustaqil silliqlash (exponential damping) */
export const damp = (current: number, target: number, lambda: number, dt: number) => lerp(current, target, 1 - Math.exp(-lambda * dt))
export const approach = (current: number, target: number, rate: number, dt: number) => {
  const d = target - current
  const s = rate * dt
  return Math.abs(d) <= s ? target : current + Math.sign(d) * s
}
export const angDiff = (a: number, b: number) => {
  let d = (a - b) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}
export const kmh = (ms: number) => ms * 3.6
export const rad = (d: number) => (d * Math.PI) / 180
export const deg = (r: number) => (r * 180) / Math.PI
/** deterministik tasodifiy sonlar (dunyo har safar bir xil quriladi) */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
