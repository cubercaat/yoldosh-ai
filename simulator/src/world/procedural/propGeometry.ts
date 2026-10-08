import { BufferGeometry, Float32BufferAttribute, Material, Mesh, PlaneGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GeoBuilder, lin } from './geom'
import { buildCar } from '../../vehicles/car/carBuilder'
import { getVehicle } from '../../vehicles/vehicleRegistry'

/** Instancing uchun bir marta quriladigan umumiy geometriyalar (daraxt, ustun, belgi, skameyka, to'xtagan mashina). */
const cache = new Map<string, BufferGeometry>()
const memo = (k: string, f: () => BufferGeometry) => { let g = cache.get(k); if (!g) { g = f(); cache.set(k, g) } return g }
const fin = (b: GeoBuilder) => b.toGeometry()!

export const treeGeo = (kind: 0 | 1) => memo(`tree${kind}`, () => {
  const b = new GeoBuilder()
  b.cylinder(0, 0, 0, 0.22, 2.1, 7, lin('#5a3d22'), 0.16)
  if (kind === 0) { // qarag'ay
    b.cylinder(0, 1.2, 0, 1.55, 2.2, 9, lin('#1f6b2c'), 0.05)
    b.cylinder(0, 2.8, 0, 1.2, 2.0, 9, lin('#257a33'), 0.05)
    b.cylinder(0, 4.2, 0, 0.8, 1.8, 9, lin('#2a8a3a'), 0.02)
  } else { // bargli daraxt (to'p shakldagi toj)
    for (const [y, r, c] of [[2.2, 1.7, '#3a8f3a'], [3.2, 1.9, '#43a047'], [4.2, 1.4, '#4caf50']] as Array<[number, number, string]>) {
      b.cylinder(0, y - 0.6, 0, r, 0.6, 10, lin(c), r * 1.0)
      b.cylinder(0, y, 0, r, 0.7, 10, lin(c), r * 0.35)
    }
  }
  return fin(b)
})

export const lampPoleGeo = () => memo('lampPole', () => {
  const b = new GeoBuilder(), m = lin('#3a404b')
  b.cylinder(0, 0, 0, 0.12, 7.0, 8, m, 0.07)
  b.box(0, 7.0, 0.9, 0.09, 0.09, 1.9, m) // yelka (+Z yo'lga qarab)
  return fin(b)
})
export const lampHeadGeo = () => memo('lampHead', () => { const b = new GeoBuilder(); b.box(0, 6.95, 1.7, 0.5, 0.14, 0.95, lin('#f2ecd8')); return fin(b) })

export const signPoleGeo = () => memo('signPole', () => { const b = new GeoBuilder(); b.cylinder(0, 0, 0, 0.04, 2.3, 6, lin('#7c828c')); return fin(b) })
export const signPlateGeo = () => memo('signPlate', () => { const g = new PlaneGeometry(0.66, 0.66); g.translate(0, 2.0, 0.06); return g })

export const benchGeo = () => memo('bench', () => {
  const b = new GeoBuilder(), wood = lin('#8b6b45'), met = lin('#2f343c')
  b.box(0, 0.45, 0, 1.7, 0.07, 0.45, wood); b.box(0, 0.78, -0.2, 1.7, 0.42, 0.06, wood)
  b.box(-0.75, 0.22, 0, 0.07, 0.45, 0.4, met); b.box(0.75, 0.22, 0, 0.07, 0.45, 0.4, met)
  return fin(b)
})

export const lightPoleGeo = () => memo('lightPole', () => {
  const b = new GeoBuilder(), m = lin('#2d323a')
  b.cylinder(0, 0, 0, 0.07, 3.3, 8, m); b.box(0, 3.35, 0.02, 0.32, 1.0, 0.3, m)
  return fin(b)
})
/** svetofor linzalari: 3 ta disk, +Z ga qaragan */
export const lensGeo = () => memo('lens', () => {
  const b = new GeoBuilder(), w: [number, number, number] = [1, 1, 1]
  for (let k = 0; k < 3; k++) b.cylinder(0, 0, 0, 0.1, 0.04, 10, w) // markazni keyin siljitamiz
  const g = fin(b)
  g.rotateX(Math.PI / 2) // silindr o'qi Z ga
  return g
})

export const beaconGeo = () => memo('beacon', () => { const b = new GeoBuilder(); b.cylinder(0, 0, 0, 4, 60, 20, lin('#b8f53b'), 4); return fin(b) })

/** to'xtagan mashina uchun BITTA birlashtirilgan geometriya (vertex ranglar; bo'yoq = oq, instanceColor bilan bo'yaladi) */
export function staticCarGeo(id: string): BufferGeometry {
  return memo(`car|${id}`, () => {
    const cfg = getVehicle(id)
    const car = buildCar(cfg, '#ffffff', '01 A 000 AA', 2)
    car.updateMatrixWorld(true)
    const list: BufferGeometry[] = []
    const paint = car.userData.paint as Material
    car.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      src.applyMatrix4(m.matrixWorld)
      const n = src.attributes.position.count
      const col = new Float32Array(n * 3), shade = src.attributes.color
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      const groups = src.groups.length ? src.groups : [{ start: 0, count: n, materialIndex: 0 }]
      for (const g of groups) {
        const mat = (mats[g.materialIndex ?? 0] ?? mats[0]) as Material & { color?: { r: number; g: number; b: number } }
        const isPaint = mat === paint
        const base = isPaint ? [1, 1, 1] : mat.color ? [mat.color.r, mat.color.g, mat.color.b] : [0.05, 0.05, 0.05]
        const isGlass = (mat as { transparent?: boolean }).transparent
        const start = g.start, end = Math.min(n, g.start + g.count)
        for (let v = start; v < end; v++) {
          const s = shade ? shade.getX(v) : 1
          const k = isGlass ? 0.7 : 1
          col[v * 3] = base[0] * s * k; col[v * 3 + 1] = base[1] * s * k; col[v * 3 + 2] = base[2] * s * k
        }
      }
      const out = new BufferGeometry()
      out.setAttribute('position', src.attributes.position); out.setAttribute('normal', src.attributes.normal)
      out.setAttribute('color', new Float32BufferAttribute(col, 3))
      list.push(out)
    })
    const merged = mergeGeometries(list, false)!
    list.forEach((g) => g.dispose())
    merged.computeBoundingSphere(); merged.computeBoundingBox()
    return merged
  })
}

export function disposePropGeos() { for (const g of cache.values()) g.dispose(); cache.clear() }

