import { defineVehicle } from './defineVehicle'

/** Porsche 911 GT3 RS — haqiqiy 3D model (blenderbett, CC BY 4.0, Sketchfab). Orqa yuritma, 7 pog'onali. */
export const porsche = defineVehicle({
  id: 'porsche', name: 'Porsche GT3 RS', tagline: 'Sport · 4.0 · orqa yuritma · 3D: blenderbett (CC BY)', category: 'B',
  body: 'hatch', colors: ['#F2C500', '#E9EDF3', '#15171C', '#8E1B1B'],
  length: 4.57, width: 1.98, height: 1.28, wheelBase: 2.46, frontOverhang: 1.04, wheelRadius: 0.325, wheelWidth: 0.3,
  mass: 1450, maxSpeed: 296, reverseSpeed: 25, acceleration: 3.2, enginePower: 386, drivetrain: 'RWD',
  gearRatios: [3.75, 2.38, 1.72, 1.34, 1.1, 0.96, 0.84], finalDrive: 3.97,
  engine: { idleRpm: 900, redlineRpm: 9000, peakTorqueRpm: 6300 },
  driverEye: [0.36, 1.0, 0.0], soundCharacter: 'petrol', drag: 0.34, steeringAngle: 32,
  suspension: { stiffness: 46 },
})
