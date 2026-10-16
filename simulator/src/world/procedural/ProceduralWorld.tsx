import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import {
  BufferGeometry, CircleGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, LineBasicMaterial, LineSegments, Material,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PointLight, Vector3,
} from 'three'
import { WorldChunkManager } from './WorldChunkManager'
import { CHUNK, crossing, getStart, lightState } from './cityPlan'
import { SIGN_KINDS, groundTexture, setWorldNight, signMaterial, type SignKind } from './worldMaterials'
import { beaconGeo, benchGeo, lampHeadGeo, lampPoleGeo, lightPoleGeo, signPlateGeo, signPoleGeo, staticCarGeo, treeGeo } from './propGeometry'
import { live, useSimStore } from '../../store/simulatorStore'
import { sunState } from '../../systems/DayNightSystem'
import { perf, perfTick, usePerf } from '../../systems/PerformanceManager'
import { handles } from '../../components/simulator/handles'
import { GROUND_NAME } from '../../physics/CollisionSystem'
import { CuboidCollider, RigidBody } from '@react-three/rapier'

import { worldClock } from './clock'
export { worldClock }
export const mgrRef: { current: WorldChunkManager | null } = { current: null }

const CAP = { tree: 3500, treeNear: 700, lamp: 700, signPole: 500, sign: 160, bench: 200, lightPole: 160, lens: 160, car: 260 }
const CAR_IDS = ['cobalt', 'malibu', 'sedan', 'gclass', 'isuzu', 'cobalt']
const hf = (x: number, z: number) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s) }

/** Yer: oyoq ostidagi cheksiz o'tloq (oyinchi bilan birga suriladi, tekstura 8 m ga hizalangan) + fizik asos */
function Ground() {
  const ref = useRef<Mesh>(null)
  const tex = useMemo(() => { const t = groundTexture().clone(); t.needsUpdate = true; t.repeat.set(250, 250); return t }, [])
  useFrame(() => {
    if (!ref.current) return
    const [px, , pz] = live.position
    ref.current.position.set(Math.round(px / 8) * 8, -0.004, Math.round(pz / 8) * 8)
  })
  return (
    <>
      <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[2000, 2000]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>
      <RigidBody type="fixed" name={GROUND_NAME} colliders={false}>
        <CuboidCollider args={[30000, 1, 30000]} position={[0, -1, 0]} friction={1} />
      </RigidBody>
    </>
  )
}

function useStatic<T>(f: () => T): T { return useMemo(f, []) } // eslint-disable-line react-hooks/exhaustive-deps

