import { useSimStore } from '../store/simulatorStore'
import { CHECKPOINTS, type Checkpoint } from '../world/layout'

/**
 * CheckpointSystem — haydash imtihoni uchun tayyorlangan nazorat nuqtalari.
 * Hozir FREE DRIVE rejimida yo'l bo'ylab ixtiyoriy "marshrut" sifatida ishlaydi (ball bermaydi).
 *
 * Kelajak (DRIVING_TEST): har Checkpoint turi ('stop' | 'speed' | 'parking' | 'finish') uchun qoidalar qo'shiladi:
 *   - stop: chiziqda to'liq to'xtash, - speed: tezlik chegarasi, - parking: zonada to'xtash, + svetofor, burilish ko'rsatkichi, jarima.
 * Shu sinfni kengaytiring; HUD va xarita avtomatik "objective" matnini ko'rsatadi.
 */
export class CheckpointSystem {
  private index = 0
  constructor(readonly list: Checkpoint[] = CHECKPOINTS) { this.sync() }
  get current(): Checkpoint | null { return this.list[this.index] ?? null }
  reset() { this.index = 0; this.sync() }
  /** har ~100ms da chaqiriladi */
  update(x: number, z: number, speedMs: number) {
    const cp = this.current
    if (!cp) return
    const d = Math.hypot(x - cp.x, z - cp.z)
    const ok = d < cp.radius && (cp.type !== 'stop' || speedMs < 0.5)
    if (ok) {
      this.index++
      const st = useSimStore.getState()
      st.pushToast(`${cp.label.split(':')[0]} o'tildi`, 'good')
      this.sync()
    }
  }
  private sync() {
    const cp = this.current
    useSimStore.getState().patch({
      checkpointIndex: this.index,
      checkpointTotal: this.list.length,
      objective: cp ? cp.label : 'Barcha nuqtalar o\'tildi. Erkin haydang!',
    })
  }
  /** keyingi nuqtagacha masofa (m) */
  distanceTo(x: number, z: number) { const cp = this.current; return cp ? Math.hypot(x - cp.x, z - cp.z) : 0 }
}
