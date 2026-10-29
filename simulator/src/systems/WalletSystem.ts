import { create } from 'zustand'

/**
 * Hamyon (o'yin ichidagi so'm) — hisob-kitob serverda (yoldosh/server/wallet.js). Bu yerda faqat so'rov va holat.
 * Sessiya: asosiy sayt yozgan localStorage ('chorraha_session', 'chorraha_api'). Sessiya yo'q bo'lsa (mehmon/dev) — hamyon o'chiq:
 * jarima ham, vaqt cheklovi ham yo'q (eski tarif qoidalari ishlaydi).
 */
const SESSION = 'chorraha_session', API_KEY = 'chorraha_api', DEFAULT_API = 'https://chorraha-api.chorraha.workers.dev'
const rd = (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const api = () => (rd(API_KEY) || DEFAULT_API).replace(/\/$/, '')

export interface FineCard { id: number; kind: 'radar' | 'redlight' | 'wrongway'; brv: number; repeat: number; speed: number; limit: number; fine: number; balance: number; where: string }
interface WalletData { connected: boolean; loaded: boolean; balance: number; playSec: number; tier: string; unlimited: boolean; canDrive: boolean; bhm: number }
interface WalletStore extends WalletData {
  fineCard: FineCard | null
  radarAhead: number // m, 0 = yo'q
  refresh: () => Promise<void>
  /** haydashga ruxsat bormi (balans > 0 va vaqt bor) */
  gate: () => Promise<{ ok: boolean; reason: string }>
  heartbeat: (sec: number) => Promise<void>
  tickLocal: () => void
  fine: (kind: 'radar' | 'redlight' | 'wrongway', speed: number, limit: number, where: string) => Promise<void>
  clearFine: () => void
}

const BLANK: WalletData = { connected: false, loaded: false, balance: 0, playSec: 0, tier: '', unlimited: false, canDrive: true, bhm: 440000 }
let fineId = 1

async function call(path: string, body?: unknown): Promise<Record<string, unknown> | null> {
  const t = rd(SESSION); if (!t) return null
  try {
    const r = await fetch(api() + path, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + t, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
    if (r.status === 401) return { _unauth: true }
    if (!r.ok) return null
    return (await r.json()) as Record<string, unknown>
  } catch { return null }
}
const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d)

export const useWallet = create<WalletStore>((set, get) => {
  const apply = (j: Record<string, unknown> | null) => {
    if (!j) return false
    if (j._unauth) { set({ ...BLANK, loaded: true }); return false }
    if (j.balance === undefined) return false
    set({ connected: true, loaded: true, balance: num(j.balance), playSec: num(j.play_sec), tier: String(j.tier || ''), unlimited: !!j.unlimited_time, canDrive: j.can_drive !== false, bhm: num(j.bhm, 440000) })
    return true
  }
  return {
    ...BLANK, fineCard: null, radarAhead: 0,
    async refresh() { if (!rd(SESSION)) { set({ ...BLANK, loaded: true }); return } apply(await call('/wallet/me')) },
    async gate() {
      await get().refresh()
      const w = get()
      if (!w.connected) return { ok: true, reason: '' }
      if (w.balance <= 0) return { ok: false, reason: "Hamyon bo'sh: radar jarimalari balansni tugatdi. Saytda test yechib pul ishlang, keyin yana haydang." }
      if (w.tier === '' && w.playSec <= 0) return { ok: false, reason: "Bepul shahar vaqti tugadi. Saytda test yeching: har to'g'ri javobga +18 soniya beriladi." }
      return { ok: true, reason: '' }
    },
    async heartbeat(sec) { if (!get().connected || get().tier !== '') return; apply(await call('/wallet/play', { sec })) },
    tickLocal() { const w = get(); if (!w.connected || w.unlimited) return; set({ playSec: Math.max(0, w.playSec - 1) }) },
    async fine(kind, speed, limit, where) {
      if (!get().connected) return
      const j = await call('/wallet/fine', { kind, speed: Math.round(speed), limit, where })
      if (!j || j._unauth) return
      const fine = num(j.fine)
      if (!apply(j)) return
      if (fine > 0) set({ fineCard: { id: fineId++, kind, brv: num(j.brv), repeat: num(j.repeat), speed: Math.round(speed), limit, fine, balance: num(j.balance), where } })
    },
    clearFine() { set({ fineCard: null }) },
  }
})

export const fmtSom = (n: number) => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

;(window as unknown as { __wallet?: unknown }).__wallet = useWallet   // sinov uchun
