import { useSimStore, type ExamGear } from '../store/simulatorStore'
import { live } from '../store/simulatorStore'

/** Kiritish holati — fizika har qadamda shu obyektdan o'qiydi (React'ga bog'liq emas). */
export interface DriveInput {
  throttle: number // 0..1
  brake: number // 0..1
  steer: number // -1..1
  handbrake: boolean
}

export const input: DriveInput & { touchSteer: number | null; touchThrottle: number; touchBrake: number; touchHandbrake: boolean } = {
  throttle: 0, brake: 0, steer: 0, handbrake: false,
  touchSteer: null, touchThrottle: 0, touchBrake: 0, touchHandbrake: false,
}

export const setGear = (g: ExamGear) => useSimStore.setState((x) => ({ exam: { ...x.exam, gear: g } }))
const down = new Set<string>()
let attached = false

function recompute() {
  const k = (...codes: string[]) => codes.some((c) => down.has(c))
  const kbSteer = (k('KeyD', 'ArrowRight') ? -1 : 0) + (k('KeyA', 'ArrowLeft') ? 1 : 0) // +X = chap
  input.throttle = Math.max(k('KeyW', 'ArrowUp') ? 1 : 0, input.touchThrottle)
  input.brake = Math.max(k('KeyS', 'ArrowDown') ? 1 : 0, input.touchBrake)
  input.handbrake = k('Space', 'ShiftLeft', 'ShiftRight') || input.touchHandbrake
  input.steer = input.touchSteer !== null ? input.touchSteer : kbSteer
}

/** Bir martalik hodisalar: R, C, L, F3 */
function onKeyDown(e: KeyboardEvent) {
  if (e.repeat) { if (['Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return }
  down.add(e.code)
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
  const st = useSimStore.getState()
  if (st.screen !== 'playing') return
  switch (e.code) {
    case 'KeyR': live.resetRequested = true; break
    case 'KeyC': st.nextCamera(); break
    case 'KeyL': st.toggleHeadlights(); break
    case 'F3': e.preventDefault(); st.toggleDebug(); break
    case 'KeyM': st.toggleMute(); break
    case 'KeyQ': useSimStore.setState((x) => ({ exam: { ...x.exam, signal: x.exam.signal === -1 ? 0 : -1 } })); break
    case 'KeyE': useSimStore.setState((x) => ({ exam: { ...x.exam, signal: x.exam.signal === 1 ? 0 : 1 } })); break
    case 'KeyB': useSimStore.setState((x) => ({ exam: { ...x.exam, belt: !x.exam.belt } })); break
    case 'KeyH': useSimStore.setState((x) => ({ exam: { ...x.exam, hazard: !x.exam.hazard } })); break
    case 'Digit1': case 'Numpad1': setGear(1); break
    case 'Digit2': case 'Numpad2': setGear(2); break
    case 'Digit3': case 'Numpad3': setGear(3); break
    case 'Digit4': case 'Numpad4': setGear('R'); break
    case 'Digit5': case 'Numpad5': setGear('D'); break
    case 'Digit0': case 'Numpad0': setGear('N'); break
    case 'KeyT': st.setTime((st.timeOfDay + 3) % 24); break
  }
  recompute()
}
function onKeyUp(e: KeyboardEvent) { down.delete(e.code); recompute() }
function onBlur() { down.clear(); recompute() }

export function attachInput() {
  if (attached) return () => { }
  attached = true
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  return () => { attached = false; window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); down.clear() }
}

/** Sensorli boshqaruv (mobil) shu funksiyalar orqali yozadi */
export function setTouch(p: Partial<{ steer: number | null; throttle: number; brake: number; handbrake: boolean }>) {
  if (p.steer !== undefined) input.touchSteer = p.steer
  if (p.throttle !== undefined) input.touchThrottle = p.throttle
  if (p.brake !== undefined) input.touchBrake = p.brake
  if (p.handbrake !== undefined) input.touchHandbrake = p.handbrake
  recompute()
}

export const isTouchDevice = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window)
