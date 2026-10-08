import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { MeshStandardMaterial } from 'three'
import { buildBuildings } from './layout'
import { facadeTexture } from '../utils/textures'
import { useSimStore } from '../store/simulatorStore'
import { sunState } from '../systems/DayNightSystem'

const PALETTE = ['#c9bfae', '#a9b4c2', '#b99c8a', '#8f9aa8', '#d6d0c4']

/** Binolar: ko'rinish + qattiq collider. Tunda derazalar yonadi (emissive). */
export function Buildings() {
  const list = useMemo(buildBuildings, [])
  const mats = useRef<MeshStandardMaterial[]>([])
  const data = useMemo(() => list.map((b, i) => {
    const base = PALETTE[Math.floor(b.hue * PALETTE.length) % PALETTE.length]
    const map = facadeTexture(100 + i, base, false), em = facadeTexture(100 + i, base, true)
    const rx = Math.max(1, Math.round(Math.max(b.w, b.d) / 8)), ry = Math.max(1, Math.round(b.h / 8))
    ;[map, em].forEach((t) => { t.wrapS = t.wrapT = 1000; t.repeat.set(rx, ry) })
    return { b, map, em }
  }), [list])

  useFrame(() => {
    const n = sunState(useSimStore.getState().timeOfDay).night
    for (const m of mats.current) if (m) m.emissiveIntensity = n * 1.6
  })

  return (
    <>
      {data.map(({ b, map, em }, i) => (
        <RigidBody key={i} type="fixed" name="Bino" colliders={false} position={[b.x, b.h / 2, b.z]}>
          <CuboidCollider args={[b.w / 2, b.h / 2, b.d / 2]} friction={0.4} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial ref={(m) => { if (m) mats.current[i] = m }} map={map} emissiveMap={em} emissive="#ffd9a0" emissiveIntensity={0} roughness={0.85} />
          </mesh>
          <mesh position={[0, b.h / 2 + 0.25, 0]} castShadow><boxGeometry args={[b.w + 0.4, 0.5, b.d + 0.4]} /><meshStandardMaterial color="#6d727b" roughness={0.9} /></mesh>
        </RigidBody>
      ))}
    </>
  )
}
