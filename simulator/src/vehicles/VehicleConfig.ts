/**
 * VehicleConfig — barcha transport vositalari uchun yagona tavsif.
 * Yangi mashina qo'shish: shu turdagi yangi fayl yarating (masalan, vehicles/nexia.ts) va vehicleRegistry.ts ga qo'shing.
 * Fizika, kamera, HUD, ovoz — hammasi shu obyektdan o'qiydi; mashinaga xos kod yo'q.
 *
 * KOORDINATA QOIDASI (GLB ham, placeholder ham shunga amal qiladi):
 *   +Z = oldinga, +Y = yuqoriga, +X = mashinaning CHAP tomoni (haydovchi chapda).
 *   Koordinata boshi = yerdagi proyeksiya, ikki o'q o'rtasida (modelning pastki tekisligi = yer).
 */
export type Drivetrain = 'FWD' | 'RWD' | 'AWD'
export type BodyKind = 'sedan' | 'hatch' | 'suv' | 'cybertruck' | 'gclass' | 'boxtruck'
export type V3 = [number, number, number]

export interface WheelMount {
  /** shassi (kuzov markazi) koordinatasida osma (suspension) mahkamlanish nuqtasi */
  position: V3
  steer: boolean
  driven: boolean
}

export interface SuspensionConfig {
  restLength: number // m
  maxTravel: number // m
  stiffness: number // Rapier (Bullet) birligi, massaga bog'liq emas
  compression: number
  relaxation: number
  maxForce: number // N (g'ildirak boshiga)
}

/** GLB ichidagi tugun (node) nomlari. Hamma model bir xil nomlanmagan bo'lishi mumkin, shuning uchun sozlanadi. */
export interface NodeMapping {
  body: string
  chassis?: string
  interior?: string
  steeringWheel: string
  wheels: { frontLeft: string; frontRight: string; rearLeft: string; rearRight: string }
  headlights: string
  taillights: string
  brakeLights: string
  windows: string
  mirrors: string
}

export interface EngineConfig {
  idleRpm: number
  redlineRpm: number
  peakTorqueRpm: number
  /** elektr motor: rpm kamera dan boshlab, pastda ham kuchli moment */
  electric?: boolean
}

export interface VehicleConfig {
  id: string
  name: string
  category: 'B' | 'C' | 'D' | 'CE'
  free?: boolean // bepul rejimda ochiq
  tagline: string
  /** public/models/vehicles/<id>/<id>.glb  (yo'q bo'lsa — placeholder) */
  modelPath: string
  /** yuqori sifat varianti (ixtiyoriy): <id>.hi.glb. Sifat YUQORI/ULTRA bo'lsa shu ishlatiladi */
  modelPathHi?: string
  /** GLB ni sozlash (masshtab/burilish). Tayyor model metrda, +Z oldinga bo'lsa, hammasi 0/1 bo'lib qoladi. */
  modelScale: number
  modelOffset: V3
  modelYaw: number
  nodes: NodeMapping
  /** placeholder shakli */
  body: BodyKind
  colors: string[]

  dimensions: { length: number; width: number; height: number }
  mass: number // kg
  centerOfMass: V3 // shassi koordinatasida
  maxSpeed: number // km/soat
  reverseSpeed: number // km/soat
  acceleration: number // 0-100 km/soat, soniya (ma'lumot uchun)
  enginePower: number // kVt
  brakingForce: number // N, butun mashina
  steeringAngle: number // maksimal rul burchagi (daraja)
  wheelBase: number
  frontOverhang: number // old o'qdan old bampergacha
  wheelRadius: number
  wheelWidth: number
  wheels: { FL: WheelMount; FR: WheelMount; RL: WheelMount; RR: WheelMount }
  drivetrain: Drivetrain
  gearRatios: number[]
  finalDrive: number
  engine: EngineConfig
  suspension: SuspensionConfig
  dragCoefficient: number
  frontalArea: number

  cameras: {
    chase: { distance: number; height: number; lookAhead: number }
    close: { distance: number; height: number; lookAhead: number }
    driver: V3 // kuzov koordinatasida ko'z nuqtasi
    hood: V3
  }
  headlightPos: V3[] // ikkita
  sound: { idle: number; max: number; pitch: number; file?: string; character: 'petrol' | 'diesel' | 'v8' | 'electric' }
}

export const DEFAULT_NODES: NodeMapping = {
  body: 'Body',
  chassis: 'Chassis',
  interior: 'Interior',
  steeringWheel: 'SteeringWheel',
  wheels: { frontLeft: 'Wheel_FL', frontRight: 'Wheel_FR', rearLeft: 'Wheel_RL', rearRight: 'Wheel_RR' },
  headlights: 'Headlights',
  taillights: 'Taillights',
  brakeLights: 'BrakeLights',
  windows: 'Windows',
  mirrors: 'Mirrors',
}

/** 4 g'ildirak joylashuvi: o'q masofalari va iz kengligidan hosil qilinadi (kuzov markazi — o'qlar orasida) */
export function makeWheels(wheelBase: number, track: number, wheelRadius: number, frontBias: number, drive: Drivetrain, restLength: number, centerY = 0): VehicleConfig['wheels'] {
  const zf = wheelBase / 2 + frontBias, zr = -wheelBase / 2 + frontBias
  const y = centerY // osma mahkamlanish nuqtasi: g'ildirak markazidan restLength yuqorida bo'ladi (controller shuni kutadi)
  const mk = (x: number, z: number, steer: boolean, driven: boolean): WheelMount => ({ position: [x, y, z], steer, driven })
  const fd = drive === 'FWD' || drive === 'AWD', rd = drive === 'RWD' || drive === 'AWD'
  void wheelRadius; void restLength
  return { FL: mk(track / 2, zf, true, fd), FR: mk(-track / 2, zf, true, fd), RL: mk(track / 2, zr, false, rd), RR: mk(-track / 2, zr, false, rd) }
}

export const tripleLights = (z: number, y: number, x: number): V3[] => [[x, y, z], [-x, y, z]]

