import { useEffect, useState } from 'react'
import { isTouchDevice } from '../../systems/InputSystem'

/** Telefonda to'liq ekran + gorizontal holatni so'raydi (foydalanuvchi bosishidan keyin). Brauzer qo'llamasa (iOS) — "telefonni yotqizing" eslatmasi. */
export function goLandscape() {
  if (!isTouchDevice()) return
  try { const r = document.documentElement.requestFullscreen?.(); if (r && r.catch) r.catch(() => { }) } catch { /* qo'llab-quvvatlanmaydi */ }
  try { const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> }; o?.lock?.('landscape')?.catch(() => { }) } catch { /* iOS */ }
}

export function OrientationGate() {
  const touch = isTouchDevice()
  const [portrait, setPortrait] = useState(() => typeof window !== 'undefined' && window.innerHeight > window.innerWidth)
  useEffect(() => {
    const f = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', f); window.addEventListener('orientationchange', f)
    const t = setInterval(f, 500)   // ba'zi brauzerlar resize/orientationchange yubormaydi
    return () => { clearInterval(t); window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f) }
  }, [])
  if (!touch || !portrait) return null
  return (
    <div className="rot-gate" onClick={goLandscape}>
      <svg viewBox="0 0 120 120" className="rot-ph"><rect x="38" y="14" width="44" height="92" rx="9" fill="none" stroke="#B8F53B" strokeWidth="5" /><circle cx="60" cy="96" r="3.5" fill="#B8F53B" /></svg>
      <b>Telefonni yotqizing</b>
      <small>Simulyator gorizontal holatda o'ynaladi</small>
      <button className="drive" onClick={goLandscape}>To'liq ekran</button>
    </div>
  )
}
