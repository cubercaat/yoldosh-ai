import { BufferGeometry, Float32BufferAttribute } from 'three'

/**
 * Loft — kuzovni "kesimlar" (cross-section) ketma-ketligidan yasaydi.
 * Yon profil (balandlik egri chiziqlari) + reja kengligi + kesim shakli (superellips) -> silliq, yopiq to'r.
 * Bu quti emas: gumbaz, kapot, bagajnik, g'ildirak kamarlari, burchaklar yumaloqlanishi hammasi egri chiziqlardan keladi.
 */
export type Pt = [number, number]

/** Silliq (pchip) yoki bo'lakli-chiziqli egri chiziq: x o'sish tartibida */
export function curve(pts: Pt[], linear = false): (x: number) => number {
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const d = new Array<number>(n).fill(0)
  if (!linear && n > 2) {
    const h: number[] = [], dl: number[] = []
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; dl[i] = (ys[i + 1] - ys[i]) / h[i] }
    d[0] = dl[0]; d[n - 1] = dl[n - 2]
    for (let i = 1; i < n - 1; i++) {
      if (dl[i - 1] * dl[i] <= 0) d[i] = 0
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; d[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]) }
    }
  } else if (!linear && n === 2) { d[0] = d[1] = (ys[1] - ys[0]) / (xs[1] - xs[0]) }
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h
    if (linear) return ys[i] + (ys[i + 1] - ys[i]) * t
    const t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * d[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * d[i + 1]
  }
}

export interface Sec {
  yb: number // pastki chiziq
  yt: number // yuqori chiziq
  hw: number // yarim kenglik (pastki/belbog' qismida)
  hwTop: number // yuqori qismdagi yarim kenglik (tumblehome)
  nx: number // yon tomonlar "to'rtburchakligi" (2 = ellips, 8+ = deyarli to'g'ri burchak)
  nyTop: number
  nyBot: number
}

export interface LoftOpts {
  zs: number[]
  sec: (z: number) => Sec
  ring: number
  /** material indeksi (ringning o'rtasida): z, h01 (0..1 balandlik), topness (-1..1, +1 = tepa), side (+1 chap, -1 o'ng) */
  mat?: (z: number, h01: number, topness: number, side: number, y: number) => number
  /** vertex rangi (qorong'ilik koeffitsienti): z, h01 */
  shade?: (z: number, h01: number) => number
  flat?: boolean
  /** uchlarni yopish (material indeksi; -1 = ochiq): [orqa, old] */
  caps?: [number, number]
}

const sgnPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)

/** kesimdagi nuqta (x, y): k — ring indeksi */
export function ringPoint(s: Sec, theta: number): [number, number, number] {
  const c = Math.cos(theta), sn = Math.sin(theta)
  const ny = sn > 0 ? s.nyTop : s.nyBot
  const yy = sgnPow(sn, 2 / ny) // -1..1
  const h01 = (yy + 1) / 2
  let x = s.hw * sgnPow(c, 2 / s.nx)
  x *= 1 + (s.hwTop / s.hw - 1) * h01
  return [x, s.yb + h01 * (s.yt - s.yb), h01]
}

/** berilgan z va y balandlikda tashqi yarim kenglik (chap tomon, x>0) — detallarni sirtga yopishtirish uchun */
export function halfWidthAt(s: Sec, y: number): number {
  if (s.yt - s.yb < 1e-4) return 0
  const yy = Math.max(-1, Math.min(1, (2 * (y - s.yb)) / (s.yt - s.yb) - 1))
  const ny = yy > 0 ? s.nyTop : s.nyBot
  const sn = sgnPow(yy, ny / 2)
  const c = Math.sqrt(Math.max(0, 1 - sn * sn))
  const h01 = (yy + 1) / 2
  return s.hw * Math.pow(c, 2 / s.nx) * (1 + (s.hwTop / s.hw - 1) * h01)
}

