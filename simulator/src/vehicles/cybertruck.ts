import { defineVehicle } from './defineVehicle'

/** Tesla Cybertruck — elektr, to'liq yuritma, burchakli kuzov. */
export const cybertruck = defineVehicle({
  id: 'cybertruck', name: 'Tesla Cybertruck', tagline: 'Elektr · 3 motor · to\'liq yuritma', category: 'B',
  body: 'cybertruck', colors: ['#B5BBC3', '#1B1D21'],
  length: 5.68, width: 2.03, height: 1.96, wheelBase: 3.8, frontOverhang: 0.95, wheelRadius: 0.42, wheelWidth: 0.3,
  mass: 3100, maxSpeed: 180, acceleration: 4.1, enginePower: 630, drivetrain: 'AWD',
  gearRatios: [9.0], finalDrive: 1.0,
  engine: { idleRpm: 0, redlineRpm: 16000, peakTorqueRpm: 6000, electric: true },
  driverEye: [0.4, 1.5, 0.35], drag: 0.34, steeringAngle: 32, soundCharacter: 'electric',
})
