import type { VehicleConfig } from './VehicleConfig'
import { cobalt } from './cobalt'
import { sedan } from './sedan'
import { malibu } from './malibu'
import { cybertruck } from './cybertruck'
import { isuzu } from './isuzu'
import { gclass } from './gclass'

/** Hamma mashinalar shu yerda ro'yxatdan o'tadi. Yangi mashina: faylini yarating va shu massivga qo'shing. */
export const vehicleRegistry: VehicleConfig[] = [cobalt, sedan, malibu, cybertruck, isuzu, gclass]
export const getVehicle = (id: string): VehicleConfig => vehicleRegistry.find((v) => v.id === id) ?? vehicleRegistry[0]
