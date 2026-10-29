import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { live } from '../../store/simulatorStore'
import { Prop } from './Prop'
import { camerasInRect, radarsInRect, radarUnder, type Radar } from '../../world/procedural/radars'

(window as unknown as { __radars?: unknown }).__radars = { radarsInRect, radarUnder }   // sinov uchun

/** Radar ustunlari (sariq quti + kamera ko'zi) va svetofor kameralari. Faqat o'yinchi atrofidagi ~350 m da chiziladi. */
export function RadarLayer() {
  const [rs, setRs] = useState<Radar[]>([])
  const [cams, setCams] = useState<Array<{ x: number; z: number; id: string }>>([])
  const last = useRef({ x: 1e9, z: 1e9, t: 0 })
  useFrame((_, dt) => {
    const [x, , z] = live.position
    last.current.t += dt
    if (last.current.t < 0.8 || Math.hypot(x - last.current.x, z - last.current.z) < 20) return
    last.current = { x, z, t: 0 }
    const R = 330
    const next = radarsInRect(x - R, z - R, x + R, z + R)
    setRs((prev) => (prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next))
    const nc = camerasInRect(x - R, z - R, x + R, z + R)
    setCams((prev) => (prev.length === nc.length && prev.every((p, i) => p.id === nc[i].id) ? prev : nc))
  })
  return (
    <group>
      {rs.map((r) => (
        <group key={r.id} position={[r.x, 0, r.z]} rotation={[0, Math.atan2(r.tx, r.tz), 0]}>
          <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.07, 0.09, 3.2, 8]} /><meshStandardMaterial color="#555b63" /></mesh>
          <group position={[0, 3.2, 0.05]}><Prop file="cctv" height={0.6} yaw={0} fallback={<mesh><boxGeometry args={[0.9, 0.7, 0.5]} /><meshStandardMaterial color="#e8c200" /></mesh>} /></group>
          <mesh position={[0, 2.5, 0.02]}><boxGeometry args={[0.7, 0.7, 0.04]} /><meshStandardMaterial color="#1565c0" emissive="#0b2a52" /></mesh>
        </group>
      ))}
      {cams.map((c) => (
        <group key={c.id} position={[c.x, 0, c.z]}>
          <Prop file="lamppost" height={7} fallback={<><mesh position={[0, 3, 0]}><cylinderGeometry args={[0.06, 0.07, 6, 6]} /><meshStandardMaterial color="#555b63" /></mesh><mesh position={[0, 6.1, 0]}><boxGeometry args={[0.6, 0.4, 0.8]} /><meshStandardMaterial color="#d9dde2" /></mesh></>} />
        </group>
      ))}
    </group>
  )
}
