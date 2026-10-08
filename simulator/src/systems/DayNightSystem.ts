import { Color, Vector3 } from 'three'
import { clamp } from '../utils/math'

/**
 * DayNightSystem — vaqtga qarab quyosh yo'nalishi, yorug'lik kuchi, osmon va tuman rangi.
 * timeOfDay: 0..24 soat. 6:00 chiqish, 12:00 tush, 18:00 botish.
 */
export interface SunState {
  dir: Vector3 // quyoshga yo'nalish
  elevation: number // -1..1 (sin)
  sunIntensity: number
  ambientIntensity: number
  hemiIntensity: number
  night: number // 0 = kunduz, 1 = to'liq tun
  sunColor: Color
  fogColor: Color
  skyTurbidity: number
  skyRayleigh: number
  envIntensity: number
}

const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const day = new Color('#fff1d6'), dusk = new Color('#ff9a52'), nightC = new Color('#7d96d6')
const fogDay = new Color('#cfe3f5'), fogDusk = new Color('#e7a77f'), fogNight = new Color('#070b16')

export function sunState(timeOfDay: number): SunState {
  const ang = ((timeOfDay - 6) / 24) * Math.PI * 2 // 6:00 -> 0 (ufq), 12:00 -> pi/2 (tepada)
  const el = Math.sin(ang)
  const az = ang * 0.5 + 0.8
  const dir = new Vector3(Math.cos(az) * Math.cos(Math.asin(clamp(el, -1, 1))), el, Math.sin(az) * Math.cos(Math.asin(clamp(el, -1, 1)))).normalize()
  const night = 1 - smooth(-0.12, 0.2, el)
  const golden = smooth(-0.1, 0.05, el) * (1 - smooth(0.12, 0.4, el))
  const sunColor = day.clone().lerp(dusk, golden).lerp(nightC, night)
  const fogColor = fogDay.clone().lerp(fogDusk, golden).lerp(fogNight, night)
  return {
    dir, elevation: el, night,
    sunIntensity: 0.05 + 2.4 * smooth(-0.02, 0.5, el) * (1 - night * 0.4) + 0.12 * night,
    ambientIntensity: 0.18 + 0.32 * (1 - night),
    hemiIntensity: 0.08 + 0.7 * (1 - night),
    sunColor, fogColor,
    skyTurbidity: 6 + 8 * golden, skyRayleigh: 1.4 + 2.6 * golden + 0.2 * night,
    envIntensity: 0.12 + 0.88 * (1 - night),
  }
}
