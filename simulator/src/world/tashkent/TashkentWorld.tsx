import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, BufferGeometry, Color, DoubleSide, ConeGeometry, CylinderGeometry, SphereGeometry, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { live } from '../../store/simulatorStore'
import { GROUND_NAME } from '../../physics/CollisionSystem'
import { useRapier } from '@react-three/rapier'
import { TK, nearestWay, type TkWay } from './tk'
import { LM } from './landmarks'
import { facadeMaterial } from './facade'
import { Landmarks } from './Landmarks'
import { colliderTags } from '../procedural/WorldChunkManager'

const Y = [0.05, 0.045, 0.04, 0.035, 0.03]
const COL = ['#34373d', '#383b41', '#3c4046', '#41454b', '#464a50']

/** yo'l lentasi (miter bilan); y balandlikda */
function ribbon(ways: TkWay[], y: (w: TkWay) => number, width: (w: TkWay) => number): BufferGeometry {
  const pos: number[] = [], idx: number[] = []
  for (const w of ways) {
    const n = w.pts.length / 2, hw = width(w) / 2, yy = y(w), base = pos.length / 3
    for (let k = 0; k < n; k++) {
      const x = w.pts[k * 2], z = w.pts[k * 2 + 1]
      let ax = 0, az = 0
      if (k > 0) { const dx = x - w.pts[k * 2 - 2], dz = z - w.pts[k * 2 - 1], l = Math.hypot(dx, dz) || 1; ax += -dz / l; az += dx / l }
      if (k < n - 1) { const dx = w.pts[k * 2 + 2] - x, dz = w.pts[k * 2 + 3] - z, l = Math.hypot(dx, dz) || 1; ax += -dz / l; az += dx / l }
      const l = Math.hypot(ax, az) || 1; ax /= l; az /= l
      pos.push(x + ax * hw, yy, z + az * hw, x - ax * hw, yy, z - az * hw)
    }
    for (let k = 0; k < n - 1; k++) { const a = base + k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  const nrm = g.getAttribute('normal'); for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0)   // tekis yuza: har doim tepaga
  return g
}


/** Yo'l bo'ylab siljitilgan (lateral) chiziq/polosa; dash=[uzunlik, oraliq] bo'lsa uzun-uzun chiziqlar. skip(s) true bo'lsa (chorraha) chizilmaydi. */
function stripes(ways: TkWay[], off: (w: TkWay) => number | number[], width: number, y: (w: TkWay) => number, dash?: [number, number], skip?: (wi: number, s: number) => boolean, filter?: (w: TkWay) => boolean): BufferGeometry {
  const pos: number[] = [], idx: number[] = []
  const quad = (x0: number, z0: number, x1: number, z1: number, nx: number, nz: number, o: number, hw: number, yy: number) => {
    const b = pos.length / 3
    pos.push(x0 + nx * (o + hw), yy, z0 + nz * (o + hw), x0 + nx * (o - hw), yy, z0 + nz * (o - hw), x1 + nx * (o + hw), yy, z1 + nz * (o + hw), x1 + nx * (o - hw), yy, z1 + nz * (o - hw))
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
  }
  const ptAt = (w: TkWay, s: number) => {
    const n = w.pts.length / 2
    let k = 1; while (k < n - 1 && w.cum[k] < s) k++
    const s0 = w.cum[k - 1], s1 = w.cum[k], f = s1 > s0 ? (s - s0) / (s1 - s0) : 0
    const x0 = w.pts[k * 2 - 2], z0 = w.pts[k * 2 - 1], x1 = w.pts[k * 2], z1 = w.pts[k * 2 + 1], l = Math.hypot(x1 - x0, z1 - z0) || 1
    return { x: x0 + (x1 - x0) * f, z: z0 + (z1 - z0) * f, nx: -(z1 - z0) / l, nz: (x1 - x0) / l, k }
  }
  for (let wi = 0; wi < TK.ways.length; wi++) {
    const w = TK.ways[wi]; if (!ways.includes(w) && filter == null) continue
    if (filter && !filter(w)) continue
    const offs = ([] as number[]).concat(off(w)), yy = y(w), n = w.pts.length / 2, hw = width / 2
    for (const o of offs) {
      if (!dash) {
        for (let k = 0; k < n - 1; k++) {
          const s = (w.cum[k] + w.cum[k + 1]) / 2; if (skip && skip(wi, s)) continue
          const x0 = w.pts[k * 2], z0 = w.pts[k * 2 + 1], x1 = w.pts[k * 2 + 2], z1 = w.pts[k * 2 + 3], l = Math.hypot(x1 - x0, z1 - z0) || 1
          quad(x0, z0, x1, z1, -(z1 - z0) / l, (x1 - x0) / l, o, hw, yy)
        }
      } else {
        for (let s = 1; s + dash[0] < w.len - 1; s += dash[0] + dash[1]) {
          if (skip && (skip(wi, s) || skip(wi, s + dash[0]))) continue
          const a = ptAt(w, s), b = ptAt(w, s + dash[0])
          quad(a.x, a.z, b.x, b.z, a.nx, a.nz, o, hw, yy)
        }
      }
    }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  const nrm = g.getAttribute('normal'); for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0)
  return g
}

/** Svetoforli chorrahalarda piyodalar o'tish joyi ("zebra") */
function zebraGeo(): BufferGeometry {
  const pos: number[] = [], idx: number[] = []
  for (const c of TK.cross) {
    if (!c.lit) continue
    for (let r = 0; r < 2; r++) for (const sg of [1, -1]) {
      const t = r === 0 ? c.ta : c.tb, self = r === 0 ? c.ha : c.hb, other = r === 0 ? c.hb : c.ha
      const rx = -t[1] * sg, rz = t[0] * sg, back = other + 3.2
      const dx = t[0] * sg, dz = t[1] * sg
      const px = c.x - dx * back, pz = c.z - dz * back          // to'xtash chizig'i markazi (yo'l o'qida)
      for (let o = -self + 0.4; o < self - 0.3; o += 0.9) {
        const cx = px + rx * o + dx * 1.9, cz = pz + rz * o + dz * 1.9
        const b = pos.length / 3, y = 0.07
        pos.push(cx + dx * 1.1 + rx * 0.22, y, cz + dz * 1.1 + rz * 0.22, cx + dx * 1.1 - rx * 0.22, y, cz + dz * 1.1 - rz * 0.22, cx - dx * 1.1 + rx * 0.22, y, cz - dz * 1.1 + rz * 0.22, cx - dx * 1.1 - rx * 0.22, y, cz - dz * 1.1 - rz * 0.22)
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
      }
    }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  const nrm = g.getAttribute('normal'); for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0)
  return g
}

const hf = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s) }
const pick = <T,>(arr: T[], r: number): T => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]
const WALL_C = ['#d9d2c3', '#e6dcc4', '#cfc6b0', '#e4d3b5', '#d8cfc0', '#c9c2b5']
const PANEL_C = ['#cfc8b4', '#d8cdb0', '#c4c9cc', '#e1c9a7', '#d6c4b0', '#bfc7c2']
const HOUSE_C = ['#efe3cc', '#e9d5b3', '#f1e9dc', '#d9c6a0', '#e6c9b0', '#cfd8c4']
const ROOF_C = ['#a8472c', '#8c4a32', '#5f7f4a', '#7c5a3a', '#6d7683']
const GLASS_C = ['#4f7fa8', '#5b8cb5', '#3f6f96', '#6a96bd']
/** body: fasadli quti (y0 = poydevor balandligi); roof: tekis qopqoq; pyr: tomli (4 qiyali) tom */
interface B { x: number; z: number; y0: number; w: number; d: number; h: number; yaw: number; c: string }
interface P { x: number; y: number; z: number; w: number; d: number; h: number; yaw: number; c: string }
interface T { x: number; z: number; s: number }
interface Cell { b: B[]; flat: P[]; pyr: P[]; t: T[] }
const cellCache = new Map<number, Cell>()
const BC = 80
function cellBuildings(i: number, j: number): Cell {
  const key = (i + 5000) * 10000 + (j + 5000), hit = cellCache.get(key); if (hit) return hit
  const bodies: B[] = [], flat: P[] = [], pyr: P[] = [], trees: T[] = [], placed: Array<[number, number, number]> = []
  const x0 = i * BC, z0 = j * BC
  const probe = (x: number, z: number) => nearestWay(x, z, 60)
  const free = (px: number, pz: number, rad: number) => !placed.some(([qx, qz, qr]) => Math.hypot(qx - px, qz - pz) < (qr + rad) * 0.92) && !LM.some((l) => Math.hypot(px - l.x, pz - l.z) < l.r + rad)
  for (let gx = x0 + 6; gx < x0 + BC; gx += 16) for (let gz = z0 + 6; gz < z0 + BC; gz += 16) {
    const px = gx + (hf(gx, gz) - 0.5) * 8, pz = gz + (hf(gz, gx) - 0.5) * 8
    const h = probe(px, pz); if (!h) continue
    const hw = h.way.w / 2, gap = h.dist - hw
    if (gap < 4 || gap > 36) continue
    const dc = Math.hypot(px, pz), res = h.way.cls >= 4, yaw = Math.atan2(h.tx, h.tz), rr = hf(px + 1, pz + 2), r2 = hf(px + 7, pz + 3)
    let w: number, d: number, hh: number
    if (res || dc > 7000) { w = 8 + r2 * 5; d = 9 + rr * 6; hh = 3.2 + hf(px, pz + 4) * 2.4 }                    // hovli uy
    else if (dc > 2600 || h.way.cls === 3) { w = 11 + r2 * 2.5; d = 36 + rr * 30; hh = 13.5 + Math.floor(hf(px, pz + 5) * 5) * 3.3 }   // panelli uy (5–9 qavat)
    else { w = 18 + r2 * 14; d = 20 + rr * 18; hh = 16 + hf(px, pz + 6) * 46 }                                    // markaz: baland binolar
    if (gap < w / 2 + 3) continue
    const rad = Math.max(w, d) / 2
    if (!free(px, pz, rad)) continue
    placed.push([px, pz, rad])
    const cr = hf(px + 3, pz)
    if (res || dc > 7000) {
      const wc = pick(HOUSE_C, cr)
      bodies.push({ x: px, z: pz, y0: 0, w, d, h: hh, yaw, c: wc })
      pyr.push({ x: px, y: hh, z: pz, w: w * 1.08, d: d * 1.08, h: 2.6 + rr * 1.6, yaw, c: pick(ROOF_C, hf(px, pz + 8)) })
    } else if (dc > 2600 || h.way.cls === 3) {
      const wc = pick(PANEL_C, cr)
      bodies.push({ x: px, z: pz, y0: 0, w, d, h: hh, yaw, c: wc })
      flat.push({ x: px, y: hh, z: pz, w: w * 1.03, d: d * 1.02, h: 0.5, yaw, c: '#6b6f73' })
    } else {
      const glass = hf(px, pz + 11) < 0.4, wc = glass ? pick(GLASS_C, cr) : pick(WALL_C, cr)
      if (hf(px, pz + 12) < 0.55 && hh > 24) {
        const bh = hh * 0.45
        bodies.push({ x: px, z: pz, y0: 0, w, d, h: bh, yaw, c: wc })
        bodies.push({ x: px, z: pz, y0: bh, w: w * 0.68, d: d * 0.68, h: hh - bh, yaw, c: wc })
        flat.push({ x: px, y: hh, z: pz, w: w * 0.7, d: d * 0.7, h: 0.5, yaw, c: '#55595d' })
        flat.push({ x: px, y: bh, z: pz, w: w * 1.02, d: d * 1.02, h: 0.4, yaw, c: '#55595d' })
      } else {
        bodies.push({ x: px, z: pz, y0: 0, w, d, h: hh, yaw, c: wc })
        flat.push({ x: px, y: hh, z: pz, w: w * 1.03, d: d * 1.02, h: 0.5, yaw, c: '#55595d' })
      }
    }
  }
  // yo'l bo'yi daraxtlari
  for (let gx = x0 + 3; gx < x0 + BC; gx += 13) for (let gz = z0 + 3; gz < z0 + BC; gz += 13) {
    const px = gx + (hf(gx + 5, gz) - 0.5) * 6, pz = gz + (hf(gz, gx + 5) - 0.5) * 6
    const h = probe(px, pz); if (!h || h.way.cls > 3) continue
    const gap = h.dist - h.way.w / 2
    if (gap < 2.4 || gap > 4.2) continue
    if (LM.some((l) => Math.hypot(px - l.x, pz - l.z) < l.r + 4)) continue
    if (placed.some(([qx, qz, qr]) => Math.hypot(qx - px, qz - pz) < qr + 2)) continue
    trees.push({ x: px, z: pz, s: 0.8 + hf(px, pz + 9) * 0.7 })
  }
  const cell = { b: bodies, flat, pyr, t: trees }
  if (cellCache.size > 1500) cellCache.clear()
  cellCache.set(key, cell)
  return cell
}

