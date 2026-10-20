import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, CanvasTexture, DoubleSide, InstancedMesh, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, RepeatWrapping, SRGBColorSpace, type BufferGeometry } from 'three'
import { CHECKPOINTS, CONES, LIGHT_HEADS, MAP_H, MAP_W, RAIL, SEGS, SIGNS, drawExam, examSurface, px2x, px2z, type Dir, type Sign } from './layout'
import { lightState } from '../autodrom/light'
import { GROUND_NAME } from '../../physics/CollisionSystem'
import { groundTexture, signMaterial, type SignKind } from '../procedural/worldMaterials'
import { lampHeadGeo, lampPoleGeo, signPoleGeo, treeGeo } from '../procedural/propGeometry'
import { perfTick, usePerf } from '../../systems/PerformanceManager'
import { useSimStore } from '../../store/simulatorStore'

const hf = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s) }
const FACE: Record<Dir, number> = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 }
const KIND: Record<Sign['kind'], SignKind> = { stop: 'stop', yield: 'yield', limit20: 'l20', limit40: 'l40', zebra: 'ped', round: 'roundabout', noentry: 'noentry', park: 'park' }

/** Imtihon avtodromi: yer rasmi, belgilar, svetoforlar, daraxtlar, atrofdagi binolar, marshrut mayoqchasi. */
export function Exam() {
  const gl = useThree((s) => s.gl)
  const level = usePerf((s) => s.level)
  const W = MAP_W, H = MAP_H

  const tex = useMemo(() => {
    const cv = document.createElement('canvas'); drawExam(cv, level >= 2 ? 10 : 7)
    const t = new CanvasTexture(cv)
    t.colorSpace = SRGBColorSpace; t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); t.minFilter = LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true
    return t
  }, [gl, level])
  useEffect(() => () => tex.dispose(), [tex])
  const outTex = useMemo(() => { const t = groundTexture().clone(); t.needsUpdate = true; t.repeat.set(300, 300); return t }, [])

  /* daraxtlar: faqat o't ustida, yo'ldan uzoqroq */
  const trees = useMemo(() => {
    const out: Array<{ x: number; z: number; kind: 0 | 1; s: number; r: number }> = []
    const want = level >= 2 ? 330 : 190
    for (let i = 0; i < 4000 && out.length < want; i++) {
      const mx = 6 + hf(i, 1) * (W - 12), mz = 6 + hf(i, 2) * (H - 12)
      const X = px2x(mx), Z = px2z(mz)
      let ok = true
      for (const [dx, dz] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, -3], [3, -3], [-3, 3]]) if (examSurface(X + dx, Z + dz) !== 'grass') { ok = false; break }
      if (!ok) continue
      let near = false
      for (const t of out) if ((t.x - X) ** 2 + (t.z - Z) ** 2 < 14) { near = true; break }
      if (near) continue
      out.push({ x: X, z: Z, kind: (hf(i, 11) > 0.55 ? 1 : 0) as 0 | 1, s: 0.85 + hf(i, 5) * 0.7, r: hf(i, 9) * 6.28 })
    }
    return out
  }, [level, W, H])
  const treeMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), [])
  const t0 = useRef<InstancedMesh>(null), t1 = useRef<InstancedMesh>(null)
  useEffect(() => {
    const o = new Object3D()
    for (const [kind, ref] of [[0, t0], [1, t1]] as const) {
      const m = ref.current; if (!m) continue
      const list = trees.filter((t) => t.kind === kind); m.count = list.length
      list.forEach((t, i) => { o.position.set(t.x, 0, t.z); o.rotation.set(0, t.r, 0); o.scale.setScalar(t.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
      m.instanceMatrix.needsUpdate = true
    }
  }, [trees])

  /* chiroq ustunlari: yo'l bo'ylab */
  const lamps = useMemo(() => {
    const out: Array<{ x: number; z: number; rot: number }> = []
    let k = 0
    for (const r of SEGS) {
      if (r.ctrl) continue
      const dx = r.b[0] - r.a[0], dz = r.b[1] - r.a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len
      for (let t = 18; t < len - 10; t += 34, k++) {
        const side = k % 2 ? 1 : -1, off = r.w / 2 + 1.8
        const mx = r.a[0] + ux * t - uz * off * side, mz = r.a[1] + uz * t + ux * off * side
        if (examSurface(px2x(mx), px2z(mz)) !== 'grass') continue
        out.push({ x: px2x(mx), z: px2z(mz), rot: Math.atan2(uz * side, -ux * side) })
      }
    }
    return out
  }, [])
  const lampMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 }), [])
  const l0 = useRef<InstancedMesh>(null), l1 = useRef<InstancedMesh>(null)
  useEffect(() => {
    const o = new Object3D()
    for (const m of [l0.current, l1.current]) {
      if (!m) continue
      lamps.forEach((p, i) => { o.position.set(p.x, 0, p.z); o.rotation.set(0, p.rot, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
      m.instanceMatrix.needsUpdate = true
    }
  }, [lamps])

  /* atrofdagi binolar (devor orqasida) */
  const blds = useMemo(() => {
    const out: Array<{ x: number; z: number; w: number; d: number; h: number; c: number; geo: BoxGeometry }> = []
    const mk = (x: number, z: number, w: number, d: number, h: number, c: number) => {
      const g = new BoxGeometry(w, h, d), uv = g.attributes.uv, n = uv.count / 6
      for (let f = 0; f < 6; f++) { const side = f < 2 ? d : f < 4 ? -1 : w; for (let v = 0; v < n; v++) { const i = f * n + v; if (side < 0) continue; uv.setXY(i, uv.getX(i) * side / 5, uv.getY(i) * h / 3.4) } }
      out.push({ x, z, w, d, h, c, geo: g })
    }
    const M = 14
    for (let i = 0; i < 26; i++) { const w = 16 + hf(i, 31) * 18, d = 14 + hf(i, 32) * 10, h = 9 + hf(i, 33) * 26; mk(-W / 2 + 8 + i * (W / 26) + hf(i, 3) * 4, -H / 2 - M - d / 2 - hf(i, 34) * 8, w, d, h, i % 4) }
    for (let i = 0; i < 26; i++) { const w = 16 + hf(i, 41) * 18, d = 14 + hf(i, 42) * 10, h = 9 + hf(i, 43) * 26; mk(-W / 2 + 8 + i * (W / 26) + hf(i, 4) * 4, H / 2 + M + d / 2 + hf(i, 44) * 8, w, d, h, (i + 1) % 4) }
    for (let i = 0; i < 20; i++) { const d = 16 + hf(i, 51) * 18, w = 14 + hf(i, 52) * 10, h = 9 + hf(i, 53) * 26; mk(-W / 2 - M - w / 2 - hf(i, 54) * 8, -H / 2 + 6 + i * (H / 20), w, d, h, (i + 2) % 4) }
    for (let i = 0; i < 20; i++) { const d = 16 + hf(i, 61) * 18, w = 14 + hf(i, 62) * 10, h = 9 + hf(i, 63) * 26; mk(W / 2 + M + w / 2 + hf(i, 64) * 8, -H / 2 + 6 + i * (H / 20), w, d, h, (i + 3) % 4) }
    return out
  }, [W, H])
  const bMats = useMemo(() => ['#d8c9a8', '#c4cbd6', '#e0b89a', '#b9c7b2'].map((c) => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128
    const g = cv.getContext('2d')!; g.fillStyle = c; g.fillRect(0, 0, 128, 128)
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { g.fillStyle = '#2c3a4c'; g.fillRect(12 + x * 40, 14 + y * 40, 24, 26); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(12 + x * 40, 14 + y * 40, 24, 8) }
    const t = new CanvasTexture(cv); t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = SRGBColorSpace
    return new MeshStandardMaterial({ map: t, roughness: 0.85 })
  }), [])
  useEffect(() => () => { blds.forEach((b) => b.geo.dispose()); bMats.forEach((m) => { m.map?.dispose(); m.dispose() }) }, [blds, bMats])

  const fenceMat = useMemo(() => new MeshStandardMaterial({ color: '#eef1f5', roughness: 0.8 }), [])
  const bandMat = useMemo(() => new MeshStandardMaterial({ color: '#1d57c9', roughness: 0.7 }), [])
  const x0 = px2x(2), x1 = px2x(W - 2), z0 = px2z(2), z1 = px2z(H - 2)
  useFrame((_, dt) => { perfTick(dt, gl.info) })

  const plate = useMemo(() => new BoxGeometry(0.9, 0.9, 0.03), [])
  const pole = useMemo(() => signPoleGeo() as BufferGeometry, [])
  const poleMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.5 }), [])

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.004, 0]} receiveShadow><planeGeometry args={[2400, 2400]} /><meshStandardMaterial map={outTex} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} receiveShadow><planeGeometry args={[W, H]} /><meshStandardMaterial map={tex} roughness={0.92} metalness={0} /></mesh>
      <RigidBody type="fixed" name={GROUND_NAME} colliders={false}><CuboidCollider args={[3000, 1, 3000]} position={[0, -1, 0]} friction={1} /></RigidBody>

      {/* devor */}
      <RigidBody type="fixed" name="devor" colliders={false}>
        <CuboidCollider args={[(x1 - x0) / 2 + 1, 1, 0.3]} position={[(x0 + x1) / 2, 1, z0]} />
        <CuboidCollider args={[(x1 - x0) / 2 + 1, 1, 0.3]} position={[(x0 + x1) / 2, 1, z1]} />
        <CuboidCollider args={[0.3, 1, (z1 - z0) / 2 + 1]} position={[x0, 1, (z0 + z1) / 2]} />
        <CuboidCollider args={[0.3, 1, (z1 - z0) / 2 + 1]} position={[x1, 1, (z0 + z1) / 2]} />
      </RigidBody>
      <mesh material={fenceMat} position={[(x0 + x1) / 2, 0.8, z0]} castShadow><boxGeometry args={[x1 - x0 + 1, 1.6, 0.35]} /></mesh>
      <mesh material={fenceMat} position={[(x0 + x1) / 2, 0.8, z1]} castShadow><boxGeometry args={[x1 - x0 + 1, 1.6, 0.35]} /></mesh>
      <mesh material={fenceMat} position={[x0, 0.8, (z0 + z1) / 2]} castShadow><boxGeometry args={[0.35, 1.6, z1 - z0 + 1]} /></mesh>
      <mesh material={fenceMat} position={[x1, 0.8, (z0 + z1) / 2]} castShadow><boxGeometry args={[0.35, 1.6, z1 - z0 + 1]} /></mesh>

      {/* belgilar */}
      <RigidBody type="fixed" name="belgi" colliders={false}>
        {SIGNS.map((s, i) => <CylinderCollider key={i} args={[1.2, 0.07]} position={[px2x(s.x), 1.2, px2z(s.z)]} />)}
      </RigidBody>
      {SIGNS.map((s, i) => (
        <group key={i} position={[px2x(s.x), 0, px2z(s.z)]} rotation={[0, FACE[s.face], 0]}>
          <mesh geometry={pole} material={poleMat} />
          <mesh position={[0, 2.05, 0.02]} geometry={plate}><meshStandardMaterial color="#9aa0a8" roughness={0.7} /></mesh>
          <mesh position={[0, 2.05, 0.045]}><planeGeometry args={[0.86, 0.86]} /><primitive object={signMaterial(KIND[s.kind])} attach="material" /></mesh>
        </group>
      ))}

      {/* svetoforlar */}
      {LIGHT_HEADS.map((l, i) => <TrafficHead key={i} x={px2x(l.x)} z={px2z(l.z)} rot={{ E: -Math.PI / 2, W: Math.PI / 2, S: Math.PI, N: 0 }[l.dir]} axis={l.axis} />)}

      <instancedMesh ref={t0} args={[treeGeo(0) as BufferGeometry, treeMat, 400]} castShadow frustumCulled={false} />
      <instancedMesh ref={t1} args={[treeGeo(1) as BufferGeometry, treeMat, 400]} castShadow frustumCulled={false} />
      <instancedMesh ref={l0} args={[lampPoleGeo() as BufferGeometry, lampMat, Math.max(1, lamps.length)]} frustumCulled={false} />
      <instancedMesh ref={l1} args={[lampHeadGeo() as BufferGeometry, lampMat, Math.max(1, lamps.length)]} frustumCulled={false} />

      {blds.map((b, i) => <mesh key={i} geometry={b.geo} material={bMats[b.c]} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow />)}
      <mesh material={bandMat} position={[(x0 + x1) / 2, 1.5, z0]}><boxGeometry args={[x1 - x0 + 1, 0.22, 0.4]} /></mesh>
      <mesh material={bandMat} position={[(x0 + x1) / 2, 1.5, z1]}><boxGeometry args={[x1 - x0 + 1, 0.22, 0.4]} /></mesh>
      <mesh material={bandMat} position={[x0, 1.5, (z0 + z1) / 2]}><boxGeometry args={[0.4, 0.22, z1 - z0 + 1]} /></mesh>
      <mesh material={bandMat} position={[x1, 1.5, (z0 + z1) / 2]}><boxGeometry args={[0.4, 0.22, z1 - z0 + 1]} /></mesh>
      <StartBuilding />
      <Cones />
      <RailCrossing />
      <RouteBeacon />
    </>
  )
}

