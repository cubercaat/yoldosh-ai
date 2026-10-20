import type { RapierRigidBody } from '@react-three/rapier'
import type { Object3D } from 'three'
import type { VehicleController } from '../../vehicles/VehicleController'
import type { VehicleVisual } from '../../utils/vehicleUtils'
import type { WorldChunkManager } from '../../world/procedural/WorldChunkManager'
import type { DestinationSystem } from '../../systems/DestinationSystem'
import type { ExamRules } from '../../systems/ExamRules'

/** Sahna bo'ylab ulashiladigan "tutqichlar" (React holatiga kirmaydi): kamera/HUD/debug o'qiydi. */
export const handles: {
  chassis: RapierRigidBody | null
  controller: VehicleController | null
  visual: VehicleVisual | null
  checkpoints: DestinationSystem | null
  vehicleObject: Object3D | null
  world: WorldChunkManager | null
  examRules: ExamRules | null
} = { chassis: null, controller: null, visual: null, checkpoints: null, vehicleObject: null, world: null, examRules: null }
