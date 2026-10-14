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

async function onUpdate(env, upd) {
  const m = upd && upd.message; if (!m || !m.from || m.chat.type !== 'private') return;
  const text = String(m.text || ''), arg = (/^\/start(?:@\w+)?\s+(\S+)/.exec(text) || [])[1];
  if (arg && TOKEN_RE.test(arg)) {
    const pending = await env.AUTH.get('p:' + arg);
    if (!pending) { await tgSend(env, m.chat.id, "Bu havola eskirgan yoki noto'g'ri. Iltimos, saytga qaytib «Telegram orqali davom etish» tugmasini qayta bosing."); return; }
    const u = { id: m.from.id, username: m.from.username || '', first: m.from.first_name || '', last: m.from.last_name || '' };
    await env.AUTH.put('c:' + arg, JSON.stringify(u), { expirationTtl: TTL });
    await tgSend(env, m.chat.id, `✅ Tasdiqlandi, ${u.first || "do'st"}!

Endi saytga qayting: ism-familyangizni yozing va o'qishni boshlang.`, { text: 'Saytga qaytish', url: siteUrl(env) + '#/tg/' + arg });
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
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const pubUser = (u) => ({ id: u.id, first: u.first, last: u.last, region: u.region, group: u.group_code, points: u.points, username: u.username });

const cors = (env) => ({ 'access-control-allow-origin': env.ALLOWED_ORIGIN || '*', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
const json = (env, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(env) } });

async function claude(env, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM, ...body }) });
  if (!r.ok) throw new Error('AI xatosi ' + r.status);
  const j = await r.json(); return (j.content || []).map(c => c.text || '').join('').trim();
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    const url = new URL(req.url);
    if (req.method === 'GET') {
      try {
        if (url.pathname === '/rank') {
          const rows = await env.DB.prepare('SELECT first, last, region, points FROM users WHERE points > 0 ORDER BY points DESC LIMIT 100').all();
          return json(env, { top: (rows.results || []).map(r => ({ name: r.first + ' ' + String(r.last || '').slice(0, 1) + '.', region: r.region, points: r.points })) });
        }
        if (url.pathname === '/me') {
          const uid = await readSession(env, req); if (!uid) return json(env, { error: 'kirish kerak' }, 401);
          const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first(); if (!u) return json(env, { error: 'topilmadi' }, 404);
          const st = await env.DB.prepare('SELECT json FROM state WHERE user_id = ?').bind(uid).first();
          return json(env, { user: pubUser(u), state: st ? JSON.parse(st.json) : null });
        }
        if (url.pathname === '/health') return json(env, { ok: true });
      } catch (e) { return json(env, { error: String(e.message || e) }, 502); }
      return json(env, { error: 'topilmadi' }, 404);
    }
    if (req.method !== 'POST') return json(env, { error: 'POST kerak' }, 405);
    let b; try { b = await req.json(); } catch { return json(env, { error: 'JSON xato' }, 400); }
    try {
      if (url.pathname === '/telegram/webhook') {
        if (!env.WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return json(env, { error: 'ruxsat yoq' }, 403);
        await onUpdate(env, b); return json(env, { ok: true });
      }
      if (url.pathname === '/auth/complete') {
        const t = String(b.token || ''); if (!TOKEN_RE.test(t)) return json(env, { error: 'token xato' }, 400);
        const c = await env.AUTH.get('c:' + t); if (!c) return json(env, { error: 'tasdiqlanmagan yoki eskirgan' }, 400);
        const tg = JSON.parse(c);
        let u = await env.DB.prepare('SELECT * FROM users WHERE tg_id = ?').bind(String(tg.id)).first(), existing = !!u;
        if (!u) {
          const first = clean(b.first, 30), last = clean(b.last, 30); if (first.length < 2 || last.length < 2) return json(env, { error: 'ism va familya kerak' }, 400);
          await env.DB.prepare('INSERT INTO users (tg_id, username, first, last, region, group_code, ref, points, created, last_seen) VALUES (?,?,?,?,?,?,?,0,?,?)')
            .bind(String(tg.id), clean(tg.username, 40), first, last, clean(b.region, 40), clean(b.code, 12).toUpperCase(), clean(b.ref, 12).toUpperCase(), Date.now(), Date.now()).run();
          u = await env.DB.prepare('SELECT * FROM users WHERE tg_id = ?').bind(String(tg.id)).first();
        } else { await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(Date.now(), u.id).run(); }
        await env.AUTH.delete('c:' + t); await env.AUTH.delete('p:' + t);
        const st = existing ? await env.DB.prepare('SELECT json FROM state WHERE user_id = ?').bind(u.id).first() : null;
        return json(env, { session: await makeSession(env, u.id), user: pubUser(u), existing, state: st ? JSON.parse(st.json) : null });
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
      if (url.pathname === '/telegram') {
        const text = String(b.text || '').slice(0, 3500); if (!text) return json(env, { error: 'matn yo\'q' }, 400);
        const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }) });
        return json(env, { ok: r.ok }, r.ok ? 200 : 502);
      }
      if (url.pathname === '/ai') {
        const c = b.context || {};
        const ctx = `Talaba: ${String(c.name || '').slice(0, 40)}. Tayyorlik: ${Number(c.readiness) || 0}%. Zaif mavzular: ${(c.weak || []).slice(0, 4).join(', ') || 'noma\'lum'}.`;
        const text = await claude(env, { system: SYSTEM + '\n' + ctx, messages: [{ role: 'user', content: String(b.message || '').slice(0, 1500) }] });
        return json(env, { text });
      }
      if (url.pathname === '/vision') {
        const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(b.image || '')); if (!m) return json(env, { error: 'rasm xato' }, 400);
        const text = await claude(env, { messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }, { type: 'text', text: `Suratdagi yo'l belgisini aniqla. Belgi nomini, ma'nosini va haydovchi nima qilishi kerakligini sodda o'zbek tilida tushuntir. Belgi ko'rinmasa, buni ayt va qayta suratga olishni so'ra.` }] }] });
        return json(env, { text });
      }
      return json(env, { error: 'topilmadi' }, 404);
    } catch (e) { return json(env, { error: String(e.message || e) }, 502); }
  },
};
