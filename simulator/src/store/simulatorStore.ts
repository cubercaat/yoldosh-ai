import { create } from 'zustand'
import type { WorldKind } from '../world/activeWorld'

export type Screen = 'select' | 'playing'
export type CameraMode = 'chase' | 'close' | 'driver' | 'hood' | 'free'
export const CAMERA_ORDER: CameraMode[] = ['chase', 'close', 'driver', 'hood', 'free']
export type GearMode = 'P' | 'R' | 'N' | 'D'

/** HUD uchun soddalashtirilgan telemetriya (sekundiga ~15 marta yangilanadi, har kadrda emas) */
export interface Telemetry {
  kmh: number
  rpm: number
  rpmNorm: number // 0..1
  gearMode: GearMode
  gear: number // 1..N, R da 0
  throttle: number
  brake: number
  handbrake: boolean
  steer: number // -1..1
  contacts: [boolean, boolean, boolean, boolean]
  grounded: number // nechta g'ildirak yerda
  surface: 'road' | 'sidewalk' | 'grass' | 'air'
}

export interface DebugInfo {
  fps: number
  physicsStep: number
  velocity: [number, number, number]
  position: [number, number, number]
  rotation: [number, number, number]
}

export type SimMode = 'FREE_DRIVE' | 'DRIVING_TEST' | 'PARKING_TEST' | 'TRAFFIC_RULES' | 'RACE' | 'TIME_TRIAL'

/** Imtihon avtodromi holati (marshrut, vaqt, xatolar, natija) */
export interface ExamState {
  started: boolean   // harakat boshlangan (taymer yurmoqda)
  t: number          // sarflangan soniya
  limit: number      // vaqt chegarasi (soniya)
  cp: number         // o'tilgan nazorat nuqtalari soni
  total: number
  text: string       // keyingi ko'rsatma
  mistakes: Record<string, number>
  done: boolean
  passed: boolean
  reason: string
  signal: -1 | 0 | 1 // burilish ko'rsatkichi: -1 chap, 1 o'ng
}
export const emptyExam: ExamState = { started: false, t: 0, limit: 480, cp: 0, total: 12, text: '', mistakes: {}, done: false, passed: false, reason: '', signal: 0 }

export interface Toast { id: number; text: string; tone: 'info' | 'warn' | 'bad' | 'good' }

interface SimState {
  screen: Screen
  vehicleId: string
  colorIndex: number
  mode: SimMode
  worldKind: WorldKind
  exam: ExamState
  cameraMode: CameraMode
  headlights: boolean
  autoHeadlights: boolean
  timeOfDay: number // 0..24
  autoTime: boolean
  debug: boolean
  showColliders: boolean
  muted: boolean
  loadStatus: 'idle' | 'loading' | 'ready'
  modelSource: 'glb' | 'placeholder' | 'unknown'
  telemetry: Telemetry
  debugInfo: DebugInfo
  impact: { t: number; strength: number }
  objective: string
  distance: number
  score: number
  checkpointIndex: number
  checkpointTotal: number
  trafficLight: 'green' | 'yellow' | 'red'
  driftScore: number // joriy drift ochkosi (0 = drift yo'q)
  driftOn: boolean
  driftBest: number
  freeSecondsLeft: number | null // bepul rejim: qolgan soniya (null = cheksiz)
  toasts: Toast[]
  setScreen: (s: Screen) => void
  setWorld: (w: WorldKind) => void
  selectVehicle: (id: string) => void
  setColor: (i: number) => void
  nextCamera: () => void
  setCamera: (c: CameraMode) => void
  toggleHeadlights: () => void
  setTime: (t: number) => void
  toggleAutoTime: () => void
  toggleDebug: () => void
  toggleColliders: () => void
  toggleMute: () => void
  patch: (p: Partial<SimState>) => void
  pushToast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

const emptyTelemetry: Telemetry = { kmh: 0, rpm: 0, rpmNorm: 0, gearMode: 'P', gear: 1, throttle: 0, brake: 0, handbrake: false, steer: 0, contacts: [false, false, false, false], grounded: 0, surface: 'road' }
let toastId = 1

export const useSimStore = create<SimState>((set, get) => ({
  screen: 'select',
  vehicleId: 'cobalt',
  colorIndex: 0,
  mode: 'FREE_DRIVE',
  worldKind: 'city',
  exam: emptyExam,
  cameraMode: 'chase',
  headlights: false,
  autoHeadlights: true,
  timeOfDay: 14,
  autoTime: false,
  debug: false,
  showColliders: false,
  muted: false,
  loadStatus: 'idle',
  modelSource: 'unknown',
  telemetry: emptyTelemetry,
  debugInfo: { fps: 0, physicsStep: 1 / 60, velocity: [0, 0, 0], position: [0, 0, 0], rotation: [0, 0, 0] },
  impact: { t: 0, strength: 0 },
  objective: 'Erkin haydash: xaritada istalgan joyga boring',
  distance: 0,
  score: 100,
  checkpointIndex: 0,
  checkpointTotal: 0,
  trafficLight: 'green',
  driftScore: 0,
  driftOn: false,
  driftBest: 0,
  freeSecondsLeft: null,
  toasts: [],
  setScreen: (screen) => set({ screen }),
  setWorld: (worldKind) => set({ worldKind }),
  selectVehicle: (vehicleId) => set({ vehicleId, colorIndex: 0 }),
  setColor: (colorIndex) => set({ colorIndex }),
  nextCamera: () => set((s) => ({ cameraMode: CAMERA_ORDER[(CAMERA_ORDER.indexOf(s.cameraMode) + 1) % CAMERA_ORDER.length] })),
  setCamera: (cameraMode) => set({ cameraMode }),
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights, autoHeadlights: false })),
  setTime: (timeOfDay) => set({ timeOfDay }),
  toggleAutoTime: () => set((s) => ({ autoTime: !s.autoTime })),
  toggleDebug: () => set((s) => ({ debug: !s.debug })),
  toggleColliders: () => set((s) => ({ showColliders: !s.showColliders })),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  patch: (p) => set(p),
  pushToast: (text, tone = 'info') => { const id = toastId++; set({ toasts: [...get().toasts.slice(-3), { id, text, tone }] }); setTimeout(() => get().dismissToast(id), 3500) },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

/** Tez o'zgaruvchan, React'ni qayta chizmaydigan "jonli" holat (fizika/kamera/audio o'qiydi). */
export const live = {
  position: [0, 0, 0] as [number, number, number],
  forward: [0, 0, 1] as [number, number, number],
  yaw: 0,
  speedMs: 0,
  rpm: 0,
  throttle: 0,
  brake: 0,
  engineLoad: 0,
  grounded: 0,
  night: 0,
  resetRequested: false,
  resetCounter: 0,
  limit: 0, // joriy yo'l tezlik chegarasi (km/soat), 0 = yo'ldan tashqari
}

