import { defineVehicle } from './defineVehicle'

/** Chevrolet Gentra — haqiqiy 3D model: Aizen_Uchixa (CC BY 4.0, Sketchfab). Kuzov rangi modelning teksturasiga pishirilgan (qora). */
export const sedan = defineVehicle({
  id: 'sedan', name: 'Chevrolet Gentra', tagline: 'Sedan · 1.5L · old yuritma · 3D: Aizen_Uchixa (CC BY)', category: 'B',
  body: 'sedan', colors: ['#15171C'],
  length: 4.5, width: 1.95, height: 1.49, wheelBase: 2.69, frontOverhang: 0.9, wheelRadius: 0.325, wheelWidth: 0.23,
  mass: 1180, maxSpeed: 180, acceleration: 11.8, enginePower: 79, drivetrain: 'FWD',
  gearRatios: [3.54, 1.91, 1.28, 0.97, 0.78], finalDrive: 4.1,
  engine: { idleRpm: 800, redlineRpm: 6300, peakTorqueRpm: 4000 },
  driverEye: [0.36, 1.2, 0.05], hiModel: true,
})
