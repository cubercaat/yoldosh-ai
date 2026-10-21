import { defineVehicle } from './defineVehicle'

/** Daewoo Nexia 2 — O'zbekistonning mashhur sedani. Haqiqiy 3D model: Q.SARDOR (CC BY 4.0, Sketchfab). */
export const nexia = defineVehicle({
  id: 'nexia', name: 'Daewoo Nexia', tagline: 'Sedan · 1.5L · old yuritma · 3D: Q.SARDOR (CC BY)', category: 'B',
  body: 'sedan', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B', '#2B3A55'], paintMaterial: 'primary',
  length: 4.48, width: 1.8, height: 1.54, wheelBase: 2.48, frontOverhang: 0.93, wheelRadius: 0.301, wheelWidth: 0.183,
  mass: 1020, maxSpeed: 165, acceleration: 13, enginePower: 59, drivetrain: 'FWD',
  gearRatios: [3.73, 2.05, 1.32, 0.95, 0.76], finalDrive: 4.06,
  engine: { idleRpm: 800, redlineRpm: 6000, peakTorqueRpm: 3400 },
  driverEye: [0.3, 1.2, 0.02], soundCharacter: 'petrol',
})
