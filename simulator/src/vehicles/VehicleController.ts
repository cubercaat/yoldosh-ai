import type { RigidBody, World } from '@dimforge/rapier3d-compat'
import { VehiclePhysics } from '../physics/VehiclePhysics'
import type { DriveInput } from '../systems/InputSystem'
import type { GearMode } from '../store/simulatorStore'
import { approach, clamp, damp } from '../utils/math'
import type { VehicleConfig } from './VehicleConfig'

/**
 * VehicleController — haydovchi kiritishi (gaz/tormoz/rul) -> mashina kuchlari.
 * Hamma mashina uchun BIR XIL kod: farq faqat VehicleConfig da (massa, moment, uzatmalar, o'qlar).
 *
 * Avtomat uzatma: P / R / N / D. D da pog'onalar tezlik va RPM bo'yicha almashadi (almashish paytida moment uziladi).
 */
export interface ControllerSnapshot {
  speed: number // m/s, belgili
  kmh: number
  rpm: number
  rpmNorm: number
  gearMode: GearMode
  gear: number
  throttle: number
  brake: number
  handbrake: boolean
  steerNorm: number
  grounded: number
  upDot: number
  fwd: [number, number, number]
  drift: number // 0..1 — drift rejimi darajasi
  slip: number // yon sirpanish burchagi (rad, belgili)
  driftScore: number
  driftOn: boolean
  burnout: boolean
}

export const tune = { rearDrop: 0.58, frontDrop: 0.08, sideDrop: 0.55, alpha: 2.6, alphaBurn: 4.2, lim: 2.4, limBurn: 3.4, kick: 0 }
const G = 9.81
const AIR = 1.2

export class VehicleController {
  readonly phys: VehiclePhysics
  gearMode: GearMode = 'P'
  gear = 1
  rpm: number
  steerNorm = 0
  private shiftTimer = 0
  time = 0 // fizika vaqti (soniya) — sinov va debug uchun
  private throttleS = 0
  private brakeS = 0
  private peakTorque: number
  private reverseRatio: number
  snap: ControllerSnapshot
  drift = 0
  private driftScore = 0
  private driftIdle = 0
  driftBest = 0

  constructor(world: World, readonly chassis: RigidBody, readonly cfg: VehicleConfig) {
    this.phys = new VehiclePhysics(world, chassis, cfg)
    this.rpm = cfg.engine.idleRpm
    // Eng yuqori moment: quvvat / burchak tezligi (ICE: ~85% redline da eng yuqori quvvat; EV: 6000 rpm gacha doimiy moment)
    const pRpm = cfg.engine.electric ? 6000 : cfg.engine.redlineRpm * 0.85
    this.peakTorque = (cfg.enginePower * 1000) / ((pRpm * 2 * Math.PI) / 60)
    this.reverseRatio = cfg.gearRatios[0] * 0.9
    this.snap = { speed: 0, kmh: 0, rpm: this.rpm, rpmNorm: 0, gearMode: 'P', gear: 1, throttle: 0, brake: 0, handbrake: false, steerNorm: 0, grounded: 4, upDot: 1, fwd: [0, 0, 1], drift: 0, slip: 0, driftScore: 0, driftOn: false, burnout: false }
  }

  /** dvigatel momenti egri chizig'i (0..1) */
  private torqueCurve(rpm: number): number {
    const e = this.cfg.engine
    if (e.electric) return rpm < 6000 ? 1 : clamp(1 - (rpm - 6000) / 12000, 0.35, 1)
    if (rpm < e.idleRpm) return 0.4
    if (rpm < e.peakTorqueRpm) return 0.6 + 0.4 * ((rpm - e.idleRpm) / (e.peakTorqueRpm - e.idleRpm))
    const t = (rpm - e.peakTorqueRpm) / (e.redlineRpm - e.peakTorqueRpm)
    return rpm > e.redlineRpm ? 0 : 1 - 0.3 * t
  }

  reset(clearGear = true) {
    this.steerNorm = 0; this.throttleS = 0; this.brakeS = 0; this.shiftTimer = 0; this.drift = 0; this.driftScore = 0; this.driftIdle = 0
    if (clearGear) { this.gearMode = 'P'; this.gear = 1; this.rpm = this.cfg.engine.idleRpm }
  }

