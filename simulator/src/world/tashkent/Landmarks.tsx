import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { Group, MeshStandardMaterial } from 'three'
import { live, useSimStore } from '../../store/simulatorStore'
import { colliderTags } from '../procedural/WorldChunkManager'
import { LM, placeLandmarks, type Lm } from './landmarks'

const mats = new Map<string, MeshStandardMaterial>()
const M = (c: string, o?: { e?: string; m?: number; r?: number }) => { const k = c + (o ? JSON.stringify(o) : ''); let m = mats.get(k); if (!m) { m = new MeshStandardMaterial({ color: c, roughness: o?.r ?? 0.8, metalness: o?.m ?? 0, emissive: o?.e ?? '#000', emissiveIntensity: o?.e ? 0.5 : 0 }); mats.set(k, m) } return m }
type V3 = [number, number, number]
const Bx = ({ p, s, c, ry = 0, o }: { p: V3; s: V3; c: string; ry?: number; o?: Parameters<typeof M>[1] }) => <mesh position={p} rotation={[0, ry, 0]} material={M(c, o)}><boxGeometry args={s} /></mesh>
const Cy = ({ p, r, h, c, r2, o }: { p: V3; r: number; h: number; c: string; r2?: number; o?: Parameters<typeof M>[1] }) => <mesh position={p} material={M(c, o)}><cylinderGeometry args={[r2 ?? r, r, h, 20]} /></mesh>
const Dome = ({ p, r, c, sy = 1, o }: { p: V3; r: number; c: string; sy?: number; o?: Parameters<typeof M>[1] }) => <mesh position={p} scale={[1, sy, 1]} material={M(c, o)}><sphereGeometry args={[r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
const Cone = ({ p, r, h, c, o }: { p: V3; r: number; h: number; c: string; o?: Parameters<typeof M>[1] }) => <mesh position={p} material={M(c, o)}><coneGeometry args={[r, h, 16]} /></mesh>
const Sp = ({ p, r, c, o }: { p: V3; r: number; c: string; o?: Parameters<typeof M>[1] }) => <mesh position={p} material={M(c, o)}><sphereGeometry args={[r, 16, 12]} /></mesh>
const Minaret = ({ p, h, c = '#d8c9a6', cap = '#2f7fb8' }: { p: V3; h: number; c?: string; cap?: string }) => (
  <group position={p}><Cy p={[0, h / 2, 0]} r={1.9} r2={2.3} h={h} c={c} /><Cy p={[0, h * 0.82, 0]} r={2.9} h={1} c={c} /><Cone p={[0, h + 3, 0]} r={2.3} h={6} c={cap} /></group>
)
const Tree = ({ p }: { p: V3 }) => <group position={p}><Cy p={[0, 1.5, 0]} r={0.3} h={3} c="#6b4a2b" /><Sp p={[0, 4.2, 0]} r={2.2} c="#3e7d3a" /></group>
const Lawn = ({ r, c = '#5d9a4a', y = 0.08 }: { r: number; c?: string; y?: number }) => <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2} material={M(c, { r: 1 })}><circleGeometry args={[r, 40]} /></mesh>
const Pad = ({ w, d, c = '#c9c4b6', y = 0.07 }: { w: number; d: number; c?: string; y?: number }) => <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2} material={M(c, { r: 1 })}><planeGeometry args={[w, d]} /></mesh>

