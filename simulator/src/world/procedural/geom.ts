import { BufferGeometry, Color, Float32BufferAttribute } from 'three'

/** Yengil geometriya yig'uvchi: pozitsiya, normal, uv, rang. Dunyo geometriyasini (yo'l, bino, yo'lak) chunk bo'yicha birlashtirish uchun. */
const colCache = new Map<string, [number, number, number]>()
/** hex -> chiziqli RGB (three ranglar boshqaruvi) */
export function lin(hex: string): [number, number, number] {
  let c = colCache.get(hex)
  if (!c) { const k = new Color(hex); c = [k.r, k.g, k.b]; colCache.set(hex, c) }
  return c
}
export const tint = (c: [number, number, number], k: number): [number, number, number] => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)]

export class GeoBuilder {
  pos: number[] = []
  nor: number[] = []
  uv: number[] = []
  col: number[] = []
  idx: number[] = []
  // joriy transformatsiya (yaw + siljish) — bino modullari lokal koordinatada chiziladi
  private tx = 0
  private tz = 0
  private cs = 1
  private sn = 0
  private ty = 0

  setTransform(x: number, z: number, yaw: number, y = 0) { this.tx = x; this.tz = z; this.cs = Math.cos(yaw); this.sn = Math.sin(yaw); this.ty = y }
  clearTransform() { this.setTransform(0, 0, 0, 0) }

