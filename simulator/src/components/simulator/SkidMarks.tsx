import { skid } from '../../systems/skid'

export function SkidMarks() {
  return (
    <mesh geometry={skid.geo} frustumCulled={false} renderOrder={2}>
      <meshBasicMaterial color="#0a0a0a" transparent opacity={0.62} depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
    </mesh>
  )
}
