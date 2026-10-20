import { useSimStore, emptyExam, type ExamState } from '../store/simulatorStore'
import { CHECKPOINTS, HW, ROADS, ROUND, LIGHT_X, STOPZONES, limitAt, examSurface, x2px, z2px } from '../world/exam/layout'
import { lightState } from '../world/autodrom/light'
import { live } from '../store/simulatorStore'

/** Imtihondan o'tish uchun ruxsat etilgan eng ko'p jarima balli (100 dan) */
export const PASS_PENALTY = 10
const isH = (r: (typeof ROADS)[number]) => r.a[1] === r.b[1]
const JUNCTIONS = (() => {
  const out: Array<[number, number, number, number]> = []
  for (const h of ROADS.filter(isH)) for (const v of ROADS.filter((r) => !isH(r))) {
    const xv = v.a[0], zh = h.a[1]
    if (xv >= Math.min(h.a[0], h.b[0]) && xv <= Math.max(h.a[0], h.b[0]) && zh >= Math.min(v.a[1], v.b[1]) && zh <= Math.max(v.a[1], v.b[1])) out.push([xv - HW - 1.6, zh - HW - 1.6, xv + HW + 1.6, zh + HW + 1.6])
  }
  return out
})()

/**
 * ExamRules — imtihon avtodromi qoidalari (marshrut, taymer, jarimalar). AutodromRules bilan bir xil interfeys.
 *  • nazorat nuqtalari (12 ta) tartib bilan, • burilish ko'rsatkichi (Q/E), • STOP, • qizil chiroq, • tezlik chegarasi (20/40),
 *  • qarama-qarshi polosa, • bordyur/maysa, • to'qnashuv (collision tizimi ballni kamaytiradi — shu yerda hisobga olinadi).
 */
export class ExamRules {
  limit = 40
  ex: ExamState = { ...emptyExam, mistakes: {} }
  private lastSig = { dir: 0, at: -99 }
  private grassT = 0; private sideT = 0; private wrongT = 0; private speedT = 0
  private cool: Record<string, number> = {}
  private stopped = false; private crossPrev = false; private lightPrev = false
  private expected = 100
  private acc = 0
  private sigSince = 0
  private lastPush = ''

  constructor() { this.init() }

  private init() {
    this.ex = { ...emptyExam, mistakes: {}, total: CHECKPOINTS.length, text: CHECKPOINTS[0].text }
    this.lastSig = { dir: 0, at: -99 }; this.grassT = this.sideT = this.wrongT = this.speedT = 0; this.cool = {}
    this.stopped = false; this.crossPrev = false; this.lightPrev = false; this.expected = 100; this.acc = 0; this.lastPush = ''
  }

  /** boshidan boshlash (holat va ballni tiklaydi) */
  reset() {
    this.init()
    useSimStore.getState().patch({ exam: { ...this.ex }, score: 100, objective: this.ex.text, checkpointIndex: 0, checkpointTotal: CHECKPOINTS.length })
  }

  private add(name: string, pts: number, toast: string) {
    const st = useSimStore.getState(), now = performance.now() / 1000
    if (this.cool[name] && now - this.cool[name] < 6) return
    this.cool[name] = now
    this.ex.mistakes[name] = (this.ex.mistakes[name] ?? 0) + 1
    this.expected = Math.max(0, Math.min(this.expected, st.score) - pts)
    st.patch({ score: this.expected })
    st.pushToast(`${toast} (−${pts})`, 'bad')
  }

  private finish(passed: boolean, reason: string) {
    if (this.ex.done) return
    this.ex.done = true; this.ex.passed = passed; this.ex.reason = reason
    useSimStore.getState().patch({ exam: { ...this.ex } })
  }

