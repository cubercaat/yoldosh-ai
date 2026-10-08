import { SURFACE_GRIP, surfaceAt, type Surface } from '../world/layout'
import type { VehicleConfig } from '../vehicles/VehicleConfig'

/** Bitta g'ildirakning jonli holati (fizika yozadi, vizual o'qiydi). */
export interface WheelState {
  index: number // 0=FL 1=FR 2=RL 3=RR
  steer: number // rad
  spin: number // rad — yurgan masofa / radius dan hisoblanadi
  suspensionLength: number // m (suspension uzunligi)
  contact: boolean
  surface: Surface | 'air'
  friction: number // joriy ishqalanish koeffitsienti (setWheelFrictionSlip)
  load: number // N (osma kuchi)
}

export const WHEEL_NAMES = ['FL', 'FR', 'RL', 'RR'] as const

export const makeWheelStates = (cfg: VehicleConfig): WheelState[] =>
  WHEEL_NAMES.map((_, i) => ({ index: i, steer: 0, spin: 0, suspensionLength: cfg.suspension.restLength, contact: false, surface: 'road' as Surface, friction: 10, load: 0 }))

/** Asosiy g'ildirak ishqalanishi (Rapier friction slip): quruq asfalt ~ 11. Sirtga qarab ko'paytiriladi. */
export const BASE_FRICTION_SLIP = 11

export function frictionFor(surface: Surface | 'air', rear: boolean, handbrake: boolean): number {
  const g = surface === 'air' ? 1 : SURFACE_GRIP[surface]
  let f = BASE_FRICTION_SLIP * g
  if (rear && handbrake) f *= 0.5 // qo'l tormozida orqa o'q sirpanadi (drift)
  return f
}

export const surfaceUnder = (x: number, z: number) => surfaceAt(x, z)

/** Yurgan masofa / radius = g'ildirak burchagi (kadrga bog'liq emas) */
export const advanceSpin = (w: WheelState, forwardSpeed: number, radius: number, dt: number) => { w.spin += (forwardSpeed / radius) * dt }
