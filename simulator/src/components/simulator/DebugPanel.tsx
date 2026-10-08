import { useEffect, useState } from 'react'
import { live, useSimStore } from '../../store/simulatorStore'
import { LEVELS, perf, usePerf } from '../../systems/PerformanceManager'
import { driveEvents } from '../../systems/driveEvents'
import { colliderTags } from '../../world/procedural/WorldChunkManager'

/** F3: simulyator + dunyo + unumdorlik paneli. "DEBUG WORLD" — chunk chegaralarini 3D da ko'rsatadi (faqat dasturchilar uchun, standart o'chiq). */
export function DebugPanel() {
  const on = useSimStore((s) => s.debug)
  const d = useSimStore((s) => s.debugInfo)
  const t = useSimStore((s) => s.telemetry)
  const id = useSimStore((s) => s.vehicleId)
  const col = useSimStore((s) => s.showColliders)
  const src = useSimStore((s) => s.modelSource)
  const level = usePerf((s) => s.level)
  const auto = usePerf((s) => s.auto)
  const dbgWorld = usePerf((s) => s.debugWorld)
  const [, tick] = useState(0)
  useEffect(() => { if (!on) return; const i = setInterval(() => tick((n) => n + 1), 300); return () => clearInterval(i) }, [on])
  if (!on) return null
  const f = (n: number) => n.toFixed(2)
  const heap = perf.heapMB ? ` · JS xotira ${perf.heapMB.toFixed(0)} MB` : ''
  const ev = driveEvents.log.slice(-3).map((e) => e.name.replace('on', '')).join(', ')
  return (
    <div className="debug glass">
      <b>DEBUG (F3) · {LEVELS[level].name}{auto ? ' · AVTO' : ' · QO\'L'}</b>
      <div>FPS {perf.fps.toFixed(0)} · kadr {perf.frameMs.toFixed(1)} ms · fizika {(d.physicsStep * 1000).toFixed(1)} ms</div>
      <div>Draw calls {perf.calls} · uchburchak {(perf.tris / 1000).toFixed(0)}k · geom {perf.geometries} · tekstura {perf.textures}{heap}</div>
      <div>Chunk: render {perf.renderChunks} · sim(kesh) {perf.simChunks} · fizika {perf.physicsChunks} · navbat {perf.queue}</div>
      <div>Chunk qurilishi: {perf.chunkBuildMs.toFixed(1)} ms (o'rt. {perf.chunkBuildAvgMs.toFixed(1)}) · dunyo uchburchak {(perf.worldTris / 1000).toFixed(0)}k</div>
      <div>Obyektlar: bino {perf.buildings} · aylana {perf.roundabouts} · prop {perf.props} · collider {perf.colliders} · fizik jism {perf.physicsBodies} (teg: {colliderTags.size})</div>
      <div>Trafik {perf.trafficActive}/{perf.trafficPool} faol · piyoda {perf.pedsActive} · tezlik chegarasi {live.limit || '—'}</div>
      <div>Mashina: {id} · model: {src} · {t.kmh} km/h · RPM {t.rpm} · {t.gearMode}{t.gearMode === 'D' ? t.gear : ''}</div>
      <div>Pos: {d.position.map(f).join(', ')} · vel: {d.velocity.map(f).join(', ')}</div>
      <div>G'ildirak aloqasi: {t.contacts.map((c) => (c ? '●' : '○')).join(' ')} · sirt: {t.surface} · hodisalar: {ev || '—'}</div>
      <div className="dbtn">
        <button onClick={() => useSimStore.getState().toggleColliders()}>{col ? 'Collider ✓' : 'Collider'}</button>
        <button className={dbgWorld ? 'on' : ''} onClick={() => usePerf.getState().toggleDebugWorld()}>DEBUG WORLD</button>
        <button className={auto ? 'on' : ''} onClick={() => usePerf.getState().setAuto(!auto)}>AVTO SIFAT</button>
        {LEVELS.map((l) => (<button key={l.level} className={!auto && level === l.level ? 'on' : ''} onClick={() => usePerf.getState().setLevel(l.level, true)}>{l.name}</button>))}
      </div>
    </div>
  )
}
