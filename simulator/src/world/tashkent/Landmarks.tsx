import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { Group, MeshStandardMaterial } from 'three'
import { live, useSimStore } from '../../store/simulatorStore'
import { colliderTags } from '../procedural/WorldChunkManager'
import { LM, placeLandmarks, type Lm } from './landmarks'
import { facadeCached, unitBox } from './facade'

const mats = new Map<string, MeshStandardMaterial>()
const M = (c: string, o?: { e?: string; m?: number; r?: number }) => { const k = c + (o ? JSON.stringify(o) : ''); let m = mats.get(k); if (!m) { m = new MeshStandardMaterial({ color: c, roughness: o?.r ?? 0.8, metalness: o?.m ?? 0, emissive: o?.e ?? '#000', emissiveIntensity: o?.e ? 0.5 : 0 }); mats.set(k, m) } return m }
type V3 = [number, number, number]
const Bx = ({ p, s, c, ry = 0, o }: { p: V3; s: V3; c: string; ry?: number; o?: Parameters<typeof M>[1] }) => <mesh position={p} rotation={[0, ry, 0]} material={M(c, o)}><boxGeometry args={s} /></mesh>
const Wb = ({ p, s, c }: { p: V3; s: V3; c: string }) => <mesh position={[p[0] - s[0] / 2, p[1] - s[1] / 2, p[2] - s[2] / 2]} scale={s} geometry={unitBox} material={facadeCached(c)} />
const Gold = ({ p, r = 0.9 }: { p: V3; r?: number }) => <group position={p}><Sp p={[0, 0, 0]} r={r} c="#e3b53a" o={{ m: 0.7, r: 0.3 }} /><Cone p={[0, r * 2, 0]} r={r * 0.35} h={r * 3} c="#e3b53a" o={{ m: 0.7, r: 0.3 }} /></group>
const Portal = ({ p, w, h, c = '#b78d3c' }: { p: V3; w: number; h: number; c?: string }) => <group position={p}><Bx p={[0, h / 2, 0]} s={[w, h, 1.2]} c="#2b2a2c" /><Bx p={[-w / 2 - 0.5, h / 2, 0.2]} s={[1, h, 1.6]} c={c} /><Bx p={[w / 2 + 0.5, h / 2, 0.2]} s={[1, h, 1.6]} c={c} /><Bx p={[0, h + 0.7, 0.2]} s={[w + 2, 1.4, 1.6]} c={c} /></group>
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
      <Lawn r={30} c="#4f9a46" /><Cy p={[0, 0.2, 0]} r={11} h={0.4} c="#d9d2c0" /><Cy p={[0, 0.5, 0]} r={9} h={0.4} c="#c8c0ac" /><Cy p={[0, 0.8, 0]} r={7} h={0.4} c="#b9b2a0" />
      <Bx p={[0, 3.2, 0]} s={[6.4, 4.8, 4.4]} c="#7e8186" /><Bx p={[0, 6.2, 0]} s={[5.4, 1.4, 3.6]} c="#a7aaaf" />
      <Bx p={[0, 9.4, 0]} s={[1.5, 1.8, 4.2]} c="#5a4a30" o={{ m: 0.5, r: 0.35 }} /><Bx p={[0, 8.2, 0]} s={[1.6, 1, 3.6]} c="#5a4a30" o={{ m: 0.5, r: 0.35 }} />
      {[[-0.5, 1.9], [0.5, 1.9], [-0.5, -1.9], [0.5, -1.9]].map(([x, z], i) => <Cy key={i} p={[x, 7.4, z]} r={0.22} h={2.6} c="#5a4a30" o={{ m: 0.5 }} />)}
      <Cy p={[0, 11.1, 1.6]} r={0.28} r2={0.4} h={2.2} c="#5a4a30" o={{ m: 0.5 }} /><Sp p={[0, 12.6, 2.7]} r={0.45} c="#5a4a30" o={{ m: 0.5 }} /><Cy p={[0, 11, -0.2]} r={0.7} h={2.4} c="#6a5a3f" o={{ m: 0.5 }} /><Sp p={[0, 12.8, -0.2]} r={0.55} c="#c8a679" /><Cone p={[0, 13.6, -0.2]} r={0.62} h={0.8} c="#2f6a9a" />
      {Array.from({ length: 14 }).map((_, i) => <Sp key={i} p={[Math.cos(i * 0.449) * 17, 0.8, Math.sin(i * 0.449) * 17]} r={1.5} c={['#d14a6a', '#e8c24a', '#e0793a', '#f2f2f2'][i % 4]} />)}
      {Array.from({ length: 10 }).map((_, i) => <Tree key={i} p={[Math.cos(i * 0.628 + 0.3) * 24, 0, Math.sin(i * 0.628 + 0.3) * 24]} />)}
    </>)
    case 'tower': return (<>
      <Cy p={[0, 0.5, 0]} r={26} h={1} c="#cfd2d6" />
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos(i * 1.5708) * 9, 28, Math.sin(i * 1.5708) * 9]} rotation={[Math.sin(i * 1.5708) * -0.2, 0, Math.cos(i * 1.5708) * 0.2]} material={M('#b4b7bd')}><cylinderGeometry args={[3.2, 4.4, 58, 10]} /></mesh>)}
      <Cy p={[0, 105, 0]} r={5.4} r2={8.6} h={150} c="#c3c6cc" />
      {[40, 80, 120, 160].map((y) => <Cy key={y} p={[0, y, 0]} r={9} r2={9} h={1.2} c="#9ea3ab" />)}
      <Cy p={[0, 188, 0]} r={9} r2={14} h={9} c="#9ea3ab" />
      <Cy p={[0, 197, 0]} r={14.5} h={9} c="#4a6a8a" o={{ m: 0.5, r: 0.25 }} /><Cy p={[0, 197, 0]} r={14.9} h={1.2} c="#9fd4ff" o={{ e: '#9fd4ff' }} />
      <Cy p={[0, 206.5, 0]} r={14.5} h={10} c="#c9ccd1" /><Cy p={[0, 216, 0]} r={14.5} h={9} c="#4a6a8a" o={{ m: 0.5, r: 0.25 }} />
      <Cy p={[0, 224, 0]} r={9} r2={14.5} h={7} c="#c9ccd1" /><Cy p={[0, 230, 0]} r={5} r2={9} h={6} c="#9ea3ab" />
      {[0, 1, 2, 3, 4, 5].map((i) => <Cy key={i} p={[0, 262 + i * 22, 0]} r={Math.max(0.5, 2.6 - i * 0.4)} r2={Math.max(0.6, 3 - i * 0.4)} h={21.5} c={i % 2 ? '#ffffff' : '#d33a3a'} />)}
    </>)
    case 'minor': return (<>
      <Pad w={70} d={70} c="#e8e4d8" /><Wb p={[0, 7, 0]} s={[28, 14, 28]} c="#f3f1ea" />
      <Cy p={[0, 14.6, 0]} r={11} h={3} c="#f6f5f1" /><Dome p={[0, 16, 0]} r={11.6} c="#fbfaf7" sy={0.95} /><Gold p={[0, 27, 0]} r={0.9} />
      {[[-19, -15], [19, -15], [-19, 15], [19, 15]].map(([x, z], i) => <group key={i}><Cy p={[x, 14, z]} r={1.5} r2={1.9} h={28} c="#f6f4ee" /><Cy p={[x, 24, z]} r={2.4} h={1} c="#e9e4d4" /><Dome p={[x, 28, z]} r={2} c="#fbfaf7" sy={1.4} /><Gold p={[x, 31, z]} r={0.5} /></group>)}
      <Portal p={[0, 0, 14.4]} w={7} h={9} c="#d8d2c0" /><Bx p={[0, 11, 14.2]} s={[26, 1, 0.6]} c="#2f8ab8" />
      {[-9, 9].map((x) => <Bx key={x} p={[x, 4, 14.3]} s={[2.2, 5, 0.5]} c="#3a3a3d" />)}
    </>)
    case 'arena': return (<>
      <Cy p={[0, 9, 0]} r={42} r2={44} h={18} c="#e8ecf1" /><Dome p={[0, 18, 0]} r={42} c="#dbe6f2" sy={0.38} o={{ m: 0.3, r: 0.4 }} />
      <Cy p={[0, 1.5, 0]} r={46} h={3} c="#9fb2c6" />
    </>)
    case 'city': return (<>
      <Pad w={150} d={150} c="#c4bfb0" />
      {[[-26, -20, 130, '#5f86a8'], [8, -28, 160, '#4d7497'], [32, 6, 108, '#7aa0c0'], [-8, 20, 92, '#6d93b5'], [-36, 26, 74, '#8fb0cc'], [60, -10, 60, '#5f86a8']].map(([x, z, h, c], i) => <group key={i}><Wb p={[x as number, (h as number) / 2, z as number]} s={[19 + (i % 2) * 4, h as number, 19]} c={c as string} /><Bx p={[x as number, (h as number) + 0.8, z as number]} s={[20 + (i % 2) * 4, 1.6, 20]} c="#3a4452" /></group>)}
      <group position={[40, 0, -52]}><Cy p={[0, 20, 0]} r={0.9} h={40} c="#9aa0a8" /><mesh position={[0, 22, 0]} rotation-x={Math.PI / 2} material={M('#e0583a')}><torusGeometry args={[18, 0.8, 8, 40]} /></mesh><mesh position={[0, 22, 0]} rotation-x={Math.PI / 2} material={M('#f2c230')}><torusGeometry args={[12, 0.45, 6, 32]} /></mesh>{Array.from({ length: 12 }).map((_, i) => <Sp key={i} p={[Math.cos(i * 0.5236) * 18, 22 + Math.sin(i * 0.5236) * 18, 0]} r={1.3} c={['#3a8fd0', '#e0583a', '#3e9e5a', '#f2c230'][i % 4]} />)}</group>
      {Array.from({ length: 8 }).map((_, i) => <Tree key={i} p={[-56 + i * 16, 0, 60]} />)}
    </>)
    case 'chorsu': return (<>
      <Pad w={130} d={130} c="#d8d2c4" /><Cy p={[0, 11, 0]} r={26} h={22} c="#e8d9b5" />
      <Dome p={[0, 22, 0]} r={29} c="#2aa0c8" sy={0.6} o={{ r: 0.3 }} /><Cy p={[0, 22.3, 0]} r={29.4} h={0.8} c="#e9c445" /><Gold p={[0, 39, 0]} r={1.4} />
      {Array.from({ length: 16 }).map((_, i) => <Bx key={i} p={[Math.cos(i * 0.3927) * 26.2, 11, Math.sin(i * 0.3927) * 26.2]} s={[3.4, 14, 1]} ry={-i * 0.3927} c="#3a3a3d" />)}
      {[[-46, 0, 22, 70], [46, 0, 22, 70], [0, 48, 80, 20]].map(([x, z, w, d], i) => <group key={i}><Wb p={[x, 4.5, z]} s={[w, 9, d]} c="#d9bf86" />{[0, 1, 2, 3, 4, 5].map((k) => <Bx key={k} p={[x - w / 2 + (k + 0.5) * (w / 6), 7.2, z + d / 2 + 0.7]} s={[w / 6 - 1, 0.6, 3]} c={['#e0583a', '#2f9ac8', '#e9c445', '#3e9e5a', '#c94a8a', '#f08a3a'][k]} />)}</group>)}
    </>)
    case 'imam': return (<>
      <Pad w={110} d={100} c="#e3d9bd" /><Wb p={[0, 6, 0]} s={[44, 12, 32]} c="#d9c58f" />
      <Portal p={[0, 0, 16.5]} w={9} h={11} c="#c4a35a" /><Bx p={[0, 14, 16.4]} s={[22, 2, 0.7]} c="#2f8ab8" />
      {[-12, 12].map((x) => <group key={x}><Cy p={[x, 14, 0]} r={7} h={5} c="#d9c58f" /><Dome p={[x, 16.5, 0]} r={8.4} c="#2f9ac8" sy={1.15} o={{ r: 0.35 }} /><Gold p={[x, 27, 0]} r={0.8} /></group>)}
      {[-27, 27].map((x) => <group key={x} position={[x, 0, 22]}><Cy p={[0, 26, 0]} r={2.1} r2={2.7} h={52} c="#d9c58f" />{[10, 22, 34].map((y) => <Cy key={y} p={[0, y, 0]} r={2.9} r2={2.9} h={1.2} c="#2f8ab8" />)}<Cy p={[0, 44, 0]} r={3.4} h={2} c="#c4a35a" /><Dome p={[0, 46, 0]} r={3.2} c="#2f9ac8" sy={1.5} /><Gold p={[0, 51, 0]} r={0.5} /></group>)}
      {[-18, -9, 0, 9, 18].map((x) => <Bx key={x} p={[x, 4, -16.3]} s={[4, 6, 0.5]} c="#7d6a3a" />)}
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
      <Pad w={56} d={56} c="#e0dccf" /><Wb p={[0, 8, 0]} s={[30, 16, 24]} c="#e6dcc0" /><Cy p={[0, 17, 0]} r={9.5} h={5} c="#e6dcc0" /><Dome p={[0, 19.5, 0]} r={10.4} c="#2a9bd0" sy={1.05} o={{ r: 0.3 }} /><Gold p={[0, 30.5, 0]} r={0.8} />
      <Portal p={[0, 0, 12.4]} w={7} h={10} c="#c9b98a" />
    </>)
    case 'theatre': return (<>
      <Pad w={80} d={70} c="#e0dccf" /><Wb p={[0, 9, 0]} s={[46, 18, 32]} c="#e6d9b8" /><Bx p={[0, 19.5, 0]} s={[48, 3, 34]} c="#bfae82" /><Bx p={[0, 22.5, -4]} s={[26, 7, 20]} c="#d9cba2" />
      {[-19, -13, -7, 0, 7, 13, 19].map((x) => <Cy key={x} p={[x, 8, 18]} r={1.3} h={16} c="#f4efdf" />)}<Bx p={[0, 17.2, 18]} s={[46, 2.4, 3]} c="#cfc29a" /><Bx p={[0, 3, 16.4]} s={[10, 6, 0.6]} c="#2b2a2c" />
    </>)
    case 'circus': return (<>
      <Pad w={120} d={120} c="#d8d4c6" /><Cy p={[0, 9, 0]} r={38} r2={40} h={18} c="#dfe2e6" />
      {Array.from({ length: 28 }).map((_, i) => <Bx key={i} p={[Math.cos(i * 0.2244) * 40.4, 9, Math.sin(i * 0.2244) * 40.4]} s={[1.6, 18, 2.4]} ry={-i * 0.2244} c="#b9bfc7" />)}
      <Cy p={[0, 19, 0]} r={41} h={2} c="#2f6fa8" /><Dome p={[0, 20, 0]} r={40} c="#c3cad2" sy={0.34} o={{ m: 0.2, r: 0.5 }} /><Cy p={[0, 33.8, 0]} r={3} h={3} c="#e0b83a" /><Cone p={[0, 38, 0]} r={2} h={6} c="#e0b83a" />
      <Bx p={[0, 3, 42]} s={[14, 6, 8]} c="#3a4452" /><Portal p={[0, 0, 46.2]} w={8} h={7} c="#9aa1ab" />
    </>)
    case 'palace': return (<>
      <Pad w={120} d={90} c="#dcd8c9" /><Wb p={[0, 12, 0]} s={[76, 24, 42]} c="#eae6d9" /><Bx p={[0, 25, 0]} s={[80, 2.4, 46]} c="#8f99a6" />
      {[-33, -22, -11, 0, 11, 22, 33].map((x) => <Cy key={x} p={[x, 11, 22.5]} r={1.5} h={22} c="#faf6ea" />)}<Bx p={[0, 3.5, 21]} s={[14, 7, 0.8]} c="#2b2a2c" />
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
      <Pad w={120} d={90} c="#d8d4c6" /><Wb p={[0, 24, 0]} s={[72, 48, 28]} c="#d6cfbf" /><Wb p={[0, 40, 0]} s={[46, 24, 20]} c="#cbc4b2" /><Wb p={[-22, 7, 24]} s={[28, 14, 18]} c="#cdbfa3" /><Bx p={[0, 49.5, 0]} s={[74, 1.5, 30]} c="#8a8f94" />
      {[-24, -12, 0, 12, 24].map((x) => <Bx key={x} p={[x, 4, 14.3]} s={[2.2, 8, 0.6]} c="#2b2a2c" />)}
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
