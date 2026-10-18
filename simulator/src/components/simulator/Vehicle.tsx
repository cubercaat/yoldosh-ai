import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Group, Object3D, Quaternion, SpotLight, Vector3 } from 'three'
import { SmokeSystem } from '../../systems/Smoke'
import { VehicleController } from '../../vehicles/VehicleController'
import type { VehicleConfig } from '../../vehicles/VehicleConfig'
import { VehicleModel, modelTransform } from './VehicleModel'
import type { VehicleVisual } from '../../utils/vehicleUtils'
import { input } from '../../systems/InputSystem'
import { live, useSimStore, type Telemetry } from '../../store/simulatorStore'
import { reportCollision } from '../../physics/CollisionSystem'
import { audio } from '../../systems/AudioSystem'
import { nearestRespawn, getStart, surfaceAt } from '../../world/layout'
import { DestinationSystem } from '../../systems/DestinationSystem'
import { RulesMonitor } from '../../systems/RulesMonitor'
import { AutodromRules, resetCones } from '../../systems/AutodromRules'
import { aw } from '../../world/activeWorld'
import { colliderTags } from '../../world/procedural/WorldChunkManager'
import { onCollision } from '../../systems/driveEvents'
import { handles } from './handles'
import { sunState } from '../../systems/DayNightSystem'

