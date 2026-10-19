import crypto from 'node:crypto';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const DAY = 86400000;
export const TZ = 5 * 3600000; // Toshkent, UTC+5 (yozgi vaqt yo'q)

export function dayStart(ts = Date.now()) { const t = ts + TZ; return t - (t % DAY) - TZ; }
export function weekStart(ts = Date.now()) {
  const d = dayStart(ts);
  const dow = new Date(d + TZ).getUTCDay(); // 0 = yakshanba
  return d - ((dow + 6) % 7) * DAY;
}
export function monthStart(ts = Date.now()) {
  const t = new Date(ts + TZ);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - TZ;
}
export function periodRange(p, now = Date.now()) {
  if (p === 'd') return [dayStart(now), now + 1];
  if (p === 'w') return [weekStart(now), now + 1];
  if (p === 'm') return [monthStart(now), now + 1];
  return [0, now + 1];
}
export const PERIOD_NAME = { d: 'Bugun', w: 'Shu hafta', m: 'Shu oy', a: 'Umumiy' };

const pad = (n) => String(n).padStart(2, '0');
export function tashkent(ts = Date.now()) {
  const d = new Date(ts + TZ);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay() };
}
export function fmtDate(ts) { const t = tashkent(ts); return `${pad(t.d)}.${pad(t.mo)}.${t.y} ${pad(t.h)}:${pad(t.mi)}`; }
export function hhmm(ts = Date.now()) { const t = tashkent(ts); return `${pad(t.h)}:${pad(t.mi)}`; }
export function dateKey(ts = Date.now()) { const t = tashkent(ts); return `${t.y}-${pad(t.mo)}-${pad(t.d)}`; }

// "14:30" yoki "25.10 14:30" yoki "25.10.2026 14:30" -> timestamp (Toshkent vaqti)
export function parseWhen(s, now = Date.now()) {
  const m = String(s).trim().match(/^(?:(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\s+)?(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const t = tashkent(now);
  const y = m[3] ? +m[3] : t.y, mo = m[2] ? +m[2] : t.mo, d = m[1] ? +m[1] : t.d;
  let ts = Date.UTC(y, mo - 1, d, +m[4], +m[5]) - TZ;
  if (!m[1] && ts <= now) ts += DAY;
  return ts;
}

export function fmtDur(ms) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : `${s} soniya`;
}

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const trunc = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

export function displayName(u) {
  if (!u) return 'Foydalanuvchi';
  if (u.username) return '@' + u.username;
  const n = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return n || 'Foydalanuvchi';
}
export const nameHtml = (u) => esc(displayName(u));
export const linkHtml = (u) => `<a href="tg://user?id=${u.id}">${esc([u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.id)}</a>`;

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const MEDALS = ['🥇', '🥈', '🥉'];
export const rankIcon = (i) => MEDALS[i] || `${i + 1}.`;
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }
