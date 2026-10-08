import { useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BARRIERS, SIGNS } from './layout'
import { bannerTexture, signTexture } from '../utils/textures'

/** Yo'l belgilari (ustun collider bilan), beton to'siqlar (barrier) va reklama taxtasi. */
export function Signs() {
  const textures = useMemo(() => Object.fromEntries((['limit40', 'stop', 'park', 'yield', 'noentry'] as const).map((k) => [k, signTexture(k)])), [])
  const banner = useMemo(() => bannerTexture("YO'LDOSH AI · SIMULYATOR"), [])
  return (
    <>
      {SIGNS.map((s, i) => (
        <RigidBody key={i} type="fixed" name={`Yo'l belgisi`} colliders={false} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}>
          <CuboidCollider args={[0.07, 1.3, 0.07]} position={[0, 1.3, 0]} />
          <mesh position={[0, 1.3, 0]} castShadow><cylinderGeometry args={[0.04, 0.04, 2.6, 8]} /><meshStandardMaterial color="#9aa3b0" metalness={0.8} roughness={0.4} /></mesh>
          <mesh position={[0, 2.5, 0.06]}><planeGeometry args={[0.95, 0.95]} /><meshBasicMaterial map={textures[s.kind]} transparent side={2} /></mesh>
        </RigidBody>
      ))}
      {BARRIERS.map((b, i) => (
        <RigidBody key={i} type="fixed" name="To'siq (barrier)" colliders={false} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          <CuboidCollider args={[b.len / 2, 0.4, 0.3]} position={[0, 0.4, 0]} friction={0.6} />
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow><boxGeometry args={[b.len, 0.8, 0.6]} /><meshStandardMaterial color="#b9bcc2" roughness={0.9} /></mesh>
          <mesh position={[0, 0.55, 0.31]}><boxGeometry args={[b.len * 0.9, 0.12, 0.02]} /><meshStandardMaterial color="#f2c230" /></mesh>
        </RigidBody>
      ))}
      <group position={[-18, 0, -150]} rotation-y={0.5}>
        <mesh position={[0, 4, 0]} castShadow><boxGeometry args={[10, 2.4, 0.3]} /><meshBasicMaterial map={banner} /></mesh>
        {[-4, 4].map((x) => (<mesh key={x} position={[x, 1.4, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 2.8, 8]} /><meshStandardMaterial color="#555b66" /></mesh>))}
      </group>
    </>
  )
}
