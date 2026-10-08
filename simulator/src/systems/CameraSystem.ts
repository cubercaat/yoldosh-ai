import { Quaternion, Vector3 } from 'three'
import { angDiff, damp } from '../utils/math'

/** Kamera hisob-kitoblari (React'dan mustaqil, test qilish oson). */
export interface FollowState {
  pos: Vector3
  look: Vector3
  yaw: number
  fov: number
  ready: boolean
}

export const makeFollowState = (): FollowState => ({ pos: new Vector3(), look: new Vector3(), yaw: 0, fov: 60, ready: false })

/** burchakni silliq (qisqa yo'ldan) yaqinlashtirish */
export const dampAngle = (cur: number, target: number, lambda: number, dt: number) => cur + angDiff(target, cur) * (1 - Math.exp(-lambda * dt))

const UP = new Vector3(0, 1, 0)
const tmpQ = new Quaternion()

/** Uchinchi shaxs: orqadan, balandlikdan va tezlikka qarab uzoqlashadi */
export function chaseTarget(base: Vector3, yaw: number, distance: number, height: number, lookAhead: number, speedMs: number, out: { pos: Vector3; look: Vector3 }) {
  const back = distance + Math.min(2.5, speedMs * 0.05)
  const h = height + Math.min(0.8, speedMs * 0.012)
  const fx = Math.sin(yaw), fz = Math.cos(yaw)
  out.pos.set(base.x - fx * back, base.y + h, base.z - fz * back)
  out.look.set(base.x + fx * lookAhead, base.y + 1.0, base.z + fz * lookAhead)
}

/** Ichki kamera: transport kvaternioniga +180° (kamera -Z ga qaraydi, mashina +Z ga) + rulga qarab ozgina qarash */
export function interiorQuat(vehicleQ: Quaternion, steerNorm: number, out: Quaternion) {
  tmpQ.setFromAxisAngle(UP, Math.PI + steerNorm * 0.18)
  return out.copy(vehicleQ).multiply(tmpQ)
}

export { damp }
