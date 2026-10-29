import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Quaternion, Scene, Vector3, WebGLRenderTarget, LinearFilter, RepeatWrapping } from 'three'
import { useSimStore } from '../../store/simulatorStore'
import { getVehicle } from '../../vehicles/vehicleRegistry'
import { handles } from './handles'

/**
 * Salon ko'rinishi (kamera 3): 3D mashina modeli yashiriladi, o'rniga yengil kokpit chiziladi —
 * rul g'ildiragi (rul burchagi bo'yicha aylanadi), ustunlar, tom, panel — va 3 ta ishlaydigan ko'zgu
 * (chap/o'ng yon ko'zgu + salon ko'zgusi): orqaga qaragan kameradan render qilinadi, gorizontal aks ettiriladi.
 */
const DARK = '#15171a', MID = '#23262b'
const MIRRORS = [
  { id: 'L', ox: 0.98, oy: -0.12, oz: 0.55, yaw: 0, w: 0.2, h: 0.11, x: 0.02, y: 0.56, fov: 38 },    // chap (x: chapdan ulush)
  { id: 'R', ox: -0.98, oy: -0.12, oz: 0.55, yaw: 0, w: 0.2, h: 0.11, x: 0.78, y: 0.56, fov: 38 },
  { id: 'C', ox: 0, oy: 0.22, oz: 0.35, yaw: 0, w: 0.22, h: 0.085, x: 0.39, y: 0.035, fov: 46 },
] as const

export function Cockpit() {
  const mode = useSimStore((s) => s.cameraMode)
  const gl = useThree((s) => s.gl), scene = useThree((s) => s.scene)
  const g = useRef<Group>(null), wheel = useRef<Group>(null)
  const targets = useMemo(() => MIRRORS.map(() => { const t = new WebGLRenderTarget(256, 128, { minFilter: LinearFilter, magFilter: LinearFilter }); t.texture.wrapS = RepeatWrapping; t.texture.repeat.x = -1; t.texture.offset.x = 1; return t }), [])
  const rig = useMemo(() => {
    const cam = new PerspectiveCamera(40, 2, 0.3, 700)
    const hud = new Scene(), ocam = new OrthographicCamera(0, 1, 1, 0, -1, 1)
    const quads = MIRRORS.map((_m, i) => {
      const frame = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ color: '#0b0c0e' }))
      const q = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: targets[i].texture, toneMapped: false }))
      q.position.z = 0.01; frame.position.z = 0; hud.add(frame, q); return { frame, q }
    })
    return { cam, hud, ocam, quads }
  }, [targets])
  useEffect(() => () => { targets.forEach((t) => t.dispose()) }, [targets])
  const tmp = useMemo(() => ({ v: new Vector3(), q: new Quaternion(), q2: new Quaternion(), f: new Vector3() }), [])
  const k = useRef(0)

  // BITTA kadr: salon holati -> ko'zgular (render target) -> asosiy sahna -> ko'zgularni ekran ustiga chizish
  useFrame(({ size, camera }) => {
    const obj = handles.vehicleObject, on = mode === 'driver' && !!obj
    if (obj) obj.visible = !on
    const grp = g.current
    if (grp) grp.visible = on
    if (on && obj && grp) {
      obj.updateWorldMatrix(true, false)
      grp.matrixAutoUpdate = false; grp.matrix.copy(obj.matrixWorld); grp.matrixWorldNeedsUpdate = true
      const snap = handles.controller?.snap
      if (wheel.current) wheel.current.rotation.z = (snap ? snap.steerNorm : 0) * 2.5
    }
    const { cam, hud, ocam, quads } = rig
    if (on && obj && grp) {
      const p = getVehicle(useSimStore.getState().vehicleId).cameras.driver
      const i = k.current++ % MIRRORS.length, m = MIRRORS[i]
      tmp.v.set(m.id === 'C' ? p[0] * 0.2 : m.ox, p[1] + m.oy, p[2] + m.oz); obj.localToWorld(tmp.v); cam.position.copy(tmp.v)
      obj.getWorldQuaternion(tmp.q)
      const back = new Vector3(0, 0, -1).applyQuaternion(tmp.q), side = new Vector3(1, 0, 0).applyQuaternion(tmp.q)
      const out = m.id === 'L' ? 0.3 : m.id === 'R' ? -0.3 : 0
      cam.up.set(0, 1, 0)
      cam.lookAt(cam.position.x + back.x + side.x * out, cam.position.y - 0.03, cam.position.z + back.z + side.z * out)
      cam.fov = m.fov; cam.aspect = 2; cam.updateProjectionMatrix()
      grp.visible = false; obj.visible = true
      const old = gl.getRenderTarget()
      gl.setRenderTarget(targets[i]); gl.clear(); gl.render(scene, cam); gl.setRenderTarget(old)
      obj.visible = false; grp.visible = true
    }
    gl.render(scene, camera)
    if (on) {
      const W = size.width, H = size.height
      ocam.left = 0; ocam.right = W; ocam.top = H; ocam.bottom = 0; ocam.updateProjectionMatrix()
      MIRRORS.forEach((mm, j) => {
        const w = mm.w * W, h = Math.min(mm.h * H * 1.6, w * 0.55), x = mm.x * W, y = H - mm.y * H - h
        quads[j].q.scale.set(w, h, 1); quads[j].q.position.set(x + w / 2, y + h / 2, 0.01)
        quads[j].frame.scale.set(w + 6, h + 6, 1); quads[j].frame.position.set(x + w / 2, y + h / 2, 0)
      })
      const ac = gl.autoClear; gl.autoClear = false; gl.clearDepth(); gl.render(hud, ocam); gl.autoClear = ac
    }
  }, 2)

  return (
    <group ref={g} visible={false}>
      <CockpitParts wheelRef={wheel} />
    </group>
  )
}

