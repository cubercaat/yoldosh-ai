import { BufferAttribute, BufferGeometry } from 'three'

/** Tormoz/sirpanish izlari: halqa bufer (eng eski iz o'chib boradi). Har g'ildirak uchun uzluksiz lenta. */
const MAX = 7000   // quad soni
export const skid = {
  geo: (() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(MAX * 4 * 3), 3).setUsage(35048))
    const idx = new Uint32Array(MAX * 6)
    for (let i = 0; i < MAX; i++) { const a = i * 4; idx.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], i * 6) }
    g.setIndex(new BufferAttribute(idx, 1)); g.setDrawRange(0, 0)
    return g
  })(),
  n: 0, head: 0,
  last: [null, null, null, null] as Array<[number, number] | null>,
  /** i = g'ildirak raqami; (x,z) = tegish nuqtasi; on = hozir iz qoldiryaptimi */
  emit(i: number, x: number, z: number, y: number, on: boolean, halfW = 0.11) {
    const lp = this.last[i]
    if (!on) { this.last[i] = null; return }
    if (!lp) { this.last[i] = [x, z]; return }
    const dx = x - lp[0], dz = z - lp[1], d = Math.hypot(dx, dz)
    if (d < 0.3) return
    if (d > 4) { this.last[i] = [x, z]; return }   // sakrash: lentani uzamiz
    const nx = (-dz / d) * halfW, nz = (dx / d) * halfW, p = this.geo.getAttribute('position') as BufferAttribute, k = this.head * 4, yy = y + 0.09
    p.setXYZ(k, lp[0] - nx, yy, lp[1] - nz); p.setXYZ(k + 1, lp[0] + nx, yy, lp[1] + nz); p.setXYZ(k + 2, x - nx, yy, z - nz); p.setXYZ(k + 3, x + nx, yy, z + nz)
    this.head = (this.head + 1) % MAX; this.n = Math.min(MAX, this.n + 1)
    this.geo.setDrawRange(0, this.n * 6); p.needsUpdate = true
    this.last[i] = [x, z]
  },
  clear() { this.n = 0; this.head = 0; this.geo.setDrawRange(0, 0); this.last = [null, null, null, null] },
}
;(window as unknown as { __skid?: unknown }).__skid = skid   // sinov uchun
