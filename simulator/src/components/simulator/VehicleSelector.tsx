import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import type { Group } from 'three'
import { useSimStore } from '../../store/simulatorStore'
import { vehicleRegistry, getVehicle } from '../../vehicles/vehicleRegistry'
import type { VehicleConfig } from '../../vehicles/VehicleConfig'
import { VehicleModel } from './VehicleModel'
import { MODES } from '../../modes'
import { hhmm, type Access } from '../../utils/access'
import { LEVELS, usePerf } from '../../systems/PerformanceManager'

const HP = 1.341

function Turntable({ cfg, color }: { cfg: VehicleConfig; color: string }) {
  const g = useRef<Group>(null)
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.35 })
  const L = cfg.dimensions.length
  return (
    <group ref={g} scale={Math.min(1.25, 6.2 / L)} position={[0, -0.9, 0]}>
      <VehicleModel cfg={cfg} color={color} plate="01 A 777 AA" silent />
    </group>
  )
}

/** Oldindan ko'rish: faqat TANLANGAN mashina yuklanadi (lazy). Bu o'yin emas — faqat tanlash ekrani. */
function Preview({ cfg, color }: { cfg: VehicleConfig; color: string }) {
  const d = 7 + cfg.dimensions.length * 0.9
  return (
    <Canvas shadows camera={{ position: [d * 0.8, d * 0.38, d * 0.8], fov: 32 }} dpr={[1, 1.6]}>
      <color attach="background" args={['#070a12']} />
      <fog attach="fog" args={['#070a12', 14, 40]} />
      <ambientLight intensity={0.35} />
      <spotLight position={[6, 9, 6]} angle={0.5} penumbra={0.8} intensity={90} castShadow />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[24, 12, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[12, 3, 6]} rotation-y={-Math.PI / 2} scale={[14, 5, 1]} color="#ffe9c8" />
        <Lightformer form="rect" intensity={1.1} position={[-12, 3, -6]} rotation-y={Math.PI / 2} scale={[14, 5, 1]} color="#9ab8ff" />
      </Environment>
      <Suspense fallback={null}><Turntable key={cfg.id + color} cfg={cfg} color={color} /></Suspense>
      <ContactShadows position={[0, -0.9, 0]} opacity={0.6} scale={20} blur={2.4} far={6} />
    </Canvas>
  )
}

const pct = (v: number, max: number) => `${Math.round(Math.min(1, v / max) * 100)}%`

export function VehicleSelector({ access, onDrive }: { access: Access; onDrive: () => void }) {
  const auto = usePerf((q) => q.auto), qLevel = usePerf((q) => q.level)
  const id = useSimStore((s) => s.vehicleId)
  const ci = useSimStore((s) => s.colorIndex)
  const src = useSimStore((s) => s.modelSource)
  const cfg = getVehicle(id)
  const color = cfg.colors[ci] ?? cfg.colors[0]
  const locked = !access.premium && !cfg.free
  const noTime = !access.premium && access.freeLeft <= 0
  const stats = useMemo(() => [
    { k: 'MAKS. TEZLIK', v: `${cfg.maxSpeed} km/h`, p: pct(cfg.maxSpeed, 230) },
    { k: 'QUVVAT', v: `${Math.round(cfg.enginePower * HP)} ot kuchi`, p: pct(cfg.enginePower, 650) },
    { k: 'OG\'IRLIK', v: `${cfg.mass.toLocaleString('en').replace(',', ' ')} kg`, p: pct(cfg.mass, 3600) },
    { k: '0–100 KM/H', v: `${cfg.acceleration.toFixed(1)} s`, p: pct(30 - cfg.acceleration, 30) },
  ], [cfg])

  return (
    <div className="sel">
      <div className="sel-3d"><Preview cfg={cfg} color={color} /></div>
      <header className="sel-top">
        <a className="back glass" href="../#/app/drive" aria-label="Orqaga">←</a>
        <div className="brand"><b>YO'LDOSH</b> SIMULYATOR<small>beta</small></div>
        <div className="glass pill">{access.premium ? 'PREMIUM · cheksiz' : noTime ? `Bepul vaqt tugadi · ${hhmm(access.reopenAt)} da yangilanadi` : `Bepul: ${Math.floor(access.freeLeft / 60)}:${String(Math.floor(access.freeLeft % 60)).padStart(2, '0')} / 5 soatda 2:00`}</div>
      </header>

      <aside className="sel-list glass">
        {vehicleRegistry.map((v) => {
          const lk = !access.premium && !v.free
          return (
            <button key={v.id} className={`row ${v.id === id ? 'on' : ''}`} onClick={() => useSimStore.getState().selectVehicle(v.id)}>
              <span className="cat">{v.category}</span>
              <span className="nm">{v.name}<small>{v.tagline}</small></span>
              {lk ? <em>PREMIUM</em> : v.free ? <em className="free">BEPUL</em> : null}
            </button>
          )
        })}
      </aside>

      <section className="sel-panel glass">
        <div className="name">{cfg.name}</div>
        <div className="tag">{cfg.tagline}</div>
        <div className="stats">
          {stats.map((s) => (<div key={s.k} className="st"><span>{s.k}</span><b>{s.v}</b><div><i style={{ width: s.p }} /></div></div>))}
          <div className="st"><span>YURITMA</span><b>{cfg.drivetrain} · {cfg.engine.electric ? 'elektr' : `${cfg.gearRatios.length} pog'ona avtomat`}</b><div><i style={{ width: '100%' }} /></div></div>
        </div>
        <div className="colors">
          {cfg.colors.map((c, i) => (<button key={c} className={i === ci ? 'on' : ''} style={{ background: c }} onClick={() => useSimStore.getState().setColor(i)} aria-label={`Rang ${i + 1}`} />))}
        </div>
        <div className="mode">
          {MODES.map((m) => (<span key={m.id} className={m.implemented ? 'on' : ''} title={m.description}>{m.title}{m.implemented ? '' : ' · tez orada'}</span>))}
        </div>
        <div className="gq"><small>Grafika sifati</small><div className="gq-b"><button className={auto ? 'on' : ''} onClick={() => usePerf.getState().setAuto(true)}>Avto</button>{LEVELS.map((l) => (<button key={l.level} className={!auto && qLevel === l.level ? 'on' : ''} onClick={() => usePerf.getState().setLevel(l.level, true)}>{l.name[0] + l.name.slice(1).toLowerCase()}</button>))}</div></div>
        {locked ? (<a className="drive" href="../#/app/premium">PREMIUM OLISH</a>) : noTime ? (<a className="drive" href="../#/app/premium">PREMIUM: CHEKSIZ</a>) : (<button className="drive" onClick={onDrive}>DRIVE</button>)}
        <div className="note">{src === 'glb' ? 'Haqiqiy 3D model.' : ''}</div>
      </section>
    </div>
  )
}
