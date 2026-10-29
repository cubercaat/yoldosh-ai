import { defineVehicle } from './defineVehicle'

/** Chevrolet Equinox RS — haqiqiy 3D model (CC BY, Sketchfab; mualliflar yoldosh/sim/models/vehicles/equinox/CREDITS.txt da). */
export const equinox = defineVehicle({
  id: 'equinox', name: 'Chevrolet Equinox RS', tagline: "Krossover · 1.5T · to'liq yuritma · 3D: Equinox RS 2022 (Sketchfab)", category: 'B',
  body: 'suv', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B'], paintMaterial: 'plastic-matte_primary',
  length: 4.65, width: 1.95, height: 1.68, wheelBase: 2.76, frontOverhang: 0.93, wheelRadius: 0.383, wheelWidth: 0.236,
  mass: 1560, maxSpeed: 190, acceleration: 10, enginePower: 130, drivetrain: 'AWD',
  gearRatios: [4.5, 2.9, 1.9, 1.4, 1.0, 0.75], finalDrive: 3.2,
  engine: { idleRpm: 750, redlineRpm: 6000, peakTorqueRpm: 3500 },
  driverEye: [0.34, 1.3, 0.05], soundCharacter: 'petrol',
})
