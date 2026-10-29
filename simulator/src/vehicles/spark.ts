import { defineVehicle } from './defineVehicle'

/** Chevrolet Spark — haqiqiy 3D model (CC BY, Sketchfab; mualliflar yoldosh/sim/models/vehicles/spark/CREDITS.txt da). */
export const spark = defineVehicle({
  id: 'spark', name: 'Chevrolet Spark', tagline: "Hetchbek · 1.2L · old yuritma · 3D: Chevrolet Spark/Beat (Sketchfab)", category: 'B',
  body: 'hatch', colors: ['#B9BEC6', '#E9EDF3', '#F2C400', '#C62828'], paintMaterial: 'Chevrolet_Beat_2010_carpaint',
  length: 3.64, width: 1.81, height: 1.52, wheelBase: 2.46, frontOverhang: 0.75, wheelRadius: 0.286, wheelWidth: 0.18,
  mass: 950, maxSpeed: 160, acceleration: 13, enginePower: 60, drivetrain: 'FWD',
  gearRatios: [3.55, 2.0, 1.3, 0.97, 0.78], finalDrive: 4.1,
  engine: { idleRpm: 850, redlineRpm: 6200, peakTorqueRpm: 3800 },
  driverEye: [0.28, 1.15, 0.04], soundCharacter: 'petrol',
})
