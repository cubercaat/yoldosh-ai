import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { KTX2Loader } from 'three-stdlib'
import { Color, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { buildCar } from '../../vehicles/car/carBuilder'
import type { VehicleConfig } from '../../vehicles/VehicleConfig'
import { probeGLB, VehicleVisual } from '../../utils/vehicleUtils'
import { useSimStore } from '../../store/simulatorStore'
import { usePerf } from '../../systems/PerformanceManager'

/**
 * VehicleModel — transport vizual modeli:
 *   1) public/models/vehicles/<id>/<id>.glb mavjud bo'lsa — shu GLB (Draco/KTX2 qo'llab-quvvatlanadi, kerak bo'lganda yuklanadi);
 *   2) aks holda — PLACEHOLDER (aniq belgilangan vaqtinchalik model).
 * Ikkalasi ham bir xil tugun nomlari bilan ishlaydi, shuning uchun fizika/HUD/kod o'zgarmaydi.
 */
const BASE = import.meta.env.BASE_URL || './'
export const modelUrl = (cfg: VehicleConfig, hi = false) => `${BASE}${hi && cfg.modelPathHi ? cfg.modelPathHi : cfg.modelPath}`

class Boundary extends Component<{ fallback: ReactNode; onError?: () => void; children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch() { this.props.onError?.() }
  render() { return this.state.err ? this.props.fallback : this.props.children }
}

interface Props {
  cfg: VehicleConfig
  color: string
  plate?: string
  onVisual?: (v: VehicleVisual | null) => void
  silent?: boolean // oldindan ko'rish: store'ga yozmaydi
}

function Placeholder({ cfg, color, plate, onVisual, silent }: Props) {
  const root = useMemo(() => buildCar(cfg, color, plate, 0), [cfg, color, plate])
  useEffect(() => {
    const v = new VehicleVisual(root, cfg)
    onVisual?.(v)
    if (!silent) useSimStore.getState().patch({ modelSource: 'placeholder', loadStatus: 'ready' })
    return () => onVisual?.(null)
  }, [root, cfg, onVisual, silent])
  return <primitive object={root} />
}

function GLB({ cfg, color, onVisual, silent }: Props) {
  const gl = useThree((s) => s.gl)
  const hi = usePerf((s) => s.level) >= 2
  const url = modelUrl(cfg, hi)
  const gltf = useGLTF(url, `${BASE}draco/`, true, (loader) => {
    try { const k = new KTX2Loader().setTranscoderPath(`${BASE}basis/`).detectSupport(gl); loader.setKTX2Loader(k) } catch { /* KTX2 ixtiyoriy */ }
  })
  const root = useMemo(() => {
    const r = gltf.scene.clone(true)
    if (cfg.paintMaterial) {   // kuzov rangi: faqat bo'yoq materialini klonlab bo'yaymiz (boshqa mashinalar/keshga ta'sir qilmasin)
      r.traverse((o) => {
        const mesh = o as Mesh
        if (!mesh.isMesh) return
        const arr = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        const out = arr.map((mt) => { if (mt.name !== cfg.paintMaterial) return mt; const c = mt.clone() as MeshStandardMaterial; c.color = new Color(color); return c })
        mesh.material = Array.isArray(mesh.material) ? out : out[0]
      })
    }
    return r
  }, [gltf, cfg.paintMaterial, color])
  useEffect(() => {
    const v = new VehicleVisual(root, cfg)
    if (!v.found.wheels) console.warn(`[${cfg.id}] GLB ichida g'ildirak tugunlari topilmadi — VehicleConfig.nodes ni tekshiring`, cfg.nodes.wheels)
    onVisual?.(v)
    if (!silent) useSimStore.getState().patch({ modelSource: 'glb', loadStatus: 'ready' })
    return () => onVisual?.(null)
  }, [root, cfg, onVisual, silent])
  return <primitive object={root} />
}

export function VehicleModel(props: Props) {
  const { cfg } = props
  const [kind, setKind] = useState<'checking' | 'glb' | 'placeholder'>('checking')
  const hiQ = usePerf((s) => s.level) >= 2
  useEffect(() => {
    let live = true
    setKind('checking')
    if (!props.silent) useSimStore.getState().patch({ loadStatus: 'loading' })
    probeGLB(modelUrl(cfg, hiQ)).then((ok) => { if (live) setKind(ok ? 'glb' : 'placeholder') })
    return () => { live = false }
  }, [cfg, props.silent, hiQ])
  const fallback = <Placeholder {...props} />
  if (kind === 'checking') return null
  if (kind === 'placeholder') return fallback
  return (
    <Boundary fallback={fallback} onError={() => console.warn(`[${cfg.id}] GLB yuklanmadi, placeholder ishlatilmoqda`)}>
      <Suspense fallback={fallback}>
        <GLB {...props} />
      </Suspense>
    </Boundary>
  )
}

/** Model joylashuvi: GLB sozlamalari (masshtab, siljish, burilish) shu guruhga qo'llanadi */
export function modelTransform(cfg: VehicleConfig): { scale: number; position: [number, number, number]; rotationY: number } {
  return { scale: cfg.modelScale, position: cfg.modelOffset, rotationY: cfg.modelYaw }
}

export type { Group, Object3D }