export function ProceduralWorld() {
  const { world, rapier } = useRapier()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const mgr = useMemo(() => new WorldChunkManager(world, rapier), [world, rapier])
  const fwd = useMemo(() => new Vector3(), [])

  /* ---- prop materiallari va geometriyalar (bir marta) ---- */
  const propMat = useStatic(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }))
  const metalMat = useStatic(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 }))
  const headMat = useStatic(() => new MeshStandardMaterial({ vertexColors: true, color: '#f2ecd8', emissive: '#ffd58a', emissiveIntensity: 0, roughness: 0.4 }))
  const carMat = useStatic(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.6, envMapIntensity: 1.2 }))
  const lensMat = useStatic(() => new MeshBasicMaterial({ toneMapped: false }))
  const lensGeo = useStatic(() => new CircleGeometry(0.1, 14))
  const geos = useStatic(() => ({
    tree0: treeGeo(0), tree1: treeGeo(1), pole: lampPoleGeo(), head: lampHeadGeo(), sPole: signPoleGeo(), sPlate: signPlateGeo(), bench: benchGeo(), lPole: lightPoleGeo(),
    cars: Object.fromEntries(CAR_IDS.map((id) => [id, staticCarGeo(id)])) as Record<string, BufferGeometry>,
  }))
  const signMats = useStatic(() => Object.fromEntries(SIGN_KINDS.map((k) => [k, signMaterial(k)])) as unknown as Record<SignKind, Material>)

  const refs = useRef<Record<string, InstancedMesh | null>>({})
  const refFns = useRef(new Map<string, (m: InstancedMesh | null) => void>())
  const setRef = (k: string) => {
    let f = refFns.current.get(k)
    if (!f) { f = (m: InstancedMesh | null) => { refs.current[k] = m; if (m && !m.userData.init) { m.userData.init = true; m.instanceMatrix.setUsage(DynamicDrawUsage); m.count = 0 } }; refFns.current.set(k, f) }
    return f
  }
  const lampLights = useRef<Array<PointLight | null>>([])
  const state = useRef({ ver: -1, px: 1e9, pz: 1e9, lampPts: [] as Array<{ x: number; z: number; dx: number; dz: number }>, heads: [] as Array<{ x: number; z: number; rot: number; axis: 0 | 1; i: number; j: number; base: number }>, lensT: 0, dbgKey: '' })
  const dbg = useRef<LineSegments | null>(null)
  const tmp = useMemo(() => new Object3D(), [])
  const tmpC = useMemo(() => new Color(), [])

  useEffect(() => {
    mgrRef.current = mgr
    const s0 = getStart()
    mgr.preload(s0.x, s0.z, Math.sin(s0.yaw), Math.cos(s0.yaw))
    return () => { mgrRef.current = null; mgr.dispose() }
  }, [mgr])

  const place = (m: InstancedMesh | null | undefined, i: number, x: number, y: number, z: number, ry: number, s = 1) => {
    if (!m) return
    tmp.position.set(x, y, z); tmp.rotation.set(0, ry, 0); tmp.scale.set(s, s, s); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix)
  }

  function rebuildProps(px: number, pz: number) {
    const R = refs.current, q = perf.q
    const cnt: Record<string, number> = {}
    const next = (k: string, cap: number) => { const c = cnt[k] ?? 0; if (c >= cap) return -1; cnt[k] = c + 1; return c }
    const lampPts: typeof state.current.lampPts = [], heads: typeof state.current.heads = []
    let props = 0
    for (const { b, ring } of mgr.mounted()) {
      const far = ring >= 2
      for (const t of b.trees) {
        if (hf(t.x, t.z) > q.trees * (far ? 0.7 : 1)) continue
        const near = (t.x - px) ** 2 + (t.z - pz) ** 2 < 75 * 75 && q.shadowRing >= 0
        const key = `tree${t.kind}${near ? 'n' : ''}`, i = next(key, near ? CAP.treeNear : CAP.tree)
        if (i >= 0) { place(R[key], i, t.x, 0, t.z, hf(t.z, t.x) * 6.28, t.s); props++ }
      }
      for (const l of b.lamps) {
        const i = next('pole', CAP.lamp); if (i < 0) break
        const ry = Math.atan2(l.dx, l.dz)
        place(R.pole, i, l.x, 0, l.z, ry); place(R.head, i, l.x, 0, l.z, ry); props++
        if (ring <= 1) lampPts.push({ x: l.x + l.dx * 1.7, z: l.z + l.dz * 1.7, dx: l.dx, dz: l.dz })
      }
      if (far) continue
      for (const s of b.signs) {
        const i = next('sPole', CAP.signPole); if (i < 0) break
        place(R.sPole, i, s.x, 0, s.z, s.rot)
        const k = next('plate' + s.kind, CAP.sign); if (k >= 0) place(R['plate' + s.kind], k, s.x, 0, s.z, s.rot)
        props++
      }
      for (const bn of b.benches) { const i = next('bench', CAP.bench); if (i >= 0) place(R.bench, i, bn.x, 0, bn.z, bn.rot) }
      for (const h of b.lights) {
        const i = next('lPole', CAP.lightPole); if (i < 0) break
        place(R.lPole, i, h.x, 0, h.z, h.rot)
        heads.push({ ...h, base: i })
      }
      for (const c of b.cars) {
        const key = 'car' + c.id, i = next(key, CAP.car); if (i < 0) continue
        const m = R[key]; place(m, i, c.x, 0, c.z, c.yaw)
        tmpC.set(c.color); m?.setColorAt(i, tmpC)
      }
    }
    for (const k of Object.keys(R)) {
      const m = R[k]; if (!m) continue
      m.count = cnt[k] ?? 0
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      if (m.count > 0) m.computeBoundingSphere()
    }
    // svetofor linzalari
    const lr = R.lensR, ly = R.lensY, lg = R.lensG
    heads.forEach((h, i) => {
      const fx = Math.sin(h.rot), fz = Math.cos(h.rot)
      for (const [m, dy] of [[lr, 3.67], [ly, 3.35], [lg, 3.03]] as Array<[InstancedMesh | null | undefined, number]>) place(m, i, h.x + fx * 0.17, dy, h.z + fz * 0.17, h.rot)
    })
    for (const m of [lr, ly, lg]) if (m) { m.count = heads.length; m.instanceMatrix.needsUpdate = true; if (m.count) m.computeBoundingSphere() }
    state.current.lampPts = lampPts; state.current.heads = heads
    perf.props = props
  }

  function updateLenses(t: number) {
    const { heads } = state.current, R = refs.current
    const on = { r: [1.6, 0.15, 0.12], y: [1.5, 1.1, 0.1], g: [0.15, 1.5, 0.35] }, off = { r: [0.14, 0.02, 0.02], y: [0.15, 0.12, 0.02], g: [0.02, 0.12, 0.04] }
    heads.forEach((h, i) => {
      const st = lightState(crossing(h.i, h.j), h.axis, t)
      const set = (m: InstancedMesh | null | undefined, v: number[]) => { if (m) { tmpC.setRGB(v[0], v[1], v[2]); m.setColorAt(i, tmpC) } }
      set(R.lensR, st === 'red' ? on.r : off.r); set(R.lensY, st === 'yellow' ? on.y : off.y); set(R.lensG, st === 'green' ? on.g : off.g)
    })
    for (const k of ['lensR', 'lensY', 'lensG']) { const m = R[k]; if (m?.instanceColor) m.instanceColor.needsUpdate = true }
  }

  useFrame((s, dt) => {
    const [px, , pz] = live.position
    camera.getWorldDirection(fwd)
    let fx = fwd.x, fz = fwd.z; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l
    const q = perf.q
    if (mgr.radii.render !== q.render || mgr.radii.sim !== q.sim) mgr.setRadii({ render: q.render, sim: q.sim })
    mgr.setShadowRing(q.shadowRing)
    mgr.update(px, pz, fx, fz, 3.5)
    perfTick(dt, gl.info)
    const st = state.current
    const moved = (px - st.px) ** 2 + (pz - st.pz) ** 2 > 18 * 18
    if (mgr.version !== st.ver || moved) { rebuildProps(px, pz); st.ver = mgr.version; st.px = px; st.pz = pz }
    const sun = sunState(useSimStore.getState().timeOfDay)
    setWorldNight(sun.night)
    headMat.emissiveIntensity = sun.night * 3.5
    // ko'cha chiroqlari: eng yaqin 6 tasiga haqiqiy yorug'lik
    const pts = st.lampPts, pool = lampLights.current
    if (sun.night > 0.15 && pts.length) {
      const near = pts.map((p) => ({ p, d: (p.x - px) ** 2 + (p.z - pz) ** 2 })).sort((a, b) => a.d - b.d).slice(0, pool.length)
      near.forEach((n, k) => { const L = pool[k]; if (L) { L.position.set(n.p.x, 6.6, n.p.z); L.intensity = 70 * sun.night } })
      for (let k = near.length; k < pool.length; k++) if (pool[k]) pool[k]!.intensity = 0
    } else for (const L of pool) if (L) L.intensity = 0
    st.lensT -= dt
    if (st.lensT <= 0) { st.lensT = 0.12; updateLenses(worldClock()) }
    // statistika (HUD uchun)
    if ((s.clock.elapsedTime * 4) % 1 < 0.1) {
      mgr.refreshStats()
      const m = mgr.stats
      perf.renderChunks = m.renderChunks; perf.simChunks = m.simChunks; perf.physicsChunks = m.physicsChunks; perf.colliders = m.colliders; perf.physicsBodies = mgr.physicsBodies()
      perf.chunkBuildMs = m.buildMs; perf.chunkBuildAvgMs = m.buildAvgMs; perf.queue = m.queue; perf.worldTris = m.tris; perf.roundabouts = m.roundabouts; perf.buildings = m.buildings
    }
    // chunk chegaralari (debug)
    if (usePerf.getState().debugWorld) {
      const key = `${mgr.chunksX},${mgr.chunksZ},${mgr.version}`
      if (st.dbgKey !== key && dbg.current) {
        st.dbgKey = key
        const pos: number[] = []
        for (const { b, ring } of mgr.mounted()) {
          const y = 0.3 + ring * 0.05
          pos.push(b.x0, y, b.z0, b.x1, y, b.z0, b.x1, y, b.z0, b.x1, y, b.z1, b.x1, y, b.z1, b.x0, y, b.z1, b.x0, y, b.z1, b.x0, y, b.z0)
          pos.push(b.x0, y, b.z0, b.x0, y + 25, b.z0)
        }
        dbg.current.geometry.dispose(); const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); dbg.current.geometry = g
      }
      if (dbg.current) dbg.current.visible = true
    } else if (dbg.current) { dbg.current.visible = false; st.dbgKey = '' }
    handles.world = mgr
  })

  const dbgMat = useStatic(() => new LineBasicMaterial({ color: '#ffd400' }))
  const mk = (k: string, g: BufferGeometry, m: Material, cap: number, shadow = false) => (
    <instancedMesh key={k} ref={setRef(k)} args={[g, m, cap]} castShadow={shadow} frustumCulled />
  )

  return (
    <>
      <primitive object={mgr.root} />
      <Ground />
      {mk('tree0', geos.tree0, propMat, CAP.tree)}
      {mk('tree1', geos.tree1, propMat, CAP.tree)}
      {mk('tree0n', geos.tree0, propMat, CAP.treeNear, true)}
      {mk('tree1n', geos.tree1, propMat, CAP.treeNear, true)}
      {mk('pole', geos.pole, metalMat, CAP.lamp)}
      {mk('head', geos.head, headMat, CAP.lamp)}
      {mk('sPole', geos.sPole, metalMat, CAP.signPole)}
      {SIGN_KINDS.map((k) => mk('plate' + k, geos.sPlate, signMats[k], CAP.sign))}
      {mk('bench', geos.bench, propMat, CAP.bench)}
      {mk('lPole', geos.lPole, metalMat, CAP.lightPole)}
      {mk('lensR', lensGeo, lensMat, CAP.lens)}
      {mk('lensY', lensGeo, lensMat, CAP.lens)}
      {mk('lensG', lensGeo, lensMat, CAP.lens)}
      {CAR_IDS.map((id) => mk('car' + id, geos.cars[id], carMat, CAP.car))}
      {Array.from({ length: 6 }, (_, k) => (<pointLight key={k} ref={(l) => { lampLights.current[k] = l }} color="#ffd9a0" intensity={0} distance={34} decay={1.7} />))}
      <lineSegments ref={dbg} material={dbgMat} visible={false}><bufferGeometry /></lineSegments>
    </>
  )
}
void beaconGeo
void CHUNK


