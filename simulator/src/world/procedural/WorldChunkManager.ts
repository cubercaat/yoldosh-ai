/**
 * WorldChunkManager — Minecraft-ga o'xshash CHUNK STREAMING (faqat arxitektura; grafika realistik, bloklar emas).
 *
 *  - Oyinchi turgan chunk aniqlanadi.
 *  - SIM radius (3): ma'lumot keshi (bloklar, yo'l rejasi), trafik/piyoda/maqsad mantiqi. Chunk geometriyasi ildamdan tayyorlanadi.
 *  - RENDER radius (2): chunk mesh'lari sahnada. Kamera orqasidagi uzoq chunklar yuklanmaydi (view-direction aware).
 *  - HIGH radius (1): soyalar, barcha mayda detallar (daraxt, belgi, skameyka).
 *  - PHYSICS radius (1): Rapier collider'lari (bino, yo'lak, ustun...). Uzoqroqdagilar fizikaga yuklanmaydi.
 *  Uzoqlashgan chunklar: mesh'lar pulga qaytariladi, geometriya dispose() qilinadi, collider'lar o'chiriladi, keshdan chiqariladi.
 *  Har kadrda ish byudjeti (ms) bilan: 1 ta yuklash/kadr (hitch yo'q). Deterministik: bir xil chunk = bir xil natija.
 */
import { Group, Mesh } from 'three'
import { CHUNK } from './cityPlan'
import { buildChunk, type ChunkBuild, type MatKey } from './chunkBuild'
import { worldMats } from './worldMaterials'
import { onSeedChange } from './seed'

export interface Radii { sim: number; render: number; hi: number; physics: number }
export const DEFAULT_RADII: Radii = { sim: 3, render: 2, hi: 1, physics: 1 }

interface RT {
  b: ChunkBuild
  ring: number
  group: Group | null
  meshes: Mesh[]
  body: { handle: number } | null
  handles: number[]
  lastUse: number
}

/** Rapier collider handle -> nom (to'qnashuv xabarlari uchun) */
export const colliderTags = new Map<number, string>()

export interface ManagerStats {
  simChunks: number // keshdagi tayyor chunklar (ma'lumot)
  renderChunks: number
  physicsChunks: number
  tris: number
  colliders: number
  queue: number
  buildMs: number // oxirgi chunk qurilish vaqti
  buildAvgMs: number
  buildsTotal: number
  roundabouts: number
  buildings: number
  trees: number
  parkedCars: number
}

type Task = { key: string; cx: number; cz: number; kind: 'mesh' | 'phys'; prio: number }

/* eslint-disable @typescript-eslint/no-explicit-any */
export class WorldChunkManager {
  readonly root = new Group()
  radii: Radii = { ...DEFAULT_RADII }
  version = 0 // mesh to'plami o'zgarganda oshadi
  readonly stats: ManagerStats = { simChunks: 0, renderChunks: 0, physicsChunks: 0, tris: 0, colliders: 0, queue: 0, buildMs: 0, buildAvgMs: 0, buildsTotal: 0, roundabouts: 0, buildings: 0, trees: 0, parkedCars: 0 }
  private builds = new Map<string, ChunkBuild>()
  private rts = new Map<string, RT>()
  private pool: Mesh[] = []
  private groupPool: Group[] = []
  private pcx = NaN
  private pcz = NaN
  private lastFx = 0
  private lastFz = 1
  private dirty = true
  private tasks: Task[] = []
  private clock = 0
  private shadowRing = 1
  private offSeed: () => void
  chunksX = 0
  chunksZ = 0

  constructor(private world: any, private rapier: any) {
    this.root.name = 'WorldChunks'
    this.offSeed = () => this.reset()
    onSeedChange(this.offSeed)
  }

  setRadii(r: Partial<Radii>) { this.radii = { ...this.radii, ...r }; this.dirty = true }
  setShadowRing(n: number) { if (n !== this.shadowRing) { this.shadowRing = n; this.rts.forEach((rt) => this.applyShadows(rt)) } }
  mounted(): Array<{ b: ChunkBuild; ring: number }> { const o: Array<{ b: ChunkBuild; ring: number }> = []; this.rts.forEach((rt) => { if (rt.group) o.push({ b: rt.b, ring: rt.ring }) }); return o }
  physicsBodies() { let n = 0; this.rts.forEach((rt) => { if (rt.body) n++ }); return n }
  chunkOf(x: number, z: number): [number, number] { return [Math.floor(x / CHUNK), Math.floor(z / CHUNK)] }
  hasChunk(key: string) { return this.rts.has(key) }

