import { defineVehicle } from './defineVehicle'

/** Chevrolet Gentra — haqiqiy 3D model (CC BY, Sketchfab; mualliflar yoldosh/sim/models/vehicles/gentra/CREDITS.txt da). */
export const gentra = defineVehicle({
  id: 'gentra', name: 'Chevrolet Gentra', tagline: "Sedan · 1.5L · old yuritma · 3D: Ravon Gentra 2015 (Sketchfab)", category: 'B',
  body: 'sedan', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B', '#2B3A55'], paintMaterial: 'carpaint',
  length: 4.5, width: 1.93, height: 1.5, wheelBase: 2.64, frontOverhang: 0.92, wheelRadius: 0.307, wheelWidth: 0.205,
  mass: 1150, maxSpeed: 185, acceleration: 11.5, enginePower: 79, drivetrain: 'FWD',
  gearRatios: [3.73, 2.05, 1.32, 0.97, 0.78], finalDrive: 4.06,
  engine: { idleRpm: 800, redlineRpm: 6300, peakTorqueRpm: 4000 },
  driverEye: [0.3, 1.15, 0.02], soundCharacter: 'petrol',
})