/** Shassi va fizika: kuzov (collider), osma+g'ildirak (VehicleController), vizual model. */
export function Vehicle({ cfg, color, plate }: { cfg: VehicleConfig; color: string; plate: string }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const modelGroup = useRef<Group>(null)
  const visualRef = useRef<VehicleVisual | null>(null)
  const ctrl = useRef<VehicleController | null>(null)
  const spotL = useRef<SpotLight>(null)
  const spotR = useRef<SpotLight>(null)
  const targetL = useMemo(() => new Object3D(), [])
  const targetR = useMemo(() => new Object3D(), [])
  const { world, rapier } = useRapier()
  const cps = useMemo(() => new DestinationSystem(), [])
  const rules = useMemo(() => (aw.kind === 'autodrom' ? new AutodromRules() : new RulesMonitor()), [])
  const prevV = useRef<[number, number] | null>(null)
  const START = useMemo(() => getStart(), [])
  const flipT = useRef(0)
  const pumpT = useRef(0)
  const stuckHint = useRef(0)
  const smoke = useMemo(() => new SmokeSystem(), [])
  const smokeAcc = useRef(0)
  const driftHint = useRef(false)
  const qTmp = useMemo(() => new Quaternion(), [])
  const wp = useMemo(() => new Vector3(), [])
  useEffect(() => () => smoke.dispose(), [smoke])

  const R = cfg.wheelRadius, rideH = R + cfg.suspension.restLength * 0.9
  const L = cfg.dimensions.length, W = cfg.dimensions.width, H = cfg.dimensions.height
  const ovR = L - cfg.wheelBase - cfg.frontOverhang, bodyZ = (cfg.frontOverhang - ovR) / 2
  // kuzov collider'lari (shassi koordinatasida; yer = -rideH)
  const lowBottom = 0.34, lowTop = Math.min(1.0, H * 0.5)
  const low = { y: (lowBottom + lowTop) / 2 - rideH, hy: (lowTop - lowBottom) / 2 }
  const cabTop = H - 0.06
  const cab = { y: (lowTop + cabTop) / 2 - rideH, hy: (cabTop - lowTop) / 2 }
  const isTruck = cfg.body === 'boxtruck'
  const start0 = getStart()
  const startPos: [number, number, number] = [start0.x, rideH + 0.5, start0.z]
  const startRot: [number, number, number] = [0, start0.yaw, 0]

  const setMass = useCallback((b: RapierRigidBody) => {
    const m = cfg.mass, [cx, cy, cz] = cfg.centerOfMass
    const Ix = (m / 12) * (H * H + L * L) * 0.9, Iy = (m / 12) * (W * W + L * L) * 0.9, Iz = (m / 12) * (W * W + H * H) * 0.9
    b.setAdditionalMassProperties(m, { x: cx, y: cy, z: cz }, { x: Ix, y: Iy, z: Iz }, { x: 0, y: 0, z: 0, w: 1 }, true)
  }, [cfg, H, L, W])

  const doReset = useCallback((b: RapierRigidBody, hard: boolean) => {
    const t = b.translation()
    const rp = hard ? START : nearestRespawn(t.x, t.z, live.yaw)
    b.setTranslation({ x: rp.x, y: rideH + 0.5, z: rp.z }, true)
    b.setRotation({ x: 0, y: Math.sin(rp.yaw / 2), z: 0, w: Math.cos(rp.yaw / 2) }, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    ctrl.current?.reset(true)
    if (hard) resetCones()
    flipT.current = 0; live.resetCounter++
    useSimStore.getState().pushToast('Mashina yo\'lga qaytarildi (R)', 'info')
  }, [rideH, START])

  /* ---------- fizika (qat'iy qadam) ---------- */
  useBeforePhysicsStep((w) => {
    const b = bodyRef.current
    if (!b) return
    if (!ctrl.current) {
      setMass(b)
      ctrl.current = new VehicleController(w, b, cfg)
      handles.chassis = b
      handles.controller = ctrl.current
    }
    if (live.resetRequested) { live.resetRequested = false; doReset(b, false) }
    const dt = w.timestep
    ctrl.current.step(dt, input)
    // dumalab ketish / yiqilish nazorati
    const s = ctrl.current.snap
    if (s.upDot < 0.25) { flipT.current += dt; if (flipT.current > 2.2 && stuckHint.current <= 0) { useSimStore.getState().pushToast('Mashina ag\'darildi: R tugmasini bosing', 'warn'); stuckHint.current = 6 } } else flipT.current = 0
    if (stuckHint.current > 0) stuckHint.current -= dt
    const p = b.translation()
    if (p.y < -25) doReset(b, false)
    // to'qnashuvni aniqlash: oldingi qadamdan keyin gorizontal tezlik keskin o'zgargan bo'lsa (dvigatel/tormoz bunday sakrash bermaydi)
    const lv = b.linvel(), pv = prevV.current
    if (pv) {
      const dv = Math.hypot(lv.x - pv[0], lv.z - pv[1]), before = Math.hypot(pv[0], pv[1])
      if (dv > 1.6 && before > 2) {
        let name = ''
        try { const col = b.collider(0); w.contactPairsWith(col, (o: { handle: number }) => { const tg = colliderTags.get(o.handle); if (tg && !name) name = tg }) } catch { /* contactPairsWith mavjud emas */ }
        const ev = reportCollision(before, name || 'to\'siq', (sv) => audio.hit(sv))
        if (ev) onCollision({ strength: ev.strength, other: ev.other })
      }
    }
    // keyingi qadam uchun: dvigatel/tormoz impulslari ctrl.step ichida qo'llanib bo'lgan
    const lv2 = b.linvel(); prevV.current = [lv2.x, lv2.z]
  })

  /* ---------- kadr: vizual, HUD, audio ---------- */
  const tmpV = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const c = ctrl.current, b = bodyRef.current
    if (!c || !b) return
    const s = c.snap, st = useSimStore.getState(), sun = sunState(st.timeOfDay)
    const lightsOn = st.autoHeadlights ? sun.night > 0.45 : st.headlights
    visualRef.current?.apply(c.phys.wheels, s.steerNorm, s.brake > 0.1 || (s.gearMode === 'P' && false), lightsOn, sun.night)
    live.position = [b.translation().x, b.translation().y, b.translation().z]
    live.forward = s.fwd; live.yaw = Math.atan2(s.fwd[0], s.fwd[2]); live.speedMs = s.speed; live.rpm = s.rpm; live.throttle = s.throttle; live.brake = s.brake; live.grounded = s.grounded; live.night = sun.night
    live.engineLoad = s.throttle
    // faralar
    const I = lightsOn ? 38 : 0
    for (const sp of [spotL.current, spotR.current]) if (sp) sp.intensity = I
    audio.update(dt, true)
    // drift / burnout tutuni: orqa g'ildiraklardan
    const rearSlide = s.grounded >= 3 && (s.drift > 0.3 || (Math.abs(s.slip) > 0.3 && s.driftOn)) && (s.throttle > 0.2 || Math.abs(s.slip) > 0.35) && (s.kmh > 5 || s.burnout)
    if (rearSlide) {
      smokeAcc.current += dt * (s.burnout ? 90 : 60) * Math.min(1, 0.4 + s.kmh / 60)
      const r = b.rotation(), bp = b.translation(), lv = b.linvel(); qTmp.set(r.x, r.y, r.z, r.w)
      while (smokeAcc.current >= 1) {
        smokeAcc.current -= 1
        const side = Math.random() < 0.5 ? 1 : -1, wRL = cfg.wheels[side > 0 ? 'RL' : 'RR'].position
        wp.set(wRL[0], -rideH + 0.05, wRL[2]).applyQuaternion(qTmp)
        smoke.emit(bp.x + wp.x, bp.y + wp.y, bp.z + wp.z, lv.x, lv.z, Math.min(1, 0.5 + s.drift * 0.5))
      }
    }
    smoke.update(dt)
    if (s.driftOn && !driftHint.current) { driftHint.current = true; try { if (!localStorage.getItem('yoldosh_drift_hint')) { localStorage.setItem('yoldosh_drift_hint', '1'); st.pushToast('DRIFT! Gaz + qo\'l tormoz (Space), rulni sirpanishga qarshi buring', 'good') } } catch { /* e'tiborsiz */ } }
    // HUD (≈15 Hz)
    pumpT.current += dt
    if (pumpT.current > 0.066) {
      pumpT.current = 0
      const wl = c.phys.wheels, pos = b.translation()
      const surf = s.grounded === 0 ? 'air' : wl.find((w) => w.contact)?.surface ?? surfaceAt(pos.x, pos.z)
      const tel: Telemetry = { kmh: Math.round(s.kmh), rpm: Math.round(s.rpm), rpmNorm: s.rpmNorm, gearMode: s.gearMode, gear: s.gear, throttle: s.throttle, brake: s.brake, handbrake: s.handbrake, steer: s.steerNorm, contacts: [wl[0].contact, wl[1].contact, wl[2].contact, wl[3].contact], grounded: s.grounded, surface: surf as Telemetry['surface'] }
      const patch: Partial<ReturnType<typeof useSimStore.getState>> = { telemetry: tel, distance: st.distance + Math.abs(s.speed) * 0.066, driftScore: Math.round(s.driftScore), driftOn: s.driftOn, driftBest: Math.round(c.driftBest) }
      if (st.debug) {
        const r = b.rotation(), lv = b.linvel()
        patch.debugInfo = { fps: Math.round(1 / Math.max(dt, 1e-4)), physicsStep: world.timestep, velocity: [lv.x, lv.y, lv.z], position: [pos.x, pos.y, pos.z], rotation: [r.x, r.y, r.z] }
      }
      useSimStore.setState(patch)
      if (aw.kind !== 'autodrom') cps.update(pos.x, pos.z, Math.abs(s.speed))
      rules.update(pos.x, pos.z, s.speed, s.fwd[0], s.fwd[2], 0.066); live.limit = rules.limit
    }
    // faralar yo'nalishi
    tmpV.set(0, 0, 1)
  })

  useEffect(() => { handles.checkpoints = cps; if (aw.kind !== 'autodrom') cps.start(startPos[0], startPos[2]); else useSimStore.getState().patch({ objective: "Avtodrom: mashqlardan o'ting, konusga tegmang, maysaga chiqmang", checkpointTotal: 0, checkpointIndex: 0 }); handles.vehicleObject = modelGroup.current; return () => { handles.vehicleObject = null; handles.chassis = null; handles.controller = null; handles.visual = null; ctrl.current = null } }, [cps])
  useEffect(() => { void rapier }, [rapier])

  const onVisual = useCallback((v: VehicleVisual | null) => { visualRef.current = v; handles.visual = v }, [])
  const mt = modelTransform(cfg)
  const hl = cfg.headlightPos

  return (
    <>
    <primitive object={smoke.points} />
    <RigidBody
      ref={bodyRef} name="player-vehicle" position={startPos} rotation={startRot} colliders={false} canSleep={false} ccd
      linearDamping={0.01} angularDamping={0.35} friction={0.3} restitution={0.05}
      onCollisionEnter={(p) => { reportCollision(ctrl.current?.snap.speed ?? 0, p.other.rigidBodyObject?.name || p.other.colliderObject?.name, (s) => audio.hit(s)) }}
    >
      <CuboidCollider args={[W / 2 - 0.06, low.hy, L / 2 - 0.05]} position={[0, low.y, bodyZ]} mass={0} friction={0.25} />
      <CuboidCollider args={[(W / 2 - 0.12) * (isTruck ? 1 : 0.88), cab.hy, (L / 2) * (isTruck ? 0.95 : 0.52)]} position={[0, cab.y, bodyZ - (isTruck ? 0 : 0.1)]} mass={0} friction={0.2} />
      <group ref={modelGroup} position={[0, -rideH, 0]}>
        <group scale={mt.scale} position={mt.position} rotation={[0, mt.rotationY, 0]}>
          <VehicleModel cfg={cfg} color={color} plate={plate} onVisual={onVisual} />
        </group>
        {hl.map((p, i) => (
          <group key={i} position={[p[0], p[1], p[2]]}>
            <spotLight ref={i === 0 ? spotL : spotR} angle={0.55} penumbra={0.6} distance={55} decay={1.6} intensity={0} color="#fff3d2" target={i === 0 ? targetL : targetR} />
            <primitive object={i === 0 ? targetL : targetR} position={[0, -0.6, 22]} />
          </group>
        ))}
      </group>
    </RigidBody>
    </>
  )
}




