/* Chorraha — backend (Cloudflare Worker). Uchta vazifa:
 *   POST /telegram  — talaba xabarini ustozning Telegramiga yuboradi
 *   POST /ai        — AI yordamchi (Claude)
 *   POST /vision    — kamera suratidagi yo'l belgisini aniqlaydi (Claude ko'rish)
 *   POST /auth/start — ro'yxatdan o'tish uchun bir martalik token yaratadi (saytdagi "Telegram orqali davom etish")
 *   POST /auth/check — token Telegramda tasdiqlanganmi? (ha bo'lsa: talabaning Telegram ma'lumoti)
 *   POST /telegram/webhook — Telegram shu manzilga xabar yuboradi (botga Start bosilganda)
 * Sirlar (wrangler secret put ...): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ANTHROPIC_API_KEY, WEBHOOK_SECRET
 * O'zgaruvchilar: ALLOWED_ORIGIN (saytingiz manzili), BOT_USERNAME (@siz), SITE_URL (https://.../ ), KV namespace: AUTH
 */
import { handleStaff, decideOrder, notifyOrder, runChunk, createBroadcast, kickBroadcast, signBc, PERMS, applyBotProfile } from './staff.js';
import { missingChannels, subText, subKeyboard, tgCall } from './fsub.js';
import { payRoutes } from './pay.js';
import { extras, runDaily, onDailyCallback, onDailyCommand, bump } from './extras.js';
const MODEL = 'claude-haiku-4-5-20251001';
const SYSTEM = `Sen Chorraha — avtomaktab talabalari uchun yo'l harakati qoidalari bo'yicha yordamchisan.
O'zbek tilida (lotin), sodda, qisqa va do'stona javob ber. Murakkab atamalarni oddiy so'z bilan tushuntir va eslab qolish usulini ayt.
Aniq raqam yoki jarima haqida ishonching komil bo'lmasa, "ustozingizdan tasdiqlang" de. Mavzudan tashqari savollarga muloyim rad javobi ber.`;


