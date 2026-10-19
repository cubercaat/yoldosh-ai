import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CFG } from './config.js';

fs.mkdirSync(path.dirname(CFG.db), { recursive: true });
export const db = new DatabaseSync(CFG.db);
db.exec(`
PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT, first_name TEXT, last_name TEXT,
  started INTEGER DEFAULT 0, blocked INTEGER DEFAULT 0, ref_by INTEGER,
  created_at INTEGER, last_seen INTEGER);
CREATE TABLE IF NOT EXISTS chats(
  id INTEGER PRIMARY KEY, title TEXT, username TEXT, type TEXT,
  active INTEGER DEFAULT 1, is_admin INTEGER DEFAULT 0, members INTEGER DEFAULT 0,
  ads INTEGER DEFAULT 1, banned INTEGER DEFAULT 0, start_mode TEXT DEFAULT 'all', summary INTEGER DEFAULT 1,
  added_by INTEGER, added_at INTEGER, last_game INTEGER, games INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS games(
  id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, starter INTEGER, kind TEXT,
  total INTEGER, seconds INTEGER, topic TEXT, exam INTEGER DEFAULT 0, status TEXT,
  asked INTEGER DEFAULT 0, players INTEGER DEFAULT 0, created_at INTEGER, finished_at INTEGER);
CREATE TABLE IF NOT EXISTS answers(
  game_id INTEGER, chat_id INTEGER, user_id INTEGER, qn INTEGER, idx INTEGER,
  correct INTEGER, ms INTEGER, at INTEGER, PRIMARY KEY(game_id, qn, user_id));
CREATE INDEX IF NOT EXISTS ans_at ON answers(at);
CREATE INDEX IF NOT EXISTS ans_chat_at ON answers(chat_id, at);
CREATE INDEX IF NOT EXISTS ans_user_at ON answers(user_id, at);
CREATE TABLE IF NOT EXISTS used_q(chat_id INTEGER, qn INTEGER, PRIMARY KEY(chat_id, qn));
CREATE TABLE IF NOT EXISTS file_ids(path TEXT PRIMARY KEY, file_id TEXT);
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS ads(
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, src_chat INTEGER, src_msg INTEGER,
  buttons TEXT, auto INTEGER DEFAULT 0, uses INTEGER DEFAULT 0, created_at INTEGER);
CREATE TABLE IF NOT EXISTS broadcasts(
  id INTEGER PRIMARY KEY AUTOINCREMENT, src_chat INTEGER, src_msg INTEGER, buttons TEXT,
  target TEXT, pin INTEGER DEFAULT 0, status TEXT, total INTEGER DEFAULT 0, sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0, created_by INTEGER, created_at INTEGER, scheduled_at INTEGER,
  finished_at INTEGER, note TEXT);
CREATE TABLE IF NOT EXISTS contests(
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, prize TEXT, scope TEXT, metric TEXT,
  winners INTEGER, min_answers INTEGER, start_at INTEGER, end_at INTEGER, gift_id TEXT,
  status TEXT, result TEXT, created_by INTEGER, created_at INTEGER);
`);

const cache = new Map();
const st = (sql) => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
const norm = (a) => a.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
export const all = (sql, ...a) => st(sql).all(...norm(a));
export const get = (sql, ...a) => st(sql).get(...norm(a));
export const run = (sql, ...a) => st(sql).run(...norm(a));

// --- Sozlamalar ---
const DEFAULTS = {
  footer_on: 1,
  footer_text: [
    "🚗 <b>Haydovchilik imtihoniga tayyorlanyapsizmi?</b>\n1276 ta rasmiy savol, har biriga izoh va imtihon simulyatori — <b>chorrahaa.uz</b>",
    "📲 Imtihonni birinchi urinishda topshiring! Barcha savollar, video darslar va 3D avtodrom — <b>chorrahaa.uz</b>",
    "🏆 Bu yerda bellashdingiz — endi to'liq tayyorlaning: <b>chorrahaa.uz</b> da bepul boshlang!",
  ].join('\n---\n'),
  auto_every: 3,
  daily_on: 0, daily_time: '12:00', daily_target: 'groups', daily_last: '',
  summary_on: 1, summary_time: '21:00', summary_last: '',
  default_seconds: 20,
  promo_in_expl: 1,
};
export function getSetting(k) {
  const r = get('SELECT v FROM settings WHERE k=?', k);
  if (!r) return DEFAULTS[k];
  try { return JSON.parse(r.v); } catch { return r.v; }
}
export function setSetting(k, v) { run('INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', k, JSON.stringify(v)); }

// --- Foydalanuvchi va chatlar ---
export function upsertUser(u, { started = 0 } = {}) {
  if (!u || u.is_bot) return false;
  const now = Date.now();
  const existed = get('SELECT id FROM users WHERE id=?', u.id);
  run(`INSERT INTO users(id,username,first_name,last_name,started,created_at,last_seen) VALUES(?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name,
       last_name=excluded.last_name, last_seen=excluded.last_seen, started=MAX(users.started, excluded.started)`,
  u.id, u.username || null, u.first_name || null, u.last_name || null, started ? 1 : 0, now, now);
  if (started) run('UPDATE users SET blocked=0 WHERE id=?', u.id);
  return !existed;
}

export function upsertChat(c, extra = {}) {
  if (!c || c.type === 'private') return;
  const now = Date.now();
  run(`INSERT INTO chats(id,title,username,type,added_at) VALUES(?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, username=excluded.username, type=excluded.type`,
  c.id, c.title || null, c.username || null, c.type, now);
  for (const [k, v] of Object.entries(extra)) {
    if (!/^[a-z_]+$/.test(k)) continue;
    run(`UPDATE chats SET ${k}=? WHERE id=?`, v, c.id);
  }
}
export const getChat = (id) => get('SELECT * FROM chats WHERE id=?', id);

// Guruh superguruhga aylansa — id yangilanadi
export function migrateChat(oldId, newId) {
  if (!get('SELECT id FROM chats WHERE id=?', newId)) run('UPDATE chats SET id=? WHERE id=?', newId, oldId);
  else run('UPDATE chats SET active=0 WHERE id=?', oldId);
  run('UPDATE answers SET chat_id=? WHERE chat_id=?', newId, oldId);
  run('UPDATE games SET chat_id=? WHERE chat_id=?', newId, oldId);
  run('UPDATE OR IGNORE used_q SET chat_id=? WHERE chat_id=?', newId, oldId);
}
