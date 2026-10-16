import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { CanvasTexture, ConeGeometry, CylinderGeometry, InstancedMesh, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, SRGBColorSpace, type BufferGeometry } from 'three'
import { BOUNDS, CENTER, K, MAP_H, MAP_W, coneSpots, drawAutodrom, px2x, px2z } from './layout'
import { lightState, type LightState } from './light'
import { cones, resetCones } from '../../systems/AutodromRules'
import { GROUND_NAME } from '../../physics/CollisionSystem'
import { groundTexture } from '../procedural/worldMaterials'
import { lampHeadGeo, lampPoleGeo, treeGeo } from '../procedural/propGeometry'
import { live } from '../../store/simulatorStore'
import { perfTick, usePerf } from '../../systems/PerformanceManager'

const W = MAP_W * K, H = MAP_H * K
const hf = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s) }

/** Avtodrom: yer (bitta tekstura), devor, konuslar, svetofor, daraxtlar. Hammasi xarita piksel koordinatasidan hosil qilinadi. */
export function Autodrom() {
  const gl = useThree((s) => s.gl)
  const level = usePerf((s) => s.level)

  // yer rasmi
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    drawAutodrom(cv, level >= 2 ? 5 : 3.6)
    const t = new CanvasTexture(cv)
    t.colorSpace = SRGBColorSpace; t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); t.minFilter = LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true
    return t
  }, [gl, level])
  useEffect(() => () => tex.dispose(), [tex])
  const outTex = useMemo(() => { const t = groundTexture().clone(); t.needsUpdate = true; t.repeat.set(300, 300); return t }, [])

  // konuslar
  const spots = useMemo(() => coneSpots().map(([x, y]) => [px2x(x), px2z(y)] as [number, number]), [])
  const coneGeo = useMemo(() => new ConeGeometry(0.17, 0.5, 12), [])
  const coneMat = useMemo(() => new MeshStandardMaterial({ color: '#ff6a1a', roughness: 0.55 }), [])
  const baseGeo = useMemo(() => new CylinderGeometry(0.22, 0.22, 0.04, 12), [])
  const bandGeo = useMemo(() => new CylinderGeometry(0.105, 0.135, 0.09, 12), [])
  const whiteMat = useMemo(() => new MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.6 }), [])
  useEffect(() => { cones.length = 0; spots.forEach(([x, z]) => cones.push({ body: null, x0: x, z0: z, knocked: false })); return () => { cones.length = 0 } }, [spots])

  // tashqi daraxtlar (maydon atrofida)
  const trees = useMemo(() => {
    const out: Array<{ x: number; z: number; kind: 0 | 1; s: number; r: number }> = []
    const M = 8
    for (let i = 0; i < 90; i++) {
      const side = i % 4, t = hf(i, 3), o = M + hf(i, 7) * 14
      let x = 0, z = 0
      if (side === 0) { x = -W / 2 + t * W; z = -H / 2 - o } else if (side === 1) { x = -W / 2 + t * W; z = H / 2 + o } else if (side === 2) { x = -W / 2 - o; z = -H / 2 + t * H } else { x = W / 2 + o; z = -H / 2 + t * H }
      out.push({ x, z, kind: (hf(i, 11) > 0.5 ? 1 : 0) as 0 | 1, s: 0.9 + hf(i, 5) * 0.8, r: hf(i, 9) * 6.28 })
    }
    return out
  }, [])
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

  // devor (to'siq) o'lchamlari
  const x0 = px2x(BOUNDS.x0), x1 = px2x(BOUNDS.x1), z0 = px2z(BOUNDS.y0), z1 = px2z(BOUNDS.y1)
  const fenceMat = useMemo(() => new MeshStandardMaterial({ color: '#8d949c', roughness: 0.8 }), [])

  useFrame((_, dt) => { perfTick(dt, gl.info); void live })
  useEffect(() => { resetCones(); return () => resetCones() }, [])

  return (
    <>
      {/* tashqi o't */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.004, 0]} receiveShadow><planeGeometry args={[2400, 2400]} /><meshStandardMaterial map={outTex} roughness={1} /></mesh>
      {/* avtodrom rasmi */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} receiveShadow><planeGeometry args={[W, H]} /><meshStandardMaterial map={tex} roughness={0.92} metalness={0} /></mesh>
      {/* fizik zamin */}
      <RigidBody type="fixed" name={GROUND_NAME} colliders={false}><CuboidCollider args={[3000, 1, 3000]} position={[0, -1, 0]} friction={1} /></RigidBody>

      {/* devor (ko'rinadigan to'siq + collider) */}
      <RigidBody type="fixed" name="devor" colliders={false}>
        <CuboidCollider args={[(x1 - x0) / 2 + 1, 0.8, 0.4]} position={[(x0 + x1) / 2, 0.8, z0 - 0.4]} />
        <CuboidCollider args={[(x1 - x0) / 2 + 1, 0.8, 0.4]} position={[(x0 + x1) / 2, 0.8, z1 + 0.4]} />
        <CuboidCollider args={[0.4, 0.8, (z1 - z0) / 2 + 1]} position={[x0 - 0.4, 0.8, (z0 + z1) / 2]} />
        <CuboidCollider args={[0.4, 0.8, (z1 - z0) / 2 + 1]} position={[x1 + 0.4, 0.8, (z0 + z1) / 2]} />
      </RigidBody>
      <mesh material={fenceMat} position={[(x0 + x1) / 2, 0.55, z0 - 0.4]} castShadow><boxGeometry args={[x1 - x0 + 2, 1.1, 0.5]} /></mesh>
      <mesh material={fenceMat} position={[(x0 + x1) / 2, 0.55, z1 + 0.4]} castShadow><boxGeometry args={[x1 - x0 + 2, 1.1, 0.5]} /></mesh>
      <mesh material={fenceMat} position={[x0 - 0.4, 0.55, (z0 + z1) / 2]} castShadow><boxGeometry args={[0.5, 1.1, z1 - z0 + 2]} /></mesh>
      <mesh material={fenceMat} position={[x1 + 0.4, 0.55, (z0 + z1) / 2]} castShadow><boxGeometry args={[0.5, 1.1, z1 - z0 + 2]} /></mesh>

      {/* konuslar (yiqiladigan, fizik) */}
      {spots.map(([x, z], i) => (
        <RigidBody key={i} ref={(b: RapierRigidBody | null) => { if (cones[i]) cones[i].body = b }} name="konus" position={[x, 0, z]} colliders={false} mass={1.2} linearDamping={0.8} angularDamping={0.6} canSleep>
          <CylinderCollider args={[0.25, 0.16]} position={[0, 0.25, 0]} friction={0.7} restitution={0.1} />
          <mesh geometry={baseGeo} material={whiteMat} position={[0, 0.02, 0]} />
          <mesh geometry={coneGeo} material={coneMat} position={[0, 0.27, 0]} castShadow />
          <mesh geometry={bandGeo} material={whiteMat} position={[0, 0.29, 0]} />
        </RigidBody>
      ))}

      {/* svetofor (4 tomon) */}
      {[
        { px: CENTER.x - 46, py: CENTER.y - 25, rot: -Math.PI / 2, axis: 'x' as const },
        { px: CENTER.x + 46, py: CENTER.y + 25, rot: Math.PI / 2, axis: 'x' as const },
        { px: CENTER.x + 25, py: CENTER.y - 46, rot: Math.PI, axis: 'z' as const },
        { px: CENTER.x - 25, py: CENTER.y + 46, rot: 0, axis: 'z' as const },
      ].map((s, i) => <TrafficHead key={i} x={px2x(s.px)} z={px2z(s.py)} rot={s.rot} axis={s.axis} />)}

      {/* daraxtlar */}
      <instancedMesh ref={t0} args={[treeGeo(0) as BufferGeometry, treeMat, 90]} castShadow frustumCulled={false} />
      <instancedMesh ref={t1} args={[treeGeo(1) as BufferGeometry, treeMat, 90]} castShadow frustumCulled={false} />
      <LampPosts />
    </>
  )
}

