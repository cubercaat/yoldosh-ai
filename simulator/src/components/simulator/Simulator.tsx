import { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import { useSimStore } from '../../store/simulatorStore'
import { getVehicle } from '../../vehicles/vehicleRegistry'
import { World } from './World'
import { Vehicle } from './Vehicle'
import { Cockpit } from './Cockpit'
import { SkidMarks } from './SkidMarks'
import { CameraSystem } from './CameraSystem'
import { VehicleHUD } from './VehicleHUD'
import { TouchControls } from './TouchControls'
import { audio } from '../../systems/AudioSystem'
import { ExamHUD } from './ExamHUD'
import { aw } from '../../world/activeWorld'
import { useSeconds, type Access } from '../../utils/access'
import { useWallet } from '../../systems/WalletSystem'
import { WalletHUD } from './WalletHUD'

/** O'yin sahnasi: Canvas -> Physics (Rapier, qat'iy 1/60 qadam) -> World + Vehicle; kamera, HUD alohida. */
export function Simulator({ access, onExit }: { access: Access; onExit: () => void }) {
  const id = useSimStore((s) => s.vehicleId)
  const ci = useSimStore((s) => s.colorIndex)
  const colliders = useSimStore((s) => s.showColliders)
  const status = useSimStore((s) => s.loadStatus)
  const cfg = getVehicle(id)
  const color = cfg.colors[ci] ?? cfg.colors[0]

  // dvigatel ovozi (foydalanuvchi bosgan "DRIVE" dan keyin boshlanadi)
  useEffect(() => { void audio.start(cfg); return () => audio.dispose() }, [cfg])

  // hamyon: bepul tarifda shahar vaqti serverda yechiladi (har 10 s da heartbeat)
  useEffect(() => {
    const w0 = useWallet.getState()
    if (!w0.connected) return
    let acc = 0
    const t = setInterval(() => {
      if (document.hidden) return
      const w = useWallet.getState()
      if (w.unlimited) return
      w.tickLocal(); acc += 1
      if (acc >= 10) { acc = 0; void w.heartbeat(10) }
      if (useWallet.getState().playSec <= 0) { useSimStore.getState().pushToast("Shahar vaqti tugadi — saytda test yeching", 'bad'); setTimeout(onExit, 900) }
    }, 1000)
    return () => { clearInterval(t); if (acc > 0) void useWallet.getState().heartbeat(acc) }
  }, [onExit])

  // bepul vaqt hisobi (eski tarif — faqat hamyon ulanmaganda)
  useEffect(() => {
    if (useWallet.getState().connected) { useSimStore.getState().patch({ freeSecondsLeft: null }); return }
    if (access.limit(id) === Infinity) { useSimStore.getState().patch({ freeSecondsLeft: null }); return }
    let left = access.left(id)
    useSimStore.getState().patch({ freeSecondsLeft: left })
    const t = setInterval(() => {
      if (document.hidden) return
      left = Math.max(0, left - 1); useSeconds(id, 1)
      useSimStore.getState().patch({ freeSecondsLeft: left })
      if (left <= 0) { useSimStore.getState().pushToast('Bugungi vaqt tugadi', 'bad'); setTimeout(onExit, 900) }
    }, 1000)
    return () => clearInterval(t)
  }, [access, onExit, id])

  const gl = useMemo(() => ({ antialias: true, powerPreference: 'high-performance' as const }), [])
  return (
    <div className="sim">
      <Canvas shadows={{ type: PCFSoftShadowMap }} dpr={[1, 1.75]} camera={{ fov: 60, near: 0.25, far: 1800, position: [0, 6, -140] }} gl={gl}
        onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; gl.outputColorSpace = SRGBColorSpace }}>
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} debug={colliders} interpolate>
            <World />
            <Vehicle key={id + color} cfg={cfg} color={color} plate={access.plate} />
            <CameraSystem />
            <Cockpit />
            <SkidMarks />
          </Physics>
        </Suspense>
      </Canvas>
      <VehicleHUD />
      <WalletHUD onBroke={onExit} />
      {aw.kind === 'exam' && <ExamHUD onExit={onExit} />}
      <TouchControls />
      {status !== 'ready' && <div className="loading"><div className="spin" /><b>Yuklanmoqda…</b><small>{cfg.name}</small></div>}
      <button className="exit glass" onClick={onExit}>← Tanlash</button>
    </div>
  )
}