  get count() { return this.pos.length / 3 }

  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number, c: [number, number, number]): number {
    const { cs, sn } = this
    // yaw (Y o'qi atrofida): x' = x cos + z sin ; z' = -x sin + z cos
    this.pos.push(x * cs + z * sn + this.tx, y + this.ty, -x * sn + z * cs + this.tz)
    this.nor.push(nx * cs + nz * sn, ny, -nx * sn + nz * cs)
    this.uv.push(u, v); this.col.push(c[0], c[1], c[2])
    return this.pos.length / 3 - 1
  }
  tri(a: number, b: number, c: number) { this.idx.push(a, b, c) }
  quadIdx(a: number, b: number, c: number, d: number) { this.idx.push(a, b, c, a, c, d) }

  /** to'rt nuqtali tekis yuza. p0..p3 soat miliga qarshi (normal tomonidan qaraganda). uv: [u,v] x4 */
  quad(p0: number[], p1: number[], p2: number[], p3: number[], n: [number, number, number], c: [number, number, number], uv?: number[][]) {
    const u = uv ?? [[0, 0], [1, 0], [1, 1], [0, 1]]
    const a = this.vert(p0[0], p0[1], p0[2], n[0], n[1], n[2], u[0][0], u[0][1], c)
    const b = this.vert(p1[0], p1[1], p1[2], n[0], n[1], n[2], u[1][0], u[1][1], c)
    const cc = this.vert(p2[0], p2[1], p2[2], n[0], n[1], n[2], u[2][0], u[2][1], c)
    const d = this.vert(p3[0], p3[1], p3[2], n[0], n[1], n[2], u[3][0], u[3][1], c)
    this.quadIdx(a, b, cc, d)
  }

  /** gorizontal to'rtburchak (tepaga qaragan), dunyo-uv: uv = (x, z) / uvScale (faqat transformatsiyasiz ishlatiladi) */
  flatRect(cx: number, cz: number, w: number, d: number, y: number, c: [number, number, number], uvScale = 6) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2
    // yuqoridan qaraganda soat miliga qarshi: (x0,z1) (x1,z1) (x1,z0) (x0,z0) -> normal +Y
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], c, [[x0 / uvScale, z1 / uvScale], [x1 / uvScale, z1 / uvScale], [x1 / uvScale, z0 / uvScale], [x0 / uvScale, z0 / uvScale]])
  }

  /** yopiq quti (6 yuza), plain material uchun */
  box(cx: number, cy: number, cz: number, w: number, h: number, d: number, c: [number, number, number], top?: [number, number, number]) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2
    const side = (a: number[], b: number[], cc: number[], dd: number[], n: [number, number, number]) => this.quad(a, b, cc, dd, n, c)
    side([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1])
    side([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1])
    side([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0])
    side([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0])
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], top ?? c)
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], c)
  }

  /** devor qutisi: faqat 4 yon yuza, fasad uv (u = metr/tileW, v = (y-y0)/tileH) */
  wallBox(cx: number, y0: number, cz: number, w: number, h: number, d: number, tileW: number, tileH: number, c: [number, number, number], offU = 0, offV = 0) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h
    const v1 = h / tileH + offV
    const face = (a: number[], b: number[], cc: number[], dd: number[], n: [number, number, number], len: number) => {
      const u1 = len / tileW + offU
      this.quad(a, b, cc, dd, n, c, [[offU, offV], [u1, offV], [u1, v1], [offU, v1]])
    }
    face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], w)
    face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], w)
    face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], d)
    face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], d)
  }

  /** Z o'qi bo'ylab cho'zilgan uchburchak prizma (gable tom): asos kengligi w (X), balandlik h, uzunlik d (Z) */
  gable(cx: number, y0: number, cz: number, w: number, h: number, d: number, c: [number, number, number], ridgeAlongX = false) {
    // ridgeAlongX=false: tizma Z bo'ylab. true: tizma X bo'ylab (w va d almashadi)
    if (ridgeAlongX) {
      const x0 = cx - d / 2, x1 = cx + d / 2, z0 = cz - w / 2, z1 = cz + w / 2, ym = y0 + h
      const n1: [number, number, number] = [0, w / 2, h], l1 = Math.hypot(n1[1], n1[2])
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, ym, cz], [x0, ym, cz], [0, n1[2] / l1, n1[1] / l1], c)
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, ym, cz], [x1, ym, cz], [0, n1[2] / l1, -n1[1] / l1], c)
      const a = this.vert(x1, y0, z1, 1, 0, 0, 0, 0, c), b = this.vert(x1, y0, z0, 1, 0, 0, 1, 0, c), t = this.vert(x1, ym, cz, 1, 0, 0, .5, 1, c); this.tri(a, b, t)
      const a2 = this.vert(x0, y0, z0, -1, 0, 0, 0, 0, c), b2 = this.vert(x0, y0, z1, -1, 0, 0, 1, 0, c), t2 = this.vert(x0, ym, cz, -1, 0, 0, .5, 1, c); this.tri(a2, b2, t2)
      return
    }
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, ym = y0 + h
    const l = Math.hypot(w / 2, h)
    this.quad([x1, y0, z1], [x1, y0, z0], [cx, ym, z0], [cx, ym, z1], [h / l, (w / 2) / l, 0], c)
    this.quad([x0, y0, z0], [x0, y0, z1], [cx, ym, z1], [cx, ym, z0], [-h / l, (w / 2) / l, 0], c)
    const a = this.vert(x0, y0, z1, 0, 0, 1, 0, 0, c), b = this.vert(x1, y0, z1, 0, 0, 1, 1, 0, c), t = this.vert(cx, ym, z1, 0, 0, 1, .5, 1, c); this.tri(a, b, t)
    const a2 = this.vert(x1, y0, z0, 0, 0, -1, 0, 0, c), b2 = this.vert(x0, y0, z0, 0, 0, -1, 1, 0, c), t2 = this.vert(cx, ym, z0, 0, 0, -1, .5, 1, c); this.tri(a2, b2, t2)
  }

  /** silindr (Y o'qi bo'ylab), segmentlar soni n */
  cylinder(cx: number, y0: number, cz: number, r: number, h: number, n: number, c: [number, number, number], r2?: number) {
    const rt = r2 ?? r
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1)
      this.quad([cx + c0 * r, y0, cz + s0 * r], [cx + c0 * rt, y0 + h, cz + s0 * rt], [cx + c1 * rt, y0 + h, cz + s1 * rt], [cx + c1 * r, y0, cz + s1 * r], [(c0 + c1) / 2, 0, (s0 + s1) / 2], c)
      const t = this.vert(cx, y0 + h, cz, 0, 1, 0, .5, .5, c), p = this.vert(cx + c0 * rt, y0 + h, cz + s0 * rt, 0, 1, 0, 0, 0, c), q = this.vert(cx + c1 * rt, y0 + h, cz + s1 * rt, 0, 1, 0, 1, 0, c)
      this.tri(t, q, p)
    }
  }

  /** gorizontal ko'pburchak (fan) — markaz + nuqtalar, tepaga qaragan */
  fan(cx: number, cz: number, pts: Array<[number, number]>, y: number, c: [number, number, number], uvScale = 6) {
    const ci = this.vert(cx, y, cz, 0, 1, 0, cx / uvScale, cz / uvScale, c)
    const ids = pts.map(([x, z]) => this.vert(x, y, z, 0, 1, 0, x / uvScale, z / uvScale, c))
    for (let k = 0; k < ids.length; k++) this.tri(ci, ids[(k + 1) % ids.length], ids[k])
  }

  /** egri chiziq bo'ylab lenta: markaz nuqtalari va o'ng normallar; lat0..lat1 oraliq; y balandlikda tepaga qaragan */
  strip(pts: Array<{ x: number; z: number; nx: number; nz: number }>, lat0: number, lat1: number, y: number, c: [number, number, number], uvScale = 6) {
    if (pts.length < 2) return
    let prevA = -1, prevB = -1
    for (const p of pts) {
      const ax = p.x + p.nx * lat0, az = p.z + p.nz * lat0, bx = p.x + p.nx * lat1, bz = p.z + p.nz * lat1
      const a = this.vert(ax, y, az, 0, 1, 0, ax / uvScale, az / uvScale, c), b = this.vert(bx, y, bz, 0, 1, 0, bx / uvScale, bz / uvScale, c)
      if (prevA >= 0) {
        // normal +Y bo'lishi uchun navbat: o'ng normal (nx,nz) = (-tz, tx): lat0 < lat1 bo'lsa
        this.idx.push(prevA, prevB, a, prevB, b, a)
      }
      prevA = a; prevB = b
    }
  }

  /** lentaning vertikal yon yuzasi (kerb): lat da, y0..y1; tashqariga (lat o'sish tomoniga) qaragan bo'lsa outward=+1 */
  strip_wall(pts: Array<{ x: number; z: number; nx: number; nz: number }>, lat: number, y0: number, y1: number, outward: 1 | -1, c: [number, number, number]) {
    if (pts.length < 2) return
    let prevA = -1, prevB = -1
    for (const p of pts) {
      const x = p.x + p.nx * lat, z = p.z + p.nz * lat
      const a = this.vert(x, y0, z, p.nx * outward, 0, p.nz * outward, 0, 0, c), b = this.vert(x, y1, z, p.nx * outward, 0, p.nz * outward, 0, 1, c)
      if (prevA >= 0) { if (outward > 0) this.idx.push(prevA, a, prevB, prevB, a, b); else this.idx.push(prevA, prevB, a, prevB, b, a) }
      prevA = a; prevB = b
    }
  }

  toGeometry(): BufferGeometry | null {
    if (!this.idx.length) return null
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3))
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3))
    g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3))
    g.setIndex(this.pos.length / 3 > 65535 ? this.idx : this.idx)
    g.computeBoundingSphere(); g.computeBoundingBox()
    return g
  }
}

