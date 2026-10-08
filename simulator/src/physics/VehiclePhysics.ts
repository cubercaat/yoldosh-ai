import type { DynamicRayCastVehicleController, RigidBody, World } from '@dimforge/rapier3d-compat'
import type { VehicleConfig } from '../vehicles/VehicleConfig'
import { advanceSpin, frictionFor, makeWheelStates, surfaceUnder, type WheelState } from './WheelPhysics'

/**
 * VehiclePhysics — Rapier DynamicRayCastVehicleController ustida yupqa qatlam.
 * Mashinani fizika harakatlantiradi (suspension, g'ildirak-yer aloqasi, yon ishqalanish, dvigatel/tormoz kuchi).
 * Pozitsiyani har kadrda qo'lda o'zgartirmaymiz.
 */
export interface WheelControls { engine: number[]; brake: number[]; steer: number[] }

export class VehiclePhysics {
  readonly controller: DynamicRayCastVehicleController
  readonly wheels: WheelState[]
  constructor(readonly world: World, readonly chassis: RigidBody, readonly cfg: VehicleConfig) {
    this.controller = world.createVehicleController(chassis)
    this.wheels = makeWheelStates(cfg)
    const s = cfg.suspension
    ;(['FL', 'FR', 'RL', 'RR'] as const).forEach((k, i) => {
      const [x, y, z] = cfg.wheels[k].position
      this.controller.addWheel({ x, y, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, s.restLength, cfg.wheelRadius)
      this.controller.setWheelSuspensionStiffness(i, s.stiffness)
      this.controller.setWheelMaxSuspensionTravel(i, s.maxTravel)
      this.controller.setWheelSuspensionCompression(i, s.compression)
      this.controller.setWheelSuspensionRelaxation(i, s.relaxation)
      this.controller.setWheelMaxSuspensionForce(i, s.maxForce)
      this.controller.setWheelFrictionSlip(i, 11)
      this.controller.setWheelSideFrictionStiffness(i, 1)
    })
  }

  /** oldinga tezlik (m/s, belgili) */
  forwardSpeed(): number { return this.controller.currentVehicleSpeed() }

  /** Boshqaruvlarni qo'llab, bitta qadamni hisoblaydi. dt — qat'iy fizika qadami. */
  step(dt: number, c: WheelControls, handbrake: boolean) {
    const ctl = this.controller, v = this.forwardSpeed()
    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i]
      // sirt ishqalanishi: g'ildirak yerga tegayotgan nuqta bo'yicha
      const cp = ctl.wheelContactPoint(i)
      const inContact = ctl.wheelIsInContact(i)
      w.contact = inContact
      w.surface = inContact && cp ? surfaceUnder(cp.x, cp.z) : 'air'
      w.friction = frictionFor(w.surface, i >= 2, handbrake)
      ctl.setWheelFrictionSlip(i, w.friction)
      ctl.setWheelEngineForce(i, c.engine[i])
      ctl.setWheelBrake(i, c.brake[i])
      ctl.setWheelSteering(i, c.steer[i])
    }
    ctl.updateVehicle(dt)
    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i]
      w.steer = c.steer[i]
      w.suspensionLength = ctl.wheelSuspensionLength(i) ?? w.suspensionLength
      w.load = ctl.wheelSuspensionForce(i) ?? 0
      advanceSpin(w, v, this.cfg.wheelRadius, dt)
    }
  }
}
