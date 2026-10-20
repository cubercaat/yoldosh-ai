import { useSimStore, emptyExam, live, type ExamState } from '../store/simulatorStore'
import { ACCEL, AVARIYA_X, BOX, CHECKPOINTS, CONES, ESTAKADA_LINE, FINISH_Z, LIGHT_LINE, RAIL, SLOT, START_LINE, STOP_LINE, TURNS, examSurface, limitAt, nearestSeg, onRoute, x2px, z2px } from '../world/exam/layout'
import { lightState } from '../world/autodrom/light'

/** Imtihondan yiqish chegarasi: jami jarima balli shunga yetsa — yiqildi */
export const PASS_PENALTY = 100

export type RuleKind = 'Kichik' | "O'rta" | "Qo'pol"
/** Rasmiy jadval — 32 ta xato va jarima ballari (avtoimtihon.uz dagi amaliy imtihon jadvali asosida) */
export const RULE_LIST: Array<{ n: number; pts: number; text: string }> = [
  { n: 1, pts: 5, text: 'Xavfsizlik kamarini taqmadi' },
  { n: 2, pts: 5, text: "Chapga burilish chirog'ini yoqmasdan 'Start' chizig'ini kesib o'tdi" },
  { n: 3, pts: 5, text: "'Start' chizig'idan keyin 10 metr masofada chapga burilish chirog'ini o'chirmadi" },
  { n: 4, pts: 5, text: "'To'xtash chizig'i'dan oldin 1 metrdan ko'proq masofada to'xtatdi" },
  { n: 5, pts: 5, text: "Tegishli yo'nalishdagi burilish chirog'ini yoqmadi" },
  { n: 6, pts: 5, text: "4.7 va 3.24 yo'l belgilarining talablarini buzdi" },
  { n: 7, pts: 5, text: "'Finish' chizig'ini kesib o'tishdan oldin o'ngga burilish ishorasini yoqmadi" },
  { n: 8, pts: 5, text: "Tezlikni 20 km/soatdan oshirib yubordi (har 5 soniya)" },
  { n: 9, pts: 10, text: "Svetoforning ruxsat beruvchi ishorasida 30 soniyadan ko'p vaqt sarfladi" },
  { n: 10, pts: 25, text: "'Start' ishorasidan keyin 30 soniya davomida harakatni boshlamadi" },
  { n: 11, pts: 20, text: "'To'xtash chizig'i'ning oldida to'xtamadi yoki uni bosib o'tdi" },
  { n: 12, pts: 20, text: "To'xtagandan so'ng 3 soniya o'tmasdan harakatni boshladi" },
  { n: 13, pts: 25, text: "'Estakada' mashqida to'xtagandan so'ng 30 soniyada harakat boshlamadi" },
  { n: 14, pts: 20, text: "'Estakada' mashqida avtomobil orqaga 0,3 metrdan ortiq siljidi" },
  { n: 15, pts: 20, text: "'90 gradus burilish' va 'Ilon izi' mashqlarida nazorat chizig'ini bosdi" },
  { n: 16, pts: 15, text: "'90 gradus burilish' va 'Ilon izi' mashqlariga 2 daqiqadan ko'p sarfladi" },
  { n: 17, pts: 20, text: "'Boksga kirish' va 'Parallel to'xtash'da belgilangan chiziqqa qo'ymadi" },
  { n: 18, pts: 25, text: "Yo'lning tezlashish qismida ikkinchi uzatmani qo'shmadi" },
  { n: 19, pts: 20, text: "Avariya ishorasi yonganidan so'ng 2 soniyada to'xtatmadi" },
  { n: 20, pts: 20, text: "Avariya to'xtashida 3 soniyada avariya chirog'ini yoqmadi" },
  { n: 21, pts: 10, text: "Harakatni boshlashdan oldin avariya chirog'ini o'chirmadi" },
  { n: 22, pts: 20, text: "Sinov mashqlarini bajarayotganda dvigatelni o'chirib qo'ydi" },
  { n: 23, pts: 100, text: "'Start' ishorasidan keyin 40 soniya harakatni boshlamadi" },
  { n: 24, pts: 100, text: "Svetoforning qizil chirog'ida chorrahaga kirdi" },
  { n: 25, pts: 50, text: "Temir yo'l kesishmasidan to'xtamasdan o'tdi" },
  { n: 26, pts: 100, text: "Imtihonni o'zboshimchalik bilan tark etdi" },
  { n: 27, pts: 100, text: "Sinov mashqlaridan birini bajarmadi" },
  { n: 28, pts: 100, text: "Belgilangan marshrut yo'nalishidan chetga chiqib ketdi" },
  { n: 29, pts: 100, text: "Ko'zda tutilmagan joylarda orqaga harakatlandi" },
  { n: 30, pts: 100, text: "To'siqqa, konusga yoki bordyurga borib urildi" },
  { n: 31, pts: 100, text: "Harakatlanish tezligini 40 km/soatdan oshirib yubordi" },
  { n: 32, pts: 100, text: "Amaliy imtihon uchun belgilangan 12 daqiqadan oshib ketdi" },
]
export const ruleKind = (pts: number): RuleKind => (pts <= 10 ? 'Kichik' : pts < 100 ? "O'rta" : "Qo'pol")

