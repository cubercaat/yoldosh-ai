import { defineVehicle } from './defineVehicle'

/** Brabus G900 Rocket Edition (Mercedes-Benz G-Class) — V12 biturbo, 900 ot kuchi, to'liq yuritma. Haqiqiy 3D model (osma/dvigatel olib tashlangan). */
export const gclass = defineVehicle({
  id: 'gclass', name: 'Brabus G900 (Gelik)', tagline: 'V12 · 900 ot kuchi · to\'liq yuritma · Rocket Edition', category: 'B',
  body: 'gclass', colors: ['#6A7378', '#111316', '#E9EDF3', '#4B5A3A', '#8E1B1B'], paintMaterial: 'Car_paint',
  length: 4.47, width: 2.16, height: 1.98, wheelBase: 2.79, frontOverhang: 0.88, wheelRadius: 0.4, wheelWidth: 0.34,
  mass: 2800, maxSpeed: 250, acceleration: 3.5, enginePower: 662, drivetrain: 'AWD',
  gearRatios: [5.35, 3.24, 2.25, 1.64, 1.21, 1.0, 0.86, 0.72, 0.6], finalDrive: 3.27,
  engine: { idleRpm: 700, redlineRpm: 6000, peakTorqueRpm: 3500 },
  driverEye: [0.4, 1.42, -0.05], drag: 0.5, soundCharacter: 'v8', suspension: { stiffness: 46 },
})
