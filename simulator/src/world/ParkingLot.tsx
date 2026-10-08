import { useEffect, useMemo, useRef } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { InstancedMesh, Matrix4, Object3D } from 'three'
import { PARKING, RAMP } from './layout'
import { asphaltTexture } from '../utils/textures'
import { buildPlaceholder } from '../vehicles/placeholderModel'
import { getVehicle } from '../vehicles/vehicleRegistry'

/** Parkovka: asfalt, chiziqlar, to'xtab turgan mashinalar (ularga urilish mumkin), qiyalik (rampa). */
const STALL_W = 3.0, STALL_D = 5.6
const ROW_Z = [PARKING.z - 20, PARKING.z + 6] // ikki qator

const PARKED: Array<{ id: string; color: string; row: number; col: number }> = [
  { id: 'gentra', color: '#2B6CB0', row: 0, col: 1 }, { id: 'cobalt', color: '#C62828', row: 0, col: 3 }, { id: 'malibu', color: '#15171C', row: 0, col: 4 },
  { id: 'cobalt', color: '#9AA3B0', row: 0, col: 7 }, { id: 'gentra', color: '#E9EDF3', row: 1, col: 2 }, { id: 'isuzu', color: '#F2F4F8', row: 1, col: 6 },
]

export function ParkingLot() {
  const tex = useMemo(() => asphaltTexture(10), [])
  const lines = useRef<InstancedMesh>(null)
  const cols = 10
  const x0 = PARKING.x - (cols * STALL_W) / 2
  const stallLines = useMemo(() => {
    const out: Array<{ x: number; z: number }> = []
    for (const rz of ROW_Z) for (let c = 0; c <= cols; c++) out.push({ x: x0 + c * STALL_W, z: rz })
    return out
  }, [x0])
  useEffect(() => {
    const m = new Matrix4(), o = new Object3D()
    stallLines.forEach((l, i) => { o.position.set(l.x, 0.03, l.z); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); m.copy(o.matrix); lines.current?.setMatrixAt(i, m) })
    if (lines.current) lines.current.instanceMatrix.needsUpdate = true
  }, [stallLines])

  const cars = useMemo(() => PARKED.map((p) => {
    const cfg = getVehicle(p.id), model = buildPlaceholder(cfg, p.color, '01 B ' + (100 + p.col * 37) + ' CA')
    const x = x0 + (p.col + 0.5) * STALL_W, z = ROW_Z[p.row]
    return { cfg, model, x, z, rot: p.row === 0 ? 0 : Math.PI }
  }), [x0])

  const ang = Math.atan2(RAMP.rise, RAMP.d), len = Math.hypot(RAMP.d, RAMP.rise)
  return (
    <>
      <mesh position={[PARKING.x, 0.016, PARKING.z]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[PARKING.w, PARKING.d]} /><meshStandardMaterial map={tex} roughness={0.92} /></mesh>
      <instancedMesh ref={lines} args={[undefined, undefined, stallLines.length]}><planeGeometry args={[0.12, STALL_D]} /><meshBasicMaterial color="#eef1f6" /></instancedMesh>
      {/* to'xtab turgan mashinalar */}
      {cars.map((c, i) => (
        <RigidBody key={i} type="fixed" name={`Turgan mashina (${c.cfg.name})`} colliders={false} position={[c.x, 0, c.z]} rotation={[0, c.rot, 0]}>
          <CuboidCollider args={[c.cfg.dimensions.width / 2 - 0.05, c.cfg.dimensions.height / 2, c.cfg.dimensions.length / 2 - 0.05]} position={[0, c.cfg.dimensions.height / 2 + 0.25, (c.cfg.frontOverhang - (c.cfg.dimensions.length - c.cfg.wheelBase - c.cfg.frontOverhang)) / 2]} />
          <primitive object={c.model} />
        </RigidBody>
      ))}
      {/* qiyalik (rampa): ko'tarilish ~7.6° */}
      <RigidBody type="fixed" name="Rampa" colliders={false} position={[RAMP.x, RAMP.rise / 2, RAMP.z]} rotation={[-ang, 0, 0]}>
        <CuboidCollider args={[RAMP.w / 2, 0.15, len / 2]} position={[0, -0.15, 0]} friction={1} />
        <mesh castShadow receiveShadow position={[0, -0.15, 0]}><boxGeometry args={[RAMP.w, 0.3, len]} /><meshStandardMaterial color="#8a8f98" roughness={0.9} /></mesh>
      </RigidBody>
    </>
  )
}