  update(X: number, Z: number, speedMs: number, fx: number, fz: number, dt: number) {
    const st = useSimStore.getState()
    if (this.ex.done) return
    const mx = x2px(X), mz = z2px(Z), kmh = Math.abs(speedMs) * 3.6, now = performance.now() / 1000
    this.ex.signal = st.exam.signal
    if (this.ex.signal !== 0) {
      this.lastSig = { dir: this.ex.signal, at: now }
      if (!this.sigSince) this.sigSince = now
      if (now - this.sigSince > 14) { this.ex.signal = 0; useSimStore.setState((s) => ({ exam: { ...s.exam, signal: 0 } })) }   // ko'rsatkich o'zi o'chadi
    } else this.sigSince = 0

    // to'qnashuvlar (collision tizimi ballni o'zi kamaytirgan)
    if (st.score < this.expected) { const d = this.expected - st.score; this.expected = st.score; this.ex.mistakes["To'qnashuv"] = (this.ex.mistakes["To'qnashuv"] ?? 0) + 1; void d }
    this.expected = Math.min(this.expected, st.score)

    // taymer
    if (!this.ex.started && kmh > 3) this.ex.started = true
    if (this.ex.started) this.ex.t += dt
    if (this.ex.t > this.ex.limit) { this.finish(false, 'Vaqt tugadi'); this.push(true); return }

    // tezlik chegarasi
    this.limit = limitAt(mx, mz); live.limit = this.limit
    if (kmh > this.limit + 5) { this.speedT += dt; if (this.speedT > 2) { this.speedT = 0; this.add('Tezlikni oshirish', 2, `Tezlik oshdi: ${Math.round(kmh)} / ${this.limit} km/h`) } } else this.speedT = Math.max(0, this.speedT - dt)

    // yo'ldan chiqish
    const surf = examSurface(X, Z)
    if (surf === 'grass') { this.grassT += dt; if (this.grassT > 1.0) { this.grassT = 0; this.add("Yo'ldan chiqish", 5, "Yo'ldan chiqdingiz") } } else this.grassT = Math.max(0, this.grassT - dt)
    if (surf === 'sidewalk') { this.sideT += dt; if (this.sideT > 1.2) { this.sideT = 0; this.add('Bordyurga chiqish', 3, 'Bordyurga chiqdingiz') } } else this.sideT = Math.max(0, this.sideT - dt)

    // qarama-qarshi polosa (o'ng tomonlama harakat)
    let wrong = false
    if (kmh > 6 && surf === 'road' && !JUNCTIONS.some((j) => mx > j[0] && mx < j[2] && mz > j[1] && mz < j[3]) && Math.hypot(mx - ROUND.x, mz - ROUND.z) > ROUND.ro + 2) {
      for (const r of ROADS) {
        const h = isH(r), c = h ? r.a[1] : r.a[0], lo = h ? Math.min(r.a[0], r.b[0]) : Math.min(r.a[1], r.b[1]), hi = h ? Math.max(r.a[0], r.b[0]) : Math.max(r.a[1], r.b[1])
        const along = h ? mx : mz, across = (h ? mz : mx) - c
        if (along < lo - 1 || along > hi + 1 || Math.abs(across) > HW) continue
        const f = h ? fx : fz   // yo'l bo'ylab harakat komponenti
        const ff = h ? fz : fx
        if (Math.abs(f) < 0.85 || Math.abs(ff) > 0.5) break
        // sharq(+x)/janub(+z) ketayotgan: yo'lning o'ng tomoni => h:+z(janub), v:-x(g'arb)
        const ok = h ? (f > 0 ? across > -0.4 : across < 0.4) : (f > 0 ? across < 0.4 : across > -0.4)
        wrong = !ok; break
      }
    }
    if (wrong) { this.wrongT += dt; if (this.wrongT > 1.5) { this.wrongT = 0; this.add("Qarama-qarshi polosa", 5, "Qarama-qarshi polosada ketyapsiz") } } else this.wrongT = Math.max(0, this.wrongT - dt * 2)

    // STOP
    for (const z of STOPZONES) {
      const inZone = mx > z.x0 && mx < z.x1 && mz > z.z0 && mz < z.z1 && fz > 0.5
      const inCross = mx > z.cross.x0 && mx < z.cross.x1 && mz > z.cross.z0 && mz < z.cross.z1 && fz > 0.5
      if (inZone && kmh < 2.5) this.stopped = true
      if (inCross && !this.crossPrev && !this.stopped) this.add("STOP belgisida to'xtamaslik", 8, "STOP belgisida to'xtamadingiz")
      if (!inZone && !inCross && !(mz > z.z0 - 8 && mz < z.cross.z1 + 4 && mx > z.x0 - 4 && mx < z.cross.x1 + 4)) this.stopped = false
      this.crossPrev = inCross
    }

    // svetofor
    const inLight = Math.abs(mx - LIGHT_X.x) < HW && Math.abs(mz - LIGHT_X.z) < HW
    if (inLight && !this.lightPrev && kmh > 6 && lightState(Math.abs(fx) >= Math.abs(fz) ? 'x' : 'z') === 'red') this.add("Qizil chiroqda o'tish", 10, "Qizil chiroqda o'tdingiz")
    this.lightPrev = inLight

    // nazorat nuqtalari
    const c = CHECKPOINTS[this.ex.cp]
    if (c && Math.hypot(mx - c.x, mz - c.z) < c.r) {
      if (c.turn) {
        const want = c.turn === 'L' ? -1 : 1
        if (!(this.lastSig.dir === want && now - this.lastSig.at < 12)) this.add("Burilish ko'rsatkichi yoqilmagan", 3, c.turn === 'L' ? "Chapga burilishda ko'rsatkich (Q) yoqilmadi" : "O'ngga burilishda ko'rsatkich (E) yoqilmadi")
      }
      this.ex.cp++
      if (this.ex.cp >= CHECKPOINTS.length) {
        const pen = 100 - useSimStore.getState().score
        this.finish(pen <= PASS_PENALTY, pen <= PASS_PENALTY ? '' : "Jarima balli juda ko'p")
      } else this.ex.text = CHECKPOINTS[this.ex.cp].text
      this.push(true)
    }
    this.acc += dt; if (this.acc > 0.25) { this.acc = 0; this.push(false) }
  }

  private push(force: boolean) {
    const key = JSON.stringify([Math.floor(this.ex.t), this.ex.cp, this.ex.mistakes, this.ex.done, this.ex.text, this.ex.started])
    if (!force && key === this.lastPush) return
    this.lastPush = key
    useSimStore.getState().patch({ exam: { ...this.ex, mistakes: { ...this.ex.mistakes } }, objective: this.ex.text, checkpointIndex: this.ex.cp, checkpointTotal: CHECKPOINTS.length })
  }
}
if (typeof window !== "undefined") (window as any).__sim = useSimStore