  step(dt: number, inp: DriveInput) {
    this.time += dt
    const cfg = this.cfg, body = this.chassis
    const q = body.rotation(), lv = body.linvel()
    // kuzov oldinga/yuqoriga vektorlari (dunyo)
    const fx = 2 * (q.x * q.z + q.w * q.y), fy = 2 * (q.y * q.z - q.w * q.x), fz = 1 - 2 * (q.x * q.x + q.y * q.y)
    const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
    const v = lv.x * fx + lv.y * fy + lv.z * fz // oldinga tezlik (belgili)
    const speed = Math.abs(v), kmh = speed * 3.6
    const grounded = this.phys.wheels.reduce((n, w) => n + (w.contact ? 1 : 0), 0)

    /* ---------- haydovchi niyati -> uzatma rejimi ---------- */
    const wantFwd = inp.throttle, wantRev = inp.brake
    if (this.gearMode === 'P' && (wantFwd > 0.05 || wantRev > 0.05)) this.gearMode = wantRev > 0.05 && wantFwd <= 0.05 ? 'R' : 'D'
    else if (this.gearMode === 'D' && wantRev > 0.05 && wantFwd < 0.05 && speed < 0.7) this.gearMode = 'R'
    else if (this.gearMode === 'R' && wantFwd > 0.05 && wantRev < 0.05 && speed < 0.7) this.gearMode = 'D'
    else if (this.gearMode === 'N' && (wantFwd > 0.05 || wantRev > 0.05)) this.gearMode = wantRev > 0.05 && wantFwd <= 0.05 ? 'R' : 'D'

    /* ---------- DRIFT niyati: gaz + qo'l tormoz, yoki gaz + tormoz birga (D da) ---------- */
    const latV = lv.x * fz - lv.z * fx // yon tezlik (+ = chap)
    const slip = Math.atan2(latV, Math.max(speed, 0.5) * (v < 0 ? -1 : 1))
    const bothPedals = this.gearMode === 'D' && wantFwd > 0.2 && wantRev > 0.2
    const hbDrift = inp.handbrake && wantFwd > 0.15 && this.gearMode === 'D'
    const intent = (bothPedals || hbDrift) && grounded >= 3
    const keep = this.drift > 0.3 && wantFwd > 0.3 && Math.abs(slip) > 0.35 && grounded >= 3 // sirpanish davomida ushlab turish
    const dTarget = intent ? 1 : keep ? 0.6 : 0
    this.drift = approach(this.drift, dTarget, dTarget > this.drift ? 5 : 1.4, dt)
    const burnout = intent && speed < 9
    // pedal xaritasi: D da W=gaz, S=tormoz. R da S=gaz (orqaga), W=tormoz
    let throttle = 0, brake = 0
    if (this.gearMode === 'D') { throttle = wantFwd; brake = bothPedals ? 0 : wantRev; if (v < -1 && wantFwd > 0.05) { brake = Math.max(brake, wantFwd); throttle = 0 } }
    else if (this.gearMode === 'R') { throttle = wantRev; brake = wantFwd; if (v > 1 && wantRev > 0.05) { brake = Math.max(brake, wantRev); throttle = 0 } }
    // pedal silliqlashi (to'satdan 0 -> 1 emas)
    this.throttleS = approach(this.throttleS, throttle, throttle > this.throttleS ? 4.5 : 8, dt)
    this.brakeS = approach(this.brakeS, brake, brake > this.brakeS ? 2.2 : 8, dt)   // pedal asta-sekin bosiladi (to'satdan emas): ~0.45 s da to'liq

    /* ---------- avtomat uzatma ---------- */
    const R = cfg.wheelRadius, ratios = cfg.gearRatios, fin = cfg.finalDrive, e = cfg.engine
    const rpmOf = (g: number) => (speed / R) * ratios[g - 1] * fin * (60 / (2 * Math.PI))
    if (this.gearMode === 'D') {
      if (this.shiftTimer > 0) this.shiftTimer -= dt
      else {
        const up = e.redlineRpm * (this.throttleS > 0.85 ? 0.92 : this.throttleS > 0.4 ? 0.72 : 0.55)
        if (this.gear < ratios.length && rpmOf(this.gear) > up) { this.gear++; this.shiftTimer = e.electric ? 0 : 0.28 }
        else if (this.gear > 1 && rpmOf(this.gear - 1) < e.redlineRpm * (this.throttleS > 0.6 ? 0.8 : 0.62) && rpmOf(this.gear) < e.peakTorqueRpm * 0.6) { this.gear--; this.shiftTimer = 0.2 }
      }
    } else if (this.gearMode === 'R') this.gear = 1
    else if (speed < 1) this.gear = 1
    const gr = this.gearMode === 'R' ? this.reverseRatio : ratios[this.gear - 1]

    /* ---------- RPM ---------- */
    const wheelRpm = speed / R * gr * fin * (60 / (2 * Math.PI))
    const launch = this.gearMode === 'N' || this.gearMode === 'P' ? 0 : Math.max(e.idleRpm, this.throttleS * (e.electric ? 0 : e.peakTorqueRpm * 0.55))
    const targetRpm = this.gearMode === 'P' || this.gearMode === 'N'
      ? e.idleRpm + this.throttleS * (e.redlineRpm * 0.9 - e.idleRpm)
      : Math.min(e.redlineRpm, Math.max(wheelRpm, launch))
    this.rpm = damp(this.rpm, Math.max(e.electric ? 0 : e.idleRpm, targetRpm), 12, dt)

    /* ---------- dvigatel kuchi ---------- */
    const driven = (['FL', 'FR', 'RL', 'RR'] as const).map((k) => cfg.wheels[k].driven)
    const nDriven = driven.filter(Boolean).length || 1
    let engineForce = 0
    const limit = this.gearMode === 'R' ? cfg.reverseSpeed : cfg.maxSpeed
    if ((this.gearMode === 'D' || this.gearMode === 'R') && this.shiftTimer <= 0 && kmh < limit) {
      const tq = this.peakTorque * this.torqueCurve(Math.max(this.rpm, wheelRpm)) * this.throttleS
      engineForce = (tq * gr * fin * 0.88) / R // butun mashina, N
      if (this.rpm >= e.redlineRpm - 20 && !e.electric) engineForce = 0 // kesgich (limiter)
    }
    const perWheel = engineForce / nDriven
    const dir = this.gearMode === 'R' ? -1 : 1
    const engine = driven.map((d) => (d ? perWheel * dir : 0))

    /* ---------- tormoz, qo'l tormoz ---------- */
    const total = cfg.brakingForce
    // haqiqiy tormoz: pedal egri chizig'i (yumshoq boshlanadi) va maksimum ~0.7g — mashina boshi cho'kib, orqasi ko'tarilib qolmaydi
    let brakeTotal = Math.pow(this.brakeS, 1.35) * total * 0.72
    if (speed < 1.2 && this.brakeS > 0.05 && this.throttleS < 0.05) brakeTotal = Math.max(brakeTotal, total * 0.6)   // past tezlikda to'xtatib ushlaydi
    // dvigatel tormozi + yurish qarshiligi (gaz yo'q bo'lganda)
    if (this.throttleS < 0.05 && (this.gearMode === 'D' || this.gearMode === 'R')) brakeTotal += cfg.mass * G * 0.025
    if (this.gearMode === 'P') brakeTotal = total * 0.8
    if (this.gearMode === 'N' && this.brakeS < 0.05) brakeTotal += cfg.mass * G * 0.01
    const hb = inp.handbrake
    const brakeW = [brakeTotal * 0.34, brakeTotal * 0.34, brakeTotal * 0.16, brakeTotal * 0.16]
    if (hb) { const hbF = this.throttleS > 0.15 && this.gearMode === 'D' ? 0.12 : 0.45; brakeW[2] += total * hbF; brakeW[3] += total * hbF }   // gaz bilan birga bo'lsa g'ildirak aylanishda qoladi (drift)

    /* ---------- rul ---------- */
    const target = clamp(inp.steer, -1, 1)
    const rate = Math.abs(target) > Math.abs(this.steerNorm) ? 7.5 : 10 // markazga qaytish tezroq
    this.steerNorm = approach(this.steerNorm, target, rate * (1 / (1 + kmh / 320)), dt)
    const maxA = (cfg.steeringAngle * Math.PI) / 180
    const speedFactor = 1 / (1 + Math.pow(kmh / 80, 1.6) * 1.0) // tezlikda rul yumshaydi, past tezlikda katta burchak
    const delta = this.steerNorm * maxA * 1.25 * Math.max(0.2, speedFactor)
    // Ackermann: ichki g'ildirak ko'proq buriladi
    const WB = cfg.wheelBase, track = Math.abs(cfg.wheels.FL.position[0]) * 2
    const sgn = Math.sign(delta), ad = Math.abs(delta)
    const tanD = Math.tan(ad)
    const inner = Math.atan(WB * tanD / Math.max(0.2, WB - (track / 2) * tanD)), outer = Math.atan(WB * tanD / (WB + (track / 2) * tanD))
    const left = sgn >= 0 ? inner : outer, right = sgn >= 0 ? outer : inner // +delta = chapga burilish
    const steer = [sgn * left, sgn * right, 0, 0]

    /* ---------- havo qarshiligi, aylanish qarshiligi, pastga bosim ---------- */
    if (speed > 0.05) {
      const drag = 0.5 * AIR * cfg.dragCoefficient * cfg.frontalArea * speed * speed + 0.012 * cfg.mass * G
      const k = (drag * dt) / Math.max(speed, 0.1)
      body.applyImpulse({ x: -lv.x * k, y: 0, z: -lv.z * k }, true)
      const down = 0.5 * AIR * 0.15 * cfg.frontalArea * speed * speed * dt // yengil aerodinamik pastga bosim
      body.applyImpulse({ x: 0, y: -down, z: 0 }, true)
    }

    const rearGrip = 1 - tune.rearDrop * this.drift, frontGrip = 1 - tune.frontDrop * this.drift
    const grip = [frontGrip, frontGrip, rearGrip, rearGrip], side = [1, 1, 1 - tune.sideDrop * this.drift, 1 - tune.sideDrop * this.drift]
    this.phys.step(dt, { engine, brake: brakeW, steer, grip, side }, hb)

    /* ---------- drift yordamchisi (arcade): burilish momenti va o'ta aylanib ketishdan saqlash ---------- */
    let driftOn = false
    if (grounded >= 3) {
      const Iy = (cfg.mass / 12) * (cfg.dimensions.width ** 2 + cfg.dimensions.length ** 2) * 0.9
      const a0 = body.angvel()
      if (this.drift > 0.15) {
        const sp = clamp(speed / 6 + 0.35, 0, 1), alpha = burnout ? tune.alphaBurn : tune.alpha   // rad/s² to'liq rulda
        let ay = this.steerNorm * alpha * this.drift * Math.max(this.throttleS, 0.4) * sp
        // juda katta burchakda (>~45°) rulga qarshi yo'nalishda turg'unlashtirish — to'liq aylanib ketmasin
        const over = Math.max(0, Math.abs(slip) - 0.8)
        if (!burnout && over > 0) ay += Math.sign(slip) * over * 5
        // yo'nalishga qarshi rulda sirpanishni ushlab turish
        if (!burnout && Math.abs(slip) > 0.25 && Math.sign(this.steerNorm) === -Math.sign(slip)) ay += Math.sign(slip) * 0.8 * Math.abs(this.steerNorm)
        body.applyTorqueImpulse({ x: 0, y: Iy * ay * dt, z: 0 }, true)
        // aylanish tezligini cheklash (donut ~ 2.6 rad/s)
        const lim = burnout ? tune.limBurn : tune.lim
        if (Math.abs(a0.y) > lim) body.setAngvel({ x: a0.x, y: Math.sign(a0.y) * lim, z: a0.z }, true)
      }
      // ochko: ma'noli sirpanish (≥12°) va tezlik
      if (speed > 5.5 && Math.abs(slip) > 0.21 && Math.abs(slip) < 1.45 && (this.drift > 0.2 || Math.abs(slip) > 0.3)) {
        this.driftScore += speed * Math.sin(Math.min(Math.abs(slip), 1.2)) * 5 * dt; this.driftIdle = 0; driftOn = true
      }
    }
    if (!driftOn) { this.driftIdle += dt; if (this.driftIdle > 1.1 && this.driftScore > 0) { this.driftBest = Math.max(this.driftBest, this.driftScore); this.driftScore = 0 } }

    // yo'nalish barqarorligi: yuqori tezlikda ortiqcha burchak tezligini biroz so'ndirish
    if (grounded >= 2) { const damping = 1 - Math.min(0.02, kmh / 9000), a2 = body.angvel(); body.setAngvel({ x: a2.x * damping, y: a2.y * (grounded >= 3 ? damping : 1), z: a2.z * damping }, true) }

    this.snap = { speed: v, kmh, rpm: this.rpm, rpmNorm: clamp((this.rpm - e.idleRpm) / (e.redlineRpm - e.idleRpm), 0, 1), gearMode: this.gearMode, gear: this.gearMode === 'R' ? 0 : this.gear, throttle: this.throttleS, brake: this.brakeS, handbrake: hb, steerNorm: this.steerNorm, grounded, upDot: upY, fwd: [fx, fy, fz], drift: this.drift, slip, driftScore: this.driftScore, driftOn, burnout }
  }
}


