import { defineVehicle } from './defineVehicle'

/** Chevrolet Malibu — katta sedan. Haqiqiy 3D model: twr422 (CC BY 4.0, Sketchfab). */
export const malibu = defineVehicle({
  id: 'malibu', name: 'Chevrolet Malibu', tagline: 'Sedan · 1.5T · old yuritma · 3D: twr422 (CC BY)', category: 'B',
  body: 'sedan', colors: ['#15171C', '#E9EDF3', '#2B3A55', '#8E1B1B'], paintMaterial: 'primary',
  length: 4.93, width: 2.07, height: 1.49, wheelBase: 2.87, frontOverhang: 1.02, wheelRadius: 0.348, wheelWidth: 0.247,
  mass: 1500, maxSpeed: 215, acceleration: 8.9, enginePower: 121, drivetrain: 'FWD',
  gearRatios: [4.58, 2.96, 1.91, 1.45, 1.0, 0.75], finalDrive: 3.0,
  engine: { idleRpm: 750, redlineRpm: 6400, peakTorqueRpm: 3500 },
  driverEye: [0.38, 1.17, 0.0], drag: 0.28,
})
