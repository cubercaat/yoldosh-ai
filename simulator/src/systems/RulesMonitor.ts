import { useSimStore } from '../store/simulatorStore'
import { RB_R_IN, RB_R_OUT, crossing, crossingsInRect, lightState, nearestRoad, rightOf, speedLimitAt, type Crossing } from '../world/procedural/cityPlan'
import { driveEvents, onRedLightViolation, onSpeedLimitViolation, onStopLineViolation, onWrongLane, onWrongWayRoundabout } from './driveEvents'
import { worldClock } from '../world/procedural/clock'
import { useWallet } from './WalletSystem'
import { aw } from '../world/activeWorld'
import { limitAtTk } from '../world/tashkent/tk'
import { crossingHasCamera, radarAhead, radarUnder } from '../world/procedural/radars'

/**
 * RulesMonitor — oddiy qoida kuzatuvchisi. FREE DRIVE da jarima ball + xabar beradi, imtihon tizimi esa
 * shu hodisalarga (driveEvents) ulanadi. Aniqlanadi: tezlik oshishi, qizil chiroq, STOP chizig'i, noto'g'ri polosa, aylanada teskari yurish.
 * Aniqlanmaydi (hali): burilish ko'rsatkichi, piyoda ustuvorligi, parkovka (onParkingCompleted faqat interfeys).
 */
export class RulesMonitor {
  limit = 0
  private speedT = 0
  private lastSpeedEmit = -99
  private wrongT = 0
  private lastWrongEmit = -99
  private rbWrongT = 0
  private lastRbEmit = -99
  private inside: { key: string; axis: 0 | 1; minSpeed: number } | null = null
  private approach = new Map<string, number>() // chorraha kaliti -> yaqinlashishdagi minimal tezlik (m/s)
  private lastPos: [number, number] | null = null
  private wOn = false                                   // hamyon ulangan: jarima faqat radar/kamera qayd etganda
  private radarSeen = new Map<string, number>()
  private lastRa = -1
  private raT = 0
  private radarPrev: [number, number] | null = null
  private note(text: string, tone?: Parameters<ReturnType<typeof useSimStore.getState>['pushToast']>[1]) { if (!this.wOn) useSimStore.getState().pushToast(text, tone) }

