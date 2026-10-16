import { DEFAULT_NODES, makeWheels, type BodyKind, type Drivetrain, type EngineConfig, type SuspensionConfig, type V3, type VehicleConfig } from './VehicleConfig'

/** Qisqa tavsifdan to'liq VehicleConfig yasaydi (ma'qul standart qiymatlar bilan). */
export interface VehicleSpec {
  id: string
  name: string
  tagline: string
  category?: VehicleConfig['category']
  free?: boolean
  body: BodyKind
  colors: string[]
  length: number
  width: number
  height: number
  wheelBase: number
  frontOverhang: number // oldingi o'qdan bamperga
  wheelRadius: number
  wheelWidth?: number
  mass: number
  maxSpeed: number
  reverseSpeed?: number
  acceleration: number
  enginePower: number
  steeringAngle?: number
  drivetrain: Drivetrain
  gearRatios: number[]
  finalDrive: number
  engine: EngineConfig
  suspension?: Partial<SuspensionConfig>
  comY?: number
  drag?: number
  area?: number
  driverEye: V3 // kuzov (yer) koordinatasida
  hoodCam?: V3
  soundCharacter?: VehicleConfig['sound']['character']
  soundFile?: string
  nodes?: Partial<VehicleConfig['nodes']>
  modelScale?: number
  modelYaw?: number
  hiModel?: boolean
  paintMaterial?: string // GLB ichidagi kuzov bo'yog'i materiali nomi (rang tanlash shuni bo'yaydi)
}

export function defineVehicle(s: VehicleSpec): VehicleConfig {
  const track = s.width - 0.2 - (s.wheelWidth ?? 0.22)
  const rest = Math.max(0.28, s.wheelRadius * 0.85)
  const susp: SuspensionConfig = { restLength: rest, maxTravel: rest * 0.8, stiffness: 28 + s.mass / 220, compression: 4.4, relaxation: 5.2, maxForce: s.mass * 22, ...s.suspension }
  // model koordinatasi: yer markazi (o'qlar o'rtasida). Old o'q = +wheelBase/2.
  const front = s.wheelBase / 2 + s.frontOverhang // old bamper z (model koordinatasida)
  const bias = 0
  const wheels = makeWheels(s.wheelBase, track, s.wheelRadius, bias, s.drivetrain, susp.restLength)
  const eye = s.driverEye
  return {
    id: s.id,
    name: s.name,
    category: s.category ?? 'B',
    free: s.free,
    tagline: s.tagline,
    modelPath: `models/vehicles/${s.id}/${s.id}.glb`,
    modelPathHi: s.hiModel ? `models/vehicles/${s.id}/${s.id}.hi.glb` : undefined,
    modelScale: s.modelScale ?? 1,
    modelOffset: [0, 0, 0],
    modelYaw: s.modelYaw ?? 0,
    paintMaterial: s.paintMaterial,
    nodes: { ...DEFAULT_NODES, ...(s.nodes ?? {}) },
    body: s.body,
    colors: s.colors,
    dimensions: { length: s.length, width: s.width, height: s.height },
    mass: s.mass,
    centerOfMass: [0, s.comY ?? -0.3, 0.05],
    maxSpeed: s.maxSpeed,
    reverseSpeed: s.reverseSpeed ?? 22,
    acceleration: s.acceleration,
    enginePower: s.enginePower,
    brakingForce: s.mass * 9.81 * 0.95,
    steeringAngle: s.steeringAngle ?? 34,
    wheelBase: s.wheelBase,
    frontOverhang: s.frontOverhang,
    wheelRadius: s.wheelRadius,
    wheelWidth: s.wheelWidth ?? 0.22,
    wheels,
    drivetrain: s.drivetrain,
    gearRatios: s.gearRatios,
    finalDrive: s.finalDrive,
    engine: s.engine,
    suspension: susp,
    dragCoefficient: s.drag ?? 0.32,
    frontalArea: s.area ?? s.width * s.height * 0.8,
    cameras: {
      chase: { distance: 6.4 + s.length * 0.35, height: 2.5 + s.height * 0.5, lookAhead: 4 },
      close: { distance: 4.2 + s.length * 0.25, height: 1.7 + s.height * 0.4, lookAhead: 3 },
      driver: eye,
      hood: s.hoodCam ?? [0, s.height * 0.62, front - 1.3],
    },
    headlightPos: [[s.width / 2 - 0.35, 0.7, front - 0.05], [-(s.width / 2 - 0.35), 0.7, front - 0.05]],
    sound: { idle: 55, max: 210, pitch: 1, character: s.soundCharacter ?? 'petrol', file: s.soundFile },
  }
}