function CockpitParts({ wheelRef }: { wheelRef: React.RefObject<Group> }) {
  const cfg = getVehicle(useSimStore.getState().vehicleId), p = cfg.cameras.driver
  const mat = useMemo(() => new MeshBasicMaterial({ color: DARK }), [])
  const mat2 = useMemo(() => new MeshBasicMaterial({ color: MID }), [])
  const rim = useMemo(() => new MeshBasicMaterial({ color: '#2a2d33' }), [])
  const mark = useMemo(() => new MeshBasicMaterial({ color: '#e8e8e2' }), [])
  const [ex, ey, ez] = p
  return (
    <group position={[ex, ey, ez]}>
      {/* panel (dashboard) */}
      <mesh position={[-ex * 0.0, -0.42, 0.95]} material={mat}><boxGeometry args={[1.9, 0.36, 0.7]} /></mesh>
      <mesh position={[0, -0.215, 0.82]} rotation={[0.35, 0, 0]} material={mat2}><boxGeometry args={[1.9, 0.04, 0.5]} /></mesh>
      {/* tom */}
      <mesh position={[0, 0.34, 0.55]} material={mat}><boxGeometry args={[1.6, 0.05, 1.5]} /></mesh>
      {/* A ustunlar */}
      <mesh position={[0.78, 0.07, 0.82]} rotation={[0.5, 0, -0.2]} material={mat}><boxGeometry args={[0.07, 0.62, 0.09]} /></mesh>
      <mesh position={[-0.78, 0.07, 0.82]} rotation={[0.5, 0, 0.2]} material={mat}><boxGeometry args={[0.07, 0.62, 0.09]} /></mesh>
      {/* eshik pastki chetlari */}
      <mesh position={[0.9, -0.3, 0.1]} material={mat}><boxGeometry args={[0.1, 0.28, 2]} /></mesh>
      <mesh position={[-0.9, -0.3, 0.1]} material={mat}><boxGeometry args={[0.1, 0.28, 2]} /></mesh>
      {/* rul */}
      <group position={[0, -0.13, 0.74]} rotation={[-2.62, 0, 0]}>
        <group ref={wheelRef}>
          <mesh material={rim}><torusGeometry args={[0.185, 0.024, 10, 36]} /></mesh>
          <mesh material={rim} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.03, 0.34, 0.02]} /></mesh>
          <mesh material={rim} position={[0, -0.09, 0]}><boxGeometry args={[0.03, 0.18, 0.02]} /></mesh>
          <mesh material={mat} position={[0, 0, 0.0]}><cylinderGeometry args={[0.055, 0.055, 0.04, 14]} /></mesh>
          <mesh material={mark} position={[0, 0.185, 0.02]}><boxGeometry args={[0.04, 0.03, 0.03]} /></mesh>
        </group>
      </group>
    </group>
  )
}
