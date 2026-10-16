import { defineVehicle } from './defineVehicle'

/** Chevrolet Cobalt LTZ — bepul, boshlang'ich mashina. Haqiqiy 3D model: uzb_rx7 (CC BY 4.0, Sketchfab). */
export const cobalt = defineVehicle({
  id: 'cobalt', name: 'Chevrolet Cobalt', tagline: 'Sedan · 1.5L · old yuritma · 3D: uzb_rx7 (CC BY)', free: true, category: 'B',
  body: 'sedan', colors: ['#E9EDF3', '#15171C', '#6E7886', '#8E1B1B'],
  length: 4.45, width: 1.92, height: 1.52, wheelBase: 2.7, frontOverhang: 0.88, wheelRadius: 0.32, wheelWidth: 0.22,
  mass: 1100, maxSpeed: 175, acceleration: 12.5, enginePower: 78, drivetrain: 'FWD',
  gearRatios: [3.62, 1.95, 1.28, 0.97, 0.78], finalDrive: 4.0,
  engine: { idleRpm: 800, redlineRpm: 6200, peakTorqueRpm: 4000 },
  driverEye: [0.3, 1.18, 0.02], soundCharacter: 'petrol', hiModel: true, paintMaterial: 'primary',
})
