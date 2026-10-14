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
const isAdminUser = (env, u) => !!u && String(env.ADMIN_TG_IDS || '').split(',').map(s => s.trim()).includes(String(u.tg_id));
const sessionUser = async (env, req) => { const uid = await readSession(env, req); return uid ? await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first() : null; };
const num = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));
const pubSchool = (s) => ({ id: s.id, name: s.name, region: s.region, city: s.city, address: s.address, phone: s.phone, price: s.price, hours: s.hours, note: s.note, telegram: s.telegram });
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const pubUser = (u, env) => ({ admin: env ? isAdminUser(env, u) : false, id: u.id, first: u.first, last: u.last, region: u.region, group: u.group_code, points: u.points, username: u.username });

let _origin = '';
const cors = (env) => ({ 'access-control-allow-origin': (() => { const l = String(env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim()); return l.includes('*') ? '*' : (l.includes(_origin) ? _origin : l[0]); })(), 'vary': 'origin', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
const json = (env, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(env) } });

async function claude(env, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM, ...body }) });
  if (!r.ok) throw new Error('AI xatosi ' + r.status);
  const j = await r.json(); return (j.content || []).map(c => c.text || '').join('').trim();
}

export default {
  async fetch(req, env) {
    _origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    const url = new URL(req.url);
    if (req.method === 'GET') {
      try {
        if (url.pathname === '/rank') {
          const rows = await env.DB.prepare('SELECT first, last, region, points, prem_until FROM users WHERE points > 0 ORDER BY points DESC LIMIT 100').all();
          return json(env, { top: (rows.results || []).map(r => ({ name: r.first + ' ' + String(r.last || '').slice(0, 1) + '.', region: r.region, points: r.points, prem: (r.prem_until || 0) > Date.now() })) });
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
          const u = await sessionUser(env, req); if (!isAdminUser(env, u)) return json(env, { error: 'ruxsat yoq' }, 403);
          const rows = await env.DB.prepare('SELECT s.*, (SELECT COUNT(*) FROM leads l WHERE l.school_id = s.id) AS leads FROM schools s ORDER BY s.region, s.name').all();
          return json(env, { schools: (rows.results || []).map(s => ({ ...pubSchool(s), active: !!s.active, leads: s.leads, free_until: s.free_until, per_student: s.per_student, tg_chat: s.tg_chat })) });
        }
        if (url.pathname === '/admin/leads') {
          const u = await sessionUser(env, req); if (!isAdminUser(env, u)) return json(env, { error: 'ruxsat yoq' }, 403);
          const sid = num(url.searchParams.get('school_id'), 0, 1e9);
          const rows = await env.DB.prepare('SELECT l.id, l.created, l.phone, l.school_id, s.name AS school, u.first, u.last, u.username, u.region FROM leads l JOIN schools s ON s.id = l.school_id JOIN users u ON u.id = l.user_id ' + (sid ? 'WHERE l.school_id = ? ' : '') + 'ORDER BY l.created DESC LIMIT 300').bind(...(sid ? [sid] : [])).all();
          return json(env, { leads: rows.results || [] });
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
        return json(env, { session: await makeSession(env, u.id), user: pubUser(u, env), existing, state: st ? JSON.parse(st.json) : null });
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
      if (url.pathname === '/admin/school') {
        const u = await sessionUser(env, req); if (!isAdminUser(env, u)) return json(env, { error: 'ruxsat yoq' }, 403);
        if (b.delete && b.id) { await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE school_id = ?').bind(num(b.id, 0, 1e9)), env.DB.prepare('DELETE FROM schools WHERE id = ?').bind(num(b.id, 0, 1e9))]); return json(env, { ok: true }); }
        const f = { name: clean(b.name, 80), region: clean(b.region, 40), city: clean(b.city, 60), address: clean(b.address, 160), phone: clean(b.phone, 40), price: clean(b.price, 60), hours: clean(b.hours, 80), note: clean(b.note, 300), telegram: clean(b.telegram, 40).replace(/^@/, ''), tg_chat: clean(b.tg_chat, 20).replace(/[^\d-]/g, ''), active: b.active === false ? 0 : 1, free_until: num(b.free_until, 0, 4e12), per_student: num(b.per_student, 0, 1e8) };
        if (f.name.length < 2) return json(env, { error: 'nom kerak' }, 400);
        if (b.id) await env.DB.prepare('UPDATE schools SET name=?, region=?, city=?, address=?, phone=?, price=?, hours=?, note=?, telegram=?, tg_chat=?, active=?, free_until=?, per_student=? WHERE id=?').bind(f.name, f.region, f.city, f.address, f.phone, f.price, f.hours, f.note, f.telegram, f.tg_chat, f.active, f.free_until, f.per_student, num(b.id, 0, 1e9)).run();
        else await env.DB.prepare('INSERT INTO schools (name, region, city, address, phone, price, hours, note, telegram, tg_chat, active, free_until, per_student, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(f.name, f.region, f.city, f.address, f.phone, f.price, f.hours, f.note, f.telegram, f.tg_chat, f.active, f.free_until, f.per_student, Date.now()).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/account/delete') {
        const uid = await readSession(env, req); if (!uid) return json(env, { error: 'kirish kerak' }, 401);
        await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE user_id = ?').bind(uid), env.DB.prepare('DELETE FROM state WHERE user_id = ?').bind(uid), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(uid)]);
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
        const rr = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: hook, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message'] }) });
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
