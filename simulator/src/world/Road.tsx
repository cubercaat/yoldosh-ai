import { useEffect, useMemo, useRef } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { InstancedMesh, Matrix4, Object3D } from 'three'
import { CITY_EXT, DRIVEWAYS, GRID, ROAD_W, SIDEWALK_H, SIDEWALK_W } from './layout'
import { asphaltTexture, roadTexture, zebraTexture } from '../utils/textures'

interface Strip { x: number; z: number; w: number; d: number }

/** [a,b] oralig'idan "teshiklar" (gaps) ni ayirib tashlaydi */
function subtract(a: number, b: number, gaps: Array<[number, number]>): Array<[number, number]> {
  let segs: Array<[number, number]> = [[a, b]]
  for (const [g0, g1] of gaps) {
    const next: Array<[number, number]> = []
    for (const [s0, s1] of segs) {
      if (g1 <= s0 || g0 >= s1) { next.push([s0, s1]); continue }
      if (g0 > s0) next.push([s0, g0])
      if (g1 < s1) next.push([g1, s1])
    }
    segs = next
  }
  return segs.filter(([s0, s1]) => s1 - s0 > 0.5)
}

/** Sidewalk bo'laklari (chorrahalarda va kirish yo'llarida uziladi) */
export function buildSidewalks(): Strip[] {
  const out: Strip[] = []
  const half = ROAD_W / 2, off = half + SIDEWALK_W / 2
  for (const g of GRID) {
    for (const side of [-1, 1]) {
      // yo'l X o'qi bo'ylab (z = g)
      const zc = g + side * off
      const gapsX: Array<[number, number]> = GRID.map((c) => [c - half, c + half] as [number, number])
      for (const d of DRIVEWAYS) if (Math.abs(zc - d.z) < d.d / 2 + SIDEWALK_W / 2) gapsX.push([d.x - d.w / 2, d.x + d.w / 2])
      for (const [s0, s1] of subtract(-CITY_EXT, CITY_EXT, gapsX)) out.push({ x: (s0 + s1) / 2, z: zc, w: s1 - s0, d: SIDEWALK_W })
      // yo'l Z o'qi bo'ylab (x = g)
      const xc = g + side * off
      const gapsZ: Array<[number, number]> = GRID.map((c) => [c - half, c + half] as [number, number])
      for (const d of DRIVEWAYS) if (Math.abs(xc - d.x) < d.w / 2 + SIDEWALK_W / 2) gapsZ.push([d.z - d.d / 2, d.z + d.d / 2])
      for (const [s0, s1] of subtract(-CITY_EXT, CITY_EXT, gapsZ)) out.push({ x: xc, z: (s0 + s1) / 2, w: SIDEWALK_W, d: s1 - s0 })
    }
  }
  return out
}

export function Road() {
  const roadTex = useMemo(() => roadTexture((CITY_EXT * 2) / 24), [])
  const asphalt = useMemo(() => asphaltTexture(3), [])
  const zebra = useMemo(zebraTexture, [])
  const strips = useMemo(buildSidewalks, [])
  const swRef = useRef<InstancedMesh>(null)
  const zbRef = useRef<InstancedMesh>(null)
  const zebras = useMemo(() => {
    const out: Array<{ x: number; z: number; rot: number }> = []
    for (const gx of GRID) for (const gz of GRID) {
      const o = ROAD_W / 2 + 2.4
      out.push({ x: gx + o, z: gz, rot: Math.PI / 2 }, { x: gx - o, z: gz, rot: Math.PI / 2 }, { x: gx, z: gz + o, rot: 0 }, { x: gx, z: gz - o, rot: 0 })
    }
    return out
  }, [])

  useEffect(() => {
    const m = new Matrix4(), o = new Object3D()
    strips.forEach((s, i) => { o.position.set(s.x, SIDEWALK_H / 2, s.z); o.scale.set(s.w, SIDEWALK_H, s.d); o.rotation.set(0, 0, 0); o.updateMatrix(); m.copy(o.matrix); swRef.current?.setMatrixAt(i, m) })
    if (swRef.current) swRef.current.instanceMatrix.needsUpdate = true
    zebras.forEach((z, i) => { o.position.set(z.x, 0.018, z.z); o.rotation.set(-Math.PI / 2, 0, z.rot); o.scale.set(1, 1, 1); o.updateMatrix(); m.copy(o.matrix); zbRef.current?.setMatrixAt(i, m) })
    if (zbRef.current) zbRef.current.instanceMatrix.needsUpdate = true
  }, [strips, zebras])

  return (
    <>
      {/* yo'llar (Z va X o'qlari bo'ylab) */}
      {GRID.map((g) => (
        <group key={g}>
          <mesh position={[g, 0.008, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[ROAD_W, CITY_EXT * 2]} /><meshStandardMaterial map={roadTex} roughness={0.92} /></mesh>
          <group rotation-y={Math.PI / 2}><mesh position={[g, 0.0085, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[ROAD_W, CITY_EXT * 2]} /><meshStandardMaterial map={roadTex} roughness={0.92} /></mesh></group>
        </group>
      ))}
      {/* chorraha maydonchalari (belgisiz asfalt) */}
      {GRID.flatMap((gx) => GRID.map((gz) => (
        <mesh key={`${gx}_${gz}`} position={[gx, 0.012, gz]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[ROAD_W, ROAD_W]} /><meshStandardMaterial map={asphalt} roughness={0.92} /></mesh>
      )))}
      {/* piyodalar o'tish joylari */}
      <instancedMesh ref={zbRef} args={[undefined, undefined, zebras.length]} receiveShadow>
        <planeGeometry args={[ROAD_W - 1.5, 3]} /><meshStandardMaterial map={zebra} transparent alphaTest={0.3} roughness={0.9} />
      </instancedMesh>
      {/* parkovkaga kirish yo'llari */}
      {DRIVEWAYS.map((d, i) => (<mesh key={i} position={[d.x, 0.014, d.z]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[d.w, d.d]} /><meshStandardMaterial map={asphalt} roughness={0.92} /></mesh>))}
      {/* trotuarlar: ko'rinish (instancing) + fizika (fixed colliders) */}
      <instancedMesh ref={swRef} args={[undefined, undefined, strips.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#9ca0a8" roughness={0.9} />
      </instancedMesh>
      <RigidBody type="fixed" name="Trotuar" colliders={false}>
        {strips.map((s, i) => (<CuboidCollider key={i} args={[s.w / 2, SIDEWALK_H / 2, s.d / 2]} position={[s.x, SIDEWALK_H / 2, s.z]} friction={0.9} />))}
      </RigidBody>
    </>
  )
}
