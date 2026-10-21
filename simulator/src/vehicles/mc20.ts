import { defineVehicle } from './defineVehicle'

/** Maserati MC20 — 630 ot kuchi, orqa yuritmali superkar. Haqiqiy 3D model: vecarz (CC BY 4.0, Sketchfab). */
export const mc20 = defineVehicle({
  id: 'mc20', name: 'Maserati MC20', tagline: 'V6 biturbo · 630 ot kuchi · orqa yuritma · 3D: vecarz (CC BY)', category: 'B',
  body: 'sedan', colors: ['#E9EDF3', '#15171C', '#C9A227', '#1F4FA0', '#8E1B1B'], paintMaterial: 'primary',
  length: 4.67, width: 2.19, height: 1.22, wheelBase: 2.71, frontOverhang: 1.12, wheelRadius: 0.353, wheelWidth: 0.31,
  mass: 1500, maxSpeed: 325, acceleration: 2.9, enginePower: 463, drivetrain: 'RWD',
  gearRatios: [3.9, 2.5, 1.8, 1.4, 1.1, 0.9, 0.75, 0.63], finalDrive: 3.55,
  engine: { idleRpm: 900, redlineRpm: 7500, peakTorqueRpm: 3500 },
  driverEye: [0.36, 0.98, 0.0], drag: 0.3, soundCharacter: 'v8', suspension: { stiffness: 42 },
})