/* ---- Telegram orqali ro'yxatdan o'tish (deep-link) ---- */
const TTL = 900;                                   // token 15 daqiqa yashaydi
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const newToken = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const tgSend = (env, chat_id, text, button) => fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id, text, ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}) }) });
const siteUrl = (env) => (env.SITE_URL || '').replace(/#.*$/, '').replace(/\/?$/, '/');

/** Telegram ma'lumotini tasdiqlangan deb yozadi va "Saytga qaytish" tugmasini yuboradi */
async function confirmLogin(env, chatId, from, token) {
  const u = { id: from.id, username: from.username || '', first: from.first_name || '', last: from.last_name || '' };
  await env.AUTH.put('c:' + token, JSON.stringify(u), { expirationTtl: TTL });
  await tgSend(env, chatId, `✅ Tasdiqlandi, ${u.first || "do'st"}!

Endi saytga qayting: ism-familyangizni yozing va o'qishni boshlang.`, { text: 'Saytga qaytish', url: siteUrl(env) + '#/tg/' + token });
}

/** Majburiy obuna: a'zo bo'lmagan kanal bo'lsa, to'siq xabarini yuboradi va false qaytaradi */
async function subGate(env, chatId, userId, token) {
  const miss = await missingChannels(env, userId); if (!miss.length) return true;
  await tgCall(env, 'sendMessage', { chat_id: chatId, text: subText(miss), reply_markup: { inline_keyboard: subKeyboard(miss, token) } });
  return false;
}

/** «✅ Tekshirish» tugmasi (oddiy foydalanuvchi): obuna bo'lgan bo'lsa ro'yxatdan o'tish davom etadi */
async function onSubCheck(env, q) {
  const mm = /^fsc:([A-Za-z0-9_-]{20,64})$/.exec(String((q && q.data) || ''));
  if (!mm || !q.from || !q.message || q.message.chat.type !== 'private') return;
  const token = mm[1], ans = (text, alert) => tgCall(env, 'answerCallbackQuery', { callback_query_id: q.id, text, show_alert: !!alert });
  if (!(await env.AUTH.get('p:' + token))) { await ans("Bu havola eskirgan. Saytga qaytib «Telegram orqali davom etish» tugmasini qayta bosing.", true); return; }
  if ((await missingChannels(env, q.from.id)).length) { await ans("Siz hali obuna bo'lmagansiz. Kanalga o'tib obuna bo'ling, keyin qayta bosing.", true); return; }
  await ans();
  await tgCall(env, 'deleteMessage', { chat_id: q.message.chat.id, message_id: q.message.message_id });
  await confirmLogin(env, q.message.chat.id, q.from, token);
}

async function onUpdate(env, upd) {
  if (upd && upd.callback_query) return /^dq:/.test(String(upd.callback_query.data || '')) ? onDailyCallback(env, upd.callback_query) : onSubCheck(env, upd.callback_query);
  const m = upd && upd.message; if (!m || !m.from || m.chat.type !== 'private') return;
  if (await onDailyCommand(env, m)) return;
  const text = String(m.text || ''), arg = (/^\/start(?:@\w+)?\s+(\S+)/.exec(text) || [])[1];
  if (arg && TOKEN_RE.test(arg)) {
    const pending = await env.AUTH.get('p:' + arg);
    if (!pending) { await tgSend(env, m.chat.id, "Bu havola eskirgan yoki noto'g'ri. Iltimos, saytga qaytib «Telegram orqali davom etish» tugmasini qayta bosing."); return; }
    if (!(await subGate(env, m.chat.id, m.from.id, arg))) return;
    await confirmLogin(env, m.chat.id, m.from, arg);
    return;
  }
  if (/^\/start/.test(text)) await tgSend(env, m.chat.id, "Salom! Men Chorraha botiman. Ro'yxatdan o'tish uchun saytga kiring va «Telegram orqali davom etish» tugmasini bosing.", { text: 'Saytni ochish', url: siteUrl(env) });
}

/* ---- Sessiya (HMAC imzoli token) va foydalanuvchilar bazasi (D1) ---- */
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(env, data) { const k = await crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(data))); }
async function makeSession(env, uid) { const exp = Date.now() + 90 * 864e5, p = uid + '.' + exp; return p + '.' + await hmac(env, p); }
async function readSession(env, req) {
  const m = /^Bearer (\d+\.\d+\.[A-Za-z0-9_-]+)$/.exec(req.headers.get('authorization') || ''); if (!m || !env.SESSION_SECRET) return null;
  const [uid, exp, sig] = m[1].split('.'); if (Date.now() > +exp) return null;
  const ok = await hmac(env, uid + '.' + exp); if (ok.length !== sig.length) return null; let d = 0; for (let i = 0; i < ok.length; i++) d |= ok.charCodeAt(i) ^ sig.charCodeAt(i); return d === 0 ? +uid : null;
}
/* ---- Admin kirishi: login + parol (PBKDF2 xesh serverda sir sifatida), alohida admin sessiyasi ---- */
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function pbkdf2(pass, salt, iter) { const k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256)); }
async function checkAdminCred(env, user, pass) {            // ADMIN_CRED = login:iter:salt(b64u):hash(b64u)
  const [lg, it, salt, hash] = String(env.ADMIN_CRED || '').split(':'); if (!lg || !hash) return false;
  const got = await pbkdf2(String(pass || ''), unb64(salt), +it || 100000), want = unb64(hash); let d = got.length ^ want.length; for (let i = 0; i < want.length; i++) d |= (got[i] || 0) ^ want[i];
  const a = enc.encode(String(user || '').toLowerCase()), bb = enc.encode(lg.toLowerCase()); let e = a.length ^ bb.length; for (let i = 0; i < bb.length; i++) e |= (a[i] || 0) ^ bb[i];
  return d === 0 && e === 0;
}
async function makeAdminSession(env) { const exp = Date.now() + 12 * 36e5, p = 'a.' + exp; return p + '.' + await hmac(env, p); }
async function readAdminSession(env, req) {
  const m = /^Bearer a\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(req.headers.get('authorization') || ''); if (!m || !env.SESSION_SECRET) return false;
  if (Date.now() > +m[1]) return false; const ok = await hmac(env, 'a.' + m[1]); if (ok.length !== m[2].length) return false; let d = 0; for (let i = 0; i < ok.length; i++) d |= ok.charCodeAt(i) ^ m[2].charCodeAt(i); return d === 0;
}
const adminAllowed = async (env, req) => (await readAdminSession(env, req)) || isAdminUser(env, await sessionUser(env, req));
const isAdminUser = (env, u) => !!u && String(env.ADMIN_TG_IDS || '').split(',').map(s => s.trim()).includes(String(u.tg_id));
const sessionUser = async (env, req) => { const uid = await readSession(env, req); return uid ? await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first() : null; };
const num = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));
const pubSchool = (s) => ({ id: s.id, name: s.name, region: s.region, city: s.city, address: s.address, phone: s.phone, price: s.price, hours: s.hours, note: s.note, telegram: s.telegram });
const BATTLE_RE = /^YB-[A-Za-z0-9]{3,8}-\d+-[A-Za-z0-9_]+-\d+-\d+$/;
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
export const TIERS = { pro: { name: 'Pro', price: 99000 }, premium: { name: 'Premium', price: 139000 }, max: { name: 'Max', price: 149000 } };
const tierOf = (u) => (u.prem_until || 0) > Date.now() ? (u.prem_tier in TIERS ? u.prem_tier : 'pro') : '';
const TRANK = { '': 0, pro: 1, premium: 2, max: 3 };
/** foydalanuvchining amaldagi tarifi (admin = max) */
const effTier = (env, u) => (u && isAdminUser(env, u)) ? 'max' : tierOf(u || {});
const hasTier = (env, u, min) => TRANK[effTier(env, u)] >= TRANK[min];
const need = (env, min) => json(env, { error: `Bu imkoniyat ${TIERS[min].name} tarifidan boshlab ochiladi`, need: min }, 403);
const WEEK = 7 * 864e5, TZ = 5 * 36e5;
const weekKey = (ms) => Math.floor((ms + TZ - 4 * 864e5) / WEEK);   // dushanbadan boshlanadigan hafta (Toshkent)
const ROOMS = { premium: 'premium', max: 'max' };
const roomOk = (env, u, room) => room === 'premium' ? hasTier(env, u, 'premium') : room === 'max' ? hasTier(env, u, 'max') : false;
/** KV asosidagi oddiy hisoblagich: true = limit oshdi */
async function over(env, key, max, ttl) {
  try { const n = +(await env.AUTH.get(key)) || 0; if (n >= max) return true; await env.AUTH.put(key, String(n + 1), { expirationTtl: Math.max(60, ttl) }); } catch (e) { }
  return false;
}
const dayKey = () => Math.floor((Date.now() + TZ) / 864e5);
const tooMany = (env) => json(env, { error: "Juda ko'p so'rov. Birozdan keyin urinib ko'ring." }, 429);
let _mig = false;
/** D1 da migratsiya yo'q: yangi ustunlar birinchi so'rovda qo'shiladi (bor bo'lsa xato e'tiborsiz) */
async function migrate(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    "CREATE TABLE IF NOT EXISTS chat_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL, tier TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'text', body TEXT NOT NULL DEFAULT '', voice_id INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL)",
    "CREATE INDEX IF NOT EXISTS chat_room ON chat_msgs (room, id)",
    "CREATE TABLE IF NOT EXISTS chat_voice (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, mime TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, start INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', link TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL)",
    "CREATE INDEX IF NOT EXISTS lessons_user ON lessons (user_id, start)"]) {
    try { await env.DB.prepare(q).run(); } catch (e) { }
  }
  /* ochiq repoda yozilib qolgan eski promokod: o'chiriladi (egasi o'ziga admin paneldan yangi kod yaratadi) */
  try { await env.DB.prepare("UPDATE promos SET active = 0 WHERE code = 'ZAFXSX'").run(); } catch (e) { }
  for (const q of ["ALTER TABLE users ADD COLUMN prem_tier TEXT NOT NULL DEFAULT ''", "ALTER TABLE promos ADD COLUMN tier TEXT NOT NULL DEFAULT ''", "ALTER TABLE promos ADD COLUMN percent INTEGER NOT NULL DEFAULT 0", "ALTER TABLE promos ADD COLUMN note TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN tier TEXT NOT NULL DEFAULT ''", "ALTER TABLE orders ADD COLUMN promo TEXT NOT NULL DEFAULT ''", "ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0"]) {
    try { await env.DB.prepare(q).run(); } catch (e) { }
  }
}
/** promokodni tekshirish: { p } yoki { error } */
async function findPromo(env, code, userId) {
  code = clean(code, 24).toUpperCase(); if (!code) return { error: 'kod kiriting' };
  const p = await env.DB.prepare('SELECT * FROM promos WHERE code = ? AND active = 1').bind(code).first();
  if (!p || (p.expires && p.expires < Date.now())) return { error: "Promokod noto'g'ri yoki muddati tugagan" };
  if (p.max_uses && p.used >= p.max_uses) return { error: 'Promokod limiti tugagan' };
  if (userId) { const had = await env.DB.prepare('SELECT 1 x FROM promo_uses WHERE promo_id = ? AND user_id = ?').bind(p.id, userId).first(); if (had) return { error: 'Siz bu kodni ishlatgansiz' }; }
  return { p };
}
const pubPromo = (p) => ({ code: p.code, days: p.days, tier: p.days > 0 ? (p.tier in TIERS ? p.tier : 'premium') : '', percent: p.percent || 0 });
/** sovg'a promokodni qo'llash (Premium kunlari) */
async function giftPromo(env, p, u) {
  const tier = p.tier in TIERS ? p.tier : 'premium', until = Math.max(Date.now(), u.prem_until || 0) + p.days * 864e5;
  await env.DB.batch([env.DB.prepare('INSERT INTO promo_uses (promo_id, user_id, at) VALUES (?,?,?)').bind(p.id, u.id, Date.now()), env.DB.prepare('UPDATE promos SET used = used + 1 WHERE id = ?').bind(p.id), env.DB.prepare('UPDATE users SET prem_until = ?, prem_tier = ? WHERE id = ?').bind(until, tier, u.id)]);
  return { until, tier };
}
const pubUser = (u, env) => ({ admin: env ? isAdminUser(env, u) : false, prem_until: u.prem_until || 0, prem_tier: tierOf(u), id: u.id, first: u.first, last: u.last, region: u.region, group: u.group_code, points: u.points, username: u.username });

let _origin = '';
const cors = (env) => ({ 'access-control-allow-origin': (() => { const l = String(env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim()); return l.includes('*') ? '*' : (l.includes(_origin) ? _origin : l[0]); })(), 'vary': 'origin', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
const json = (env, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(env) } });

async function claude(env, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM, ...body }) });
  if (!r.ok) throw new Error('AI xatosi ' + r.status);
  const j = await r.json(); return (j.content || []).map(c => c.text || '').join('').trim();
}

