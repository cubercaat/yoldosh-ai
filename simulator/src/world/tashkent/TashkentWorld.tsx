import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, SphereGeometry, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { live } from '../../store/simulatorStore'
import { GROUND_NAME } from '../../physics/CollisionSystem'
import { useRapier } from '@react-three/rapier'
import { TK, nearestWay, type TkWay } from './tk'
import { LM } from './landmarks'
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

const hf = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s) }
const PAL = ['#d9d2c3', '#c9c3b6', '#e6e1d6', '#b9b3a6', '#cfd6dc', '#d8c9b0', '#aeb6bf', '#e9dcc6']
interface B { x: number; z: number; w: number; d: number; h: number; yaw: number; c: string }
interface T { x: number; z: number; s: number }
interface Cell { b: B[]; t: T[] }
const cellCache = new Map<number, Cell>()
const BC = 80
function cellBuildings(i: number, j: number): Cell {
  const key = (i + 5000) * 10000 + (j + 5000), hit = cellCache.get(key); if (hit) return hit
  const out: B[] = [], trees: T[] = [], occ = new Set<number>()
  const x0 = i * BC, z0 = j * BC
  const seen = new Set<string>()
  const probe = (x: number, z: number) => nearestWay(x, z, 60)
  // yo'l markazlaridan namuna: katak ichidagi nuqtalarni to'r bilan tekshiramiz (22 m)
  for (let gx = x0 + 8; gx < x0 + BC; gx += 18) for (let gz = z0 + 8; gz < z0 + BC; gz += 18) {
    const px = gx + (hf(gx, gz) - 0.5) * 8, pz = gz + (hf(gz, gx) - 0.5) * 8
    const h = probe(px, pz); if (!h) continue
    const hw = h.way.w / 2, gap = h.dist - hw
    if (gap < 5 || gap > 34) continue                              // faqat yo'l bo'yi
    if (LM.some((l) => Math.hypot(px - l.x, pz - l.z) < l.r + 14)) continue
    const r = 7 + hf(px, pz + 1) * 6
    if (gap < r + 2.5) continue
    const k = Math.floor(px / 14) * 7919 + Math.floor(pz / 14); if (occ.has(k)) continue; occ.add(k)
    const sk = `${Math.round(px)}|${Math.round(pz)}`; if (seen.has(sk)) continue; seen.add(sk)
    const dc = Math.hypot(px, pz), res = h.way.cls >= 4
    const hh = res ? 4 + hf(px, pz + 2) * 6 : dc < 2500 ? 10 + hf(px, pz + 3) * 48 : dc < 6000 ? 8 + hf(px, pz + 3) * 24 : 5 + hf(px, pz + 3) * 10
    out.push({ x: px, z: pz, w: r * 1.7, d: r * 1.3, h: hh, yaw: Math.atan2(h.tx, h.tz), c: PAL[Math.floor(hf(px + 3, pz) * PAL.length)] })
  }
  // yo'l bo'yi daraxtlari
  for (let gx = x0 + 3; gx < x0 + BC; gx += 13) for (let gz = z0 + 3; gz < z0 + BC; gz += 13) {
    const px = gx + (hf(gx + 5, gz) - 0.5) * 6, pz = gz + (hf(gz, gx + 5) - 0.5) * 6
    const h = probe(px, pz); if (!h || h.way.cls > 3) continue
    const gap = h.dist - h.way.w / 2
    if (gap < 2.4 || gap > 4.2) continue
    if (LM.some((l) => Math.hypot(px - l.x, pz - l.z) < l.r + 4)) continue
    if (out.some((b) => Math.hypot(b.x - px, b.z - pz) < Math.max(b.w, b.d) * 0.75 + 2)) continue
    trees.push({ x: px, z: pz, s: 0.8 + hf(px, pz + 9) * 0.7 })
  }
  const cell = { b: out, t: trees }
  if (cellCache.size > 1500) cellCache.clear()
  cellCache.set(key, cell)
  return cell
}

