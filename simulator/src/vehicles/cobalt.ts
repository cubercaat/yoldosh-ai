import { defineVehicle } from './defineVehicle'

/** Chevrolet Cobalt — haqiqiy 3D model (CC BY, Sketchfab; mualliflar yoldosh/sim/models/vehicles/cobalt/CREDITS.txt da). */
export const cobalt = defineVehicle({
  id: 'cobalt', name: 'Chevrolet Cobalt', tagline: "Sedan · 1.5L · old yuritma · 3D: Cobalt LTZ 2014 (Sketchfab)", free: true, category: 'B',
  body: 'sedan', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B'], paintMaterial: 'Realistic_Car_Paint',
  length: 4.5, width: 1.93, height: 1.5, wheelBase: 2.75, frontOverhang: 0.87, wheelRadius: 0.325, wheelWidth: 0.233,
  mass: 1100, maxSpeed: 175, acceleration: 12.5, enginePower: 78, drivetrain: 'FWD',
  gearRatios: [3.62, 1.95, 1.28, 0.97, 0.78], finalDrive: 4.0,
  engine: { idleRpm: 800, redlineRpm: 6200, peakTorqueRpm: 4000 },
  driverEye: [0.3, 1.16, 0.02], soundCharacter: 'petrol',
})