const CAR_HALF = 2.2   // mashina markazidan old/orqa bamperigacha (m)

/**
 * ExamRules — YHQ amaliy imtihoni uslubidagi avtodrom: 12 ta mashq ketma-ket, 32 ta rasmiy xato, 12 daqiqa, 100 ball chegarasi.
 * AutodromRules bilan bir xil interfeys: update(x, z, speedMs, fwdX, fwdZ, dt), limit.
 */
export class ExamRules {
  limit = 20
  ex: ExamState = { ...emptyExam, mistakes: {} }
  private cool: Record<number, number> = {}
  private lastSig = { dir: 0, at: -99 }
  private sigSince = 0
  private S: Record<string, number | boolean> = {}
  private moved = false; private waitT = 0; private startCrossed = false; private post3 = false
  private overT = 0; private offT = 0; private offRouteT = 0; private revD = 0
  private ctrlT0 = -1; private ctrlDone = false
  private turnDone = new Set<number>()
  private lastM: [number, number] | null = null
  private acc = 0; private stallT = 0
  private lastPush = ''

  constructor() { this.init() }

  private init() {
    this.ex = { ...emptyExam, mistakes: {}, total: CHECKPOINTS.length, text: CHECKPOINTS[0].text, alert: 'START', started: true }
    this.cool = {}; this.lastSig = { dir: 0, at: -99 }; this.sigSince = 0; this.S = {}
    this.moved = false; this.waitT = 0; this.startCrossed = false; this.post3 = false
    this.overT = this.offT = this.offRouteT = this.revD = 0; this.ctrlT0 = -1; this.ctrlDone = false
    this.turnDone = new Set(); this.lastM = null; this.acc = 0; this.lastPush = ''
  }

  /** boshidan boshlash (holat va ballni tiklaydi) */
  reset() {
    this.init()
    useSimStore.getState().patch({ exam: { ...this.ex }, score: 100, objective: this.ex.text, checkpointIndex: 0, checkpointTotal: CHECKPOINTS.length })
  }

  private finish(passed: boolean, reason: string) {
    if (this.ex.done) return
    this.ex.done = true; this.ex.passed = passed; this.ex.reason = reason; this.ex.alert = ''
    this.push(true)
  }

  /** qoida #n buzildi */
  private rule(n: number, gap = 2.5) {
    const now = performance.now() / 1000
    if (this.ex.done || (this.cool[n] && now - this.cool[n] < gap)) return
    this.cool[n] = now
    const r = RULE_LIST[n - 1]
    this.ex.pen += r.pts
    const key = `#${n} ${r.text}`
    this.ex.mistakes[key] = (this.ex.mistakes[key] ?? 0) + 1
    useSimStore.getState().pushToast(`#${n} ${r.text.length > 54 ? r.text.slice(0, 52) + '…' : r.text} (−${r.pts})`, 'bad')
    useSimStore.getState().patch({ score: Math.max(0, 100 - this.ex.pen) })
    if (this.ex.pen >= PASS_PENALTY) this.finish(false, `Jarima balli ${PASS_PENALTY} ga yetdi`)
  }

  private advance() {
    this.ex.cp++; this.S = {}
    if (this.ex.cp >= CHECKPOINTS.length) { this.finish(this.ex.pen < PASS_PENALTY, ''); return }
    this.ex.text = CHECKPOINTS[this.ex.cp].text
    useSimStore.getState().pushToast(`✓ ${CHECKPOINTS[this.ex.cp - 1].name}`, 'good')
    this.push(true)
  }

