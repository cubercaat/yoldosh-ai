import { defineVehicle } from './defineVehicle'

/** Bugatti Divo — giper-avtomobil (8.0L W16, 4 turbo, to'liq yuritma). Haqiqiy 3D model: Jonrss (CC BY 4.0, Sketchfab). Kuzov rangi teksturaga pishirilgan (qora). */
export const divo = defineVehicle({
  id: 'divo', name: 'Bugatti Divo', tagline: 'Giper-avto · W16 · 3000 ot kuchi · 3D: Jonrss (CC BY)', category: 'B',
  body: 'hatch', colors: ['#15171C'],
  length: 4.5, width: 2.08, height: 1.23, wheelBase: 2.636, frontOverhang: 0.96, wheelRadius: 0.375, wheelWidth: 0.32,
  mass: 1960, maxSpeed: 410, reverseSpeed: 25, acceleration: 1.2, enginePower: 2206, drivetrain: 'AWD',
  gearRatios: [3.15, 2.19, 1.62, 1.25, 0.97, 0.78, 0.63], finalDrive: 3.6,
  engine: { idleRpm: 900, redlineRpm: 6700, peakTorqueRpm: 4200 },
  driverEye: [0.35, 0.98, 0.25], soundCharacter: 'v8', drag: 0.35, steeringAngle: 30, suspension: { stiffness: 52 }, hiModel: true,
})
