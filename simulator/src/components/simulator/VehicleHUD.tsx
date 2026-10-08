import { useEffect, useRef } from 'react'
import { shallow } from 'zustand/shallow'
import { live, useSimStore, type GearMode } from '../../store/simulatorStore'
import { getVehicle } from '../../vehicles/vehicleRegistry'
import { MiniMap, LimitSign } from './Minimap'
import { DebugPanel } from './DebugPanel'
import { fmtTime } from '../../utils/math'
import { sunState } from '../../systems/DayNightSystem'

const GEARS: GearMode[] = ['P', 'R', 'N', 'D']

/** Premium "dark glass" HUD: tezlik, RPM, uzatma, pedallar, mini-xarita, maqsad, ball, kun/tun nazorati. */
export function VehicleHUD() {
  const tel = useSimStore((s) => s.telemetry, shallow)
  const cfg = getVehicle(useSimStore((s) => s.vehicleId))
  const objective = useSimStore((s) => s.objective)
  const distance = useSimStore((s) => s.distance)
  const score = useSimStore((s) => s.score)
  const camMode = useSimStore((s) => s.cameraMode)
  const lights = useSimStore((s) => s.headlights)
  const auto = useSimStore((s) => s.autoHeadlights)
  const tod = useSimStore((s) => s.timeOfDay)
  const autoTime = useSimStore((s) => s.autoTime)
  const cpI = useSimStore((s) => s.checkpointIndex)
  const free = useSimStore((s) => s.freeSecondsLeft)
  const muted = useSimStore((s) => s.muted)
  const src = useSimStore((s) => s.modelSource)
  const night = sunState(tod).night
  const lightsOn = auto ? night > 0.45 : lights
  const R = 92, C = 2 * Math.PI * R, ARC = 0.75
  const rpmLen = C * ARC * tel.rpmNorm
  const gearLabel = tel.gearMode === 'D' ? String(tel.gear) : tel.gearMode === 'R' ? 'R' : tel.gearMode

  return (
    <div className="hud">
      <div className="hud-tl glass">
        <div className="obj-k">MAQSAD · {cpI}</div>
        <div className="obj-t">{objective}</div>
        <div className="obj-s"><span>{(distance / 1000).toFixed(2)} km</span><span>Ball {score}</span></div>
      </div>

      <div className="hud-tr">
        <MiniMap />
        <div className="glass chips">
          <button onClick={() => useSimStore.getState().nextCamera()} title="Kamera (C)">CAM · {camLabel(camMode)}</button>
          <button className={lightsOn ? 'on' : ''} onClick={() => useSimStore.getState().toggleHeadlights()} title="Faralar (L)">FARA{auto && !lights ? ' · AVTO' : ''}</button>
          <button onClick={() => useSimStore.getState().toggleMute()}>{muted ? 'OVOZ ×' : 'OVOZ'}</button>
        </div>
        <div className="glass time">
          <span>{String(Math.floor(tod)).padStart(2, '0')}:{String(Math.floor((tod % 1) * 60)).padStart(2, '0')}</span>
          <input type="range" min={0} max={24} step={0.1} value={tod} onChange={(e) => useSimStore.getState().setTime(parseFloat(e.target.value))} aria-label="Kun vaqti" />
          <button className={autoTime ? 'on' : ''} onClick={() => useSimStore.getState().toggleAutoTime()}>AVTO</button>
        </div>
        {free !== null && <div className="glass free">Bepul vaqt: {fmtTime(free)}</div>}
      </div>

      <div className="hud-bottom">
        <div className="glass pedals">
          <Bar label="GAZ" v={tel.throttle} cls="gas" />
          <Bar label="TORMOZ" v={tel.brake} cls="brk" />
          <div className={`hb ${tel.handbrake ? 'on' : ''}`}>QO'L TORMOZ</div>
          <div className="surf">{surfaceLabel(tel.surface)} · {tel.grounded}/4 g'ildirak</div>
        </div>

        <LimitSign />
      <div className="speedo glass">
          <svg viewBox="0 0 220 220" className="ring">
            <circle cx="110" cy="110" r={R} className="trk" strokeDasharray={`${C * ARC} ${C}`} transform="rotate(135 110 110)" />
            <circle cx="110" cy="110" r={R} className={`val ${tel.rpmNorm > 0.88 ? 'hot' : ''}`} strokeDasharray={`${rpmLen} ${C}`} transform="rotate(135 110 110)" />
          </svg>
          <div className="digits"><b>{String(tel.kmh).padStart(3, '0')}</b><small>KM/H</small></div>
          <div className="rpm">{(tel.rpm / 1000).toFixed(1)}<small> ×1000 RPM</small></div>
        </div>

        <div className="glass gear">
          <div className="big">{gearLabel}</div>
          <div className="prnd">{GEARS.map((g) => (<span key={g} className={g === tel.gearMode ? 'on' : ''}>{g}</span>))}</div>
          <div className="veh">{cfg.name}</div>
        </div>
      </div>

      {Math.abs(tel.steer) > 0.02 && <div className="steer glass"><i style={{ transform: `translateX(${tel.steer * -40}px)` }} /></div>}
      <Toasts />
      <ImpactFlash />
      <div className="keys">W/S gaz-tormoz · A/D rul · Space qo'l tormoz · C kamera · L faralar · R tiklash · F3 debug{src === 'placeholder' ? ' · PLACEHOLDER MODEL' : ''}</div>
      <DebugPanel />
    </div>
  )
}

const camLabel = (m: string) => ({ chase: '1', close: '2', driver: '3', hood: '4', free: '5' }[m] ?? m)
const surfaceLabel = (s: string) => ({ road: 'Asfalt', sidewalk: 'Trotuar', grass: 'O\'t', air: 'Havoda' }[s] ?? s)

function Bar({ label, v, cls }: { label: string; v: number; cls: string }) {
  return (<div className={`bar ${cls}`}><span>{label}</span><div><i style={{ width: `${Math.round(v * 100)}%` }} /></div></div>)
}

function Toasts() {
  const toasts = useSimStore((s) => s.toasts)
  return (<div className="toasts">{toasts.map((t) => (<div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>))}</div>)
}

function ImpactFlash() {
  const imp = useSimStore((s) => s.impact)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = ref.current; if (!el || !imp.t) return; el.style.opacity = String(Math.min(0.7, 0.2 + imp.strength)); const id = setTimeout(() => { el.style.opacity = '0' }, 140); return () => clearTimeout(id) }, [imp])
  return <div ref={ref} className="impact" />
}


