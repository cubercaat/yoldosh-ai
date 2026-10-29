import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { live } from '../../store/simulatorStore'
import { TK, continuation, crossingsInRect, lightFor, tkTime, waysInRect, wayPoint, type Light, type TkCross } from './tk'
import { colliderTags } from '../procedural/WorldChunkManager'

/* ===================== SVETOFORLAR + TO'XTASH CHIZIQLARI ===================== */
const ON = { r: new MeshBasicMaterial({ color: '#ff2a1a' }), y: new MeshBasicMaterial({ color: '#ffc21a' }), g: new MeshBasicMaterial({ color: '#25e05a' }) }
const OFF = { r: new MeshBasicMaterial({ color: '#3a1210' }), y: new MeshBasicMaterial({ color: '#3a3010' }), g: new MeshBasicMaterial({ color: '#0f2e18' }) }
const POLE = new MeshStandardMaterial({ color: '#4b5057' })
const BOX = new MeshStandardMaterial({ color: '#16181b' })
const LINE = new MeshBasicMaterial({ color: '#e9e9e4' })

interface Head { key: string; ci: number; roadA: boolean; x: number; z: number; yaw: number; lx: number; lz: number; lyaw: number; lw: number }

function headsFor(ci: number): Head[] {
  const c = TK.cross[ci], out: Head[] = []
  for (let r = 0; r < 2; r++) for (const sg of [1, -1]) {
    const t = r === 0 ? c.ta : c.tb, self = r === 0 ? c.ha : c.hb, other = r === 0 ? c.hb : c.ha
    const rx = -t[1] * sg, rz = t[0] * sg, back = other + 3.2
    const px = c.x - t[0] * sg * back, pz = c.z - t[1] * sg * back
    out.push({ key: `${ci}:${r}:${sg}`, ci, roadA: r === 0, x: px + rx * (self + 1.3), z: pz + rz * (self + 1.3), yaw: Math.atan2(-t[0] * sg, -t[1] * sg), lx: px + rx * (self / 2), lz: pz + rz * (self / 2), lyaw: Math.atan2(t[0], t[1]), lw: self })
  }
  return out
}

export function TrafficLights() {
  const [list, setList] = useState<Head[]>([])
  const last = useRef({ x: 1e9, z: 1e9, t: 0, k: 0 })
  const refs = useRef(new Map<string, Mesh[]>())
  useFrame((_, dt) => {
    const l = last.current; l.t += dt; l.k += dt
    const [x, , z] = live.position
    if (l.t > 1 && Math.hypot(x - l.x, z - l.z) > 25) {
      l.t = 0; l.x = x; l.z = z
      const R = 260, ids = crossingsInRect(x - R, z - R, x + R, z + R).filter((i) => TK.cross[i].lit)
      const next = ids.flatMap(headsFor)
      setList((prev) => (prev.length === next.length && prev.every((p, i) => p.key === next[i].key) ? prev : next))
    }
    if (l.k > 0.2) {
      l.k = 0
      const t = tkTime()
      for (const h of list) {
        const m = refs.current.get(h.key); if (!m) continue
        const st: Light = lightFor(TK.cross[h.ci] as TkCross, h.roadA, t)
        m[0].material = st === 'r' ? ON.r : OFF.r; m[1].material = st === 'y' ? ON.y : OFF.y; m[2].material = st === 'g' ? ON.g : OFF.g
      }
    }
  })
  return (
    <group>
      {list.map((h) => (
        <group key={h.key}>
          <group position={[h.x, 0, h.z]} rotation={[0, h.yaw, 0]}>
            <mesh position={[0, 2.2, 0]} material={POLE}><cylinderGeometry args={[0.07, 0.09, 4.4, 8]} /></mesh>
            <mesh position={[0, 4.3, 0.1]} material={BOX}><boxGeometry args={[0.5, 1.4, 0.4]} /></mesh>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0, 4.75 - i * 0.45, 0.32]} material={OFF[(['r', 'y', 'g'] as const)[i]]} ref={(m) => { if (!m) return; const a = refs.current.get(h.key) ?? []; a[i] = m; refs.current.set(h.key, a) }}><circleGeometry args={[0.16, 12]} /></mesh>
            ))}
          </group>
          <mesh position={[h.lx, 0.075, h.lz]} rotation={[0, h.lyaw, 0]} material={LINE}><boxGeometry args={[h.lw, 0.02, 0.45]} /></mesh>
        </group>
      ))}
    </group>
  )
}

