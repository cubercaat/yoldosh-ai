import { defineVehicle } from './defineVehicle'

/** Isuzu NMR — furgon (yopiq kuzovli yuk mashinasi), C toifasi. */
export const isuzu = defineVehicle({
  id: 'isuzu', name: 'Isuzu NMR (yuk, C)', tagline: 'Dizel · furgon · orqa yuritma', category: 'C',
  body: 'boxtruck', colors: ['#F2F4F8', '#1B3F8F', '#F2C400', '#C62828'],
  length: 6.9, width: 2.2, height: 3.2, wheelBase: 3.4, frontOverhang: 1.1, wheelRadius: 0.38, wheelWidth: 0.26,
  mass: 3500, maxSpeed: 110, acceleration: 25, enginePower: 110, drivetrain: 'RWD',
  gearRatios: [5.8, 3.4, 2.0, 1.35, 1.0, 0.78], finalDrive: 4.1,
  engine: { idleRpm: 750, redlineRpm: 3800, peakTorqueRpm: 2000 },
  driverEye: [0.42, 2.05, 2.0], steeringAngle: 38, drag: 0.6, comY: -0.1, soundCharacter: 'diesel',
})
