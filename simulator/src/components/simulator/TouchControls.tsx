import { useEffect, useRef, useState } from 'react'
import { isTouchDevice, setTouch } from '../../systems/InputSystem'
import { live, useSimStore } from '../../store/simulatorStore'

/** Mobil sensorli boshqaruv (faqat sensorli qurilmada ko'rinadi): rul, gaz, tormoz, qo'l tormoz, kamera. */
export function TouchControls() {
  const [touch] = useState(isTouchDevice)
  const wheel = useRef<HTMLDivElement>(null)
  const state = useRef({ drag: false, a0: 0, w0: 0, angle: 0 })
  const [angle, setAngle] = useState(0)
  useEffect(() => () => setTouch({ steer: null, throttle: 0, brake: 0, handbrake: false }), [])
  if (!touch) return null

  const ang = (e: React.PointerEvent) => { const r = wheel.current!.getBoundingClientRect(); return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI }
  const down = (e: React.PointerEvent) => { state.current.drag = true; state.current.a0 = ang(e); state.current.w0 = state.current.angle; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
  const move = (e: React.PointerEvent) => {
    const s = state.current; if (!s.drag) return
    let d = ang(e) - s.a0; if (d > 180) d -= 360; if (d < -180) d += 360
    s.angle = Math.max(-120, Math.min(120, s.w0 + d)); setAngle(s.angle)
    setTouch({ steer: -s.angle / 100 }) // soat mili bo'yicha = o'ngga (negativ)
  }
  const up = () => { state.current.drag = false; const back = () => { const s = state.current; if (s.drag) return; s.angle *= 0.78; if (Math.abs(s.angle) < 1) s.angle = 0; setAngle(s.angle); setTouch({ steer: s.angle === 0 ? null : -s.angle / 100 }); if (s.angle !== 0) requestAnimationFrame(back) }; back() }

  const hold = (key: 'throttle' | 'brake' | 'handbrake') => ({
    onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setTouch({ [key]: key === 'handbrake' ? true : 1 } as never) },
    onPointerUp: () => setTouch({ [key]: key === 'handbrake' ? false : 0 } as never),
    onPointerCancel: () => setTouch({ [key]: key === 'handbrake' ? false : 0 } as never),
  })

  return (
    <div className="touch">
      <div ref={wheel} className="t-wheel" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <svg viewBox="0 0 200 200" style={{ transform: `rotate(${angle}deg)` }}>
          <circle cx="100" cy="100" r="86" fill="none" stroke="#10141b" strokeWidth="24" /><circle cx="100" cy="100" r="86" fill="none" stroke="#2c3341" strokeWidth="19" />
          <path d="M16 100h54M130 100h54M100 118v70" stroke="#2c3341" strokeWidth="12" strokeLinecap="round" />
          <circle cx="100" cy="100" r="26" fill="#161b24" stroke="#B8F53B" strokeWidth="3" /><rect x="95" y="8" width="10" height="20" rx="3" fill="#B8F53B" />
        </svg>
      </div>
      <div className="t-mid">
        <button onClick={() => useSimStore.getState().nextCamera()}>KAMERA</button>
        <button onClick={() => { live.resetRequested = true }}>TIKLASH</button>
      </div>
      <div className="t-right">
        <button className="hb" {...hold('handbrake')}>QO'L<br />TORMOZ</button>
        <button className="brk" {...hold('brake')}>TORMOZ<br />ORQAGA</button>
        <button className="gas" {...hold('throttle')}>GAZ</button>
      </div>
    </div>
  )
}