function Buildings() {
  const CAP = 5200, TCAP = 4200
  const { world, rapier } = useRapier()
  const ref = useRef<InstancedMesh>(null), roofRef = useRef<InstancedMesh>(null), trunkRef = useRef<InstancedMesh>(null), crownRef = useRef<InstancedMesh>(null)
  const geo = useMemo(() => { const g = new BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g }, [])
  const trunkGeo = useMemo(() => { const g = new CylinderGeometry(0.18, 0.28, 2.6, 6); g.translate(0, 1.3, 0); return g }, [])
  const crownGeo = useMemo(() => { const g = new SphereGeometry(1.7, 8, 6); g.translate(0, 4.1, 0); return g }, [])
  const mat = useMemo(() => new MeshStandardMaterial({ roughness: 0.9 }), [])
  const roofMat = useMemo(() => new MeshStandardMaterial({ color: '#6f6a62', roughness: 1 }), [])
  const trunkMat = useMemo(() => new MeshStandardMaterial({ color: '#6b4a2b', roughness: 1 }), [])
  const crownMat = useMemo(() => new MeshStandardMaterial({ color: '#3f7f3b', roughness: 1 }), [])
  const o = useMemo(() => new Object3D(), [])
  const col = useMemo(() => new Color(), [])
  const last = useRef({ x: 1e9, z: 1e9 })
  const phys = useRef(new Map<number, number[]>())     // katak -> collider handle'lar
  useEffect(() => {
    for (const m of [ref.current, roofRef.current, trunkRef.current, crownRef.current]) if (m) { m.count = 0; m.instanceMatrix.setUsage(DynamicDrawUsage) }
    const store = phys.current
    return () => { for (const hs of store.values()) for (const h of hs) colliderTags.delete(h); store.clear() }
  }, [])
  const body = useMemo(() => world.createRigidBody(rapier.RigidBodyDesc.fixed()), [world, rapier])
  useEffect(() => () => { try { world.removeRigidBody(body) } catch { /* yo'q */ } }, [world, body])
  useFrame(() => {
    const m = ref.current, rf = roofRef.current, tr = trunkRef.current, cr = crownRef.current
    if (!m || !rf || !tr || !cr || !TK.ready) return
    const [px, , pz] = live.position
    if (Math.hypot(px - last.current.x, pz - last.current.z) < 50) return
    last.current = { x: px, z: pz }
    const R = 440, i0 = Math.floor((px - R) / BC), i1 = Math.floor((px + R) / BC), j0 = Math.floor((pz - R) / BC), j1 = Math.floor((pz + R) / BC)
    let n = 0, nt = 0
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const cell = cellBuildings(i, j)
      for (const b of cell.b) {
        if (n >= CAP) break
        o.position.set(b.x, 0, b.z); o.rotation.set(0, b.yaw, 0); o.scale.set(b.w, b.h, b.d); o.updateMatrix()
        m.setMatrixAt(n, o.matrix); col.set(b.c); m.setColorAt(n, col)
        o.position.set(b.x, b.h, b.z); o.scale.set(b.w * 1.02, 0.5, b.d * 1.02); o.updateMatrix(); rf.setMatrixAt(n, o.matrix); n++
      }
      for (const t of cell.t) {
        if (nt >= TCAP) break
        o.position.set(t.x, 0, t.z); o.rotation.set(0, 0, 0); o.scale.set(t.s, t.s, t.s); o.updateMatrix(); tr.setMatrixAt(nt, o.matrix); cr.setMatrixAt(nt, o.matrix); nt++
      }
    }
    m.count = rf.count = n; tr.count = cr.count = nt
    for (const x of [m, rf, tr, cr]) x.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    // fizika: faqat 170 m ichidagi kataklarda bino collider'lari
    const P = 170, want = new Set<number>()
    for (let i = Math.floor((px - P) / BC); i <= Math.floor((px + P) / BC); i++) for (let j = Math.floor((pz - P) / BC); j <= Math.floor((pz + P) / BC); j++) want.add((i + 5000) * 10000 + (j + 5000))
    for (const [k, hs] of phys.current) if (!want.has(k)) { for (const h of hs) { const c = world.getCollider(h); if (c) world.removeCollider(c, false); colliderTags.delete(h) } phys.current.delete(k) }
    for (const k of want) {
      if (phys.current.has(k)) continue
      const i = Math.floor(k / 10000) - 5000, j = (k % 10000) - 5000, hs: number[] = []
      for (const b of cellBuildings(i, j).b) {
        const c = world.createCollider(rapier.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.h / 2, b.z).setRotation({ x: 0, y: Math.sin(b.yaw / 2), z: 0, w: Math.cos(b.yaw / 2) }), body)
        colliderTags.set(c.handle, 'Bino'); hs.push(c.handle)
      }
      phys.current.set(k, hs)
    }
  })
  return (<>
    <instancedMesh ref={ref} args={[geo, mat, CAP]} frustumCulled={false} receiveShadow />
    <instancedMesh ref={roofRef} args={[geo, roofMat, CAP]} frustumCulled={false} />
    <instancedMesh ref={trunkRef} args={[trunkGeo, trunkMat, TCAP]} frustumCulled={false} />
    <instancedMesh ref={crownRef} args={[crownGeo, crownMat, TCAP]} frustumCulled={false} />
  </>)
}

function Ground() {
  const ref = useRef<Mesh>(null)
  useFrame(() => { if (ref.current) { const [px, , pz] = live.position; ref.current.position.set(px, -0.004, pz) } })
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
    const lines = TK.ways.filter((w) => w.cls <= 2 && !w.link && !w.oneway)
    const line = { g: ribbon(lines, (w) => Y[w.cls] + 0.012, () => 0.22), c: '#ece6c8' }
    return { out, line }
  }, [])
  return (
    <>
      <Ground />
      {roads.out.map((r, i) => (<mesh key={i} geometry={r.g} receiveShadow frustumCulled={false}><meshStandardMaterial color={r.c} roughness={0.95} /></mesh>))}
      <mesh geometry={roads.line.g} frustumCulled={false}><meshStandardMaterial color={roads.line.c} roughness={0.8} /></mesh>
      <Buildings />
      <Landmarks />
    </>
  )
}
