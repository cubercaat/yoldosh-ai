import type { RigidBody, World } from '@dimforge/rapier3d-compat'
import { useSimStore } from '../store/simulatorStore'

/**
 * To'qnashuv tizimi: obyektlar o'tib ketmaydi (Rapier collider), to'qnashuvda esa "his" (feedback) beriladi:
 * HUD'da miltillash, ovoz, kichik jarima ball. Zarar (deformatsiya) modellashtirilmaydi — haddan tashqari "buzuvchi" emas.
 */
export const GROUND_NAME = 'ground'

export interface ImpactEvent { strength: number; other: string }
let lastImpactAt = 0

/** Rapier onCollisionEnter dan chaqiriladi */
export function reportCollision(speedBefore: number, other: string | undefined, audioHit?: (s: number) => void) {
  if (other === GROUND_NAME) return null
  const now = performance.now()
  if (now - lastImpactAt < 350) return null // takroriy hodisalarni birlashtirish
  const strength = Math.min(1, Math.abs(speedBefore) / 14)
  if (strength < 0.06) return null
  lastImpactAt = now
  const st = useSimStore.getState()
  st.patch({ impact: { t: now, strength }, score: Math.max(0, st.score - Math.round(strength * 6)) })
  if (strength > 0.25) st.pushToast(other ? `To'qnashuv: ${other}` : `To'qnashuv`, strength > 0.6 ? 'bad' : 'warn')
  audioHit?.(strength)
  return { strength, other: other ?? '' } as ImpactEvent
}

/** Kamera uchun: nishondan istalgan nuqtagacha to'siq bormi? (to'siqgacha bo'lgan masofani qaytaradi) */
export function clipCameraDistance(world: World, rapier: typeof import('@dimforge/rapier3d-compat').default, from: [number, number, number], to: [number, number, number], exclude: RigidBody | null): number {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2]
  const len = Math.hypot(dx, dy, dz)
  if (len < 0.01) return 1
  const ray = new rapier.Ray({ x: from[0], y: from[1], z: from[2] }, { x: dx / len, y: dy / len, z: dz / len })
  const hit = world.castRay(ray, len, true, undefined, undefined, undefined, exclude ?? undefined)
  if (!hit) return 1
  return Math.max(0.15, (hit.timeOfImpact - 0.4) / len)
}