/** svetofor: ustun va bosh; chiroqlar 0.1 s da yangilanadi */
function TrafficHead({ x, z, rot, axis }: { x: number; z: number; rot: number; axis: 'x' | 'z' }) {
  const mats = useMemo(() => ({ r: new MeshBasicMaterial({ color: '#400' }), y: new MeshBasicMaterial({ color: '#430' }), g: new MeshBasicMaterial({ color: '#040' }) }), [])
  const acc = useRef(0), last = useRef('')
  useFrame((_, dt) => {
    acc.current += dt; if (acc.current < 0.1) return; acc.current = 0
    const s = lightState(axis); if (s === last.current) return; last.current = s
    mats.r.color.set(s === 'red' ? '#ff2a2a' : '#3a0a0a'); mats.y.color.set(s === 'yellow' ? '#ffc400' : '#3a2e05'); mats.g.color.set(s === 'green' ? '#25e060' : '#07260f')
  })
  const dark = useMemo(() => new MeshStandardMaterial({ color: '#23272e', roughness: 0.6, metalness: 0.4 }), [])
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh material={dark} position={[0, 1.9, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 3.8, 8]} /></mesh>
      <mesh material={dark} position={[0, 3.55, 0.05]} castShadow><boxGeometry args={[0.46, 1.2, 0.3]} /></mesh>
      <mesh material={mats.r} position={[0, 3.92, 0.22]}><circleGeometry args={[0.14, 16]} /></mesh>
      <mesh material={mats.y} position={[0, 3.55, 0.22]}><circleGeometry args={[0.14, 16]} /></mesh>
      <mesh material={mats.g} position={[0, 3.18, 0.22]}><circleGeometry args={[0.14, 16]} /></mesh>
    </group>
  )
}

