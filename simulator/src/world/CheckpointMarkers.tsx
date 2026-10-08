import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { CHECKPOINTS } from './layout'
import { useSimStore } from '../store/simulatorStore'

/** Joriy nazorat nuqtasi: yorqin halqa va nur. (Fizikaga ta'sir qilmaydi.) */
export function CheckpointMarkers() {
  const idx = useSimStore((s) => s.checkpointIndex)
  const ring = useRef<Mesh>(null)
  useFrame(({ clock }) => { if (ring.current) { ring.current.rotation.z = clock.elapsedTime * 0.8; ring.current.position.y = 0.4 + Math.sin(clock.elapsedTime * 2) * 0.1 } })
  const cp = CHECKPOINTS[idx]
  if (!cp) return null
  return (
    <group position={[cp.x, 0, cp.z]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2}><ringGeometry args={[cp.radius - 0.6, cp.radius, 48]} /><meshBasicMaterial color="#B8F53B" transparent opacity={0.85} /></mesh>
      <mesh position={[0, 6, 0]}><cylinderGeometry args={[0.25, cp.radius * 0.5, 12, 16, 1, true]} /><meshBasicMaterial color="#B8F53B" transparent opacity={0.18} depthWrite={false} /></mesh>
    </group>
  )
}
