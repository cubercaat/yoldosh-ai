import { defineVehicle } from './defineVehicle'

/** Chevrolet Malibu — katta sedan, 6 pog'onali avtomat. */
export const malibu = defineVehicle({
  id: 'malibu', name: 'Chevrolet Malibu', tagline: 'Sedan · 1.5T · old yuritma', category: 'B',
  body: 'sedan', colors: ['#15171C', '#E9EDF3', '#2B3A55', '#8E1B1B'],
  length: 4.93, width: 1.86, height: 1.46, wheelBase: 2.83, frontOverhang: 0.95, wheelRadius: 0.33,
  mass: 1500, maxSpeed: 215, acceleration: 8.9, enginePower: 121, drivetrain: 'FWD',
  gearRatios: [4.58, 2.96, 1.91, 1.45, 1.0, 0.75], finalDrive: 3.0,
  engine: { idleRpm: 750, redlineRpm: 6400, peakTorqueRpm: 3500 },
  driverEye: [0.38, 1.17, 0.0], drag: 0.28,
})