/** keyingi nazorat nuqtasidagi yorqin ustun va yerdagi halqa */
function RouteBeacon() {
  const pillar = useRef<Mesh>(null), ring = useRef<Mesh>(null)
  const geo = useMemo(() => ({ pm: new MeshBasicMaterial({ color: '#b8f53b', transparent: true, opacity: 0.22, depthWrite: false, side: DoubleSide, fog: false }), rm: new MeshBasicMaterial({ color: '#b8f53b', transparent: true, opacity: 0.7, depthWrite: false, side: DoubleSide, fog: false }) }), [])
  useFrame(({ clock }) => {
    const st = useSimStore.getState().exam, c = CHECKPOINTS[st.cp], p = pillar.current, r = ring.current
    if (!p || !r) return
    if (!c || st.done) { p.visible = false; r.visible = false; return }
    p.visible = r.visible = true
    const X = px2x(c.x), Z = px2z(c.z), k = 1 + Math.sin(clock.elapsedTime * 3) * 0.05
    p.position.set(X, 14, Z); p.scale.set(k, 1, k); r.position.set(X, 0.05, Z); r.scale.setScalar(k)
  })
  return (
    <>
      <mesh ref={pillar} material={geo.pm}><cylinderGeometry args={[2.2, 2.2, 28, 18, 1, true]} /></mesh>
      <mesh ref={ring} material={geo.rm} rotation-x={-Math.PI / 2}><ringGeometry args={[4.6, 5.4, 36]} /></mesh>
    </>
  )
}