function Buildings() {
  const CAP = 7000, PCAP = 4200, TCAP = 4200
  const { world, rapier } = useRapier()
  const ref = useRef<InstancedMesh>(null), flatRef = useRef<InstancedMesh>(null), pyrRef = useRef<InstancedMesh>(null), trunkRef = useRef<InstancedMesh>(null), crownRef = useRef<InstancedMesh>(null)
  const geo = useMemo(() => { const g = new BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g }, [])
  const pyrGeo = useMemo(() => { const g = new ConeGeometry(0.7071, 1, 4); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g }, [])
  const trunkGeo = useMemo(() => { const g = new CylinderGeometry(0.18, 0.28, 2.6, 6); g.translate(0, 1.3, 0); return g }, [])
  const crownGeo = useMemo(() => { const g = new SphereGeometry(1.7, 8, 6); g.translate(0, 4.1, 0); return g }, [])
  const mat = useMemo(() => facadeMaterial('#ffffff'), [])
  const flatMat = useMemo(() => new MeshStandardMaterial({ roughness: 1 }), [])
  const pyrMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.9 }), [])
  const trunkMat = useMemo(() => new MeshStandardMaterial({ color: '#6b4a2b', roughness: 1 }), [])
  const crownMat = useMemo(() => new MeshStandardMaterial({ color: '#3f7f3b', roughness: 1 }), [])
  const o = useMemo(() => new Object3D(), [])
  const col = useMemo(() => new Color(), [])
  const last = useRef({ x: 1e9, z: 1e9 })
  const phys = useRef(new Map<number, number[]>())
  useEffect(() => {
    for (const m of [ref.current, flatRef.current, pyrRef.current, trunkRef.current, crownRef.current]) if (m) { m.count = 0; m.instanceMatrix.setUsage(DynamicDrawUsage) }
    const store = phys.current
    return () => { for (const hs of store.values()) for (const h of hs) colliderTags.delete(h); store.clear() }
  }, [])
  const body = useMemo(() => world.createRigidBody(rapier.RigidBodyDesc.fixed()), [world, rapier])
  useEffect(() => () => { try { world.removeRigidBody(body) } catch { /* yo'q */ } }, [world, body])
  useFrame(() => {
    const m = ref.current, fl = flatRef.current, py = pyrRef.current, tr = trunkRef.current, cr = crownRef.current
    if (!m || !fl || !py || !tr || !cr || !TK.ready) return
    const [px, , pz] = live.position
    if (Math.hypot(px - last.current.x, pz - last.current.z) < 50) return
    last.current = { x: px, z: pz }
    const R = 440, i0 = Math.floor((px - R) / BC), i1 = Math.floor((px + R) / BC), j0 = Math.floor((pz - R) / BC), j1 = Math.floor((pz + R) / BC)
    let n = 0, nf = 0, np = 0, nt = 0
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const cell = cellBuildings(i, j)
      for (const b of cell.b) { if (n >= CAP) break; o.position.set(b.x, b.y0, b.z); o.rotation.set(0, b.yaw, 0); o.scale.set(b.w, b.h, b.d); o.updateMatrix(); m.setMatrixAt(n, o.matrix); col.set(b.c); m.setColorAt(n, col); n++ }
      for (const f of cell.flat) { if (nf >= CAP) break; o.position.set(f.x, f.y, f.z); o.rotation.set(0, f.yaw, 0); o.scale.set(f.w, f.h, f.d); o.updateMatrix(); fl.setMatrixAt(nf, o.matrix); col.set(f.c); fl.setColorAt(nf, col); nf++ }
      for (const f of cell.pyr) { if (np >= PCAP) break; o.position.set(f.x, f.y, f.z); o.rotation.set(0, f.yaw, 0); o.scale.set(f.w, f.h, f.d); o.updateMatrix(); py.setMatrixAt(np, o.matrix); col.set(f.c); py.setColorAt(np, col); np++ }
      for (const t of cell.t) { if (nt >= TCAP) break; o.position.set(t.x, 0, t.z); o.rotation.set(0, 0, 0); o.scale.set(t.s, t.s, t.s); o.updateMatrix(); tr.setMatrixAt(nt, o.matrix); cr.setMatrixAt(nt, o.matrix); nt++ }
    }
    m.count = n; fl.count = nf; py.count = np; tr.count = cr.count = nt
    for (const x of [m, fl, py, tr, cr]) { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true }
    const P = 170, want = new Set<number>()
    for (let i = Math.floor((px - P) / BC); i <= Math.floor((px + P) / BC); i++) for (let j = Math.floor((pz - P) / BC); j <= Math.floor((pz + P) / BC); j++) want.add((i + 5000) * 10000 + (j + 5000))
    for (const [k, hs] of phys.current) if (!want.has(k)) { for (const h of hs) { const c = world.getCollider(h); if (c) world.removeCollider(c, false); colliderTags.delete(h) } phys.current.delete(k) }
    for (const k of want) {
      if (phys.current.has(k)) continue
      const i = Math.floor(k / 10000) - 5000, j = (k % 10000) - 5000, hs: number[] = []
      for (const b of cellBuildings(i, j).b) {
        const c = world.createCollider(rapier.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y0 + b.h / 2, b.z).setRotation({ x: 0, y: Math.sin(b.yaw / 2), z: 0, w: Math.cos(b.yaw / 2) }), body)
        colliderTags.set(c.handle, 'Bino'); hs.push(c.handle)
      }
      phys.current.set(k, hs)
    }
  })
  return (<>
    <instancedMesh ref={ref} args={[geo, mat, CAP]} frustumCulled={false} />
    <instancedMesh ref={flatRef} args={[geo, flatMat, CAP]} frustumCulled={false} />
    <instancedMesh ref={pyrRef} args={[pyrGeo, pyrMat, PCAP]} frustumCulled={false} />
    <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, TCAP]} frustumCulled={false} />
    <instancedMesh ref={crownRef} args={[crownGeo, crownMat, TCAP]} frustumCulled={false} />
  </>)
}

