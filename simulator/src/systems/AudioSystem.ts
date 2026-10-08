import { live, useSimStore } from '../store/simulatorStore'
import { clamp, damp } from '../utils/math'
import type { VehicleConfig } from '../vehicles/VehicleConfig'

/**
 * AudioSystem — dvigatel ovozi moduli.
 *  - Agar public/audio/<file> mavjud bo'lsa (VehicleConfig.sound.file), shu namuna aylanadi va RPM ga qarab tezligi o'zgaradi.
 *  - Aks holda — WebAudio sintezatori (PLACEHOLDER ovoz; haqiqiy dvigatel yozuvi emas).
 * Ovoz fayllari yo'q bo'lsa ham ilova ishlayveradi (xatolik yutiladi).
 */
export class AudioSystem {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private osc: OscillatorNode[] = []
  private filter: BiquadFilterNode | null = null
  private engineGain: GainNode | null = null
  private noiseGain: GainNode | null = null
  private sample: AudioBufferSourceNode | null = null
  private sampleOk = false
  private vol = 0
  private pitch = 0
  private cfg: VehicleConfig | null = null
  started = false

  /** foydalanuvchi harakatidan keyin chaqiriladi (brauzer talabi) */
  async start(cfg: VehicleConfig) {
    try {
      this.cfg = cfg
      if (!this.ctx) {
        const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!C) return
        this.ctx = new C()
        this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      this.build(cfg)
      this.started = true
    } catch { /* audio ixtiyoriy */ }
  }

  private async build(cfg: VehicleConfig) {
    this.dispose(false)
    const ctx = this.ctx!, master = this.master!
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 600
    this.filter.connect(this.engineGain); this.engineGain.connect(master)
    // 1) haqiqiy namuna bormi?
    if (cfg.sound.file) {
      try {
        const res = await fetch(cfg.sound.file)
        if (res.ok && (res.headers.get('content-type') || '').includes('audio')) {
          const buf = await ctx.decodeAudioData(await res.arrayBuffer())
          const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(this.filter); src.start(); this.sample = src; this.sampleOk = true
        }
      } catch { this.sampleOk = false }
    }
    // 2) placeholder sintezator
    if (!this.sampleOk) {
      const kind = cfg.sound.character
      const types: OscillatorType[] = kind === 'electric' ? ['sine', 'triangle'] : kind === 'diesel' ? ['sawtooth', 'square'] : ['sawtooth', 'square']
      this.osc = types.map((t) => { const o = ctx.createOscillator(); o.type = t; o.frequency.value = 50; o.connect(this.filter!); o.start(); return o })
      // shovqin (dizel/v8 uchun biroz qo'pollik)
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = nb.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true
      this.noiseGain = ctx.createGain(); this.noiseGain.gain.value = 0
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 500
      ns.connect(nf); nf.connect(this.noiseGain); this.noiseGain.connect(master); ns.start()
      this.osc.push(ns as unknown as OscillatorNode)
    }
  }

  /** har kadrda: RPM, gaz, tezlik bo'yicha pitch va hajm (silliqlangan) */
  update(dt: number, active: boolean) {
    if (!this.ctx || !this.engineGain || !this.cfg) return
    const muted = useSimStore.getState().muted
    const e = this.cfg.engine, rpmN = clamp((live.rpm - e.idleRpm) / (e.redlineRpm - e.idleRpm || 1), 0, 1)
    const kind = this.cfg.sound.character
    const targetVol = !active || muted ? 0 : 0.05 + 0.12 * live.throttle + 0.08 * rpmN + (live.engineLoad > 0.2 ? 0.02 : 0)
    this.vol = damp(this.vol, targetVol, 8, dt)
    this.pitch = damp(this.pitch, rpmN, 10, dt)
    this.engineGain.gain.value = this.vol
    const base = kind === 'electric' ? 90 : kind === 'diesel' ? 38 : kind === 'v8' ? 32 : 48
    const f = base + this.pitch * (kind === 'electric' ? 520 : kind === 'diesel' ? 110 : kind === 'v8' ? 130 : 170)
    if (this.sampleOk && this.sample) this.sample.playbackRate.value = 0.6 + this.pitch * 1.4
    else {
      if (this.osc[0]) (this.osc[0] as OscillatorNode).frequency.value = f
      if (this.osc[1]) (this.osc[1] as OscillatorNode).frequency.value = f * (kind === 'electric' ? 2.01 : 0.5)
    }
    if (this.filter) this.filter.frequency.value = 260 + this.pitch * 1500 + live.throttle * 500
    if (this.noiseGain) this.noiseGain.gain.value = muted || !active ? 0 : (kind === 'electric' ? 0.004 : 0.012 + live.throttle * 0.02) * (0.4 + this.pitch)
  }

  /** to'qnashuv "dub" ovozi */
  hit(strength: number) {
    try {
      if (!this.ctx || !this.master || useSimStore.getState().muted) return
      const o = this.ctx.createOscillator(), g = this.ctx.createGain()
      o.type = 'triangle'; o.frequency.setValueAtTime(110, this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.25)
      g.gain.setValueAtTime(0.25 * strength + 0.05, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3)
      o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + 0.32)
    } catch { /* e'tiborsiz */ }
  }

  dispose(closeCtx = true) {
    try { this.osc.forEach((o) => { try { o.stop() } catch { /* */ } }); this.sample?.stop() } catch { /* */ }
    this.osc = []; this.sample = null; this.sampleOk = false
    if (closeCtx) { try { this.ctx?.close() } catch { /* */ } this.ctx = null; this.started = false }
  }
}

export const audio = new AudioSystem()
