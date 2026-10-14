import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment as DreiEnv, Lightformer, Sky, Stars } from '@react-three/drei'
import { Color, DirectionalLight, Fog, HemisphereLight, type Group, type Object3D } from 'three'
import { live, useSimStore } from '../store/simulatorStore'
import { sunState } from '../systems/DayNightSystem'
import { perf, usePerf } from '../systems/PerformanceManager'

/** Quyosh, osmon, tuman, soyalar. Kun/tun tizimi shu yerda yorug'likni boshqaradi; sifat darajasi (PerformanceManager) soya/tumanni sozlaydi. */
export function Environment() {
  const sunRef = useRef<DirectionalLight>(null)
  const hemiRef = useRef<HemisphereLight>(null)
  const skyRef = useRef<Object3D>(null)
  const starsRef = useRef<Group>(null)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const setDpr = useThree((s) => s.setDpr)
  const level = usePerf((s) => s.level)
  const col = useRef(new Color()).current

  useEffect(() => { scene.fog = new Fog('#cfe3f5', 60, perf.q.fogFar); return () => { scene.fog = null } }, [scene])

  // sifat darajasi o'zgarganda
  useEffect(() => {
    const q = perf.q
    setDpr(Math.min(window.devicePixelRatio || 1, q.dpr))
    gl.shadowMap.enabled = q.shadowMap > 0
    const sun = sunRef.current
    if (sun) {
      sun.castShadow = q.shadowMap > 0
      if (q.shadowMap > 0 && sun.shadow.mapSize.x !== q.shadowMap) { sun.shadow.mapSize.set(q.shadowMap, q.shadowMap); sun.shadow.map?.dispose(); (sun.shadow as unknown as { map: unknown }).map = null }
    }
    if (scene.fog) (scene.fog as Fog).far = q.fogFar
    scene.traverse((o) => { const m = (o as unknown as { material?: { needsUpdate: boolean } }).material; if (m && !Array.isArray(m)) m.needsUpdate = true })
  }, [level, gl, scene, setDpr])

  useFrame((_, dt) => {
    const st = useSimStore.getState()
    if (st.autoTime) st.setTime((st.timeOfDay + dt * 0.18) % 24) // ~1 soat / 5.5 soniya
    const s = sunState(st.timeOfDay), [px, , pz] = live.position
    const sun = sunRef.current
    if (sun) {
      sun.position.set(px + s.dir.x * 90, Math.max(8, s.dir.y * 90), pz + s.dir.z * 90)
      sun.target.position.set(px, 0, pz); sun.target.updateMatrixWorld()
      sun.intensity = s.sunIntensity; sun.color.copy(s.sunColor)
    }
    if (hemiRef.current) { hemiRef.current.intensity = s.hemiIntensity; hemiRef.current.color.copy(s.fogColor).lerp(col.set('#ffffff'), 0.4 * (1 - s.night)) }
    if (scene.fog) (scene.fog as Fog).color.copy(s.fogColor)
    if (scene.background instanceof Color) scene.background.copy(s.fogColor)
    ;(scene as unknown as { environmentIntensity: number }).environmentIntensity = s.envIntensity
    const m = (skyRef.current as unknown as { material?: { uniforms: Record<string, { value: unknown }> } } | null)?.material
    if (m) { (m.uniforms.sunPosition.value as { copy: (v: unknown) => void }).copy(s.dir); (m.uniforms.turbidity as { value: number }).value = s.skyTurbidity; (m.uniforms.rayleigh as { value: number }).value = s.skyRayleigh }
    if (starsRef.current) starsRef.current.visible = s.night > 0.35
  })

  return (
    <>
      <color attach="background" args={['#cfe3f5']} />
      <hemisphereLight ref={hemiRef} args={['#dff0ff', '#4d6b3a', 0.8]} />
      <directionalLight ref={sunRef} castShadow intensity={2.2} position={[40, 70, 25]} shadow-mapSize={[1024, 1024]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} shadow-camera-near={5} shadow-camera-far={260} shadow-bias={-0.0003} shadow-normalBias={0.04} />
      <Sky ref={skyRef as never} distance={4500} sunPosition={[100, 60, 40]} turbidity={6} rayleigh={1.6} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <group ref={starsRef} visible={false}><Stars radius={400} depth={80} count={2500} factor={5} fade speed={0} /></group>
      {/* mashina bo'yoqlari uchun aks (internetsiz, protsedura bilan) */}
      <DreiEnv key={level >= 2 ? 'hi' : 'lo'} resolution={level >= 2 ? 256 : 128} frames={1} background={false}>
        <Lightformer form="rect" intensity={3} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[24, 12, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[12, 3, 6]} rotation-y={-Math.PI / 2} scale={[14, 5, 1]} color="#ffe9c8" />
        <Lightformer form="rect" intensity={1.2} position={[-12, 3, -6]} rotation-y={Math.PI / 2} scale={[14, 5, 1]} color="#cfe3ff" />
        <Lightformer form="ring" intensity={0.8} position={[0, 2, -14]} scale={8} />
        {level >= 2 && <>
          <Lightformer form="rect" intensity={2.2} position={[0, 1.2, 14]} scale={[30, 1.6, 1]} color="#dbe9ff" />
          <Lightformer form="rect" intensity={1.4} position={[0, 1.2, -14]} rotation-y={Math.PI} scale={[30, 1.6, 1]} color="#fff2dc" />
          <Lightformer form="rect" intensity={0.5} position={[0, -2.2, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} color="#3a3f46" />
          <Lightformer form="circle" intensity={6} position={[16, 9, 10]} scale={2.2} color="#fff6e0" />
        </>}
      </DreiEnv>
    </>
  )
}
