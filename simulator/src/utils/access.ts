/**
 * Yo'ldosh AI ilovasi bilan integratsiya: Premium/bepul holatni asosiy ilova saqlagan localStorage ('yoldosh_v1') dan o'qiydi.
 *   Premium (yoki bepul sinov, ustoz bergan Premium, maktab to'lagan): cheksiz vaqt va hamma mashina.
 *   Bepul: 5 soat ichida jami 2 daqiqa va faqat free:true mashina (Cobalt).
 * Mustaqil ishga tushirilsa (kalit yo'q) — hamma narsa ochiq (dev rejimi).
 */
const KEY = 'yoldosh_v1'
const FREE_SEC = 120
const WINDOW = 5 * 3600e3

interface Saved { sub?: { until: number }; trialUntil?: number; grants?: Record<string, number>; uid?: string; school?: { paid?: boolean }; drv?: { t0: number; used: number }; plate?: string; name?: string; role?: string }

function read(): Saved | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Saved) : null } catch { return null }
}
function write(mut: (s: Saved) => void) {
  try { const raw = localStorage.getItem(KEY); const s: Saved = raw ? JSON.parse(raw) : {}; mut(s); localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* e'tiborsiz */ }
}

export interface Access { standalone: boolean; premium: boolean; freeLeft: number; reopenAt: number; plate: string }

export function getAccess(): Access {
  const s = read()
  if (!s) return { standalone: true, premium: true, freeLeft: Infinity, reopenAt: 0, plate: '01 A 777 AA' }
  const now = Date.now()
  const premium = !!((s.sub && s.sub.until > now) || (s.trialUntil && s.trialUntil > now) || (s.uid && s.grants && (s.grants[s.uid] ?? 0) > now) || s.school?.paid)
  let drv = s.drv ?? { t0: 0, used: 0 }
  if (drv.t0 && now - drv.t0 >= WINDOW) drv = { t0: 0, used: 0 }
  return { standalone: false, premium, freeLeft: premium ? Infinity : Math.max(0, FREE_SEC - drv.used), reopenAt: drv.t0 ? drv.t0 + WINDOW : 0, plate: s.plate || '01 A 777 AA' }
}

/** bepul vaqtdan sarflangan soniyalarni yozish */
export function useFreeSeconds(sec: number) {
  write((s) => {
    let drv = s.drv ?? { t0: 0, used: 0 }
    if (drv.t0 && Date.now() - drv.t0 >= WINDOW) drv = { t0: 0, used: 0 }
    if (!drv.t0) drv.t0 = Date.now()
    drv.used = Math.min(FREE_SEC, drv.used + sec)
    s.drv = drv
  })
}

export const hhmm = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