  /** Boshlang'ich yuklash: oyinchi atrofi (physics + render yaqin) darhol tayyor bo'lsin */
  preload(px: number, pz: number, fx = 0, fz = 1) {
    this.recompute(Math.floor(px / CHUNK), Math.floor(pz / CHUNK), fx, fz)
    for (const t of this.tasks.slice()) {
      const ring = Math.max(Math.abs(t.cx - this.pcx), Math.abs(t.cz - this.pcz))
      if (ring <= 1) this.run(t)
    }
    this.tasks = this.tasks.filter((t) => Math.max(Math.abs(t.cx - this.pcx), Math.abs(t.cz - this.pcz)) > 1)
  }

  update(px: number, pz: number, fx: number, fz: number, budgetMs = 4) {
    this.clock++
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK)
    const turned = fx * this.lastFx + fz * this.lastFz < 0.92
    if (pcx !== this.pcx || pcz !== this.pcz || turned || this.dirty) this.recompute(pcx, pcz, fx, fz)
    const t0 = performance.now()
    let n = 0
    while (this.tasks.length && (n === 0 || performance.now() - t0 < budgetMs)) { this.run(this.tasks.shift()!); n++ }
    // bo'sh vaqtda: sim radiusidagi chunklarni oldindan tayyorlash (burilganda darhol tayyor)
    if (!this.tasks.length && performance.now() - t0 < budgetMs * 0.5) this.prefetch()
    this.stats.queue = this.tasks.length
  }

  private ringOf(cx: number, cz: number) { return Math.max(Math.abs(cx - this.pcx), Math.abs(cz - this.pcz)) }

  private recompute(pcx: number, pcz: number, fx: number, fz: number) {
    this.pcx = pcx; this.pcz = pcz; this.lastFx = fx; this.lastFz = fz; this.dirty = false
    this.chunksX = pcx; this.chunksZ = pcz
    const { render, physics, sim } = this.radii
    const R = Math.ceil(render + 0.5)
    const wantRender = new Set<string>(), wantPhys = new Set<string>()
    const tasks: Task[] = []
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
      const ring = Math.max(Math.abs(dx), Math.abs(dz)), dist = Math.hypot(dx, dz)
      if (dist > render + 0.5) continue
      const cx = pcx + dx, cz = pcz + dz, key = `${cx},${cz}`
      let dot = 1
      if (ring >= 2) {
        dot = (dx * fx + dz * fz) / dist
        if (dot < (this.rts.get(key)?.group ? -0.7 : -0.35)) continue // kamera orqasi — yuklanmaydi
      } else if (ring === 1) dot = (dx * fx + dz * fz) / dist
      wantRender.add(key)
      if (!this.rts.get(key)?.group) tasks.push({ key, cx, cz, kind: 'mesh', prio: ring * 10 - dot * 4 })
    }
    for (let dx = -physics; dx <= physics; dx++) for (let dz = -physics; dz <= physics; dz++) {
      const cx = pcx + dx, cz = pcz + dz, key = `${cx},${cz}`
      wantPhys.add(key)
      if (!this.rts.get(key)?.body) tasks.push({ key, cx, cz, kind: 'phys', prio: Math.max(Math.abs(dx), Math.abs(dz)) * 10 - 6 })
    }
    tasks.sort((a, b) => a.prio - b.prio)
    this.tasks = tasks
    // yuklab olinmaydiganlarni o'chirish
    let changed = false
    for (const [key, rt] of this.rts) {
      if (rt.group && !wantRender.has(key)) { this.unmountMesh(rt); changed = true }
      if (rt.body && !wantPhys.has(key)) this.unmountPhys(rt)
      rt.ring = this.ringOf(rt.b.cx, rt.b.cz)
      if (rt.group) this.applyShadows(rt)
      if (!rt.group && !rt.body) this.rts.delete(key)
    }
    // sim radiusidan tashqaridagi ma'lumotlarni tashlab yuborish
    for (const [key, b] of this.builds) {
      if (this.ringOf(b.cx, b.cz) > sim + 1 && !this.rts.has(key)) { for (const g of Object.values(b.geos)) g?.dispose(); this.builds.delete(key) }
    }
    if (changed) this.version++
  }

  private prefetch() {
    const { sim } = this.radii
    let best: { key: string; cx: number; cz: number; d: number } | null = null
    for (let dx = -sim; dx <= sim; dx++) for (let dz = -sim; dz <= sim; dz++) {
      const cx = this.pcx + dx, cz = this.pcz + dz, key = `${cx},${cz}`
      if (this.builds.has(key)) continue
      const d = Math.hypot(dx, dz) + ((dx * this.lastFx + dz * this.lastFz) > 0 ? -0.5 : 0.5)
      if (!best || d < best.d) best = { key, cx, cz, d }
    }
    if (best) this.ensureBuild(best.cx, best.cz)
  }

  private ensureBuild(cx: number, cz: number): ChunkBuild {
    const key = `${cx},${cz}`
    let b = this.builds.get(key)
    if (!b) {
      const t = performance.now()
      b = buildChunk(cx, cz)
      const ms = performance.now() - t
      this.builds.set(key, b)
      this.stats.buildMs = ms; this.stats.buildsTotal++
      this.stats.buildAvgMs = this.stats.buildAvgMs ? this.stats.buildAvgMs * 0.9 + ms * 0.1 : ms
    }
    return b
  }

  private run(t: Task) {
    const wantNow = true
    void wantNow
    const b = this.ensureBuild(t.cx, t.cz)
    let rt = this.rts.get(t.key)
    if (!rt) { rt = { b, ring: this.ringOf(t.cx, t.cz), group: null, meshes: [], body: null, handles: [], lastUse: this.clock }; this.rts.set(t.key, rt) }
    if (t.kind === 'mesh' && !rt.group) { this.mountMesh(rt); this.version++ }
    else if (t.kind === 'phys' && !rt.body) this.mountPhys(rt)
  }

  /* ---------- mesh ---------- */
  private mountMesh(rt: RT) {
    const g = this.groupPool.pop() ?? new Group()
    g.name = `chunk ${rt.b.key}`
    const mats = worldMats()
    for (const k of Object.keys(rt.b.geos) as MatKey[]) {
      const geo = rt.b.geos[k]!
      const m = this.pool.pop() ?? new Mesh()
      m.geometry = geo; m.material = mats[k]; m.name = k
      m.receiveShadow = k === 'asphalt' || k === 'sidewalk' || k === 'grass' || k === 'plain' || k === 'paint'
      m.matrixAutoUpdate = false; m.updateMatrix()
      g.add(m); rt.meshes.push(m)
    }
    rt.group = g
    this.applyShadows(rt)
    this.root.add(g)
  }
  private applyShadows(rt: RT) {
    const cast = rt.ring <= this.shadowRing
    for (const m of rt.meshes) m.castShadow = cast && (m.name === 'res' || m.name === 'off' || m.name === 'shop' || m.name === 'ind' || m.name === 'plain')
  }
  private unmountMesh(rt: RT) {
    if (!rt.group) return
    this.root.remove(rt.group)
    for (const m of rt.meshes) { rt.group.remove(m); m.geometry.dispose(); m.geometry = undefined as any; this.pool.push(m) }
    rt.meshes = []
    this.groupPool.push(rt.group); rt.group = null
  }

  /* ---------- fizika ---------- */
  private mountPhys(rt: RT) {
    const R = this.rapier, w = this.world
    const body = w.createRigidBody(R.RigidBodyDesc.fixed())
    rt.body = body
    for (const c of rt.b.colliders) {
      let d: any
      if (c.t === 'box') {
        d = R.ColliderDesc.cuboid(c.hx, c.hy, c.hz).setTranslation(c.x, c.y, c.z).setRotation({ x: 0, y: Math.sin(c.ry / 2), z: 0, w: Math.cos(c.ry / 2) })
      } else d = R.ColliderDesc.cylinder(c.hh, c.r).setTranslation(c.x, c.y, c.z)
      d.setFriction(c.tag === 'yo\'lak' ? 0.9 : 0.4)
      const col = w.createCollider(d, body)
      colliderTags.set(col.handle, c.tag); rt.handles.push(col.handle)
    }
  }
  private unmountPhys(rt: RT) {
    if (!rt.body) return
    for (const h of rt.handles) colliderTags.delete(h)
    rt.handles = []
    try { this.world.removeRigidBody(rt.body) } catch { /* dunyo allaqachon yo'q qilingan */ }
    rt.body = null
  }

  /* ---------- statistika ---------- */
  refreshStats() {
    const s = this.stats
    let tris = 0, colliders = 0, render = 0, phys = 0, rb = 0, bd = 0, tr = 0, pc = 0
    this.rts.forEach((rt) => {
      if (rt.group) { render++; tris += rt.b.tris }
      if (rt.body) { phys++; colliders += rt.b.colliders.length }
      if (rt.group) { rb += rt.b.roundabouts; bd += rt.b.buildings; tr += rt.b.trees.length; pc += rt.b.cars.length }
    })
    s.simChunks = this.builds.size; s.renderChunks = render; s.physicsChunks = phys; s.tris = tris; s.colliders = colliders; s.roundabouts = rb; s.buildings = bd; s.trees = tr; s.parkedCars = pc
  }

  reset() {
    for (const rt of this.rts.values()) { this.unmountMesh(rt); this.unmountPhys(rt) }
    this.rts.clear()
    for (const b of this.builds.values()) for (const g of Object.values(b.geos)) g?.dispose()
    this.builds.clear(); this.tasks = []; this.dirty = true; this.pcx = NaN; this.version++
  }

  dispose() {
    this.reset(); this.pool.length = 0; this.groupPool.length = 0
  }
}
