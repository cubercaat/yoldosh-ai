/**
 * Eski statik xarita (3 ta chorraha, qo'lda joylashtirilgan binolar) O'CHIRILDI.
 * Endi dunyo — cheksiz protsedura shahar: world/procedural/*.
 * Bu fayl faqat boshqa modullar uchun qulay "eksport nuqtasi".
 */
export { SURFACE_GRIP, surfaceAt, nearestRoad, nearestRespawn, getStart, speedLimitAt, CHUNK, SPEC } from './procedural/cityPlan'
export type { Surface, Respawn } from './procedural/cityPlan'
export { WORLD_SEED, setWorldSeed } from './procedural/seed'
