import { useEffect, useMemo, useRef } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { CanvasTexture, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Color } from 'three'
import { BUMPS, MAP_H, MAP_W, SIGNS, px2x, px2z, type Dir } from './layout'
import { examSignMats } from './signs'
import { GROUND_NAME } from '../../physics/CollisionSystem'

const FACE: Record<Dir, number> = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 }

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false): CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  draw(cv.getContext('2d')!, w, h)
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  return t
}
const std = (o: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial(o)

/* ===================== YO'L BELGILARI ===================== */
export function Signs() {
  const pole = useMemo(() => new CylinderGeometry(0.045, 0.05, 3.1, 8).translate(0, 1.55, 0), [])
  const poleMat = useMemo(() => std({ color: '#8c939c', roughness: 0.5, metalness: 0.6 }), [])
  const plane = useMemo(() => new PlaneGeometry(0.86, 0.86), [])
  return (
    <>
      <RigidBody type="fixed" name="belgi" colliders={false}>
        {SIGNS.map((s, i) => <CylinderCollider key={i} args={[1.5, 0.07]} position={[px2x(s.x), 1.5, px2z(s.z)]} />)}
      </RigidBody>
      {SIGNS.map((s, i) => {
        const m = examSignMats(s.kind)
        return (
          <group key={i} position={[px2x(s.x), 0, px2z(s.z)]} rotation={[0, FACE[s.face], 0]}>
            <mesh geometry={pole} material={poleMat} castShadow />
            <mesh position={[0, 2.3, 0.06]} geometry={plane} material={m.front} castShadow />
            <mesh position={[0, 2.3, 0.06]} geometry={plane} material={m.back} />
            <mesh position={[0, 2.3, 0.045]} material={poleMat}><boxGeometry args={[0.1, 0.1, 0.05]} /></mesh>
          </group>
        )
      })}
    </>
  )
}

/* ===================== SEKINLATKICHLAR ===================== */
/** Past dumaloq to'siq (balandligi ~8,5 sm): ko'rinish ham, fizika ham bitta silindr. Nom "ground" — to'qnashuv jarimasi hisoblanmaydi. */
export function Bumps() {
  const R = 2.2, H = 0.085
  const mat = useMemo(() => {
    const t = canvasTex(32, 128, (g, w, h) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#1a1a1c' : '#f2b705'; g.fillRect(0, (i * h) / 4, w, h / 4) } }, true)
    t.repeat.set(1, 2.8); t.needsUpdate = true
    return std({ map: t, roughness: 0.7 })
  }, [])
  const geo = useMemo(() => new CylinderGeometry(R, R, 5.6, 64, 1), [])
  return (
    <RigidBody type="fixed" name={GROUND_NAME} colliders={false}>
      {BUMPS.map((b, i) => {
        const pos: [number, number, number] = [px2x(b.x), H - R, px2z(b.z)]
        const rot: [number, number, number] = b.along === 'x' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]
        return (
          <group key={i}>
            <CylinderCollider args={[b.len / 2, R]} position={pos} rotation={rot} friction={1} />
            <mesh geometry={geo} material={mat} position={pos} rotation={rot} castShadow receiveShadow />
          </group>
        )
      })}
    </RigidBody>
  )
}

/* ===================== TO'SIQ VA DARVOZA ===================== */
interface FSeg { ax: 'x' | 'z'; c: number; a: number; b: number }
export const GATE_Z0 = 171.4, GATE_Z1 = 180.6   // g'arbiy to'siqdagi darvoza ochiqligi (xarita z, metr)

export function Fence() {
  const x0 = px2x(2), x1 = px2x(MAP_W - 2), z0 = px2z(2), z1 = px2z(MAP_H - 2)
  const g0 = px2z(GATE_Z0), g1 = px2z(GATE_Z1)
  const segs = useMemo<FSeg[]>(() => [
    { ax: 'x', c: z0, a: x0, b: x1 }, { ax: 'x', c: z1, a: x0, b: x1 },
    { ax: 'z', c: x0, a: z0, b: g0 }, { ax: 'z', c: x0, a: g1, b: z1 }, { ax: 'z', c: x1, a: z0, b: z1 },
  ], [x0, x1, z0, z1, g0, g1])
  const bars = useMemo(() => canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    for (let i = 0; i < 5; i++) { const x = 3 + i * 12.6; g.fillStyle = '#7f8996'; g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, 0, 1.4, h) }
  }, true), [])
  const barMat = useMemo(() => std({ map: bars, transparent: true, alphaTest: 0.4, side: DoubleSide, roughness: 0.5, metalness: 0.5 }), [bars])
  const plinth = useMemo(() => std({ color: '#d7dade', roughness: 0.9 }), [])
  const blue = useMemo(() => std({ color: '#1d57c9', roughness: 0.55 }), [])
  const post = useMemo(() => std({ color: '#cfd3d9', roughness: 0.8 }), [])
  const posts = useMemo(() => {
    const out: Array<[number, number]> = []
    for (const s of segs) { const n = Math.max(1, Math.round((s.b - s.a) / 5)); for (let i = 0; i <= n; i++) { const t = s.a + ((s.b - s.a) * i) / n; out.push(s.ax === 'x' ? [t, s.c] : [s.c, t]) } }
    return out
  }, [segs])
  const pm = useRef<InstancedMesh>(null)
  useEffect(() => {
    const m = pm.current; if (!m) return
    const o = new Object3D()
    posts.forEach(([x, z], i) => { o.position.set(x, 1.0, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
    m.instanceMatrix.needsUpdate = true
  }, [posts])
  useEffect(() => () => { bars.dispose() }, [bars])
  const repTex = (L: number) => { const t = bars.clone(); t.repeat.set(L / 0.6, 1); t.needsUpdate = true; return t }
  return (
    <>
      <RigidBody type="fixed" name="devor" colliders={false}>
        {segs.map((s, i) => { const L = s.b - s.a, m = (s.a + s.b) / 2; return <CuboidCollider key={i} args={s.ax === 'x' ? [L / 2 + 0.2, 1.1, 0.3] : [0.3, 1.1, L / 2 + 0.2]} position={s.ax === 'x' ? [m, 1.1, s.c] : [s.c, 1.1, m]} /> })}
        {/* darvoza ustunlari */}
        <CuboidCollider args={[0.4, 1.4, 0.4]} position={[x0, 1.4, g0 - 0.4]} />
        <CuboidCollider args={[0.4, 1.4, 0.4]} position={[x0, 1.4, g1 + 0.4]} />
      </RigidBody>
      {segs.map((s, i) => {
        const L = s.b - s.a, m = (s.a + s.b) / 2, horiz = s.ax === 'x'
        const t = repTex(L)
        return (
          <group key={i} position={horiz ? [m, 0, s.c] : [s.c, 0, m]} rotation={[0, horiz ? 0 : Math.PI / 2, 0]}>
            <mesh material={plinth} position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[L, 0.5, 0.3]} /></mesh>
            <mesh position={[0, 1.22, 0]}><planeGeometry args={[L, 1.3]} /><meshStandardMaterial map={t} transparent alphaTest={0.4} side={DoubleSide} roughness={0.5} metalness={0.5} /></mesh>
            <mesh material={blue} position={[0, 1.9, 0]}><boxGeometry args={[L, 0.12, 0.14]} /></mesh>
            <mesh material={blue} position={[0, 0.58, 0]}><boxGeometry args={[L, 0.06, 0.12]} /></mesh>
          </group>
        )
      })}
      <instancedMesh ref={pm} args={[undefined as never, post, posts.length]} frustumCulled={false} castShadow><boxGeometry args={[0.16, 2.0, 0.16]} /></instancedMesh>
      <Gate x={x0} g0={g0} g1={g1} blue={blue} post={post} bar={barMat} />
    </>
  )
}

function Gate({ x, g0, g1, blue, post, bar }: { x: number; g0: number; g1: number; blue: MeshStandardMaterial; post: MeshStandardMaterial; bar: MeshStandardMaterial }) {
  const frame = useMemo(() => std({ color: '#3a4350', roughness: 0.5, metalness: 0.6 }), [])
  const lampMat = useMemo(() => std({ color: '#fff3c6', emissive: '#ffd66b', emissiveIntensity: 0.6 }), [])
  const leaf = useMemo(() => { const t = bar.map!.clone(); t.repeat.set(6.2 / 0.6, 1); t.needsUpdate = true; return t }, [bar])
  const pillar = (z: number, key: number) => (
    <group key={key} position={[x, 0, z]}>
      <mesh material={post} position={[0, 1.5, 0]} castShadow><boxGeometry args={[0.75, 3, 0.75]} /></mesh>
      <mesh material={blue} position={[0, 3.08, 0]}><boxGeometry args={[0.92, 0.18, 0.92]} /></mesh>
      <mesh material={lampMat} position={[0, 3.35, 0]}><sphereGeometry args={[0.2, 12, 10]} /></mesh>
    </group>
  )
  return (
    <>
      {pillar(g0 - 0.4, 0)}{pillar(g1 + 0.4, 1)}
      {/* sirpanchiq darvoza (ochiq, devor ichida turibdi) */}
      <group position={[x + 0.7, 0, g1 + 3.9]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={frame} position={[0, 1.8, 0]}><boxGeometry args={[6.2, 0.1, 0.1]} /></mesh>
        <mesh material={frame} position={[0, 0.25, 0]}><boxGeometry args={[6.2, 0.1, 0.1]} /></mesh>
        <mesh material={frame} position={[-3.1, 1.0, 0]}><boxGeometry args={[0.1, 1.6, 0.1]} /></mesh>
        <mesh material={frame} position={[3.1, 1.0, 0]}><boxGeometry args={[0.1, 1.6, 0.1]} /></mesh>
        <mesh position={[0, 1.02, 0]}><planeGeometry args={[6.1, 1.5]} /><meshStandardMaterial map={leaf} transparent alphaTest={0.4} side={DoubleSide} roughness={0.5} metalness={0.5} /></mesh>
      </group>
    </>
  )
}

/* ===================== IMTIHON BINOSI ===================== */
export const BUILDING = { x: 44, z: 190.5, w: 26, d: 9, h: 6.0 }

export function ExamBuilding() {
  const m = useMemo(() => {
    const wall = std({ color: '#eceef1', roughness: 0.85 })
    const blue = std({ color: '#1d57c9', roughness: 0.5, metalness: 0.1 })
    const dark = std({ color: '#2b323c', roughness: 0.5, metalness: 0.5 })
    const concrete = std({ color: '#c9ccd1', roughness: 0.95 })
    const glass = std({
      map: canvasTex(1024, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a9cfe9'); gr.addColorStop(0.55, '#5f8fb7'); gr.addColorStop(1, '#2d4d6d'); g.fillStyle = gr; g.fillRect(0, 0, w, h)
        g.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 6; i++) { const x = i * 190 - 30; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x + 20, h); g.lineTo(x - 50, h); g.closePath(); g.fill() }
        g.fillStyle = 'rgba(255,230,160,.35)'; for (let i = 0; i < 9; i++) g.fillRect(40 + i * 112, 150, 40, 6)     // ichkaridagi chiroqlar
        g.fillStyle = '#1b2430'; g.fillRect(w / 2 - 110, 70, 220, h - 70)                                             // eshik ochilishi
        g.fillStyle = 'rgba(160,200,230,.35)'; g.fillRect(w / 2 - 104, 76, 98, h - 82); g.fillRect(w / 2 + 6, 76, 98, h - 82)
        g.fillStyle = '#c9d2dc'; g.fillRect(w / 2 - 12, 140, 6, 50); g.fillRect(w / 2 + 6, 140, 6, 50)
        g.fillStyle = '#1f2a37'; for (let x = 0; x <= w; x += 64) g.fillRect(x - 2, 0, 5, h)                           // vertikal ramalar
        g.fillRect(0, 62, w, 6); g.fillRect(0, 0, w, 5)
      }), roughness: 0.18, metalness: 0.55, envMapIntensity: 1.4,
    })
    const strip = std({
      map: canvasTex(256, 128, (g, w, h) => {
        g.fillStyle = '#e6e9ee'; g.fillRect(0, 0, w, h)
        for (let i = 0; i < 2; i++) { const x = 18 + i * 120; g.fillStyle = '#26384d'; g.fillRect(x, 26, 100, 74); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x, 26, 100, 20); g.fillStyle = '#e6e9ee'; g.fillRect(x + 48, 26, 4, 74) }
        g.fillStyle = '#cfd3da'; g.fillRect(0, h - 6, w, 6)
      }, true), roughness: 0.55, metalness: 0.15,
    })
    strip.map!.repeat.set(3, 1)
    const sign = std({
      map: canvasTex(1024, 128, (g, w, h) => {
        g.fillStyle = '#1d57c9'; g.fillRect(0, 0, w, h)
        g.fillStyle = '#fff'; g.font = '800 62px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("AVTODROM · AMALIY IMTIHON MARKAZI", w / 2, h / 2 + 3)
        g.fillStyle = '#f2b705'; g.fillRect(0, h - 10, w, 10)
      }), roughness: 0.5,
    })
    const paving = std({
      map: canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#b8bbc1'; g.fillRect(0, 0, w, h)
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 170 + ((x * 7 + y * 13) % 5) * 4; g.fillStyle = `rgb(${v},${v + 2},${v + 8})`; g.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29) }
      }, true), roughness: 0.9,
    })
    paving.map!.repeat.set(10, 3)
    const flag = std({
      map: canvasTex(192, 96, (g, w, h) => {
        g.fillStyle = '#0099b5'; g.fillRect(0, 0, w, h * 0.32); g.fillStyle = '#fff'; g.fillRect(0, h * 0.32, w, h * 0.36); g.fillStyle = '#1eb53a'; g.fillRect(0, h * 0.68, w, h * 0.32)
        g.fillStyle = '#ce1126'; g.fillRect(0, h * 0.3, w, h * 0.025); g.fillRect(0, h * 0.665, w, h * 0.025)
        g.fillStyle = '#fff'; g.beginPath(); g.arc(30, 16, 11, 0, 7); g.fill(); g.fillStyle = '#0099b5'; g.beginPath(); g.arc(35, 15, 9, 0, 7); g.fill()
      }), side: DoubleSide, roughness: 0.8,
    })
    return { wall, blue, dark, concrete, glass, strip, sign, paving, flag }
  }, [])
  const { x, z, w, d, h } = BUILDING
  const bx = px2x(x), bz = px2z(z), front = -d / 2
  return (
    <>
      <RigidBody type="fixed" name="bino" colliders={false}><CuboidCollider args={[w / 2 + 0.6, 4, d / 2 + 0.6]} position={[bx, 4, bz]} /></RigidBody>
      <group position={[bx, 0, bz]}>
        {/* asosiy hajm */}
        <mesh material={m.wall} position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /></mesh>
        <mesh material={m.concrete} position={[0, 0.25, 0]}><boxGeometry args={[w + 0.3, 0.5, d + 0.3]} /></mesh>
        {/* parapet va tom jihozlari */}
        <mesh material={m.wall} position={[0, h + 0.25, 0]} castShadow><boxGeometry args={[w + 0.5, 0.5, d + 0.5]} /></mesh>
        <mesh material={m.blue} position={[0, h + 0.55, front - 0.1]}><boxGeometry args={[w + 0.5, 0.1, 0.35]} /></mesh>
        {[-8, -3, 6].map((ax, i) => <mesh key={i} material={m.concrete} position={[ax, h + 1.0, 1.2]} castShadow><boxGeometry args={[2.2, 0.9, 1.6]} /></mesh>)}
        {/* yon qanotlardagi derazalar */}
        <mesh material={m.strip} position={[-9.7, h / 2 + 0.3, front - 0.02]} rotation={[0, Math.PI, 0]}><planeGeometry args={[6.6, 3.4]} /></mesh>
        <mesh material={m.strip} position={[9.7, h / 2 + 0.3, front - 0.02]} rotation={[0, Math.PI, 0]}><planeGeometry args={[6.6, 3.4]} /></mesh>
        {/* markaziy shisha kirish hajmi */}
        <mesh material={m.dark} position={[0, h / 2 - 0.2, front - 0.75]} castShadow><boxGeometry args={[12.4, h - 0.4, 1.5]} /></mesh>
        <mesh material={m.glass} position={[0, h / 2 - 1.0, front - 1.52]} rotation={[0, Math.PI, 0]}><planeGeometry args={[12, h - 1.8]} /></mesh>
        <mesh material={m.blue} position={[0, h - 0.5, front - 0.8]} castShadow><boxGeometry args={[12.8, 1.0, 1.7]} /></mesh>
        <mesh material={m.sign} position={[0, h - 0.5, front - 1.66]} rotation={[0, Math.PI, 0]}><planeGeometry args={[12.2, 0.8]} /></mesh>
        {/* ko'k tik qanot */}
        <mesh material={m.blue} position={[w / 2 + 0.6, (h + 1.4) / 2, front + 0.6]} castShadow><boxGeometry args={[1.8, h + 1.4, d - 1.2]} /></mesh>
        {/* pog'onalar, yo'lak */}
        <mesh material={m.concrete} position={[0, 0.12, front - 2.3]} receiveShadow><boxGeometry args={[11, 0.24, 1.6]} /></mesh>
        <mesh material={m.concrete} position={[0, 0.06, front - 3.5]} receiveShadow><boxGeometry args={[11, 0.12, 1.4]} /></mesh>
        <mesh material={m.paving} position={[0, 0.03, front - 5.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 3.6]} /></mesh>
        <mesh material={m.paving} position={[0, 0.03, front - 8.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[3.2, 4.4]} /></mesh>
        {/* bayroq ustuni */}
        <group position={[-13.8, 0, front - 4.4]}>
          <mesh material={m.concrete} position={[0, 0.15, 0]}><cylinderGeometry args={[0.5, 0.6, 0.3, 14]} /></mesh>
          <mesh material={m.dark} position={[0, 4.4, 0]} castShadow><cylinderGeometry args={[0.05, 0.08, 8.6, 10]} /></mesh>
          <mesh material={m.flag} position={[0.95, 7.7, 0]}><planeGeometry args={[1.9, 0.95]} /></mesh>
        </group>
      </group>
      <Landscaping cx={bx} cz={bz} front={front} />
    </>
  )
}