export function loft(o: LoftOpts): BufferGeometry {
  const { zs, sec, ring: N } = o
  const S = zs.length
  const pos: number[] = [], col: number[] = []
  const mid: Array<{ z: number; h01: number }> = []
  for (let si = 0; si < S; si++) {
    const z = zs[si], s = sec(z)
    for (let k = 0; k < N; k++) {
      const th = -Math.PI / 2 + (2 * Math.PI * k) / N
      const [x, y, h01] = ringPoint(s, th)
      pos.push(x, y, z)
      const sh = o.shade ? o.shade(z, h01) : 1
      col.push(sh, sh, sh)
    }
    mid.push({ z, h01: 0 })
  }
  // materiallar bo'yicha indekslar
  const groups = new Map<number, number[]>()
  for (let si = 0; si < S - 1; si++) {
    const zm = (zs[si] + zs[si + 1]) / 2
    for (let k = 0; k < N; k++) {
      const k1 = (k + 1) % N
      const a = si * N + k, b = si * N + k1, c = (si + 1) * N + k, d = (si + 1) * N + k1
      const thm = -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / N
      const s = sec(zm), [x, yy, h01] = ringPoint(s, thm)
      const mi = o.mat ? o.mat(zm, h01, Math.sin(thm), x >= 0 ? 1 : -1, yy) : 0
      let arr = groups.get(mi)
      if (!arr) { arr = []; groups.set(mi, arr) }
      arr.push(a, c, b, b, c, d)
    }
  }
  if (o.caps) {
    const add = (si: number, mi: number, front: boolean) => {
      if (mi < 0) return
      let cx = 0, cy = 0
      for (let k = 0; k < N; k++) { cx += pos[(si * N + k) * 3]; cy += pos[(si * N + k) * 3 + 1] }
      const ci = pos.length / 3
      pos.push(cx / N, cy / N, zs[si]); col.push(1, 1, 1)
      let arr = groups.get(mi)
      if (!arr) { arr = []; groups.set(mi, arr) }
      for (let k = 0; k < N; k++) { const a = si * N + k, b = si * N + ((k + 1) % N); if (front) arr.push(ci, b, a); else arr.push(ci, a, b) }
    }
    add(0, o.caps[0], false); add(S - 1, o.caps[1], true)
  }
  // yo'nalish: hajm musbat bo'lishi kerak
  let vol = 0
  for (const arr of groups.values()) for (let i = 0; i < arr.length; i += 3) {
    const i0 = arr[i] * 3, i1 = arr[i + 1] * 3, i2 = arr[i + 2] * 3
    const ax = pos[i0], ay = pos[i0 + 1], az = pos[i0 + 2], bx = pos[i1], by = pos[i1 + 1], bz = pos[i1 + 2], cx = pos[i2], cy = pos[i2 + 1], cz = pos[i2 + 2]
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)
  }
  const flip = vol < 0
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  const index: number[] = []
  const keys = [...groups.keys()].sort((a, b) => a - b)
  for (const mi of keys) {
    const arr = groups.get(mi)!, start = index.length
    for (let i = 0; i < arr.length; i += 3) { if (flip) index.push(arr[i], arr[i + 2], arr[i + 1]); else index.push(arr[i], arr[i + 1], arr[i + 2]) }
    geo.addGroup(start, index.length - start, mi)
  }
  geo.setIndex(index)
  geo.computeVertexNormals()
  if (o.flat) { const g2 = geo.toNonIndexed(); g2.computeVertexNormals(); geo.dispose(); return g2 }
  return geo
}

/** stansiyalar: uchlarda zich, qo'shimcha nuqtalar bilan */
export function stations(z0: number, z1: number, n: number, extra: number[] = []): number[] {
  const out: number[] = []
  for (let i = 0; i <= n; i++) { const u = i / n; out.push(z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(Math.PI * u))) }
  for (const e of extra) if (e > z0 && e < z1) out.push(e)
  out.sort((a, b) => a - b)
  const dedup: number[] = []
  for (const v of out) if (!dedup.length || v - dedup[dedup.length - 1] > 0.012) dedup.push(v)
  dedup[0] = z0; dedup[dedup.length - 1] = z1
  return dedup
}

/** uchlarni yumaloqlash koeffitsienti (0..1) */
export function endClosure(z: number, zr: number, zf: number, capR: number, capF: number, p = 2.6): number {
  if (z > zf - capF) { const u = (z - (zf - capF)) / capF; return Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, u), p)), 1 / p) }
  if (z < zr + capR) { const u = (zr + capR - z) / capR; return Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, u), p)), 1 / p) }
  return 1
}


