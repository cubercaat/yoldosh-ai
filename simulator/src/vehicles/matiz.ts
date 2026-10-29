import { defineVehicle } from './defineVehicle'

/** Daewoo Matiz — haqiqiy 3D model (CC BY, Sketchfab; mualliflar yoldosh/sim/models/vehicles/matiz/CREDITS.txt da). */
export const matiz = defineVehicle({
  id: 'matiz', name: 'Daewoo Matiz', tagline: "Hetchbek · 0.8L · old yuritma · 3D: Daewoo Matiz (Sketchfab)", category: 'B',
  body: 'hatch', colors: ['#1B3F8F', '#E9EDF3', '#C62828', '#D8C29A'], paintMaterial: 'Car_Paint',
  length: 3.5, width: 1.73, height: 1.5, wheelBase: 2.43, frontOverhang: 0.62, wheelRadius: 0.27, wheelWidth: 0.185,
  mass: 800, maxSpeed: 140, acceleration: 17, enginePower: 38, drivetrain: 'FWD',
  gearRatios: [3.55, 1.96, 1.3, 0.89, 0.71], finalDrive: 4.2,
  engine: { idleRpm: 850, redlineRpm: 6000, peakTorqueRpm: 3600 },
  driverEye: [0.28, 1.12, 0.05], soundCharacter: 'petrol',
})