/** svetofor ustuni va boshi: chiroqlar har 0.1 s yangilanadi */
function TrafficHead({ x, z, rot, axis }: { x: number; z: number; rot: number; axis: 'x' | 'z' }) {
  const mats = useMemo(() => ({ r: new MeshBasicMaterial({ color: '#400' }), y: new MeshBasicMaterial({ color: '#430' }), g: new MeshBasicMaterial({ color: '#040' }) }), [])
  const acc = useRef(0), last = useRef<LightState | ''>('')
  useFrame((_, dt) => {
    acc.current += dt; if (acc.current < 0.1) return; acc.current = 0
    const s = lightState(axis); if (s === last.current) return; last.current = s
    mats.r.color.set(s === 'red' ? '#ff2a2a' : '#3a0a0a'); mats.y.color.set(s === 'yellow' ? '#ffc400' : '#3a2e05'); mats.g.color.set(s === 'green' ? '#25e060' : '#07260f')
  })
  const dark = useMemo(() => new MeshStandardMaterial({ color: '#23272e', roughness: 0.6, metalness: 0.4 }), [])
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh material={dark} position={[0, 1.9, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 3.8, 8]} /></mesh>
      <mesh material={dark} position={[0, 3.55, 0.05]} castShadow><boxGeometry args={[0.42, 1.12, 0.3]} /></mesh>
      <mesh material={mats.r} position={[0, 3.9, 0.22]}><circleGeometry args={[0.13, 14]} /></mesh>
      <mesh material={mats.y} position={[0, 3.55, 0.22]}><circleGeometry args={[0.13, 14]} /></mesh>
      <mesh material={mats.g} position={[0, 3.2, 0.22]}><circleGeometry args={[0.13, 14]} /></mesh>
    </group>
  )
}

/** maydon ichidagi chiroq ustunlari (bezak) */
function LampPosts() {
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 }), [])
  const ref = useRef<InstancedMesh>(null), ref2 = useRef<InstancedMesh>(null)
  const pts = useMemo(() => [[40, 21], [160, 21], [260, 21], [400, 21], [40, 372], [250, 372], [440, 372], [14, 190], [502, 190]].map(([a, b]) => [px2x(a), px2z(b)] as [number, number]), [])
  useEffect(() => {
    const o = new Object3D()
    for (const m of [ref.current, ref2.current]) {
      if (!m) continue
      pts.forEach(([x, z], i) => { o.position.set(x, 0, z); o.rotation.set(0, z < 0 ? 0 : Math.PI, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
      m.instanceMatrix.needsUpdate = true
    }
  }, [pts])
  return (
    <>
      <instancedMesh ref={ref} args={[lampPoleGeo() as BufferGeometry, mat, pts.length]} frustumCulled={false} />
      <instancedMesh ref={ref2} args={[lampHeadGeo() as BufferGeometry, mat, pts.length]} frustumCulled={false} />
    </>
  )
}

export type { Mesh }
