import { Environment } from '../../world/Environment'
import { ProceduralWorld } from '../../world/procedural/ProceduralWorld'
import { DestinationBeacon } from '../../world/DestinationBeacon'
import { Autodrom } from '../../world/autodrom/Autodrom'
import { Exam } from '../../world/exam/Exam'
import { aw } from '../../world/activeWorld'
import { RadarLayer } from './RadarLayer'
import { TashkentWorld } from '../../world/tashkent/TashkentWorld'
import { TrafficAI, TrafficLights } from '../../world/tashkent/Traffic'

/**
 * Dunyo = cheksiz PROTSEDURA shahar (chunk streaming). Eski statik xarita o'chirildi.
 *  - Environment: quyosh, osmon, tuman, soya, kun/tun
 *  - ProceduralWorld: chunk menejeri, yo'llar, binolar, parklar, aylanalar, belgilar, svetoforlar, daraxtlar, fizika collider'lari
 *  - DestinationBeacon: maqsad nuqtasi
 */
export function World() {
  if (aw.kind === 'exam') return (<><Environment /><Exam /></>)
  if (aw.kind === 'autodrom') return (<><Environment /><Autodrom /></>)
  if (aw.tashkent) return (<><Environment /><TashkentWorld /><TrafficLights /><TrafficAI /><RadarLayer /></>)
  return (
    <>
      <Environment />
      <ProceduralWorld />
      <DestinationBeacon />
      <RadarLayer />
    </>
  )
}
