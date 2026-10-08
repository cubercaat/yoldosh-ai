import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, PointLight } from 'three'
import { buildStreetLights } from './layout'
import { live, useSimStore } from '../store/simulatorStore'
import { sunState } from '../systems/DayNightSystem'

const POOL = 6 // bir vaqtning o'zida faqat eng yaqin 6 ta chiroq haqiqiy yorug'lik beradi (unumdorlik)

/** Ko'cha chiroqlari: instancing (ustun, qo'l, plafon). Tunda yonadi; mashinaga yaqin 6 tasi haqiqiy PointLight. */
export function StreetLights() {
  const list = useMemo(buildStreetLights, [])
  const pole = useRef<InstancedMesh>(null), arm = useRef<InstancedMesh>(null), head = useRef<InstancedMesh>(null)
  const headMat = useRef<MeshStandardMaterial>(null)
  const lights = useRef<Array<PointLight | null>>([])
  const pos = useMemo(() => list.map((l) => ({ x: l.x, z: l.z })), [list])

  useEffect(() => {
    const m = new Matrix4(), o = new Object3D()
    list.forEach((l, i) => {
      o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1)
      o.position.set(l.x, 3.6, l.z); o.updateMatrix(); m.copy(o.matrix); pole.current?.setMatrixAt(i, m)
      o.position.set(l.x + l.tx * 0.9, 7.1, l.z + l.tz * 0.9); o.rotation.set(0, l.tx !== 0 ? Math.PI / 2 : 0, 0); o.updateMatrix(); m.copy(o.matrix); arm.current?.setMatrixAt(i, m)
      o.position.set(l.x + l.tx * 1.7, 7.0, l.z + l.tz * 1.7); o.rotation.set(0, l.tx !== 0 ? Math.PI / 2 : 0, 0); o.updateMatrix(); m.copy(o.matrix); head.current?.setMatrixAt(i, m)
    })
    ;[pole, arm, head].forEach((r) => { if (r.current) r.current.instanceMatrix.needsUpdate = true })
  }, [list])
  useFrame(() => {
    const n = sunState(useSimStore.getState().timeOfDay).night
    if (headMat.current) headMat.current.emissiveIntensity = n * 4
    // eng yaqin chiroqlarga pool nuqta-yorug'liklarini biriktirish
    const [px, , pz] = live.position
    const near = pos.map((p, i) => ({ i, d: (p.x - px) ** 2 + (p.z - pz) ** 2 })).sort((a, b) => a.d - b.d).slice(0, POOL)
    near.forEach((nr, k) => {
      const L = lights.current[k]; if (!L) return
      const l = list[nr.i]
      L.position.set(l.x + l.tx * 1.7, 6.7, l.z + l.tz * 1.7); L.intensity = n > 0.15 ? 70 * n : 0
    })
  })

  return (
    <>
      <instancedMesh ref={pole} args={[undefined, undefined, list.length]} castShadow><cylinderGeometry args={[0.09, 0.12, 7.2, 8]} /><meshStandardMaterial color="#3a404b" metalness={0.6} roughness={0.5} /></instancedMesh>
      <instancedMesh ref={arm} args={[undefined, undefined, list.length]}><boxGeometry args={[0.08, 0.08, 1.9]} /><meshStandardMaterial color="#3a404b" metalness={0.6} roughness={0.5} /></instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, list.length]}><boxGeometry args={[0.5, 0.14, 0.9]} /><meshStandardMaterial ref={headMat} color="#e8e4d0" emissive="#ffd58a" emissiveIntensity={0} /></instancedMesh>
      {Array.from({ length: POOL }, (_, k) => (<pointLight key={k} ref={(l) => { lights.current[k] = l }} color="#ffd9a0" intensity={0} distance={34} decay={1.7} />))}
      <RigidBody type="fixed" name="Chiroq ustuni" colliders={false}>
        {list.map((l, i) => (<CuboidCollider key={i} args={[0.12, 3.6, 0.12]} position={[l.x, 3.6, l.z]} />))}
      </RigidBody>
    </>
  )
}

