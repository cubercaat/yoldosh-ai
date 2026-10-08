import { defineVehicle } from './defineVehicle'

/** Chevrolet sedan (reference rasm: qora Gentra). */
export const sedan = defineVehicle({
  id: 'sedan', name: 'Chevrolet Sedan (Gentra)', tagline: 'Sedan · 1.5L · old yuritma', category: 'B',
  body: 'sedan', colors: ['#15171C', '#E9EDF3', '#9AA3B0', '#6B1B1B'],
  length: 4.5, width: 1.74, height: 1.49, wheelBase: 2.6, frontOverhang: 0.9, wheelRadius: 0.31,
  mass: 1180, maxSpeed: 180, acceleration: 11.8, enginePower: 79, drivetrain: 'FWD',
  gearRatios: [3.54, 1.91, 1.28, 0.97, 0.78], finalDrive: 4.1,
  engine: { idleRpm: 800, redlineRpm: 6300, peakTorqueRpm: 4000 },
  driverEye: [0.36, 1.2, 0.05],
})
