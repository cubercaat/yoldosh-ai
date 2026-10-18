import { defineVehicle } from './defineVehicle'

/** Lotus E-R9 — elektr gipermobil, 3000+ ot kuchi (2300 kVt), to'liq yuritma. Haqiqiy 3D model; kuzov rangi teksturaga pishirilgan. */
export const lotus = defineVehicle({
  id: 'lotus', name: 'Lotus E-R9', tagline: 'Elektr · 3000+ ot kuchi · to\'liq yuritma', category: 'B',
  body: 'hatch', colors: ['#F2F4F8'],
  length: 4.81, width: 2.32, height: 1.0, wheelBase: 2.89, frontOverhang: 0.95, wheelRadius: 0.36, wheelWidth: 0.1,
  mass: 1500, maxSpeed: 420, reverseSpeed: 30, acceleration: 1.3, enginePower: 2300, drivetrain: 'AWD',
  gearRatios: [1.0], finalDrive: 4.2,
  engine: { idleRpm: 0, redlineRpm: 16000, peakTorqueRpm: 6000, electric: true },
  driverEye: [0.25, 0.8, 0.1], soundCharacter: 'electric', drag: 0.3, steeringAngle: 30, suspension: { stiffness: 50 },
})
