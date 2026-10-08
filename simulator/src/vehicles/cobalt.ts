import { defineVehicle } from './defineVehicle'

/** Chevrolet Cobalt — bepul, boshlang'ich mashina. Reference rasm: oq sedan. */
export const cobalt = defineVehicle({
  id: 'cobalt', name: 'Chevrolet Cobalt', tagline: 'Sedan · 1.5L · old yuritma', free: true, category: 'B',
  body: 'sedan', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B'],
  length: 4.48, width: 1.75, height: 1.5, wheelBase: 2.62, frontOverhang: 0.88, wheelRadius: 0.31,
  mass: 1100, maxSpeed: 175, acceleration: 12.5, enginePower: 78, drivetrain: 'FWD',
  gearRatios: [3.62, 1.95, 1.28, 0.97, 0.78], finalDrive: 4.0,
  engine: { idleRpm: 800, redlineRpm: 6200, peakTorqueRpm: 4000 },
  driverEye: [0.36, 1.2, 0.05], soundCharacter: 'petrol',
})
