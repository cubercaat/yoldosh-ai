/** Avtodrom markaziy chorrahasidagi svetofor: X o'qi (sharq-g'arb) va Z o'qi (shimol-janub) navbatma-navbat. */
export const CYCLE = 24
export type LightState = 'green' | 'yellow' | 'red'
export const lightClock = () => performance.now() / 1000
/** axis 'x' — mashina X bo'ylab yursa; 'z' — Z bo'ylab */
export function lightState(axis: 'x' | 'z', t: number = lightClock()): LightState {
  const p = ((t % CYCLE) + CYCLE) % CYCLE
  if (axis === 'x') return p < 9 ? 'green' : p < 11 ? 'yellow' : 'red'
  return p < 13 ? 'red' : p < 22 ? 'green' : 'yellow'
}