/** buta va gul tuvaklari: bino old tomoni va darvoza atrofi */
function Landscaping({ cx, cz, front }: { cx: number; cz: number; front: number }) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => new IcosahedronGeometry(0.5, 1), [])
  const mat = useMemo(() => std({ color: '#ffffff', roughness: 0.9 }), [])
  const pts = useMemo(() => {
    const out: Array<{ x: number; z: number; s: number; c: string }> = []
    const greens = ['#3f8a3a', '#2f7a34', '#4f9a3f', '#5aa646']
    const flowers = ['#e04a6a', '#f2b705', '#f0f0f0', '#a45cd6']
    const h = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s) }
    // bino old tomoni: ikki qanot oldida gul ko'chatlari
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) out.push({ x: cx + side * (7 + i * 0.95), z: cz + front - 0.9 - (i % 2) * 0.35, s: 0.55 + h(i, side) * 0.35, c: i % 3 === 2 ? flowers[(i + side + 4) % 4] : greens[i % 4] })
    // darvoza yonidagi butalar
    for (let i = 0; i < 6; i++) out.push({ x: px2x(4) + 0.4, z: px2z(GATE_Z1) + 2 + i * 1.1, s: 0.7, c: greens[i % 4] })
    for (let i = 0; i < 6; i++) out.push({ x: px2x(4) + 0.4, z: px2z(GATE_Z0) - 2 - i * 1.1, s: 0.7, c: greens[(i + 1) % 4] })
    return out
  }, [cx, cz, front])
  useEffect(() => {
    const m = ref.current; if (!m) return
    const o = new Object3D(), col = new Color()
    pts.forEach((p, i) => { o.position.set(p.x, p.s * 0.32, p.z); o.scale.set(p.s * 1.1, p.s * 0.75, p.s * 1.1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(p.c)) })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [pts])
  return <instancedMesh ref={ref} args={[geo, mat, pts.length]} frustumCulled={false} castShadow receiveShadow />
}

