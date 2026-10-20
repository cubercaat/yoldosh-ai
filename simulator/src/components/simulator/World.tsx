import { Environment } from '../../world/Environment'
import { ProceduralWorld } from '../../world/procedural/ProceduralWorld'
import { DestinationBeacon } from '../../world/DestinationBeacon'
import { Autodrom } from '../../world/autodrom/Autodrom'
import { Exam } from '../../world/exam/Exam'
import { aw } from '../../world/activeWorld'

/**
 * Dunyo = cheksiz PROTSEDURA shahar (chunk streaming). Eski statik xarita o'chirildi.
 *  - Environment: quyosh, osmon, tuman, soya, kun/tun
 *  - ProceduralWorld: chunk menejeri, yo'llar, binolar, parklar, aylanalar, belgilar, svetoforlar, daraxtlar, fizika collider'lari
 *  - DestinationBeacon: maqsad nuqtasi
 */
export function World() {
  if (aw.kind === 'exam') return (<><Environment /><Exam /></>)
  if (aw.kind === 'autodrom') return (<><Environment /><Autodrom /></>)
  return (
    <>
      <Environment />
      <ProceduralWorld />
      <DestinationBeacon />
    </>
  )
}