const H = { json, cors, sessionUser, adminAllowed, over, tooMany, hmac };

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(runDaily(env).catch(e => console.error('daily', e && e.stack || e))); },
  async fetch(req, env, ctx) {
    _origin = req.headers.get('origin') || '';
    if (req.method !== 'OPTIONS') await migrate(env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    const url = new URL(req.url);
    if (url.pathname.startsWith('/pay/')) { const pr = await payRoutes(env, req, url, H); if (pr) return pr; }
    if (/^\/(ev$|story\/|autodrom\/|admin\/(ev|ad|stor))/.test(url.pathname)) { const ex = await extras(env, ctx, req.clone(), url, H); if (ex) return ex; }
    if (req.method === 'GET') {
      try {
        if (url.pathname === '/rank') {
          const tq = url.searchParams.get('tier') || '', rq = clean(url.searchParams.get('region') || '', 40);
          const viewer = (tq || rq) ? await sessionUser(env, req) : null;
          if (tq) { if (!(tq in TIERS)) return json(env, { error: 'tarif xato' }, 400); if (!hasTier(env, viewer, tq)) return need(env, tq); }
          if (rq && !hasTier(env, viewer, 'pro')) return need(env, 'pro');
          const where = ['points > 0'], args = [];
          if (tq) { where.push('prem_tier = ?', 'prem_until > ?'); args.push(tq, Date.now()); }
          if (rq) { where.push('region = ?'); args.push(rq); }
          const rows = await env.DB.prepare(`SELECT first, last, region, points, prem_until, prem_tier FROM users WHERE ${where.join(' AND ')} ORDER BY points DESC LIMIT 100`).bind(...args).all();
          return json(env, { top: (rows.results || []).map(r => ({ name: r.first + ' ' + String(r.last || '').slice(0, 1) + '.', region: r.region, points: r.points, prem: (r.prem_until || 0) > Date.now(), tier: tierOf(r) })) });
        }
        if (url.pathname === '/chat/list') {
          const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
          const room = url.searchParams.get('room') || ''; if (!(room in ROOMS)) return json(env, { error: 'xona yoq' }, 400);
          if (!roomOk(env, u, room)) return need(env, room);
          const after = num(url.searchParams.get('after'), 0, 1e12);
          const rows = after
            ? await env.DB.prepare('SELECT id, user_id, name, tier, kind, body, voice_id, ts FROM chat_msgs WHERE room = ? AND id > ? ORDER BY id ASC LIMIT 100').bind(room, after).all()
            : await env.DB.prepare('SELECT id, user_id, name, tier, kind, body, voice_id, ts FROM (SELECT * FROM chat_msgs WHERE room = ? ORDER BY id DESC LIMIT 60) ORDER BY id ASC').bind(room).all();
          return json(env, { me: u.id, can_voice: room === 'max', msgs: (rows.results || []).map(m => ({ id: m.id, uid: m.user_id, name: m.name, tier: m.tier, kind: m.kind, text: m.body, voice: m.voice_id, ts: m.ts })) });
        }
        if (url.pathname.startsWith('/chat/voice/')) {
          const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
          const v = await env.DB.prepare('SELECT room, mime, data FROM chat_voice WHERE id = ?').bind(num(url.pathname.slice(12), 0, 1e12)).first();
          if (!v) return json(env, { error: 'topilmadi' }, 404); if (!roomOk(env, u, v.room)) return need(env, v.room);
          const bin = Uint8Array.from(atob(v.data), c => c.charCodeAt(0));
          return new Response(bin, { headers: { 'content-type': v.mime, 'cache-control': 'private, max-age=86400', ...cors(env) } });
        }
        if (url.pathname === '/lesson/mine') {
          const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
          const rows = await env.DB.prepare('SELECT id, start, note, status, link FROM lessons WHERE user_id = ? ORDER BY start DESC LIMIT 20').bind(u.id).all();
          return json(env, { lessons: rows.results || [], max: hasTier(env, u, 'max') });
        }
        if (url.pathname === '/admin/lessons') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const rows = await env.DB.prepare("SELECT l.id, l.user_id, l.name, l.start, l.note, l.status, l.link, u.username FROM lessons l LEFT JOIN users u ON u.id = l.user_id WHERE l.status IN ('pending','confirmed') AND l.start > ? ORDER BY l.start ASC LIMIT 100").bind(Date.now() - 36e5).all();
          return json(env, { lessons: rows.results || [] });
        }
        if (url.pathname === '/me') {
          const uid = await readSession(env, req); if (!uid) return json(env, { error: 'kirish kerak' }, 401);
          const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first(); if (!u) return json(env, { error: 'topilmadi' }, 404);
          const st = await env.DB.prepare('SELECT json FROM state WHERE user_id = ?').bind(uid).first();
          return json(env, { user: pubUser(u, env), state: st ? JSON.parse(st.json) : null });
        }
        if (url.pathname === '/schools') {
          const reg = clean(url.searchParams.get('region'), 40);
          const rows = reg ? await env.DB.prepare('SELECT * FROM schools WHERE active = 1 AND region = ? ORDER BY name').bind(reg).all() : await env.DB.prepare('SELECT * FROM schools WHERE active = 1 ORDER BY region, name').all();
          return json(env, { schools: (rows.results || []).map(pubSchool) });
        }
        if (url.pathname === '/admin/schools') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const rows = await env.DB.prepare('SELECT s.*, (SELECT COUNT(*) FROM leads l WHERE l.school_id = s.id) AS leads FROM schools s ORDER BY s.region, s.name').all();
          return json(env, { schools: (rows.results || []).map(s => ({ ...pubSchool(s), active: !!s.active, leads: s.leads, free_until: s.free_until, per_student: s.per_student, tg_chat: s.tg_chat })) });
        }
        if (url.pathname === '/config') {                       // ochiq: sayt sozlamalari (narxlar va h.k.)
          const rows = await env.DB.prepare('SELECT k, v FROM settings').all(); const o = {}; for (const r of rows.results || []) { if (r.k === 'fsub') continue; try { o[r.k] = JSON.parse(r.v); } catch (e) { } }
          return json(env, { settings: o });
        }
        if (url.pathname === '/content') {                      // ochiq: admin qo'shgan savollar va tahrirlar
          const [q, e] = await Promise.all([env.DB.prepare('SELECT id, topic, text, options, answer, explain, img, active FROM cquestions WHERE active = 1 ORDER BY id').all(), env.DB.prepare('SELECT n, hide, text, options, answer, explain FROM qedits').all()]);
          const pj = (s) => { try { return JSON.parse(s); } catch (e) { return []; } };
          return json(env, { questions: (q.results || []).map(r => ({ ...r, options: pj(r.options) })), edits: (e.results || []).map(r => ({ ...r, options: r.options ? pj(r.options) : null })) });
        }
        if (url.pathname.startsWith('/media/')) {
          const id = num(url.pathname.slice(7), 0, 1e9); const m = await env.DB.prepare('SELECT mime, data FROM media WHERE id = ?').bind(id).first();
          if (!m) return json(env, { error: 'topilmadi' }, 404);
          const bin = Uint8Array.from(atob(m.data), c => c.charCodeAt(0));
          return new Response(bin, { headers: { 'content-type': m.mime, 'cache-control': 'public, max-age=31536000, immutable', ...cors(env) } });
        }
        if (url.pathname === '/admin/promos') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          return json(env, { promos: (await env.DB.prepare('SELECT * FROM promos ORDER BY created DESC').all()).results || [] });
        }
        if (url.pathname === '/admin/cquestions') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const pj = (s) => { try { return JSON.parse(s); } catch (e) { return []; } };
          return json(env, { questions: ((await env.DB.prepare('SELECT * FROM cquestions ORDER BY id DESC').all()).results || []).map(r => ({ ...r, options: pj(r.options) })), edits: (await env.DB.prepare('SELECT * FROM qedits').all()).results || [] });
        }
        if (url.pathname === '/admin/stats') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const now = Date.now(), d1 = now - 864e5, d7 = now - 7 * 864e5;
          const one = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).first()) || {};
          const [t, n1, n7, a1, a7, pr, sc, ld, pts] = await Promise.all([one('SELECT COUNT(*) c FROM users'), one('SELECT COUNT(*) c FROM users WHERE created > ?', d1), one('SELECT COUNT(*) c FROM users WHERE created > ?', d7), one('SELECT COUNT(*) c FROM users WHERE last_seen > ?', d1), one('SELECT COUNT(*) c FROM users WHERE last_seen > ?', d7), one('SELECT COUNT(*) c FROM users WHERE prem_until > ?', now), one('SELECT COUNT(*) c FROM schools'), one('SELECT COUNT(*) c FROM leads'), one('SELECT COALESCE(SUM(points),0) c FROM users')]);
          const reg = await env.DB.prepare("SELECT COALESCE(NULLIF(region,''),'—') r, COUNT(*) c FROM users GROUP BY r ORDER BY c DESC").all();
          const days = await env.DB.prepare('SELECT CAST((created - ?) / 86400000 AS INTEGER) d, COUNT(*) c FROM users WHERE created > ? GROUP BY d').bind(now - 14 * 864e5, now - 14 * 864e5).all();
          const [rv, rv30, pend, bt] = await Promise.all([one("SELECT COALESCE(SUM(amount),0) c, COUNT(*) n FROM orders WHERE status = 'approved'"), one("SELECT COALESCE(SUM(amount),0) c FROM orders WHERE status = 'approved' AND updated > ?", now - 30 * 864e5), one("SELECT COUNT(*) c FROM orders WHERE status IN ('new','paid')"), one('SELECT COUNT(*) c FROM battle_results')]);
          return json(env, { revenue: rv.c, sales: rv.n, revenue30: rv30.c, pending: pend.c, battles: bt.c, users: t.c, new1: n1.c, new7: n7.c, active1: a1.c, active7: a7.c, premium: pr.c, schools: sc.c, leads: ld.c, points: pts.c, regions: reg.results || [], signups14: days.results || [] });
        }
        if (url.pathname === '/admin/users') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const q = clean(url.searchParams.get('q'), 40), like = '%' + q.replace(/[%_]/g, '') + '%';
          const rows = q ? await env.DB.prepare('SELECT id, tg_id, username, first, last, region, points, prem_until, created, last_seen FROM users WHERE first LIKE ? OR last LIKE ? OR username LIKE ? OR tg_id = ? ORDER BY created DESC LIMIT 100').bind(like, like, like, q).all()
            : await env.DB.prepare('SELECT id, tg_id, username, first, last, region, points, prem_until, created, last_seen FROM users ORDER BY created DESC LIMIT 100').all();
          return json(env, { users: rows.results || [] });
        }
        if (url.pathname === '/admin/leads') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const sid = num(url.searchParams.get('school_id'), 0, 1e9);
          const rows = await env.DB.prepare('SELECT l.id, l.created, l.phone, l.school_id, s.name AS school, u.first, u.last, u.username, u.region FROM leads l JOIN schools s ON s.id = l.school_id JOIN users u ON u.id = l.user_id ' + (sid ? 'WHERE l.school_id = ? ' : '') + 'ORDER BY l.created DESC LIMIT 300').bind(...(sid ? [sid] : [])).all();
          return json(env, { leads: rows.results || [] });
        }
        if (url.pathname.startsWith('/battle/')) {              // ochiq: batl natijalari (kod bo'yicha)
          const code = clean(decodeURIComponent(url.pathname.slice(8)), 60); if (!BATTLE_RE.test(code)) return json(env, { error: 'kod xato' }, 400);
          const rows = await env.DB.prepare('SELECT name, score, total, sec, created FROM battle_results WHERE code = ? ORDER BY score DESC, sec ASC LIMIT 50').bind(code).all();
          return json(env, { results: rows.results || [] });
        }
        if (url.pathname === '/orders/mine') {
          const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
          return json(env, { orders: (await env.DB.prepare('SELECT id, kind, days, amount, status, reason, created, updated FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 20').bind(u.id).all()).results || [] });
        }
        if (url.pathname === '/admin/orders') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const st = clean(url.searchParams.get('status'), 12);
          const rows = await env.DB.prepare('SELECT o.id, o.kind, o.days, o.amount, o.status, o.note, o.reason, o.created, o.updated, u.first, u.last, u.username, u.tg_id, u.region FROM orders o JOIN users u ON u.id = o.user_id ' + (st ? 'WHERE o.status = ? ' : '') + 'ORDER BY o.id DESC LIMIT 200').bind(...(st ? [st] : [])).all();
          return json(env, { orders: rows.results || [] });
        }
        if (url.pathname === '/admin/activity') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const [u, o] = await Promise.all([env.DB.prepare('SELECT first, last, region, created FROM users ORDER BY id DESC LIMIT 8').all(), env.DB.prepare('SELECT o.amount, o.status, o.days, o.updated, u.first, u.last FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.updated DESC LIMIT 8').all()]);
          return json(env, { users: u.results || [], orders: o.results || [] });
        }
        if (url.pathname === '/admin/staff') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const rows = (await env.DB.prepare('SELECT tg_id, name, perms, created FROM admins ORDER BY created').all()).results || [];
          return json(env, { owners: String(env.ADMIN_TG_IDS || '').split(',').map(x => x.trim()).filter(Boolean), perms: PERMS, staff: rows.map(r => { let p = []; try { p = JSON.parse(r.perms); } catch (e) { } return { ...r, perms: p }; }) });
        }
        if (url.pathname === '/admin/broadcasts') {
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          return json(env, { items: (await env.DB.prepare('SELECT id, status, text, photo, btn_text, audience, sent, failed, total, created, finished FROM broadcasts ORDER BY id DESC LIMIT 20').all()).results || [] });
        }
        if (url.pathname === '/health') return json(env, { ok: true });
      } catch (e) { console.error('worker', e && e.stack || e); return json(env, { error: 'Server xatosi. Birozdan keyin urinib ko\'ring.' }, 502); }
      return json(env, { error: 'topilmadi' }, 404);
    }
    if (req.method !== 'POST') return json(env, { error: 'POST kerak' }, 405);
    let b; try { b = await req.json(); } catch { return json(env, { error: 'JSON xato' }, 400); }
    try {
      if (url.pathname === '/telegram/webhook') {
        if (!env.WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return json(env, { error: 'ruxsat yoq' }, 403);
        let done = false; try { done = await handleStaff(env, ctx, url.origin, b); } catch (e) { done = false; }
        if (!done) await onUpdate(env, b); return json(env, { ok: true });
      }
      if (url.pathname === '/auth/complete') {
        const t = String(b.token || ''); if (!TOKEN_RE.test(t)) return json(env, { error: 'token xato' }, 400);
        const c = await env.AUTH.get('c:' + t); if (!c) return json(env, { error: 'tasdiqlanmagan yoki eskirgan' }, 400);
        const tg = JSON.parse(c);
        let u = await env.DB.prepare('SELECT * FROM users WHERE tg_id = ?').bind(String(tg.id)).first(), existing = !!u, promoRes = null;
        if (!u) {
          const first = clean(b.first, 30), last = clean(b.last, 30); if (first.length < 2 || last.length < 2) return json(env, { error: 'ism va familya kerak' }, 400);
          await env.DB.prepare('INSERT INTO users (tg_id, username, first, last, region, group_code, ref, points, created, last_seen) VALUES (?,?,?,?,?,?,?,0,?,?)')
            .bind(String(tg.id), clean(tg.username, 40), first, last, clean(b.region, 40), clean(b.code, 12).toUpperCase(), clean(b.ref, 12).toUpperCase(), Date.now(), Date.now()).run();
          u = await env.DB.prepare('SELECT * FROM users WHERE tg_id = ?').bind(String(tg.id)).first();
          if (b.promo) {
            const f = await findPromo(env, b.promo, u.id);
            if (f.error) promoRes = { error: f.error };
            else if (f.p.days > 0) { const g = await giftPromo(env, f.p, u); u.prem_until = g.until; u.prem_tier = g.tier; promoRes = { ok: true, ...pubPromo(f.p) }; }
            else promoRes = { ok: true, ...pubPromo(f.p) };   // faqat chegirma: to'lovda qo'llanadi
          }
        } else { await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(Date.now(), u.id).run(); }
        await env.AUTH.delete('c:' + t); await env.AUTH.delete('p:' + t);
        const st = existing ? await env.DB.prepare('SELECT json FROM state WHERE user_id = ?').bind(u.id).first() : null;
        return json(env, { session: await makeSession(env, u.id), user: pubUser(u, env), existing, promo: promoRes, state: st ? JSON.parse(st.json) : null });
      }
      if (url.pathname === '/battle/result') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const code = clean(b.code, 60); if (!BATTLE_RE.test(code)) return json(env, { error: 'kod xato' }, 400);
        const total = num(b.total, 1, 200), score = num(b.score, 0, total), sec = num(b.sec, 0, 86400), name = clean(b.name, 30) || (u.first + ' ' + (u.last || '').slice(0, 1) + '.');
        const dup = await env.DB.prepare('SELECT id FROM battle_results WHERE code = ? AND user_id = ? AND created > ?').bind(code, u.id, Date.now() - 60000).first();
        if (!dup) await env.DB.prepare('INSERT INTO battle_results (code, user_id, name, score, total, sec, created) VALUES (?,?,?,?,?,?,?)').bind(code, u.id, name, score, total, sec, Date.now()).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/schools/apply') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const sid = num(b.school_id, 0, 1e9); const s = await env.DB.prepare('SELECT * FROM schools WHERE id = ? AND active = 1').bind(sid).first(); if (!s) return json(env, { error: 'topilmadi' }, 404);
        const phone = clean(b.phone, 20).replace(/[^\d+]/g, '');
        const had = await env.DB.prepare('SELECT id FROM leads WHERE user_id = ? AND school_id = ?').bind(u.id, sid).first();
        if (!had) {
          await env.DB.prepare('INSERT INTO leads (school_id, user_id, phone, created) VALUES (?,?,?,?)').bind(sid, u.id, phone, Date.now()).run();
          const text = `🆕 Yangi ariza\n${s.name}\n👤 ${u.first} ${u.last}${u.username ? ' (@' + u.username + ')' : ''}\n📍 ${u.region || ''}${phone ? '\n📞 ' + phone : ''}`;
          const chats = [...String(env.ADMIN_TG_IDS || '').split(',').map(x => x.trim()).filter(Boolean), ...(s.tg_chat ? [s.tg_chat] : [])];
          await Promise.all(chats.map(c => tgSend(env, c, text).catch(() => { })));
        }
        return json(env, { ok: true, again: !!had });
      }
      if (url.pathname === '/promo/check') {
        if (await over(env, 'rl:pc:' + (req.headers.get('cf-connecting-ip') || 'x'), 20, 60)) return tooMany(env);
        const u = await sessionUser(env, req); const f = await findPromo(env, b.code, u ? u.id : 0);
        return f.error ? json(env, { error: f.error }, 400) : json(env, { ok: true, ...pubPromo(f.p) });
      }
      if (url.pathname === '/promo/redeem') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const f = await findPromo(env, b.code, u.id); if (f.error) return json(env, { error: f.error }, 400);
        if (!(f.p.days > 0)) return json(env, { error: "Bu kod chegirma kodi: uni Premium sotib olayotganda kiriting (" + f.p.percent + "% chegirma)" }, 400);
        const g = await giftPromo(env, f.p, u);
        return json(env, { ok: true, days: f.p.days, tier: g.tier, prem_until: g.until });
      }
      if (url.pathname === '/admin/settings') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const s = b.settings || {}; const keys = Object.keys(s).filter(k => /^[A-Za-z0-9_]{1,40}$/.test(k)).slice(0, 60);
        await env.DB.batch(keys.map(k => { const v = JSON.stringify(s[k]); if (v.length > 4000) throw new Error('qiymat katta'); return env.DB.prepare('INSERT INTO settings (k, v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, v); }));
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/promo') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        if (b.delete) { await env.DB.prepare('DELETE FROM promos WHERE id = ?').bind(num(b.id, 0, 1e9)).run(); return json(env, { ok: true }); }
        if (b.toggle) { await env.DB.prepare('UPDATE promos SET active = 1 - active WHERE id = ?').bind(num(b.id, 0, 1e9)).run(); return json(env, { ok: true }); }
        const code = clean(b.code, 24).toUpperCase().replace(/[^A-Z0-9_-]/g, ''), days = num(b.days, 0, 3650), percent = num(b.percent, 0, 90), tier = b.tier in TIERS ? b.tier : 'premium'; if (code.length < 3) return json(env, { error: 'kod kamida 3 belgi' }, 400); if (!days && !percent) return json(env, { error: 'kun yoki chegirma foizi kerak' }, 400);
        try { await env.DB.prepare('INSERT INTO promos (code, days, tier, percent, note, max_uses, expires, active, used, created) VALUES (?,?,?,?,?,?,?,1,0,?)').bind(code, days, tier, percent, clean(b.note, 80), num(b.max_uses, 0, 1e7), num(b.expires, 0, 4e12), Date.now()).run(); } catch (e) { return json(env, { error: 'bu kod mavjud' }, 400); }
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/media') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || '')); if (!m || m[2].length > 4e6) return json(env, { error: 'rasm xato yoki juda katta' }, 400);
        if (m[2].length > 600000) return json(env, { error: 'rasm katta (400 KB gacha)' }, 413);
        const r = await env.DB.prepare('INSERT INTO media (mime, data, created) VALUES (?,?,?)').bind(m[1], m[2], Date.now()).run();
        return json(env, { id: r.meta.last_row_id });
      }
      if (url.pathname === '/admin/cquestion') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const id = num(b.id, 0, 1e9);
        if (b.delete && id) { await env.DB.prepare('DELETE FROM cquestions WHERE id = ?').bind(id).run(); return json(env, { ok: true }); }
        const opts = (Array.isArray(b.options) ? b.options : []).map(o => clean(o, 300)).filter(Boolean).slice(0, 6), ans = num(b.answer, 0, 5), text = clean(b.text, 500);
        if (text.length < 5 || opts.length < 2 || ans >= opts.length) return json(env, { error: "savol, kamida 2 variant va to'g'ri javob kerak" }, 400);
        const f = [clean(b.topic, 12) || 'rules', text, JSON.stringify(opts), ans, clean(b.explain, 600), clean(b.img, 200), b.active === false ? 0 : 1];
        if (id) await env.DB.prepare('UPDATE cquestions SET topic=?, text=?, options=?, answer=?, explain=?, img=?, active=? WHERE id=?').bind(...f, id).run();
        else await env.DB.prepare('INSERT INTO cquestions (topic, text, options, answer, explain, img, active, created) VALUES (?,?,?,?,?,?,?,?)').bind(...f, Date.now()).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/qedit') {                    // mavjud (rasmiy) savolni tahrirlash/yashirish
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const n = num(b.n, 1, 100000); if (!n) return json(env, { error: 'raqam kerak' }, 400);
        if (b.reset) { await env.DB.prepare('DELETE FROM qedits WHERE n = ?').bind(n).run(); return json(env, { ok: true }); }
        const opts = Array.isArray(b.options) && b.options.length >= 2 ? JSON.stringify(b.options.map(o => clean(o, 300)).filter(Boolean).slice(0, 6)) : null;
        await env.DB.prepare('INSERT INTO qedits (n, hide, text, options, answer, explain) VALUES (?,?,?,?,?,?) ON CONFLICT(n) DO UPDATE SET hide=excluded.hide, text=excluded.text, options=excluded.options, answer=excluded.answer, explain=excluded.explain')
          .bind(n, b.hide ? 1 : 0, clean(b.text, 500) || null, opts, b.answer === null || b.answer === undefined || b.answer === '' ? null : num(b.answer, 0, 5), clean(b.explain, 600) || null).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/login') {
        const ip = req.headers.get('cf-connecting-ip') || 'x', key = 'rl:' + ip, tries = +(await env.AUTH.get(key)) || 0;
        if (tries >= 8) return json(env, { error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urining" }, 429);
        if (!(await checkAdminCred(env, b.user, b.password))) { await env.AUTH.put(key, String(tries + 1), { expirationTtl: 900 }); return json(env, { error: "Login yoki parol noto'g'ri" }, 401); }
        await env.AUTH.delete(key); return json(env, { session: await makeAdminSession(env) });
      }
      if (url.pathname === '/order/create') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const months = [1, 3, 12].includes(+b.months) ? +b.months : 1, tier = b.tier in TIERS ? b.tier : 'premium';
        const ks = ['price_' + tier, 'price3_' + tier, 'price12_' + tier];
        const rows = await env.DB.prepare('SELECT k, v FROM settings WHERE k IN (?,?,?)').bind(...ks).all(); const S = {}; for (const r of rows.results || []) { try { S[r.k] = JSON.parse(r.v); } catch (e) { } }
        const one = Number(S[ks[0]]) || TIERS[tier].price;
        let amount = months === 1 ? one : months === 3 ? (Number(S[ks[1]]) || one * 3) : (Number(S[ks[2]]) || one * 12), discount = 0, promo = '';
        if (b.promo) {
          const f = await findPromo(env, b.promo, u.id); if (f.error) return json(env, { error: f.error }, 400);
          if (!(f.p.percent > 0)) return json(env, { error: "Bu kod chegirma bermaydi (Premium sovg'a kodi — «Promokod» bo'limida kiriting)" }, 400);
          discount = Math.round(amount * f.p.percent / 100 / 1000) * 1000; amount -= discount; promo = f.p.code;
        }
        const open = await env.DB.prepare("SELECT * FROM orders WHERE user_id = ? AND days = ? AND tier = ? AND status IN ('new','paid') ORDER BY id DESC").bind(u.id, months * 30, tier).first();
        if (open) { await env.DB.prepare('UPDATE orders SET amount = ?, promo = ?, discount = ? WHERE id = ? AND status = ?').bind(amount, promo, discount, open.id, 'new').run(); return json(env, { id: open.id, amount, discount, status: open.status, tier }); }
        const r = await env.DB.prepare("INSERT INTO orders (user_id, kind, days, amount, status, tier, promo, discount, created, updated) VALUES (?,?,?,?,'new',?,?,?,?,?)").bind(u.id, 'premium', months * 30, amount, tier, promo, discount, Date.now(), Date.now()).run();
        return json(env, { id: r.meta.last_row_id, amount, discount, status: 'new', tier });
      }
      if (url.pathname === '/order/paid') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(num(b.id, 0, 1e9), u.id).first(); if (!o) return json(env, { error: 'topilmadi' }, 404);
        if (o.status !== 'new' && o.status !== 'paid') return json(env, { error: 'buyurtma yopilgan' }, 400);
        await env.DB.prepare("UPDATE orders SET status = 'paid', note = ?, updated = ? WHERE id = ?").bind(clean(b.note, 200), Date.now(), o.id).run();
        if (o.status === 'new') await notifyOrder(env, o, `${u.first} ${u.last}${u.username ? ' (@' + u.username + ')' : ''}`, clean(b.note, 200), siteUrl(env)).catch(() => { });
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/order') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const r = await decideOrder(env, num(b.id, 0, 1e9), b.action, b.reason);
        return r.ok ? json(env, { ok: true }) : json(env, { error: r.error }, r.code || 400);
      }
      if (url.pathname === '/admin/broadcast') {                // ommaviy xabar/reklama: ish yaratiladi, bo'laklab o'zi yuboradi
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const text = clean(b.text, 3500); if (text.length < 3 && !b.media_id) return json(env, { error: 'matn kerak' }, 400);
        const aud = ['all', 'free', 'prem'].includes(b.audience) ? b.audience : 'all';
        const bu = clean(b.btn_url, 300), bt = clean(b.btn_text, 40); if ((bu || bt) && !(/^https?:\/\//.test(bu) && bt)) return json(env, { error: 'tugma uchun matn va https:// havola kerak' }, 400);
        const photo = b.media_id ? url.origin + '/media/' + num(b.media_id, 1, 1e9) : '';
        const owner = String(env.ADMIN_TG_IDS || '').split(',')[0].trim();
        const j = await createBroadcast(env, owner, { text, photo, btn: bt ? [bt, bu] : null, aud });
        await kickBroadcast(env, ctx, url.origin, j.id);
        return json(env, { ok: true, id: j.id, total: j.total });
      }
      if (url.pathname === '/internal/bc') {                     // o'z-o'zini chaqirish: keyingi bo'lak
        const bid = num(b.id, 0, 1e9);
        if (req.headers.get('x-bc') !== await signBc(env, bid)) return json(env, { error: 'ruxsat yoq' }, 403);
        ctx.waitUntil(runChunk(env, ctx, url.origin, bid).catch(() => { }));
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/staff') {                     // adminlar va ruxsatlar (faqat ega)
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const id = clean(b.tg_id, 20).replace(/\D/g, ''); if (!id) return json(env, { error: 'Telegram ID kerak' }, 400);
        if (b.delete) { await env.DB.prepare('DELETE FROM admins WHERE tg_id = ?').bind(id).run(); return json(env, { ok: true }); }
        const perms = (Array.isArray(b.perms) ? b.perms : []).filter(k => k in PERMS);
        await env.DB.prepare('INSERT INTO admins (tg_id, name, perms, added_by, created) VALUES (?,?,?,?,?) ON CONFLICT(tg_id) DO UPDATE SET name = excluded.name, perms = excluded.perms').bind(id, clean(b.name, 60), JSON.stringify(perms), 'web', Date.now()).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/bot-setup') {                  // webhookni yangilash (callback tugmalar uchun)
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        if (!env.WEBHOOK_SECRET || !env.TELEGRAM_BOT_TOKEN) return json(env, { error: 'bot sozlanmagan' }, 400);
        const call = (m, body) => fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(x => x.json()).catch(() => ({ ok: false }));
        const r = await call('setWebhook', { url: url.origin + '/telegram/webhook', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] });
        await call('setMyCommands', { commands: [{ command: 'start', description: 'Boshlash' }, { command: 'admin', description: 'Boshqaruv paneli (adminlar uchun)' }] });
        const profile = await applyBotProfile(env);
        return json(env, { ok: !!r.ok, telegram: r, profile });
      }
      if (url.pathname === '/admin/user') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const id = num(b.id, 0, 1e9); if (!id) return json(env, { error: 'id kerak' }, 400);
        if (b.delete) { await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE user_id = ?').bind(id), env.DB.prepare('DELETE FROM state WHERE user_id = ?').bind(id), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id)]); return json(env, { ok: true }); }
        if (b.prem_days !== undefined) { const days = num(b.prem_days, 0, 3650); await env.DB.prepare('UPDATE users SET prem_until = ?, prem_tier = ? WHERE id = ?').bind(days ? Date.now() + days * 864e5 : 0, days && b.tier in TIERS ? b.tier : (days ? 'premium' : ''), id).run(); return json(env, { ok: true }); }
        if (b.add_days !== undefined) { const days = num(b.add_days, 1, 3650), u = await env.DB.prepare('SELECT prem_until, prem_tier FROM users WHERE id = ?').bind(id).first(); if (!u) return json(env, { error: 'topilmadi' }, 404); const until = Math.max(Date.now(), u.prem_until || 0) + days * 864e5; await env.DB.prepare('UPDATE users SET prem_until = ?, prem_tier = ? WHERE id = ?').bind(until, b.tier in TIERS ? b.tier : (u.prem_tier in TIERS ? u.prem_tier : 'premium'), id).run(); return json(env, { ok: true, prem_until: until }); }
        return json(env, { error: 'amal yoq' }, 400);
      }
      if (url.pathname === '/admin/school') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        if (b.delete && b.id) { await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE school_id = ?').bind(num(b.id, 0, 1e9)), env.DB.prepare('DELETE FROM schools WHERE id = ?').bind(num(b.id, 0, 1e9))]); return json(env, { ok: true }); }
        const f = { name: clean(b.name, 80), region: clean(b.region, 40), city: clean(b.city, 60), address: clean(b.address, 160), phone: clean(b.phone, 40), price: clean(b.price, 60), hours: clean(b.hours, 80), note: clean(b.note, 300), telegram: clean(b.telegram, 40).replace(/^@/, ''), tg_chat: clean(b.tg_chat, 20).replace(/[^\d-]/g, ''), active: b.active === false ? 0 : 1, free_until: num(b.free_until, 0, 4e12), per_student: num(b.per_student, 0, 1e8) };
        if (f.name.length < 2) return json(env, { error: 'nom kerak' }, 400);
        if (b.id) await env.DB.prepare('UPDATE schools SET name=?, region=?, city=?, address=?, phone=?, price=?, hours=?, note=?, telegram=?, tg_chat=?, active=?, free_until=?, per_student=? WHERE id=?').bind(f.name, f.region, f.city, f.address, f.phone, f.price, f.hours, f.note, f.telegram, f.tg_chat, f.active, f.free_until, f.per_student, num(b.id, 0, 1e9)).run();
        else await env.DB.prepare('INSERT INTO schools (name, region, city, address, phone, price, hours, note, telegram, tg_chat, active, free_until, per_student, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(f.name, f.region, f.city, f.address, f.phone, f.price, f.hours, f.note, f.telegram, f.tg_chat, f.active, f.free_until, f.per_student, Date.now()).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/account/delete') {
        const uid = await readSession(env, req); if (!uid) return json(env, { error: 'kirish kerak' }, 401);
        await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE user_id = ?').bind(uid), env.DB.prepare('DELETE FROM state WHERE user_id = ?').bind(uid), env.DB.prepare('DELETE FROM promo_uses WHERE user_id = ?').bind(uid), env.DB.prepare('DELETE FROM battle_results WHERE user_id = ?').bind(uid), env.DB.prepare('DELETE FROM lessons WHERE user_id = ?').bind(uid), env.DB.prepare('DELETE FROM chat_msgs WHERE user_id = ?').bind(uid), env.DB.prepare("UPDATE orders SET note = '' WHERE user_id = ?").bind(uid), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(uid)]);
        return json(env, { ok: true });
      }
      if (url.pathname === '/sync') {
        const uid = await readSession(env, req); if (!uid) return json(env, { error: 'kirish kerak' }, 401);
        const js = JSON.stringify(b.state || {}); if (js.length > 400000) return json(env, { error: 'juda katta' }, 413);
        const pts = Math.max(0, Math.min(1e7, Math.floor(Number(b.points) || 0)));
        await env.DB.batch([
          env.DB.prepare('INSERT INTO state (user_id, json, updated) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated = excluded.updated').bind(uid, js, Date.now()),
          env.DB.prepare('UPDATE users SET points = ?, last_seen = ? WHERE id = ?').bind(pts, Date.now(), uid),
        ]);
        return json(env, { ok: true });
      }
      if (url.pathname === '/telegram/setup') { // bir martalik: webhookni ulash (WEBHOOK_SECRET kerak)
        if (!env.WEBHOOK_SECRET || b.secret !== env.WEBHOOK_SECRET) return json(env, { error: 'ruxsat yoq' }, 403);
        const hook = url.origin + '/telegram/webhook';
        const rr = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: hook, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] }) });
        const me = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`).then(x => x.json()).catch(() => ({}));
        return json(env, { webhook: await rr.json(), bot: me.result ? me.result.username : null });
      }
      if (url.pathname === '/auth/start') {
        const token = newToken(); await env.AUTH.put('p:' + token, '1', { expirationTtl: TTL });
        return json(env, { token, link: `https://t.me/${String(env.BOT_USERNAME || '').replace(/^@/, '')}?start=${token}` });
      }
      if (url.pathname === '/auth/check') {
        const t = String(b.token || ''); if (!TOKEN_RE.test(t)) return json(env, { ok: false });
        const c = await env.AUTH.get('c:' + t); if (!c) return json(env, { ok: false, pending: !!(await env.AUTH.get('p:' + t)) });
        if (b.consume) { await env.AUTH.delete('c:' + t); await env.AUTH.delete('p:' + t); }
        return json(env, { ok: true, tg: JSON.parse(c) });
      }
      if (url.pathname === '/chat/send') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const room = String(b.room || ''); if (!(room in ROOMS)) return json(env, { error: 'xona yoq' }, 400);
        if (!roomOk(env, u, room)) return need(env, room);
        const last = await env.DB.prepare('SELECT ts FROM chat_msgs WHERE user_id = ? ORDER BY id DESC LIMIT 1').bind(u.id).first();
        if (last && Date.now() - last.ts < 1200) return json(env, { error: 'Sekinroq yozing' }, 429);
        const name = (u.first + ' ' + String(u.last || '').slice(0, 1) + '.').trim(), tier = effTier(env, u), now = Date.now();
        if (b.voice) {
          if (room !== 'max' || !hasTier(env, u, 'max')) return need(env, 'max');
          const m = /^data:(audio\/(?:webm|ogg|mp4|mpeg|wav|x-m4a|aac))(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.voice)); if (!m) return json(env, { error: 'audio formati xato' }, 400);
          if (m[2].length > 600000) return json(env, { error: 'Ovozli xabar juda uzun (30 soniyagacha)' }, 413);
          const v = await env.DB.prepare('INSERT INTO chat_voice (room, mime, data, created) VALUES (?,?,?,?)').bind(room, m[1], m[2], now).run();
          const vid = (v.meta && v.meta.last_row_id) || 0;
          await env.DB.prepare("INSERT INTO chat_msgs (room, user_id, name, tier, kind, body, voice_id, ts) VALUES (?,?,?,?,'voice','',?,?)").bind(room, u.id, name, tier, vid, now).run();
          return json(env, { ok: true });
        }
        const text = clean(b.text, 500); if (!text) return json(env, { error: 'xabar bo\'sh' }, 400);
        await env.DB.prepare("INSERT INTO chat_msgs (room, user_id, name, tier, kind, body, voice_id, ts) VALUES (?,?,?,?,'text',?,0,?)").bind(room, u.id, name, tier, text, now).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/chat') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const id = num(b.id, 0, 1e12); const m = await env.DB.prepare('SELECT voice_id FROM chat_msgs WHERE id = ?').bind(id).first();
        if (m && m.voice_id) await env.DB.prepare('DELETE FROM chat_voice WHERE id = ?').bind(m.voice_id).run();
        await env.DB.prepare('DELETE FROM chat_msgs WHERE id = ?').bind(id).run(); return json(env, { ok: true });
      }
      if (url.pathname === '/lesson/book') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        if (!hasTier(env, u, 'max')) return need(env, 'max');
        const start = Math.floor(Number(b.start) || 0), now = Date.now();
        if (!start || start < now + 24 * 36e5) return json(env, { error: 'Darsni kamida 1 kun oldin rejalashtiring' }, 400);
        if (start > now + 60 * 864e5) return json(env, { error: 'Eng ko\'pi bilan 60 kun oldin' }, 400);
        const mine = await env.DB.prepare("SELECT start FROM lessons WHERE user_id = ? AND status IN ('pending','confirmed','done')").bind(u.id).all();
        if ((mine.results || []).some(l => weekKey(l.start) === weekKey(start))) return json(env, { error: 'Haftada 1 marta dars olish mumkin. Bu haftada darsingiz bor' }, 409);
        const taken = await env.DB.prepare("SELECT 1 x FROM lessons WHERE status IN ('pending','confirmed') AND start < ? AND start > ?").bind(start + 36e5, start - 36e5).first();
        if (taken) return json(env, { error: 'Bu vaqt band, boshqa vaqt tanlang' }, 409);
        const note = clean(b.note, 300), name = (u.first + ' ' + (u.last || '')).trim();
        const r = await env.DB.prepare("INSERT INTO lessons (user_id, name, start, note, status, link, created) VALUES (?,?,?,?,'pending','',?)").bind(u.id, name, start, note, now).run();
        const when = new Date(start + TZ).toISOString().replace('T', ' ').slice(0, 16);
        if (env.TELEGRAM_CHAT_ID && env.TELEGRAM_BOT_TOKEN) ctx.waitUntil(tgSend(env, env.TELEGRAM_CHAT_ID, `🎓 Yangi online dars (Max)\n${name}${u.username ? ' @' + u.username : ''}\nVaqt: ${when} (Toshkent) · 1 soat\n${note ? 'Mavzu: ' + note : ''}\nTasdiqlash: admin panel → Darslar`).catch(() => { }));
        return json(env, { ok: true, id: (r.meta && r.meta.last_row_id) || 0 });
      }
      if (url.pathname === '/lesson/cancel') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const l = await env.DB.prepare('SELECT * FROM lessons WHERE id = ? AND user_id = ?').bind(num(b.id, 0, 1e12), u.id).first();
        if (!l || !['pending', 'confirmed'].includes(l.status)) return json(env, { error: 'dars topilmadi' }, 404);
        if (l.start < Date.now() + 6 * 36e5) return json(env, { error: 'Darsga 6 soatdan kam qolgan, bekor qilib bo\'lmaydi. Ustoz bilan bog\'laning' }, 400);
        await env.DB.prepare("UPDATE lessons SET status = 'cancelled' WHERE id = ?").bind(l.id).run(); return json(env, { ok: true });
      }
      if (url.pathname === '/admin/lesson') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const l = await env.DB.prepare('SELECT l.*, u.tg_id FROM lessons l LEFT JOIN users u ON u.id = l.user_id WHERE l.id = ?').bind(num(b.id, 0, 1e12)).first(); if (!l) return json(env, { error: 'topilmadi' }, 404);
        const st = ['confirmed', 'cancelled', 'done'].includes(b.status) ? b.status : 'confirmed', link = clean(b.link, 200);
        await env.DB.prepare('UPDATE lessons SET status = ?, link = ? WHERE id = ?').bind(st, link || l.link, l.id).run();
        const when = new Date(l.start + TZ).toISOString().replace('T', ' ').slice(0, 16);
        if (l.tg_id && env.TELEGRAM_BOT_TOKEN && st !== 'done') ctx.waitUntil(tgSend(env, l.tg_id, st === 'confirmed' ? `✅ Darsingiz tasdiqlandi\n${when} (Toshkent), 1 soat\n${link || l.link ? 'Havola: ' + (link || l.link) : 'Ustoz Telegram video-chat orqali bog\'lanadi.'}` : `❌ ${when} dagi darsingiz bekor qilindi. Boshqa vaqt tanlashingiz mumkin.`).catch(() => { }));
        return json(env, { ok: true });
      }
      if (url.pathname === '/telegram') {
        { const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401); if (!hasTier(env, u, 'premium')) return need(env, 'premium'); }
        const text = String(b.text || '').slice(0, 3500); if (!text) return json(env, { error: 'matn yo\'q' }, 400);
        const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }) });
        return json(env, { ok: r.ok }, r.ok ? 200 : 502);
      }
      if (url.pathname === '/ai') {
        { const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401); if (!hasTier(env, u, 'pro')) return need(env, 'pro'); if (!isAdminUser(env, u) && await over(env, `q:ai:${u.id}:${dayKey()}`, 40, 90000)) return json(env, { error: "Bugungi AI limiti tugadi (40 ta). Ertaga qayta urinib ko'ring." }, 429); }
        const c = b.context || {};
        const ctx = `Talaba: ${String(c.name || '').slice(0, 40)}. Tayyorlik: ${Number(c.readiness) || 0}%. Zaif mavzular: ${(c.weak || []).slice(0, 4).join(', ') || 'noma\'lum'}.`;
        const text = await claude(env, { system: SYSTEM + '\n' + ctx, messages: [{ role: 'user', content: String(b.message || '').slice(0, 1500) }] });
        return json(env, { text });
      }
      if (url.pathname === '/vision') {
        { const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401); if (!hasTier(env, u, 'pro')) return need(env, 'pro'); if (!isAdminUser(env, u) && await over(env, `q:vis:${u.id}:${dayKey()}`, 15, 90000)) return json(env, { error: 'Bugungi rasm limiti tugadi (15 ta).' }, 429); }
        const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(b.image || '')); if (!m || m[2].length > 4e6) return json(env, { error: 'rasm xato yoki juda katta' }, 400);
        const text = await claude(env, { messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }, { type: 'text', text: `Suratdagi yo'l belgisini aniqla. Belgi nomini, ma'nosini va haydovchi nima qilishi kerakligini sodda o'zbek tilida tushuntir. Belgi ko'rinmasa, buni ayt va qayta suratga olishni so'ra.` }] }] });
        return json(env, { text });
      }
      return json(env, { error: 'topilmadi' }, 404);
    } catch (e) { return json(env, { error: String(e.message || e) }, 502); }
  },
};