/** konuslar: to'q sariq, oq belbog'li */
function Cones() {
  const ref = useRef<InstancedMesh>(null), ref2 = useRef<InstancedMesh>(null)
  const m1 = useMemo(() => new MeshStandardMaterial({ color: '#ff6a1a', roughness: 0.6 }), [])
  const m2 = useMemo(() => new MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.6 }), [])
  useEffect(() => {
    const o = new Object3D()
    for (const m of [ref.current, ref2.current]) {
      if (!m) continue
      CONES.forEach(([x, z], i) => { o.position.set(px2x(x), m === ref.current ? 0.3 : 0.34, px2z(z)); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
      m.instanceMatrix.needsUpdate = true
    }
  }, [])
  return (
    <>
      <instancedMesh ref={ref} args={[undefined as unknown as BufferGeometry, m1, CONES.length]} frustumCulled={false} castShadow><coneGeometry args={[0.2, 0.6, 12]} /></instancedMesh>
      <instancedMesh ref={ref2} args={[undefined as unknown as BufferGeometry, m2, CONES.length]} frustumCulled={false}><cylinderGeometry args={[0.121, 0.135, 0.09, 12]} /></instancedMesh>
    </>
  )
}

/** temir yo'l kesishmasi: shlagbaum (ko'tarilgan), svetofor va "X" belgisi */
function RailCrossing() {
  const red = useMemo(() => new MeshStandardMaterial({ color: '#d22', roughness: 0.6 }), [])
  const white = useMemo(() => new MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.6 }), [])
  const dark = useMemo(() => new MeshStandardMaterial({ color: '#23272e', roughness: 0.6, metalness: 0.4 }), [])
  const x = px2x(RAIL.x + 4.4), z1 = px2z(52.6), z2 = px2z(59.6)
  const post = (z: number, key: number) => (
    <group key={key} position={[x, 0, z]}>
      <mesh material={dark} position={[0, 1.2, 0]} castShadow><boxGeometry args={[0.28, 2.4, 0.28]} /></mesh>
      <mesh material={red} position={[0, 2.6, 0]}><sphereGeometry args={[0.16, 10, 10]} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} material={i % 2 ? white : red} position={[0, 2.2 + i * 0.4 * 0 + 0.0, (z < px2z(56) ? -1 : 1) * (0.1 + i * 0.52)]} rotation={[0, 0, 0.35]}><boxGeometry args={[0.1, 0.1, 0.5]} /></mesh>)}
    </group>
  )
  return <>{post(z1, 0)}{post(z2, 1)}</>
}

