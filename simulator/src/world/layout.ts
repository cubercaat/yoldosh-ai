/**
 * Dunyo "eksport nuqtasi". Ikki dunyo bor:
 *  - 'city': cheksiz protsedura shahar (world/procedural/*)
 *  - 'autodrom': haydash maktabi maydoni (world/autodrom/*)
 * Fizika va HUD faqat shu fayl orqali so'raydi (surfaceAt, getStart, nearestRespawn): qaysi dunyo faol bo'lsa, o'shaniki qaytadi.
 */
import { SURFACE_GRIP, surfaceAt as citySurface, nearestRespawn as cityRespawn, getStart as cityStart } from './procedural/cityPlan'
import type { Respawn, Surface } from './procedural/cityPlan'
import { aw } from './activeWorld'
import { respawnTk, startTk, surfaceAtTk } from './tashkent/tk'
import { autodromRespawn, autodromStart, autodromSurface } from './autodrom/layout'
import { examRespawn, examStart, examSurface } from './exam/layout'
import { useSimStore } from '../store/simulatorStore'

export { SURFACE_GRIP, nearestRoad, speedLimitAt, CHUNK, SPEC } from './procedural/cityPlan'
export type { Surface, Respawn } from './procedural/cityPlan'
export { WORLD_SEED, setWorldSeed } from './procedural/seed'

export const surfaceAt = (x: number, z: number): Surface => (aw.tashkent ? surfaceAtTk(x, z) : aw.kind === 'exam' ? examSurface(x, z) : aw.kind === 'autodrom' ? autodromSurface(x, z) : citySurface(x, z))
export const getStart = (): Respawn => (aw.tashkent ? startTk() : aw.kind === 'exam' ? examStart() : aw.kind === 'autodrom' ? autodromStart() : cityStart())
export const nearestRespawn = (x: number, z: number, hintYaw?: number): Respawn => (aw.tashkent ? respawnTk(x, z, hintYaw) : aw.kind === 'exam' ? examRespawn(useSimStore.getState().exam.cp) : aw.kind === 'autodrom' ? autodromRespawn(x, z) : cityRespawn(x, z, hintYaw))