  /** ~10 Hz */
  update(x: number, z: number, speedMs: number, fwdX: number, fwdZ: number, dt: number) {
    const st = useSimStore.getState(), now = performance.now() / 1000
    this.wOn = useWallet.getState().connected
    const kmh = Math.abs(speedMs) * 3.6
    // ---- tezlik chegarasi
    const lim = aw.tashkent ? limitAtTk(x, z) : speedLimitAt(x, z)
    this.limit = lim
    if (!this.wOn && lim > 0 && kmh > lim + 6) {
      this.speedT += dt
      if (this.speedT > 2.5 && now - this.lastSpeedEmit > 10) {
        this.lastSpeedEmit = now
        onSpeedLimitViolation({ speedKmh: Math.round(kmh), limitKmh: lim, x, z })
        st.patch({ score: Math.max(0, st.score - 2) }); this.note(`Tezlik oshdi: ${Math.round(kmh)} / ${lim} km/h`, 'warn')
      }
    } else this.speedT = Math.max(0, this.speedT - dt)

    // ---- RADAR: faqat shu yerda pul yechiladi (hamyon ulangan bo'lsa)
    if (this.wOn) {
      if (kmh > 25) {
        // kadrlar orasida radar zonasidan sakrab o'tmaslik uchun: oldingi nuqtadan hozirgisigacha 2.5 m qadam bilan tekshiriladi
        let rd = radarUnder(x, z)
        const lp = this.radarPrev
        if (!rd && lp) { const dd = Math.hypot(x - lp[0], z - lp[1]); if (dd > 3 && dd < 80) for (let t = 2.5; t < dd && !rd; t += 2.5) rd = radarUnder(lp[0] + (x - lp[0]) * (t / dd), lp[1] + (z - lp[1]) * (t / dd)) }
        if (rd && now - (this.radarSeen.get(rd.id) ?? -99) > 25) {
          this.radarSeen.set(rd.id, now)
          const sp = Math.round(kmh)
          if (sp >= rd.limit + 10) void useWallet.getState().fine('radar', sp, rd.limit, (rd as unknown as { name?: string }).name || roadLabel(rd.limit))
        }
      }
      this.radarPrev = [x, z]
      this.raT += dt
      if (this.raT > 0.4) { this.raT = 0; const ra = Math.round(radarAhead(x, z, fwdX, fwdZ) / 10) * 10; if (ra !== this.lastRa) { this.lastRa = ra; useWallet.setState({ radarAhead: ra }) } }
    }

    if (aw.tashkent) return
    const q = nearestRoad(x, z)
    // ---- noto'g'ri polosa (ikki tomonlama yo'lda chap yarmida yurish)
    if (q && q.kind === 'seg' && q.edge < -0.4 && q.seg && kmh > 12) {
      const [rx, rz] = rightOf(q.tx, q.tz), lat = (x - q.cx) * rx + (z - q.cz) * rz
      const dir = fwdX * q.tx + fwdZ * q.tz >= 0 ? 1 : -1
      const wrong = dir > 0 ? lat < -0.7 : lat > 0.7
      if (wrong && Math.abs(fwdX * q.tx + fwdZ * q.tz) > 0.7) {
        this.wrongT += dt
        if (this.wrongT > 2 && now - this.lastWrongEmit > 12) { this.lastWrongEmit = now; onWrongLane({ x, z }); st.patch({ score: Math.max(0, st.score - 1) }); this.note('Noto\'g\'ri polosa: o\'ng tomonda yuring', 'warn') }
      } else this.wrongT = Math.max(0, this.wrongT - dt)
    } else this.wrongT = Math.max(0, this.wrongT - dt)

    // ---- aylana: teskari yo'nalish
    if (q && q.kind === 'ring' && q.cross && kmh > 8) {
      const dx = x - q.cross.x, dz = z - q.cross.z, r = Math.hypot(dx, dz)
      if (r > RB_R_IN + 0.5 && r < RB_R_OUT - 0.5) {
        const legal = (fwdX * dz - fwdZ * dx) / (r || 1) // (dz,-dx) bilan skalyar ko'paytma
        if (legal < -0.3) { this.rbWrongT += dt; if (this.rbWrongT > 1.2 && now - this.lastRbEmit > 12) { this.lastRbEmit = now; onWrongWayRoundabout({ x, z }); st.patch({ score: Math.max(0, st.score - 3) }); this.note('Aylanada teskari yo\'nalish!', 'bad') } }
        else this.rbWrongT = 0
      }
    } else this.rbWrongT = 0

    // ---- chorrahalar: qizil chiroq va STOP
    const near = crossingsInRect(x - 40, z - 40, x + 40, z + 40)
    let insideNow: { c: Crossing; axis: 0 | 1 } | null = null
    for (const c of near) {
      const dx = x - c.x, dz = z - c.z
      const inX = Math.abs(dx) < c.w0 / 2, inZ = Math.abs(dz) < c.w1 / 2
      const key = `${c.i},${c.j}`
      if (c.ctrl === 'stop' && !c.roundabout) {
        // yaqinlashish tezligi: plaza chetidan 14 m ichida minimal tezlik
        const dEdge = Math.max(Math.abs(dx) - c.w0 / 2, Math.abs(dz) - c.w1 / 2)
        if (dEdge > 0 && dEdge < 14) this.approach.set(key, Math.min(this.approach.get(key) ?? 99, Math.abs(speedMs)))
        else if (dEdge >= 14) this.approach.delete(key)
      }
      if (inX && inZ) { const axis: 0 | 1 = Math.abs(fwdZ) >= Math.abs(fwdX) ? 0 : 1; insideNow = { c, axis } }
    }
    if (insideNow && (!this.inside || this.inside.key !== `${insideNow.c.i},${insideNow.c.j}`)) {
      // chorrahaga kirish lahzasi
      const c = insideNow.c, axis = insideNow.axis, key = `${c.i},${c.j}`
      if (c.ctrl === 'lights' && kmh > 8 && lightState(crossing(c.i, c.j), axis, worldClock()) === 'red') {
        onRedLightViolation({ x, z, crossingI: c.i, crossingJ: c.j }); st.patch({ score: Math.max(0, st.score - 8) }); if (this.wOn && crossingHasCamera(c)) void useWallet.getState().fine('redlight', Math.round(kmh), 0, 'Svetofor kamerasi'); this.note('Qizil chiroqda o\'tdingiz!', 'bad')
      } else if (c.ctrl === 'stop' && axis === c.stopAxis) {
        const mn = (this.approach.get(key) ?? Math.abs(speedMs)) * 3.6
        if (mn > 6) { onStopLineViolation({ x, z, minSpeedKmh: Math.round(mn) }); st.patch({ score: Math.max(0, st.score - 4) }); this.note('STOP: to\'liq to\'xtamadingiz', 'warn') }
      }
      this.inside = { key, axis, minSpeed: 0 }
    } else if (!insideNow) this.inside = null
    this.lastPos = [x, z]
  }
}
void driveEvents
const roadLabel = (limit: number) => (limit >= 90 ? 'Magistral yo\'l' : limit >= 60 ? 'Asosiy ko\'cha' : limit >= 50 ? 'Ko\'cha' : 'Turar-joy ko\'chasi')

