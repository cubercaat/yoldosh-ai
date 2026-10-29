import { defineVehicle } from './defineVehicle'

/** Chevrolet Onix — haqiqiy 3D model (CC BY, Sketchfab; mualliflar yoldosh/sim/models/vehicles/onix/CREDITS.txt da). */
export const onix = defineVehicle({
  id: 'onix', name: 'Chevrolet Onix', tagline: "Sedan · 1.0T · old yuritma · 3D: Chevrolet Onix (Sketchfab)", category: 'B',
  body: 'sedan', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B'], paintMaterial: 'primary',
  length: 4.47, width: 1.95, height: 1.46, wheelBase: 2.62, frontOverhang: 0.83, wheelRadius: 0.317, wheelWidth: 0.229,
  mass: 1130, maxSpeed: 190, acceleration: 10.5, enginePower: 85, drivetrain: 'FWD',
  gearRatios: [3.9, 2.2, 1.4, 1.0, 0.82, 0.68], finalDrive: 3.6,
  engine: { idleRpm: 800, redlineRpm: 6000, peakTorqueRpm: 3500 },
  driverEye: [0.3, 1.12, 0.02], soundCharacter: 'petrol',
})
