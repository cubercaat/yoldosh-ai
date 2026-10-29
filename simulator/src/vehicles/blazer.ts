import { defineVehicle } from './defineVehicle'

/** Chevrolet K5 Blazer 1978 — haqiqiy 3D model (CC BY, Sketchfab; mualliflar yoldosh/sim/models/vehicles/blazer/CREDITS.txt da). */
export const blazer = defineVehicle({
  id: 'blazer', name: 'Chevrolet K5 Blazer 1978', tagline: "SUV · 5.7L V8 · to'liq yuritma · 3D: K5 Blazer Cheyenne (Sketchfab)", category: 'B',
  body: 'suv', colors: ['#C0A060', '#15171C', '#8E1B1B', '#2E5A3A'], paintMaterial: 'CarPaint',
  length: 4.6, width: 2.1, height: 1.9, wheelBase: 2.78, frontOverhang: 0.77, wheelRadius: 0.422, wheelWidth: 0.234,
  mass: 1900, maxSpeed: 170, acceleration: 9.5, enginePower: 120, drivetrain: 'AWD',
  gearRatios: [2.52, 1.52, 1.0, 0.7], finalDrive: 3.73,
  engine: { idleRpm: 700, redlineRpm: 5000, peakTorqueRpm: 2800 },
  driverEye: [0.38, 1.5, 0.05], soundCharacter: 'petrol',
})