function Ground() {
  const ref = useRef<Mesh>(null)
  useFrame(() => { if (ref.current) { const [px, , pz] = live.position; ref.current.position.set(px, -0.12, pz) } })
  return (
    <>
      <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[3000, 3000]} /><meshStandardMaterial color="#6f8a55" roughness={1} /></mesh>
      <RigidBody type="fixed" name={GROUND_NAME} colliders={false}><CuboidCollider args={[30000, 1, 30000]} position={[0, -1, 0]} friction={1} /></RigidBody>
    </>
  )
}

export function TashkentWorld() {
  const roads = useMemo(() => {
    const out: Array<{ g: BufferGeometry; c: string }> = []
    for (let c = 4; c >= 0; c--) {
      const ws = TK.ways.filter((w) => w.cls === c)
      if (ws.length) out.push({ g: ribbon(ws, (w) => Y[c] + (w.link ? 0.004 : 0), (w) => w.w), c: COL[c] })
    }
    const main = (w: TkWay) => w.cls <= 3 && !w.link
    const jskip = (wi: number, s: number) => {   // chorraha ichida chiziq chizilmaydi
      const w = TK.ways[wi]
      for (const xr of w.xs) { const c = TK.cross[xr.ci]; const other = c.a === wi ? c.hb : c.ha; if (Math.abs(s - xr.s) < other + 3.6) return true }
      return false
    }
    const lanes = (w: TkWay) => Math.max(w.oneway ? 1 : 2, Math.round(w.w / 3.3))
    const half = (w: TkWay) => w.w / 2
    const none: TkWay[] = []
    const edge = { g: stripes(none, (w) => [half(w) - 0.28, -(half(w) - 0.28)], 0.14, (w) => Y[w.cls] + 0.012, undefined, jskip, main), c: '#e8e8e2' }
    const center = { g: stripes(none, () => [0.1, -0.1], 0.11, (w) => Y[w.cls] + 0.012, undefined, jskip, (w) => main(w) && !w.oneway && lanes(w) >= 4), c: '#f0e9b8' }
    const centerDash = { g: stripes(none, () => 0, 0.14, (w) => Y[w.cls] + 0.012, [3, 6], jskip, (w) => main(w) && !w.oneway && lanes(w) < 4), c: '#e8e8e2' }
    const divider = { g: stripes(none, (w) => { const n = lanes(w), lw = w.w / n, out: number[] = []; if (w.oneway) { for (let k = 1; k < n; k++) out.push(-half(w) + k * lw) } else { const per = n / 2; for (let k = 1; k < per; k++) { out.push(k * lw, -k * lw) } } return out }, 0.12, (w) => Y[w.cls] + 0.012, [3, 6], jskip, (w) => main(w) && lanes(w) >= (w.oneway ? 2 : 4)), c: '#e8e8e2' }
    const zebra = { g: zebraGeo(), c: '#ecece6' }
    const line = { g: new BufferGeometry(), c: '#000' }
    const marks = [edge, center, centerDash, divider, zebra]
    return { out, line, marks }
  }, [])
  return (
    <>
      <Ground />
      {roads.out.map((r, i) => (<mesh key={i} ref={(m) => { const w = window as unknown as { __roadM?: Record<string, unknown> }; (w.__roadM = w.__roadM || {})['r' + i] = m }} geometry={r.g} receiveShadow frustumCulled={false}><meshStandardMaterial color={r.c} roughness={0.95} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} /></mesh>))}
      {roads.marks.map((m, i) => (<mesh key={'m' + i} ref={(o) => { const w = window as unknown as { __roadM?: Record<string, unknown> }; (w.__roadM = w.__roadM || {})['m' + i] = o }} geometry={m.g} frustumCulled={false} receiveShadow><meshStandardMaterial color={m.c} roughness={0.85} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /></mesh>))}
      <Buildings />
      <Landmarks />
    </>
  )
}
