import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { MeshStandardMaterial } from 'three'
import { LIGHT_POSTS, trafficState } from './layout'
import { useSimStore } from '../store/simulatorStore'

type Lamp = { r: MeshStandardMaterial | null; y: MeshStandardMaterial | null; g: MeshStandardMaterial | null }

/** Markaziy chorrahadagi svetoforlar. Faza: NS yashil -> sariq -> hammasi qizil -> EW yashil ... (store'ga NS holati yoziladi) */
export function TrafficLights() {
  const lamps = useRef<Lamp[]>(LIGHT_POSTS.map(() => ({ r: null, y: null, g: null })))
  const clock = useRef(0)
  const lastNS = useRef<string>('')

  useFrame((_, dt) => {
    clock.current += dt
    const s = trafficState(clock.current)
    LIGHT_POSTS.forEach((p, i) => {
      const st = p.group === 'NS' ? s.NS : s.EW, l = lamps.current[i]
      if (l.r) l.r.emissiveIntensity = st === 'red' ? 3.2 : 0.06
      if (l.y) l.y.emissiveIntensity = st === 'yellow' ? 3.2 : 0.06
      if (l.g) l.g.emissiveIntensity = st === 'green' ? 3.2 : 0.06
    })
    if (s.NS !== lastNS.current) { lastNS.current = s.NS; useSimStore.getState().patch({ trafficLight: s.NS }) }
  })

  const post = useMemo(() => ({ pole: '#2a2f3a', box: '#15181f' }), [])
  return (
    <>
      {LIGHT_POSTS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation-y={p.face}>
          <mesh position={[0, 2.2, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 4.4, 10]} /><meshStandardMaterial color={post.pole} metalness={0.6} roughness={0.5} /></mesh>
          <mesh position={[0, 4.35, 0.15]} castShadow><boxGeometry args={[0.45, 1.3, 0.34]} /><meshStandardMaterial color={post.box} roughness={0.6} /></mesh>
          {([['r', 4.75, '#ff2a2a'], ['y', 4.35, '#ffc400'], ['g', 3.95, '#22dd55']] as const).map(([k, y, c]) => (
            <mesh key={k} position={[0, y, 0.34]}><sphereGeometry args={[0.15, 16, 16]} /><meshStandardMaterial ref={(m) => { lamps.current[i][k] = m }} color={c} emissive={c} emissiveIntensity={0.06} /></mesh>
          ))}
        </group>
      ))}
      <RigidBody type="fixed" name="Svetofor" colliders={false}>
        {LIGHT_POSTS.map((p, i) => (<CuboidCollider key={i} args={[0.14, 2.2, 0.14]} position={[p.x, 2.2, p.z]} />))}
      </RigidBody>
    </>
  )
}
