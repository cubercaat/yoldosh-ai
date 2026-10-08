import { useSimStore } from '../store/simulatorStore'
import { SPACING, crossing, linePos } from '../world/procedural/cityPlan'
import { stream } from '../world/procedural/seed'
import { onCheckpointReached } from './driveEvents'

/**
 * DestinationSystem — cheksiz dunyoda "maqsad" (checkpoint) tizimi. Har safar 350-650 m uzoqlikdagi chorrahani tanlaydi.
 * Imtihon (DRIVING_TEST) uchun shu sinf kengaytiriladi: tayyor marshrut, STOP/PARKING/SPEED nuqtalari, jarima qoidalari.
 */
export interface Destination { x: number; z: number; label: string; i: number; j: number }

export class DestinationSystem {
  current: Destination | null = null
  count = 0
  private t = 0
  constructor() { this.current = null }

  private pick(px: number, pz: number) {
    const r = stream(this.count, Math.floor(px / 50), Math.floor(pz / 50), 700)
    for (let k = 0; k < 20; k++) {
      const a = r() * Math.PI * 2, d = 350 + r() * 300
      const ti = Math.round((px + Math.cos(a) * d) / SPACING), tj = Math.round((pz + Math.sin(a) * d) / SPACING)
      const c = crossing(ti, tj)
      if (c.arms < 2) continue
      const dist = Math.hypot(c.x - px, c.z - pz)
      if (dist < 250 || dist > 750) continue
      this.current = { x: c.x, z: c.z, i: ti, j: tj, label: c.roundabout ? 'aylana' : c.ctrl === 'lights' ? 'svetoforli chorraha' : 'chorraha' }
      return
    }
    this.current = { x: linePos(0, Math.round(px / SPACING) + 2), z: linePos(1, Math.round(pz / SPACING)), i: 0, j: 0, label: 'chorraha' }
  }

  start(px: number, pz: number) { this.pick(px, pz); this.sync(px, pz) }

  update(x: number, z: number, _speedMs: number) {
    if (!this.current) this.pick(x, z)
    const d = Math.hypot(x - this.current!.x, z - this.current!.z)
    if (d < 18) {
      this.count++
      const st = useSimStore.getState()
      st.patch({ score: st.score + 25 }); st.pushToast(`Manzilga yetdingiz! +25 ball (${this.count})`, 'good')
      onCheckpointReached({ id: `dest-${this.count}`, label: this.current!.label, index: this.count })
      this.pick(x, z)
    }
    this.t += 0.1
    this.sync(x, z)
  }
  reset() { this.count = 0; this.current = null }
  distanceTo(x: number, z: number) { return this.current ? Math.hypot(x - this.current.x, z - this.current.z) : 0 }

  private sync(x: number, z: number) {
    const c = this.current; if (!c) return
    const d = Math.round(Math.hypot(x - c.x, z - c.z))
    const txt = `Manzil: ${c.label} · ${d} m`
    const st = useSimStore.getState()
    if (st.objective !== txt || st.checkpointIndex !== this.count) st.patch({ objective: txt, checkpointIndex: this.count, checkpointTotal: 0 })
  }
}
