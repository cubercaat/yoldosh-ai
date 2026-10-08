import type { SimMode } from '../store/simulatorStore'

/**
 * Simulyatsiya rejimlari. Hozir faqat FREE_DRIVE ishlaydi. Qolganlari arxitektura uchun e'lon qilingan:
 * har rejim o'z qoidalarini (ball, jarima, vaqt) CheckpointSystem va simulatorStore orqali boshqaradi.
 */
export interface ModeDefinition { id: SimMode; title: string; implemented: boolean; description: string }

export const MODES: ModeDefinition[] = [
  { id: 'FREE_DRIVE', title: 'Erkin haydash', implemented: true, description: 'Xaritada cheklovsiz haydash. Nazorat nuqtalari ixtiyoriy marshrut.' },
  { id: 'DRIVING_TEST', title: 'Haydash imtihoni', implemented: false, description: 'Svetofor, STOP, tezlik chegarasi, burilish ko\'rsatkichi, jarimalar va ball.' },
  { id: 'PARKING_TEST', title: 'Parkovka', implemented: false, description: 'Parallel va perpendikulyar parkovka zonalari.' },
  { id: 'TRAFFIC_RULES', title: 'Yo\'l qoidalari', implemented: false, description: 'Belgilar va chorrahalarda ustunlik.' },
  { id: 'RACE', title: 'Poyga', implemented: false, description: 'Bir nechta aylanish, raqiblar.' },
  { id: 'TIME_TRIAL', title: 'Vaqtga qarshi', implemented: false, description: 'Eng yaxshi vaqt jadvali.' },
]
