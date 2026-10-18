import { defineVehicle } from './defineVehicle'

/** Isuzu Elf — furgon (yopiq kuzovli yuk mashinasi), C toifasi. Haqiqiy 3D model. */
export const isuzu = defineVehicle({
  id: 'isuzu', name: 'Isuzu Elf (yuk, C)', tagline: 'Dizel · furgon · orqa yuritma', category: 'C',
  body: 'boxtruck', colors: ['#F2F4F8', '#1B3F8F', '#F2C400', '#C62828'],
  length: 7.19, width: 2.06, height: 2.81, wheelBase: 3.8, frontOverhang: 1.23, wheelRadius: 0.32, wheelWidth: 0.3,
  mass: 4200, maxSpeed: 110, acceleration: 25, enginePower: 110, drivetrain: 'RWD',
  gearRatios: [5.8, 3.4, 2.0, 1.35, 1.0, 0.78], finalDrive: 4.1,
  engine: { idleRpm: 750, redlineRpm: 3800, peakTorqueRpm: 2000 },
  driverEye: [0.45, 1.72, 1.95], steeringAngle: 38, drag: 0.6, comY: -0.1, soundCharacter: 'diesel',
})