/* ===================== SHAHAR TRAFIGI (AI mashinalar) ===================== */
interface Car { id: number; wi: number; s: number; dir: 1 | -1; v: number; x: number; z: number; yaw: number; wait: number; life: number; body?: unknown }
const N_CARS = 22, COLORS = ['#c9ccd1', '#f2f2f0', '#1c1f24', '#8a1f1f', '#1f3f7a', '#6d7580', '#c8b46a', '#2b5d3a']
const rightV = (hx: number, hz: number): [number, number] => [-hz, hx]


/* AI mashinalar uchun yengil (birlashtirilgan) haqiqiy modellar */
const AI_MODELS = ['gentra', 'cobalt', 'matiz', 'onix', 'spark', 'equinox', 'gentra', 'cobalt', 'blazer', 'onix', 'matiz']
const AI_BASE = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL
class AIErr extends Component<{ children: ReactNode; fallback: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? this.props.fallback : this.props.children }
}
function AIModel({ id }: { id: string }) {
  const g = useGLTF(`${AI_BASE}models/vehicles/${id}/${id}.ai.glb`, `${AI_BASE}draco/`, true)
  const obj = useMemo(() => g.scene.clone(true), [g])
  return <primitive object={obj} />
}
function BoxCar({ i }: { i: number }) {
  return (<>
    <mesh position={[0, 0.65, 0]}><boxGeometry args={[1.8, 0.7, 4.3]} /><meshStandardMaterial color={COLORS[i % COLORS.length]} metalness={0.3} roughness={0.5} /></mesh>
    <mesh position={[0, 1.2, -0.2]}><boxGeometry args={[1.6, 0.55, 2.3]} /><meshStandardMaterial color="#222a33" metalness={0.5} roughness={0.2} /></mesh>
  </>)
}

export const AI = { cars: [] as Car[], stops: 0, redStops: 0 }
;(window as unknown as { __ai?: unknown }).__ai = AI

