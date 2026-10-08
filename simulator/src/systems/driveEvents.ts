/**
 * HAYDASH HODISALARI — kelajakdagi imtihon (DRIVING_TEST) tizimi uchun tayyor interfeys.
 * Hozir bu hodisalar FREE DRIVE da ham chiqariladi (ball jarimasi + xabar), lekin to'liq imtihon logikasi yozilmagan.
 *
 * Foydalanish:
 *   import { driveEvents } from './driveEvents'
 *   const off = driveEvents.on('onRedLightViolation', (e) => console.log(e))
 * Yoki to'g'ridan-to'g'ri emitter funksiyalar: onSpeedLimitViolation({...}).
 */
export interface DriveEventMap {
  onSpeedLimitViolation: { speedKmh: number; limitKmh: number; x: number; z: number }
  onRedLightViolation: { x: number; z: number; crossingI: number; crossingJ: number }
  onStopLineViolation: { x: number; z: number; minSpeedKmh: number }
  onCollision: { strength: number; other: string }
  onWrongLane: { x: number; z: number }
  onWrongWayRoundabout: { x: number; z: number }
  onParkingCompleted: { x: number; z: number; accuracy: number } // ZAXIRA: aniqlash hali yozilmagan
  onCheckpointReached: { id: string; label: string; index: number }
}
export type DriveEventName = keyof DriveEventMap
type Handler<K extends DriveEventName> = (e: DriveEventMap[K]) => void

class DriveEvents {
  private map = new Map<DriveEventName, Set<Handler<DriveEventName>>>()
  on<K extends DriveEventName>(name: K, fn: Handler<K>): () => void {
    let s = this.map.get(name)
    if (!s) { s = new Set(); this.map.set(name, s) }
    s.add(fn as Handler<DriveEventName>)
    return () => { s!.delete(fn as Handler<DriveEventName>) }
  }
  emit<K extends DriveEventName>(name: K, e: DriveEventMap[K]) {
    this.map.get(name)?.forEach((f) => { try { f(e as never) } catch (err) { console.warn('[driveEvents]', name, err) } })
    this.log.push({ name, t: performance.now() }); if (this.log.length > 50) this.log.shift()
  }
  /** so'nggi hodisalar (debug panel uchun) */
  log: Array<{ name: DriveEventName; t: number }> = []
}
export const driveEvents = new DriveEvents()

export const onSpeedLimitViolation = (e: DriveEventMap['onSpeedLimitViolation']) => driveEvents.emit('onSpeedLimitViolation', e)
export const onRedLightViolation = (e: DriveEventMap['onRedLightViolation']) => driveEvents.emit('onRedLightViolation', e)
export const onStopLineViolation = (e: DriveEventMap['onStopLineViolation']) => driveEvents.emit('onStopLineViolation', e)
export const onCollision = (e: DriveEventMap['onCollision']) => driveEvents.emit('onCollision', e)
export const onWrongLane = (e: DriveEventMap['onWrongLane']) => driveEvents.emit('onWrongLane', e)
export const onWrongWayRoundabout = (e: DriveEventMap['onWrongWayRoundabout']) => driveEvents.emit('onWrongWayRoundabout', e)
export const onParkingCompleted = (e: DriveEventMap['onParkingCompleted']) => driveEvents.emit('onParkingCompleted', e)
export const onCheckpointReached = (e: DriveEventMap['onCheckpointReached']) => driveEvents.emit('onCheckpointReached', e)
