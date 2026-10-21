/**
 * Chorraha ilovasi bilan integratsiya: tarifni asosiy ilova saqlagan localStorage ('yoldosh_v1') dan o'qiydi.
 * Tariflar: Pro < Premium < Max. Har mashinaning o'z tarifi bor (CAR_TIER).
 *   O'z tarifi (va undan past) mashinalar — kuniga 5 soat;
 *   Pro egasi: Premium mashinalar kuniga 10 daqiqa, Max mashinalar 3 daqiqa;
 *   Premium egasi: Max mashinalar kuniga 3 daqiqa.
 *   Max egasi: hamma mashina, cheksiz.
 *   Tarifsiz (bepul): faqat Cobalt, 5 soat ichida jami 2 daqiqa.
 * Mustaqil ishga tushirilsa (kalit yo'q) — hamma narsa ochiq (dev rejimi).
 */
const KEY = 'yoldosh_v1'
const FREE_SEC = 120
const WINDOW = 5 * 3600e3
const OWN_SEC = 5 * 3600
export type Tier = 'free' | 'pro' | 'premium' | 'max'
const RANK: Record<Tier, number> = { free: 0, pro: 1, premium: 2, max: 3 }
export const TIER_NAME: Record<Tier, string> = { free: 'BEPUL', pro: 'PRO', premium: 'PREMIUM', max: 'MAX' }
/** mashina → eng past tarif */
export const CAR_TIER: Record<string, Tier> = { cobalt: 'pro', nexia: 'pro', sedan: 'pro', malibu: 'pro', isuzu: 'pro', gclass: 'premium', porsche: 'premium', mc20: 'max', lotus: 'max', divo: 'max' }
const carTier = (id: string): Tier => CAR_TIER[id] ?? 'max'

interface Saved { sub?: { until: number; tier?: string }; trialUntil?: number; grants?: Record<string, number>; uid?: string; school?: { paid?: boolean }; drv?: { t0: number; used: number }; drv2?: { d: string; u: Record<string, number> }; plate?: string; name?: string; role?: string }

function read(): Saved | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Saved) : null } catch { return null }
}
function write(mut: (s: Saved) => void) {
  try { const raw = localStorage.getItem(KEY); const s: Saved = raw ? JSON.parse(raw) : {}; mut(s); localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* e'tiborsiz */ }
}
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }

export interface Access {
  standalone: boolean
  tier: Tier
  plate: string
  reopenAt: number
  /** shu mashinada kuniga ruxsat etilgan soniya (0 = yopiq, Infinity = cheksiz) */
  limit: (id: string) => number
  /** bugun shu mashina uchun qolgan soniya */
  left: (id: string) => number
}

function tierOf(s: Saved): Tier {
  const now = Date.now()
  if (s.sub && s.sub.until > now) { const t = s.sub.tier; return t === 'premium' || t === 'max' ? t : 'pro' }
  if ((s.uid && s.grants && (s.grants[s.uid] ?? 0) > now) || s.school?.paid) return 'premium'
  if (s.trialUntil && s.trialUntil > now) return 'pro'
  return 'free'
}
function used(s: Saved, pool: string): number {
  if (pool === 'free') { const d = s.drv; return d && d.t0 && Date.now() - d.t0 < WINDOW ? d.used : 0 }
  return s.drv2 && s.drv2.d === dayKey() ? (s.drv2.u[pool] ?? 0) : 0
}

export function getAccess(): Access {
  const s = read()
  if (!s) return { standalone: true, tier: 'max', plate: '01 A 777 AA', reopenAt: 0, limit: () => Infinity, left: () => Infinity }
  const tier = tierOf(s)
  const limit = (id: string): number => {
    if (tier === 'free') return id === 'cobalt' ? FREE_SEC : 0
    if (tier === 'max') return Infinity   // Max: hamma mashina, cheksiz
    const c = carTier(id)
    if (RANK[c] <= RANK[tier]) return OWN_SEC
    return c === 'premium' ? 600 : 180
  }
  const pool = (id: string) => (tier === 'free' ? 'free' : carTier(id))
  const left = (id: string) => Math.max(0, limit(id) - used(s, pool(id)))
  return { standalone: false, tier, plate: s.plate || '01 A 777 AA', reopenAt: s.drv?.t0 ? s.drv.t0 + WINDOW : 0, limit, left }
}

/** shu mashinada sarflangan soniyalarni yozish */
export function useSeconds(id: string, sec: number) {
  write((s) => {
    if (tierOf(s) === 'free') {
      let drv = s.drv ?? { t0: 0, used: 0 }
      if (drv.t0 && Date.now() - drv.t0 >= WINDOW) drv = { t0: 0, used: 0 }
      if (!drv.t0) drv.t0 = Date.now()
      drv.used = Math.min(FREE_SEC, drv.used + sec)
      s.drv = drv
      return
    }
    const d = dayKey(), p = carTier(id)
    if (!s.drv2 || s.drv2.d !== d) s.drv2 = { d, u: {} }
    s.drv2.u[p] = (s.drv2.u[p] ?? 0) + sec
  })
}

export const hhmm = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
/** 600 → "10 daq", 18000 → "5 soat" */
export const fmtLimit = (sec: number) => (sec >= 3600 ? `${Math.round(sec / 3600)} soat` : `${Math.round(sec / 60)} daq`)
