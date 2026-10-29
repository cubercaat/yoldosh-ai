import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'

const BASE = import.meta.env.BASE_URL || './'

class Guard extends Component<{ children: ReactNode; fallback?: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? (this.props.fallback ?? null) : this.props.children }
}

/** GLB ni berilgan balandlikka keltiradi, asosini (pastki markaz) koordinata boshiga qo'yadi. */
function Inner({ file, height, yaw }: { file: string; height: number; yaw: number }) {
  const g = useGLTF(`${BASE}models/props/${file}.glb`, `${BASE}draco/`, true)
  const { obj, s, off } = useMemo(() => {
    const o = g.scene.clone(true)
    const b = new Box3().setFromObject(o), size = b.getSize(new Vector3()), c = b.getCenter(new Vector3())
    const k = height / Math.max(size.y, 1e-6)
    return { obj: o, s: k, off: [-c.x * k, -b.min.y * k, -c.z * k] as [number, number, number] }
  }, [g, height])
  return <group rotation={[0, yaw, 0]}><group position={off} scale={s}><primitive object={obj} /></group></group>
}

export function Prop({ file, height, yaw = 0, fallback }: { file: string; height: number; yaw?: number; fallback?: ReactNode }) {
  return <Guard fallback={fallback}><Suspense fallback={fallback}><Inner file={file} height={height} yaw={yaw} /></Suspense></Guard>
}