/* ===================== QOROVUL BUDKASI VA SHLAGBAUM ===================== */
export function GuardBooth() {
  const white = useMemo(() => std({ color: '#f4f5f7', roughness: 0.8 }), [])
  const blue = useMemo(() => std({ color: '#1d57c9', roughness: 0.6 }), [])
  const glass = useMemo(() => std({ color: '#16222f', roughness: 0.2, metalness: 0.6 }), [])
  const red = useMemo(() => std({ color: '#d92b2b', roughness: 0.6 }), [])
  const whiteB = useMemo(() => std({ color: '#f2f2ee', roughness: 0.6 }), [])
  return (
    <group position={[px2x(12), 0, px2z(182.2)]}>
      <mesh material={white} position={[0, 1.25, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 2.5, 2.4]} /></mesh>
      <mesh material={blue} position={[0, 2.6, 0]}><boxGeometry args={[2.9, 0.22, 2.9]} /></mesh>
      <mesh material={glass} position={[0, 1.55, -1.21]}><boxGeometry args={[1.8, 1.0, 0.04]} /></mesh>
      <mesh material={glass} position={[-1.21, 1.55, 0]}><boxGeometry args={[0.04, 1.0, 1.8]} /></mesh>
      {/* ko'tarilgan shlagbaum: ustun + vertikal tayoq */}
      <mesh material={red} position={[0, 0.55, -3.2]} castShadow><boxGeometry args={[0.4, 1.1, 0.4]} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} material={i % 2 ? whiteB : red} position={[0, 1.3 + i * 0.5, -3.2]}><boxGeometry args={[0.12, 0.5, 0.12]} /></mesh>)}
    </group>
  )
}