function Model({ k }: { k: Lm['kind'] }): ReactNode {
  switch (k) {
    case 'amirtemur': return (<>
      <Lawn r={24} /><Cy p={[0, 0.2, 0]} r={9} h={0.3} c="#d9d2c0" />
      <Bx p={[0, 2.5, 0]} s={[7, 5, 5]} c="#8d8f94" /><Bx p={[0, 5.4, 0]} s={[5.4, 1.2, 3.6]} c="#a7a9ae" />
      <Sp p={[0, 8.2, 0]} r={2.1} c="#5b4a33" o={{ m: 0.4 }} /> {/* ot */}
      <Bx p={[0, 7.6, 0]} s={[1.6, 2, 4.6]} c="#5b4a33" o={{ m: 0.4 }} /><Cy p={[0, 9.9, 0.5]} r={0.7} h={2.2} c="#6a5a3f" o={{ m: 0.4 }} /><Sp p={[0, 11.3, 0.5]} r={0.7} c="#6a5a3f" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Sp key={i} p={[Math.cos(i * 0.785) * 15, 0.8, Math.sin(i * 0.785) * 15]} r={1.6} c={i % 2 ? '#d14a6a' : '#e8c24a'} />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <Tree key={i} p={[Math.cos(i * 1.047 + 0.3) * 20, 0, Math.sin(i * 1.047 + 0.3) * 20]} />)}
    </>)
    case 'tower': return (<>
      <Cy p={[0, 95, 0]} r={5.2} r2={8.5} h={190} c="#b9bcc2" />
      <Cy p={[0, 200, 0]} r={11} r2={11} h={9} c="#9ea3ab" /><Cy p={[0, 209, 0]} r={15} r2={15} h={9} c="#c6c9ce" /><Cy p={[0, 219, 0]} r={15} r2={15} h={10} c="#4a6a8a" o={{ m: 0.5, r: 0.3 }} />
      <Cy p={[0, 228, 0]} r={11} r2={14} h={8} c="#c6c9ce" /><Cy p={[0, 232, 0]} r={9} r2={9} h={4} c="#9ea3ab" />
      <Cy p={[0, 305, 0]} r={0.5} r2={2.6} h={146} c="#d33a3a" /><Cy p={[0, 290, 0]} r={1.6} r2={3} h={5} c="#fff" />
      <Cy p={[0, 0.5, 0]} r={22} h={1} c="#cfd2d6" />
    </>)
    case 'minor': return (<>
      <Pad w={60} d={60} c="#e6e2d6" /><Bx p={[0, 7, 0]} s={[26, 14, 26]} c="#f2f0ea" />
      <Dome p={[0, 14, 0]} r={12} c="#f4f3ef" sy={0.9} /><Dome p={[0, 14, 0]} r={11.4} c="#ffffff" sy={0.9} />
      <Minaret p={[-17, 0, -13]} h={30} c="#f2f0ea" cap="#cfd6dc" /><Minaret p={[17, 0, -13]} h={30} c="#f2f0ea" cap="#cfd6dc" />
      <Bx p={[0, 3, 15]} s={[10, 6, 5]} c="#e6e2d6" />
    </>)
    case 'arena': return (<>
      <Cy p={[0, 9, 0]} r={42} r2={44} h={18} c="#e8ecf1" /><Dome p={[0, 18, 0]} r={42} c="#dbe6f2" sy={0.38} o={{ m: 0.3, r: 0.4 }} />
      <Cy p={[0, 1.5, 0]} r={46} h={3} c="#9fb2c6" />
    </>)
    case 'city': return (<>
      <Pad w={140} d={140} c="#bdb8aa" />
      {[[-24, -18, 120], [8, -26, 150], [30, 6, 100], [-6, 18, 86], [-34, 24, 70]].map(([x, z, h], i) => <Bx key={i} p={[x, h / 2, z]} s={[18 + (i % 2) * 4, h, 18]} c={['#5f86a8', '#4d7497', '#7aa0c0', '#6d93b5', '#8fb0cc'][i]} o={{ m: 0.6, r: 0.25 }} />)}
      <group position={[36, 0, -40]}><Cy p={[0, 18, 0]} r={0.8} h={36} c="#aaa" /><mesh position={[0, 20, 0]} rotation-x={Math.PI / 2} material={M('#e0583a')}><torusGeometry args={[16, 0.7, 8, 40]} /></mesh><mesh position={[0, 20, 0]} rotation-x={Math.PI / 2} material={M('#f2c230')}><torusGeometry args={[11, 0.4, 6, 32]} /></mesh></group>
      {[0, 1, 2, 3, 4, 5].map((i) => <Tree key={i} p={[-50 + i * 20, 0, 52]} />)}
    </>)
    case 'chorsu': return (<>
      <Pad w={110} d={110} c="#d8d2c4" />
      <Cy p={[0, 9, 0]} r={26} h={18} c="#e6dcc0" /><Dome p={[0, 18, 0]} r={28} c="#2a8fc2" sy={0.55} o={{ r: 0.35 }} />
      {[-40, 40].map((x) => <Bx key={x} p={[x, 4, 0]} s={[22, 8, 70]} c="#c9a96a" />)}<Bx p={[0, 3, 44]} s={[80, 6, 18]} c="#d3b87c" />
    </>)
    case 'imam': return (<>
      <Pad w={100} d={100} c="#e0d6b8" /><Bx p={[0, 6, 0]} s={[40, 12, 30]} c="#d8c08a" /><Dome p={[-10, 12, 0]} r={9} c="#2f8ab8" sy={1.1} /><Dome p={[12, 12, 0]} r={9} c="#2f8ab8" sy={1.1} />
      <Minaret p={[-24, 0, 20]} h={46} c="#d8c08a" /><Minaret p={[24, 0, 20]} h={46} c="#d8c08a" /><Bx p={[0, 5, 17]} s={[14, 10, 4]} c="#b89a5a" />
    </>)
    case 'kukeldash': return (<>
      <Pad w={60} d={50} c="#e0d6b8" /><Bx p={[0, 7, 0]} s={[34, 14, 24]} c="#c9a766" /><Bx p={[0, 8, 12.5]} s={[10, 16, 2]} c="#b58f4a" />
      <Dome p={[-10, 14, -2]} r={5} c="#2f8ab8" sy={1.1} /><Dome p={[10, 14, -2]} r={5} c="#2f8ab8" sy={1.1} />
      {[[-17, -12], [17, -12], [-17, 12], [17, 12]].map(([x, z], i) => <Cy key={i} p={[x, 9, z]} r={1.8} h={18} c="#c9a766" />)}
    </>)
    case 'mustaqil': return (<>
      <Pad w={140} d={90} c="#d8d4c6" />
      <Bx p={[-14, 8, 0]} s={[4, 16, 4]} c="#e9e6dc" /><Bx p={[14, 8, 0]} s={[4, 16, 4]} c="#e9e6dc" /><Bx p={[0, 17, 0]} s={[32, 3, 4]} c="#e9e6dc" />
      <Bx p={[0, 4, -30]} s={[5, 8, 5]} c="#9a9c9f" /><Cy p={[0, 14, -30]} r={0.8} h={12} c="#9a9c9f" /><Sp p={[0, 21, -30]} r={4.2} c="#2a6fb0" o={{ m: 0.5, r: 0.3 }} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <Tree key={i} p={[-50 + i * 16.6, 0, 40]} />)}
      <Cy p={[-55, 14, 10]} r={0.3} h={28} c="#ccc" /><Cy p={[55, 14, 10]} r={0.3} h={28} c="#ccc" />
    </>)
    case 'museum': return (<>
      <Pad w={50} d={50} c="#e0dccf" /><Bx p={[0, 7, 0]} s={[28, 14, 22]} c="#e4dcc4" /><Cy p={[0, 14, 0]} r={9} h={4} c="#e4dcc4" /><Dome p={[0, 16, 0]} r={9.5} c="#2a8fc2" sy={1} />
      <Bx p={[0, 5, 12]} s={[14, 10, 3]} c="#d3c8a8" />
    </>)
    case 'theatre': return (<>
      <Pad w={70} d={60} c="#e0dccf" /><Bx p={[0, 8, 0]} s={[44, 16, 30]} c="#e3d9bd" /><Bx p={[0, 18, 0]} s={[30, 4, 24]} c="#c9bd9a" />
      {[-16, -8, 0, 8, 16].map((x) => <Cy key={x} p={[x, 7, 17]} r={1.2} h={14} c="#f1ecda" />)}
    </>)
    case 'circus': return (<>
      <Pad w={110} d={110} c="#d8d4c6" /><Cy p={[0, 9, 0]} r={38} r2={40} h={18} c="#c8ccd2" /><Cone p={[0, 26, 0]} r={42} h={16} c="#7d8691" /><Cy p={[0, 36, 0]} r={2.5} h={6} c="#e0b83a" />
      <Cy p={[0, 1, 0]} r={43} h={2} c="#9aa1ab" />
    </>)
    case 'palace': return (<>
      <Pad w={110} d={80} c="#dcd8c9" /><Bx p={[0, 11, 0]} s={[70, 22, 40]} c="#ebe7dc" />{[-30, -20, -10, 0, 10, 20, 30].map((x) => <Cy key={x} p={[x, 10, 21]} r={1.4} h={20} c="#faf6ea" />)}<Bx p={[0, 23, 0]} s={[74, 2, 44]} c="#9aa6b2" />
    </>)
    case 'church': return (<>
      <Pad w={44} d={44} c="#e0dccf" /><Bx p={[0, 9, 0]} s={[18, 18, 28]} c="#f1ece0" /><Cy p={[0, 21, 0]} r={4} h={6} c="#f1ece0" /><Dome p={[0, 24, 0]} r={4.6} c="#2c8a56" sy={1.5} /><Sp p={[0, 31, 0]} r={0.9} c="#e5b93a" />
      <Cy p={[0, 15, 15]} r={2.5} h={30} c="#f1ece0" /><Dome p={[0, 30, 15]} r={3} c="#2c8a56" sy={1.5} />
    </>)
    case 'cathedral': return (<>
      <Pad w={44} d={44} c="#e0dccf" /><Bx p={[0, 9, 0]} s={[16, 18, 30]} c="#d8cbb0" /><Cone p={[-6, 27, 13]} r={3.2} h={18} c="#7d6a55" /><Cone p={[6, 27, 13]} r={3.2} h={18} c="#7d6a55" /><Bx p={[-6, 12, 13]} s={[5, 24, 5]} c="#d8cbb0" /><Bx p={[6, 12, 13]} s={[5, 24, 5]} c="#d8cbb0" />
    </>)
    case 'mosque': return (<>
      <Pad w={60} d={60} c="#e0d6b8" /><Bx p={[0, 6, 0]} s={[26, 12, 24]} c="#d6c08c" /><Dome p={[0, 12, 0]} r={9} c="#2f8ab8" sy={1.1} /><Minaret p={[-15, 0, 14]} h={34} c="#d6c08c" /><Minaret p={[15, 0, 14]} h={34} c="#d6c08c" />
    </>)
    case 'hotel': return (<>
      <Pad w={110} d={80} c="#d8d4c6" /><Bx p={[0, 22, 0]} s={[70, 44, 26]} c="#cfc9bb" /><Bx p={[0, 36, 0]} s={[44, 22, 18]} c="#c2bcae" /><Bx p={[-20, 6, 22]} s={[28, 12, 16]} c="#bfb8a6" />
    </>)
    case 'airport': return (<>
      <Pad w={260} d={160} c="#b8b9bb" /><Bx p={[0, 9, 0]} s={[200, 18, 40]} c="#cfd6dd" o={{ m: 0.3 }} /><Bx p={[0, 3, 38]} s={[160, 6, 30]} c="#a9adb2" />
      <Cy p={[90, 25, -30]} r={4} r2={5} h={50} c="#e3e5e8" /><Bx p={[90, 52, -30]} s={[12, 7, 12]} c="#4d6b88" o={{ m: 0.5 }} />
    </>)
  }
  return null
}

