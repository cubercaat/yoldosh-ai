import type { RapierRigidBody } from '@react-three/rapier'
import { useSimStore } from '../store/simulatorStore'
import { CENTER, autodromSurface, px2x, px2z } from '../world/autodrom/layout'
import { lightState } from '../world/autodrom/light'

/** Konuslar ro'yxati (Autodrom komponenti to'ldiradi): yiqilganini aniqlash uchun boshlang'ich holat saqlanadi */
export const cones: Array<{ body: RapierRigidBody | null; x0: number; z0: number; knocked: boolean }> = []
export const resetCones = () => { for (const c of cones) c.knocked = false }

/**
 * AutodromRules — imtihon qoidalari (RulesMonitor bilan bir xil interfeys: update(...), limit):
 *  • maysaga chiqish, • konus yiqitish, • tezlik oshishi (30 km/h), • markaziy chorrahada qizil chiroq.
 * Har bir jarima ballni kamaytiradi va xabar chiqaradi.
 */
export class AutodromRules {
  limit = 30
  private grassT = 0
  private lastGrass = -99
  private speedT = 0
  private lastSpeed = -99
  private inside = false

  update(x: number, z: number, speedMs: number, fwdX: number, fwdZ: number, dt: number) {
    const st = useSimStore.getState(), now = performance.now() / 1000, kmh = Math.abs(speedMs) * 3.6
    // maysa
    if (autodromSurface(x, z) === 'grass') {
      this.grassT += dt
      if (this.grassT > 1.2 && now - this.lastGrass > 6) { this.lastGrass = now; st.patch({ score: Math.max(0, st.score - 2) }); st.pushToast("Maysaga chiqdingiz: yo'lda qoling", 'warn') }
    } else this.grassT = Math.max(0, this.grassT - dt)
    // tezlik
    if (kmh > this.limit + 6) {
      this.speedT += dt
      if (this.speedT > 2.5 && now - this.lastSpeed > 10) { this.lastSpeed = now; st.patch({ score: Math.max(0, st.score - 1) }); st.pushToast(`Tezlik oshdi: ${Math.round(kmh)} / ${this.limit} km/h`, 'warn') }
    } else this.speedT = Math.max(0, this.speedT - dt)
    // konuslar
    for (const c of cones) {
      if (c.knocked || !c.body) continue
      const p = c.body.translation(), r = c.body.rotation()
      const upY = 1 - 2 * (r.x * r.x + r.z * r.z)       // konus vertikal o'qining Y komponenti
      if (Math.hypot(p.x - c.x0, p.z - c.z0) > 0.55 || upY < 0.55 || p.y < 0.02) {
        c.knocked = true; st.patch({ score: Math.max(0, st.score - 2) }); st.pushToast('Konus yiqildi (-2 ball)', 'bad')
      }
    }
    // markaziy chorraha: qizil chiroq
    const cx = px2x(CENTER.x), cz = px2z(CENTER.y), half = 14 * 0.31 * 1.6
    const inBox = Math.abs(x - cx) < half && Math.abs(z - cz) < half
    if (inBox && !this.inside) {
      const axis = Math.abs(fwdX) >= Math.abs(fwdZ) ? 'x' : 'z'
      if (kmh > 8 && lightState(axis) === 'red') { st.patch({ score: Math.max(0, st.score - 8) }); st.pushToast("Qizil chiroqda o'tdingiz! (-8 ball)", 'bad') }
    }
    this.inside = inBox
  }
}
