import { defineVehicle } from './defineVehicle'

/** Mercedes-Benz G-Class (G63) — to'liq yuritma, 9 pog'onali avtomat, V8. */
export const gclass = defineVehicle({
  id: 'gclass', name: 'Mercedes-Benz G-Class', tagline: 'V8 · to\'liq yuritma · 9G-Tronic', category: 'B',
  body: 'gclass', colors: ['#111316', '#E9EDF3', '#4B5A3A', '#6E7886'],
  length: 4.87, width: 1.98, height: 1.97, wheelBase: 2.89, frontOverhang: 0.95, wheelRadius: 0.4, wheelWidth: 0.28,
  mass: 2560, maxSpeed: 220, acceleration: 4.5, enginePower: 430, drivetrain: 'AWD',
  gearRatios: [5.35, 3.24, 2.25, 1.64, 1.21, 1.0, 0.86, 0.72, 0.6], finalDrive: 3.27,
  engine: { idleRpm: 700, redlineRpm: 6000, peakTorqueRpm: 3500 },
  driverEye: [0.42, 1.5, 0.45], drag: 0.5, soundCharacter: 'v8',
})