/** Taniqli joylar: model + fizik collider (taxminiy kvadrat/silindr asos) + yaqinlashganda nom xabari */
export function Landmarks() {
  const { world, rapier } = useRapier()
  useMemo(() => placeLandmarks(), [])
  const refs = useRef<Array<Group | null>>([])
  const near = useRef('')
  useEffect(() => {
    const R = rapier, w = world
    const body = w.createRigidBody(R.RigidBodyDesc.fixed()), hs: number[] = []
    const add = (x: number, z: number, hx: number, hy: number, hz: number, ry: number, tag: string, ox = 0, oz = 0) => {
      const cx = x + Math.cos(ry) * ox + Math.sin(ry) * oz, cz = z - Math.sin(ry) * ox + Math.cos(ry) * oz
      const c = w.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, hy, cz).setRotation({ x: 0, y: Math.sin(ry / 2), z: 0, w: Math.cos(ry / 2) }), body); colliderTags.set(c.handle, tag); hs.push(c.handle)
    }
    for (const l of LM) {
      const H: Partial<Record<Lm['kind'], [number, number, number]>> = { tower: [9, 120, 9], minor: [13, 8, 13], arena: [42, 10, 42], chorsu: [26, 9, 26], imam: [20, 8, 15], kukeldash: [17, 8, 12], museum: [14, 8, 11], theatre: [22, 9, 15], circus: [38, 14, 38], palace: [35, 12, 20], church: [9, 10, 14], cathedral: [8, 10, 15], mosque: [13, 8, 12], hotel: [35, 24, 13], amirtemur: [3.6, 5, 2.6] }
      const h = H[l.kind]; if (h) add(l.x, l.z, h[0], h[1], h[2], l.yaw, l.name)
    }
    return () => { for (const h of hs) colliderTags.delete(h); try { w.removeRigidBody(body) } catch { /* dunyo allaqachon yo'q */ } }
  }, [world, rapier])
  useFrame(() => {
    const [px, , pz] = live.position
    let nm = ''
    LM.forEach((l, i) => {
      const g = refs.current[i]; if (!g) return
      const d = Math.hypot(l.x - px, l.z - pz)
      g.visible = d < (l.kind === 'tower' ? 3500 : l.kind === 'airport' ? 1800 : 1100)
      if (d < l.r + 60 && !nm) nm = l.name
    })
    if (nm !== near.current) { near.current = nm; if (nm) useSimStore.getState().pushToast('📍 ' + nm, 'info') }
  })
  return (<>{LM.map((l, i) => (<group key={l.id} ref={(g) => { refs.current[i] = g }} position={[l.x, 0, l.z]} rotation={[0, l.yaw, 0]}><Model k={l.kind} /></group>))}</>)
}