  update(X: number, Z: number, v: number, fx: number, fz: number, dt: number) {
    if (this.ex.done) return
    const st = useSimStore.getState(), now = performance.now() / 1000
    const mx = x2px(X), mz = z2px(Z), kmh = Math.abs(v) * 3.6
    const frontX = mx + fx * CAR_HALF, frontZ = mz + fz * CAR_HALF
    if (this.lastM && Math.hypot(mx - this.lastM[0], mz - this.lastM[1]) > 12) this.S = {}   // tiklash (R): mashq holati yangilanadi
    this.lastM = [mx, mz]

    /* boshqaruv holati */
    this.ex.hazard = st.exam.hazard; this.ex.belt = st.exam.belt; this.ex.gear = st.exam.gear
    this.ex.signal = st.exam.signal
    if (this.ex.signal !== 0) {
      this.lastSig = { dir: this.ex.signal, at: now }
      if (!this.sigSince) this.sigSince = now
      if (now - this.sigSince > 20) { this.ex.signal = 0; useSimStore.setState((s) => ({ exam: { ...s.exam, signal: 0 } })) }
    } else this.sigSince = 0

    /* to'qnashuv: collision tizimi ballni kamaytirgan bo'lsa — to'siqqa urildi (#30) */
    if (st.score < 100 - this.ex.pen - 0.5) this.rule(30)
    if (this.ex.done) return

    /* vaqt: 12 daqiqa */
    this.ex.t += dt
    if (this.ex.t > this.ex.limit) { this.rule(32); this.finish(false, '12 daqiqa tugadi'); return }

    /* dvigatel o'chishi (#22): mexanikada yuqori uzatmada joyidan gaz bosib turilsa */
    if (typeof this.ex.gear === 'number' && this.ex.gear >= 2 && kmh < 3 && st.telemetry.throttle > 0.5) { this.stallT += dt; if (this.stallT > 2) { this.stallT = 0; this.rule(22, 6); useSimStore.getState().pushToast("Dvigatel o'chdi: 1-uzatmadan boshlang", 'warn') } } else this.stallT = Math.max(0, this.stallT - dt)

    /* tezlik */
    this.limit = limitAt(mx, mz); live.limit = this.limit
    if (kmh > 40.5) this.rule(31)
    else if (kmh > this.limit + 0.5) { this.overT += dt; if (this.overT >= 5) { this.overT = 0; this.rule(8, 0) } } else this.overT = Math.max(0, this.overT - dt)

    /* harakatni boshlash: START ishorasidan keyin */
    if (!this.moved) {
      if (kmh > 2) { this.moved = true; this.ex.alert = ''; if (!this.ex.belt) this.rule(1) }
      else { this.waitT += dt; if (this.waitT >= 30) this.rule(10, 99); if (this.waitT >= 40) this.rule(23) }
    }

    /* yo'ldan chiqish: bordyur/o't — to'siqqa urilish (#30); marshrutdan chetga chiqish (#28) */
    const surf = examSurface(X, Z)
    if (surf !== 'road') { this.offT += dt; if (this.offT > 0.35) this.rule(30) } else this.offT = 0
    if (surf === 'road' && !onRoute(mx, mz)) { this.offRouteT += dt; if (this.offRouteT > 1.5) this.rule(28) } else this.offRouteT = Math.max(0, this.offRouteT - dt)

    /* orqaga yurish: faqat garaj, parkovka va estakada zonalarida */
    const revZone = (mx > 108 && mx < 152 && mz > 40 && mz < 70) || (mx > 236 && mx < 256 && mz > 70 && mz < 100) || (mx > ESTAKADA_LINE - 14 && mx < ESTAKADA_LINE + 8 && mz > 168)
    if (v < -0.5 && !revZone) { this.revD += Math.abs(v) * dt; if (this.revD > 1.5) this.rule(29) } else if (v > 0.3) this.revD = Math.max(0, this.revD - dt * 2)

    /* konusga urilish: mashina to'rtburchagi bilan tekshiruv (#30) */
    for (const [cx, cz] of CONES) {
      const dx = cx - mx, dz = cz - mz, lx = dx * fx + dz * fz, lt = -dx * fz + dz * fx
      if (Math.abs(lx) < 2.5 && Math.abs(lt) < 1.15) { this.rule(30); break }
    }

    /* burilish ko'rsatkichlari (#5) */
    TURNS.forEach((t, i) => {
      if (this.turnDone.has(i) || Math.hypot(mx - t.x, mz - t.z) > 7 || kmh < 2) return
      this.turnDone.add(i)
      if (!(this.ex.signal === t.dir || (this.lastSig.dir === t.dir && now - this.lastSig.at < 10))) this.rule(5, 0)
    })

    /* START chizig'i (#2, #3) */
    if (!this.startCrossed && mx >= START_LINE && fx > 0.4) { this.startCrossed = true; if (this.ex.signal !== -1) this.rule(2) }
    if (this.startCrossed && !this.post3 && mx >= START_LINE + 10) { this.post3 = true; if (this.ex.signal === -1) this.rule(3) }

    /* nazorat chiziqlari (90° va ilon izi) */
    if (this.ex.cp === 3 || this.ex.cp === 4) {
      if (this.ctrlT0 < 0 && mx > 140 && mz > 100) this.ctrlT0 = this.ex.t
      const nd = nearestSeg(mx, mz, true)
      if (nd.seg && nd.d > nd.seg.w / 2 - 0.95 && nd.d < nd.seg.w / 2 + 0.7) this.rule(15, 3)
    }

    /* mashqlar */
    const S = this.S, gear = st.telemetry.gearMode === 'D' ? st.telemetry.gear : 1
    switch (this.ex.cp) {
      case 0:
        if (this.startCrossed) this.advance()
        break
      case 1:
      case 2: {
        const line = this.ex.cp === 1 ? STOP_LINE : ESTAKADA_LINE, est = this.ex.cp === 2
        const nearLine = frontX > line - 9 && frontX < line + 0.6
        if (kmh < 1.0 && nearLine) { S.stopT = ((S.stopT as number) || 0) + dt; S.stopFront = frontX; if ((S.stopT as number) > 0.4) S.stopped = true }
        else if (S.stopped && kmh >= 1.5) {
          if ((S.stopT as number) < 3) this.rule(12, 0)
          if (line - (S.stopFront as number) > 1.0) this.rule(4, 0)
          S.stopped = false; S.got = true; S.stopT = 0
        } else if (kmh >= 1.5) S.stopT = 0
        if (est && S.stopped && (S.stopT as number) > 30 && !S.p13) { S.p13 = true; this.rule(13, 0) }
        if (est && (S.stopped || S.got) && v < -0.05 && nearLine) { S.roll = ((S.roll as number) || 0) + Math.abs(v) * dt; if ((S.roll as number) > 0.3 && !S.p14) { S.p14 = true; this.rule(14, 0) } }
        if (frontX >= line && !S.got && !S.stopped && !S.missed) { S.missed = true; this.rule(11, 0) }
        if (mx > line + 4) this.advance()
        break
      }
      case 3:
        if (mz < 152 && mx > 158) this.advance()
        break
      case 4:
        if (mz < 100 && Math.abs(mx - 164) < 4.5) {
          if (this.ctrlT0 >= 0 && !this.ctrlDone) { this.ctrlDone = true; if (this.ex.t - this.ctrlT0 > 120) this.rule(16) }
          this.advance()
        }
        break
      case 5: {
        const ls = lightState('z')
        if (!S.cross && frontZ < LIGHT_LINE) { S.cross = true; if (kmh > 2 && ls === 'red') this.rule(24) }
        if (kmh < 1 && frontZ > LIGHT_LINE && frontZ < LIGHT_LINE + 14 && ls === 'green') { S.gw = ((S.gw as number) || 0) + dt; if ((S.gw as number) > 30 && !S.p9) { S.p9 = true; this.rule(9, 0) } } else if (ls !== 'green') S.gw = 0
        if (mz < 78) this.advance()
        break
      }
      case 6: {
        const rearZ = mz - fz * CAR_HALF
        const inBox = mx > BOX.x0 - 0.3 && mx < BOX.x1 + 0.3 && mz > BOX.z0 && mz < BOX.z1 - 0.3
        if (inBox) S.visited = true
        if (S.visited && inBox && kmh < 0.8) {
          S.parkT = ((S.parkT as number) || 0) + dt
          if ((S.parkT as number) > 1 && !S.eval) {
            S.eval = true
            const ok = rearZ >= BOX.z0 + 0.1 && rearZ <= BOX.backLine + 0.9 && fz > 0.8 && Math.abs(mx - (BOX.x0 + BOX.x1) / 2) < 0.9
            if (!ok) this.rule(17, 0); else useSimStore.getState().pushToast("Boksga to'g'ri qo'ydingiz", 'good')
          }
        } else if (kmh > 1.5) S.parkT = 0
        if (S.eval && mz > 57) this.advance()
        else if (!S.visited && mx < 106) { this.rule(27); }
        break
      }
      case 7: {
        if (kmh < 1.2 && frontX > RAIL.x + 2.6 && frontX < RAIL.stopX + 1.5) S.stoppedRail = true
        if (!S.cross && frontX < RAIL.x + 2.4) { S.cross = true; if (!S.stoppedRail) this.rule(25) }
        if (mx < RAIL.x - 6) this.advance()
        break
      }
      case 8: {
        if (mx >= ACCEL.x0 && mx <= ACCEL.x1 && mz < 30) S.maxGear = Math.max((S.maxGear as number) || 1, gear)
        if (mx > ACCEL.x1 + 2) { if (((S.maxGear as number) || 1) < 2) this.rule(18, 0); this.advance() }
        break
      }
      case 9: {
        const phase = (S.phase as number) || 0
        if (phase === 0 && mx >= AVARIYA_X) { S.phase = 1; S.at = 0; S.stopAt = 0; this.ex.alert = "AVARIYA! TO'XTANG" }
        else if (phase === 1) {
          S.at = (S.at as number) + dt
          if (kmh < 1) { S.stopped = true; S.stopAt = (S.stopAt as number) + dt }
          if ((S.at as number) > 2 && !S.stopped && !S.p19) { S.p19 = true; this.rule(19, 0) }
          if ((S.at as number) > 3 && !this.ex.hazard && !S.p20) { S.p20 = true; this.rule(20, 0) }
          if (S.stopped && this.ex.hazard && (S.stopAt as number) > 1.5) { S.phase = 2; this.ex.alert = ''; useSimStore.getState().pushToast("Avariya chirog'ini o'chirib, davom eting", 'info') }
          else if ((S.at as number) > 10 && mx > AVARIYA_X + 20) { S.phase = 2; this.ex.alert = '' }
        } else if (phase === 2) {
          if (this.ex.hazard && kmh > 3 && !S.p21) { S.p21 = true; this.rule(21, 0) }
          if (mx > AVARIYA_X + 25) this.advance()
        }
        break
      }
      case 10: {
        const cx0 = SLOT.x0 + 0.8, cx1 = SLOT.x1 - 0.8
        const inSlot = mx > SLOT.x0 - 0.3 && mx < SLOT.x1 && mz > SLOT.z0 - 1 && mz < SLOT.z1 + 1 && mx < 247.6
        if (inSlot) S.visited = true
        if (S.visited && inSlot && kmh < 0.8) {
          S.parkT = ((S.parkT as number) || 0) + dt
          if ((S.parkT as number) > 1 && !S.eval) {
            S.eval = true
            const ok = Math.abs(fz) > 0.9 && mx >= cx0 && mx <= cx1 && mz >= SLOT.z0 + 2.2 && mz <= SLOT.z1 - 2.2
            if (!ok) this.rule(17, 0); else useSimStore.getState().pushToast("Parkovka to'g'ri bajarildi", 'good')
          }
        } else if (kmh > 1.5) S.parkT = 0
        if (S.eval && mz > 91 && mx > 248) this.advance()
        else if (!S.visited && mz > 100) this.rule(27)
        break
      }
      case 11:
        if (mz >= FINISH_Z && fz > 0.4) {
          if (!(this.ex.signal === 1 || (this.lastSig.dir === 1 && now - this.lastSig.at < 12))) this.rule(7, 0)
          this.advance()
        }
        break
    }
    this.acc += dt; if (this.acc > 0.25) { this.acc = 0; this.push(false) }
  }

  private push(force: boolean) {
    const key = JSON.stringify([Math.floor(this.ex.t), this.ex.cp, this.ex.mistakes, this.ex.done, this.ex.text, this.ex.pen, this.ex.alert, this.ex.hazard, this.ex.belt])
    if (!force && key === this.lastPush) return
    this.lastPush = key
    useSimStore.getState().patch({ exam: { ...this.ex, mistakes: { ...this.ex.mistakes } }, objective: this.ex.text, checkpointIndex: this.ex.cp, checkpointTotal: CHECKPOINTS.length })
  }
}