export function TrafficAI() {
  const { world, rapier } = useRapier()
  const group = useRef<Group>(null)
  const bodies = useRef<Array<{ rb: ReturnType<typeof world.createRigidBody>; ch: number } | null>>([])
  const cars = useMemo(() => { AI.cars = []; return AI.cars }, [])
  useEffect(() => () => {
    for (const b of bodies.current) if (b) { try { world.removeRigidBody(b.rb) } catch { /* yo'q */ } colliderTags.delete(b.ch) }
    bodies.current = []; cars.length = 0
  }, [world, cars])

  const place = (c: Car) => {
    const w = TK.ways[c.wi], p = wayPoint(w, c.s), hx = p.tx * c.dir, hz = p.tz * c.dir, [rx, rz] = rightV(hx, hz), off = w.w / 4
    c.x = p.x + rx * off; c.z = p.z + rz * off; c.yaw = Math.atan2(hx, hz)
  }
  const spawn = (id: number): Car | null => {
    const [px, , pz] = live.position
    const cand = waysInRect(px - 230, pz - 230, px + 230, pz + 230).filter((w) => w.cls <= 3 && !w.link && w.len > 90)
    for (let a = 0; a < 10 && cand.length; a++) {
      const w = cand[Math.floor(Math.random() * cand.length)], wi = TK.ways.indexOf(w)
      const dir: 1 | -1 = w.oneway ? 1 : Math.random() < 0.5 ? 1 : -1, s = 10 + Math.random() * (w.len - 20)
      const c: Car = { id, wi, s, dir, v: 0, x: 0, z: 0, yaw: 0, wait: 0, life: 0 }
      place(c)
      const d = Math.hypot(c.x - px, c.z - pz)
      if (d < 55 || d > 230) continue
      if (cars.some((o) => o !== c && o.id !== id && Math.hypot(o.x - c.x, o.z - c.z) < 14)) continue
      c.v = Math.min(w.limit * 0.8, 40) / 3.6
      return c
    }
    return null
  }

  useFrame((_, dt0) => {
    if (!TK.ready) return
    const dt = Math.min(dt0, 0.1), t = tkTime()
    const [px, , pz] = live.position
    if (cars.length < N_CARS) { const c = spawn(cars.length); if (c) cars.push(c) }
    for (const c of cars) {
      const w = TK.ways[c.wi], vmax = Math.max(8, w.limit * 0.85) / 3.6
      let vt = vmax
      const hx = Math.sin(c.yaw), hz = Math.cos(c.yaw)
      const [rx, rz] = rightV(hx, hz)
      // oldidagi mashina / o'yinchi
      const gapLimit = (g: number) => Math.sqrt(2 * 4 * Math.max(0, g - 6.5))
      for (const o of cars) {
        if (o === c) continue
        const dx = o.x - c.x, dz = o.z - c.z, f = dx * hx + dz * hz, l = dx * rx + dz * rz
        if (f > 0 && f < 45 && Math.abs(l) < 2.4) vt = Math.min(vt, gapLimit(f) + (o.v > 0.3 ? o.v * 0.5 : 0))
      }
      { const dx = px - c.x, dz = pz - c.z, f = dx * hx + dz * hz, l = dx * rx + dz * rz; if (f > 0 && f < 40 && Math.abs(l) < 2.6) vt = Math.min(vt, gapLimit(f)) }
      // keyingi chorraha
      let stopDist = Infinity, yieldTo = false
      for (const xr of w.xs) {
        const ahead = (xr.s - c.s) * c.dir
        const cr = TK.cross[xr.ci], isA = cr.a === c.wi, oh = isA ? cr.hb : cr.ha
        const sd = ahead - (oh + 3.6)
        if (sd < -1.5 || ahead > 160) continue
        if (sd < stopDist) {
          const st = cr.lit ? lightFor(cr, isA, t) : null
          let must = false
          if (st === 'r') must = true
          else if (st === 'y') must = sd > (c.v * c.v) / (2 * 3.5) + 4
          else if (!cr.lit && sd < 38 && c.wait < 5) {
            // o'ng qo'l qoidasi va asosiy yo'l ustuvorligi
            const O = TK.ways[isA ? cr.b : cr.a], mine = w.cls
            const consider = (ox: number, oz: number) => {
              const dd = Math.hypot(ox - cr.x, oz - cr.z); if (dd > 30) return false
              if (O.cls < mine) return true
              if (O.cls > mine) return false
              return (ox - cr.x) * rx + (oz - cr.z) * rz > 1
            }
            for (const o of cars) if (o !== c && o.wi === (isA ? cr.b : cr.a) && consider(o.x, o.z)) must = true
            if (consider(px, pz)) { const lat = Math.abs((px - cr.x) * (isA ? cr.tb[0] : cr.ta[0]) + (pz - cr.z) * (isA ? cr.tb[1] : cr.ta[1])); if (lat < 40) must = true }
            if (must) yieldTo = true
          }
          if (must) stopDist = sd
        }
      }
      if (stopDist < Infinity) vt = Math.min(vt, Math.sqrt(2 * 3.5 * Math.max(0, stopDist - 0.4)))
      if (c.v < 0.2 && stopDist < 6) { c.wait += dt; AI.stops++ } else c.wait = Math.max(0, c.wait - dt * 0.5)
      if (yieldTo === false && stopDist < Infinity && c.v < 0.2) AI.redStops++
      // tezlik
      c.v += Math.max(-6 * dt, Math.min(2.2 * dt, vt - c.v)); if (c.v < 0) c.v = 0
      c.s += c.v * dt * c.dir; c.life += dt
      if (c.s <= 0 || c.s >= w.len) {
        const nx = continuation(c.wi, c.dir > 0)
        if (nx) { c.wi = nx[0]; c.dir = nx[1]; c.s = nx[1] > 0 ? 0.5 : TK.ways[nx[0]].len - 0.5 } else c.life = 1e9
      }
      place(c)
      if (Math.hypot(c.x - px, c.z - pz) > 300 || c.life > 1e8) { const n = spawn(c.id); if (n) Object.assign(c, n) }
    }
    // jismoniy jismlar va ko'rinish
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]
      let b = bodies.current[i]
      if (!b) {
        const rb = world.createRigidBody(rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(c.x, 0.75, c.z))
        const col = world.createCollider(rapier.ColliderDesc.cuboid(0.9, 0.7, 2.2), rb)
        colliderTags.set(col.handle, 'avtomobil')
        b = { rb, ch: col.handle }; bodies.current[i] = b
      }
      b.rb.setNextKinematicTranslation({ x: c.x, y: 0.75, z: c.z })
      b.rb.setNextKinematicRotation({ x: 0, y: Math.sin(c.yaw / 2), z: 0, w: Math.cos(c.yaw / 2) })
      const g = group.current?.children[i]; if (g) { g.position.set(c.x, 0, c.z); g.rotation.y = c.yaw }
    }
  })
  return (
    <group ref={group}>
      {Array.from({ length: N_CARS }, (_, i) => (
        <group key={i} position={[0, -50, 0]}>
          <AIErr fallback={<BoxCar i={i} />}><Suspense fallback={<BoxCar i={i} />}><AIModel id={AI_MODELS[i % AI_MODELS.length]} /></Suspense></AIErr>
        </group>
      ))}
    </group>
  )
}

;(window as unknown as { __tk?: unknown }).__tk = { TK, lightFor, tkTime }   // sinov uchun