/** imtihon binosi, qorovul budkasi va start shlagbaumi */
function StartBuilding() {
  const white = useMemo(() => new MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.8 }), [])
  const blue = useMemo(() => new MeshStandardMaterial({ color: '#1d57c9', roughness: 0.6 }), [])
  const glass = useMemo(() => new MeshStandardMaterial({ color: '#16222f', roughness: 0.2, metalness: 0.6 }), [])
  const red = useMemo(() => new MeshStandardMaterial({ color: '#d92b2b', roughness: 0.6 }), [])
  const whiteB = useMemo(() => new MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.6 }), [])
  const bx = px2x(44), bz = px2z(190.5)
  return (
    <>
      <group position={[bx, 0, bz]}>
        <mesh material={white} position={[0, 2.6, 0]} castShadow receiveShadow><boxGeometry args={[26, 5.2, 9]} /></mesh>
        <mesh material={blue} position={[0, 5.4, 0]}><boxGeometry args={[26.6, 0.5, 9.6]} /></mesh>
        <mesh material={glass} position={[0, 2.3, -4.53]}><boxGeometry args={[22, 2.2, 0.06]} /></mesh>
        <mesh material={blue} position={[0, 4.4, -4.56]}><boxGeometry args={[8, 0.7, 0.05]} /></mesh>
      </group>
      <group position={[px2x(20), 0, px2z(181.6)]}>
        <mesh material={white} position={[0, 1.2, 0]} castShadow><boxGeometry args={[2.2, 2.4, 2.2]} /></mesh>
        <mesh material={blue} position={[0, 2.5, 0]}><boxGeometry args={[2.6, 0.2, 2.6]} /></mesh>
        <mesh material={glass} position={[0, 1.4, -1.12]}><boxGeometry args={[1.6, 0.9, 0.04]} /></mesh>
        <mesh material={red} position={[0, 0.5, -1.9]} castShadow><boxGeometry args={[0.4, 1.0, 0.4]} /></mesh>
        <group position={[0, 1.0, -1.9]} rotation={[0.0, 0, 0]}>
          {[0, 1, 2, 3, 4].map((i) => <mesh key={i} material={i % 2 ? whiteB : red} position={[0, 0.55 + i * 0.46, 0]} rotation={[0, 0, 0]}><boxGeometry args={[0.12, 0.44, 0.12]} /></mesh>)}
        </group>
      </group>
    </>
  )
}
