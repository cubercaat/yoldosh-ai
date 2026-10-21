import { create } from 'zustand'

/**
 * PerformanceManager — FPS / kadr vaqti / draw call / uchburchak / chunklar / transport / fizika tanalari monitoringi
 * va ADAPTIV SIFAT: FPS tushsa — soya, ko'rinish masofasi, uzoq LOD, trafik, o'simlik kamayadi; FPS yuqori bo'lsa — oshadi.
 */
export interface Quality {
  level: number
  name: string
  render: number // chunk render radiusi
  sim: number // chunk sim radiusi
  shadowRing: number // soya beradigan chunk halqasi (-1 = soya o'chiq)
  shadowMap: number // 0 = o'chiq
  dpr: number
  traffic: number // maksimal faol trafik
  peds: number // maksimal piyodalar
  trees: number // daraxt zichligi 0..1
  fogFar: number
  lodBias: number // >1: LOD tezroq pasayadi
}
export const LEVELS: Quality[] = [
  { level: 0, name: 'PAST', render: 1, sim: 2, shadowRing: -1, shadowMap: 0, dpr: 1, traffic: 5, peds: 3, trees: 0.35, fogFar: 185, lodBias: 2 },
  { level: 1, name: 'O\'RTA', render: 2, sim: 2, shadowRing: 0, shadowMap: 1024, dpr: 1.25, traffic: 10, peds: 6, trees: 0.6, fogFar: 270, lodBias: 1.4 },
  { level: 2, name: 'YUQORI', render: 2, sim: 3, shadowRing: 1, shadowMap: 1024, dpr: 1.5, traffic: 16, peds: 10, trees: 0.85, fogFar: 310, lodBias: 1.1 },
  { level: 3, name: 'ULTRA', render: 2, sim: 3, shadowRing: 1, shadowMap: 2048, dpr: 1.75, traffic: 24, peds: 14, trees: 1, fogFar: 330, lodBias: 1 },
]

/** zaif qurilma/tarmoq: telefon, kam yadro/xotira, trafik tejash yoki sekin ulanish -> yengil model va O'RTA sifat bilan boshlaymiz */
export const LITE: boolean = (() => {
  try {
    const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } }
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(n.userAgent) || (n.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820)
    const weak = (n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4
    const slow = !!n.connection && (n.connection.saveData === true || /(^|-)2g|3g/.test(n.connection.effectiveType || ''))
    return mobile || weak || slow
  } catch { return false }
})()

export const perf = {
  fps: 60,
  frameMs: 16.7,
  calls: 0,
  tris: 0,
  geometries: 0,
  textures: 0,
  heapMB: 0,
  auto: true,
  level: LITE ? 1 : 2,
  // boshqa tizimlar yozadi:
  renderChunks: 0,
  simChunks: 0,
  physicsChunks: 0,
  colliders: 0,
  physicsBodies: 0,
  trafficActive: 0,
  trafficPool: 0,
  pedsActive: 0,
  chunkBuildMs: 0,
  chunkBuildAvgMs: 0,
  queue: 0,
  worldTris: 0,
  props: 0,
  roundabouts: 0,
  buildings: 0,
  q: LEVELS[LITE ? 1 : 2] as Quality,
}

interface PerfStore { level: number; auto: boolean; debugWorld: boolean; setLevel: (n: number, manual?: boolean) => void; setAuto: (a: boolean) => void; toggleDebugWorld: () => void }
export const usePerf = create<PerfStore>((set) => ({
  level: LITE ? 1 : 2, auto: true, debugWorld: false,
  setLevel: (n, manual) => { const l = Math.max(0, Math.min(3, n)); perf.level = l; perf.q = LEVELS[l]; set(manual ? { level: l, auto: false } : { level: l }); if (manual) { perf.auto = false; try { localStorage.setItem('sim_quality', String(l)) } catch { /* */ } } },
  setAuto: (a) => { perf.auto = a; set({ auto: a }); if (a) { try { localStorage.setItem('sim_quality', 'auto') } catch { /* */ } } },
  toggleDebugWorld: () => set((s) => ({ debugWorld: !s.debugWorld })),
}))

/** saqlangan sifat tanlovi (Avto yoki qo'lda) */
try { const sv = localStorage.getItem('sim_quality'); if (sv && sv !== 'auto' && !isNaN(+sv)) { const l = Math.max(0, Math.min(3, +sv)); perf.level = l; perf.q = LEVELS[l]; perf.auto = false; usePerf.setState({ level: l, auto: false }) } } catch { /* */ }

let acc = 0, frames = 0, lowWin = 0, highWin = 0, cooldown = 6

/** har kadrda chaqiriladi; gl.info dan o'lchovlarni oladi */
export function perfTick(dt: number, info?: { render: { calls: number; triangles: number }; memory: { geometries: number; textures: number } }) {
  if (dt > 0.5) return // yashirin vkladka / uzilish
  perf.frameMs = perf.frameMs * 0.9 + dt * 1000 * 0.1
  acc += dt; frames++
  if (info) { perf.calls = info.render.calls; perf.tris = info.render.triangles; perf.geometries = info.memory.geometries; perf.textures = info.memory.textures }
  if (acc >= 1.5) {
    perf.fps = frames / acc; acc = 0; frames = 0
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    perf.heapMB = mem ? mem.usedJSHeapSize / 1048576 : 0
    cooldown -= 1.5
    if (!perf.auto) { lowWin = highWin = 0; return }
    if (perf.fps < 38) { lowWin++; highWin = 0 } else if (perf.fps > 57) { highWin++; lowWin = 0 } else { lowWin = Math.max(0, lowWin - 1); highWin = Math.max(0, highWin - 1) }
    if (lowWin >= 2 && cooldown <= 0 && perf.level > 0) { usePerf.getState().setLevel(perf.level - 1); lowWin = 0; cooldown = 5 }
    else if (highWin >= 5 && cooldown <= 0 && perf.level < 3) { usePerf.getState().setLevel(perf.level + 1); highWin = 0; cooldown = 10 }
  }
}
