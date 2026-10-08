import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { DoubleSide } from 'three'
import { handles } from '../components/simulator/handles'
import { live } from '../store/simulatorStore'

/** Maqsad nuqtasidagi yorqin ustun (uzoqdan ko'rinadi). Tuman ichida ham ko'rinishi uchun fog:false. */
export function DestinationBeacon() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current, d = handles.checkpoints?.current
    if (!m) return
    if (!d) { m.visible = false; return }
    const dist = Math.hypot(d.x - live.position[0], d.z - live.position[2])
    m.visible = dist > 12
    m.position.set(d.x, 30, d.z)
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.06
    m.scale.set(s, 1, s)
  })
  return (
    <mesh ref={ref} visible={false}>
      <cylinderGeometry args={[3.2, 3.2, 60, 18, 1, true]} />
      <meshBasicMaterial color="#b8f53b" transparent opacity={0.28} depthWrite={false} side={DoubleSide} fog={false} />
    </mesh>
  )
}
