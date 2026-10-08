import { Environment } from '../../world/Environment'
import { ProceduralWorld } from '../../world/procedural/ProceduralWorld'
import { DestinationBeacon } from '../../world/DestinationBeacon'

/**
 * Dunyo = cheksiz PROTSEDURA shahar (chunk streaming). Eski statik xarita o'chirildi.
 *  - Environment: quyosh, osmon, tuman, soya, kun/tun
 *  - ProceduralWorld: chunk menejeri, yo'llar, binolar, parklar, aylanalar, belgilar, svetoforlar, daraxtlar, fizika collider'lari
 *  - DestinationBeacon: maqsad nuqtasi
 */
export function World() {
  return (
    <>
      <Environment />
      <ProceduralWorld />
      <DestinationBeacon />
    </>
  )
}
