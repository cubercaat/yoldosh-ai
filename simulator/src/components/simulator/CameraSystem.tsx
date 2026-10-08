import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRapier } from '@react-three/rapier'
import { PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { useSimStore } from '../../store/simulatorStore'
import { getVehicle } from '../../vehicles/vehicleRegistry'
import { chaseTarget, dampAngle, interiorQuat, makeFollowState } from '../../systems/CameraSystem'
import { clipCameraDistance } from '../../physics/CollisionSystem'
import { handles } from './handles'
import { damp } from '../../utils/math'

/**
 * 5 ta kamera: 1 orqadan (chase), 2 yaqin, 3 salon (haydovchi), 4 kapot, 5 erkin (debug).
 * C — almashtirish. Uchinchi shaxs kameralari silliq (damping), to'siqqa urilmaydi (raycast), tezlikka qarab o'zgaradi.
 */
export function CameraSystem() {
  const cam = useThree((s) => s.camera) as PerspectiveCamera
  const mode = useSimStore((s) => s.cameraMode)
  const { world, rapier } = useRapier()
  const fs = useMemo(makeFollowState, [])
  const base = useMemo(() => new Vector3(), [])
  const q = useMemo(() => new Quaternion(), [])
  const q2 = useMemo(() => new Quaternion(), [])
  const tgt = useMemo(() => ({ pos: new Vector3(), look: new Vector3() }), [])
  const eye = useMemo(() => new Vector3(), [])
  const lastMode = useRef(mode)

  useEffect(() => { fs.ready = false; lastMode.current = mode }, [mode, fs])

  useFrame((_, dt) => {
    const obj = handles.vehicleObject
    const st = useSimStore.getState()
    if (!obj || st.screen !== 'playing') return
    if (st.cameraMode === 'free') return
    const cfg = getVehicle(st.vehicleId), snap = handles.controller?.snap
    obj.updateWorldMatrix(true, false)
    obj.getWorldPosition(base); obj.getWorldQuaternion(q)
    const fwd = new Vector3(0, 0, 1).applyQuaternion(q)
    const yawNow = Math.atan2(fwd.x, fwd.z), speed = snap ? snap.speed : 0
    const first = !fs.ready
    if (first) { fs.yaw = yawNow; fs.ready = true; fs.pos.copy(cam.position); fs.look.copy(base) }
    const m = st.cameraMode

    if (m === 'chase' || m === 'close') {
      const c = m === 'chase' ? cfg.cameras.chase : cfg.cameras.close
      // yaw'ni kechiktirib kuzatish — kamera mashinaning har bir silkinishiga ergashmaydi; orqaga yurganda 180° aylanmaydi
      const lam = Math.abs(speed) > 1 ? 3.2 : 1.5
      fs.yaw = dampAngle(fs.yaw, speed < -2 ? yawNow + Math.PI * 0 : yawNow, lam, dt)
      chaseTarget(base, fs.yaw, c.distance, c.height, c.lookAhead, Math.abs(speed), tgt)
      // to'siq (bino, devor, boshqa mashina) orqasida qolmaslik
      const from: [number, number, number] = [tgt.look.x, tgt.look.y + 0.4, tgt.look.z]
      const to: [number, number, number] = [tgt.pos.x, tgt.pos.y, tgt.pos.z]
      const frac = clipCameraDistance(world, rapier, [base.x, base.y + 1.2, base.z], to, handles.chassis)
      void from
      if (frac < 1) { tgt.pos.set(base.x + (to[0] - base.x) * frac, base.y + 1.2 + (to[1] - base.y - 1.2) * frac, base.z + (to[2] - base.z) * frac) }
      tgt.pos.y = Math.max(tgt.pos.y, 0.5)
      const k = first ? 1e3 : 5.2
      cam.position.set(damp(cam.position.x, tgt.pos.x, k, dt), damp(cam.position.y, tgt.pos.y, k, dt), damp(cam.position.z, tgt.pos.z, k, dt))
      const kl = first ? 1e3 : 8; fs.look.set(damp(fs.look.x, tgt.look.x, kl, dt), damp(fs.look.y, tgt.look.y, kl, dt), damp(fs.look.z, tgt.look.z, kl, dt))
      cam.lookAt(fs.look)
      const fov = 58 + Math.min(14, Math.abs(speed) * 0.35)
      cam.fov = damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix()
    } else {
      const p = m === 'driver' ? cfg.cameras.driver : cfg.cameras.hood
      eye.set(p[0], p[1], p[2]); obj.localToWorld(eye)
      cam.position.copy(eye)
      interiorQuat(q, snap ? snap.steerNorm : 0, q2)
      cam.quaternion.slerp(q2, 1 - Math.exp(-18 * dt))
      cam.fov = damp(cam.fov, m === 'driver' ? 68 : 62, 6, dt); cam.updateProjectionMatrix()
    }
  })

  return mode === 'free' ? <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.49} target={[live3(handles)[0], 1, live3(handles)[2]]} /> : null
}

function live3(h: typeof handles): [number, number, number] {
  const t = h.chassis?.translation()
  return t ? [t.x, t.y, t.z] : [0, 0, 0]
}

