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
const pubUser = (u, env) => ({ admin: env ? isAdminUser(env, u) : false, prem_until: u.prem_until || 0, id: u.id, first: u.first, last: u.last, region: u.region, group: u.group_code, points: u.points, username: u.username });

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
          if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
          const rows = await env.DB.prepare('SELECT s.*, (SELECT COUNT(*) FROM leads l WHERE l.school_id = s.id) AS leads FROM schools s ORDER BY s.region, s.name').all();
          return json(env, { schools: (rows.results || []).map(s => ({ ...pubSchool(s), active: !!s.active, leads: s.leads, free_until: s.free_until, per_student: s.per_student, tg_chat: s.tg_chat })) });
        }
        if (url.pathname === '/config') {                       // ochiq: sayt sozlamalari (narxlar va h.k.)
          const rows = await env.DB.prepare('SELECT k, v FROM settings').all(); const o = {}; for (const r of rows.results || []) { try { o[r.k] = JSON.parse(r.v); } catch (e) { } }
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
          return json(env, { users: t.c, new1: n1.c, new7: n7.c, active1: a1.c, active7: a7.c, premium: pr.c, schools: sc.c, leads: ld.c, points: pts.c, regions: reg.results || [], signups14: days.results || [] });
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
      if (url.pathname === '/promo/redeem') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const code = clean(b.code, 24).toUpperCase(); if (!code) return json(env, { error: 'kod kiriting' }, 400);
        const p = await env.DB.prepare('SELECT * FROM promos WHERE code = ? AND active = 1').bind(code).first();
        if (!p || (p.expires && p.expires < Date.now())) return json(env, { error: "Promokod noto'g'ri yoki muddati tugagan" }, 400);
        if (p.max_uses && p.used >= p.max_uses) return json(env, { error: 'Promokod limiti tugagan' }, 400);
        const had = await env.DB.prepare('SELECT 1 x FROM promo_uses WHERE promo_id = ? AND user_id = ?').bind(p.id, u.id).first(); if (had) return json(env, { error: 'Siz bu kodni ishlatgansiz' }, 400);
        const base = Math.max(Date.now(), u.prem_until || 0), until = base + p.days * 864e5;
        await env.DB.batch([env.DB.prepare('INSERT INTO promo_uses (promo_id, user_id, at) VALUES (?,?,?)').bind(p.id, u.id, Date.now()), env.DB.prepare('UPDATE promos SET used = used + 1 WHERE id = ?').bind(p.id), env.DB.prepare('UPDATE users SET prem_until = ? WHERE id = ?').bind(until, u.id)]);
        return json(env, { ok: true, days: p.days, prem_until: until });
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
        const code = clean(b.code, 24).toUpperCase().replace(/[^A-Z0-9_-]/g, ''), days = num(b.days, 1, 3650); if (code.length < 3) return json(env, { error: 'kod kamida 3 belgi' }, 400);
        try { await env.DB.prepare('INSERT INTO promos (code, days, max_uses, expires, active, used, created) VALUES (?,?,?,?,1,0,?)').bind(code, days, num(b.max_uses, 0, 1e7), num(b.expires, 0, 4e12), Date.now()).run(); } catch (e) { return json(env, { error: 'bu kod mavjud' }, 400); }
        return json(env, { ok: true });
      }
      if (url.pathname === '/admin/media') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || '')); if (!m) return json(env, { error: 'rasm xato' }, 400);
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
      if (url.pathname === '/admin/user') {
        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
        const id = num(b.id, 0, 1e9); if (!id) return json(env, { error: 'id kerak' }, 400);
        if (b.delete) { await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE user_id = ?').bind(id), env.DB.prepare('DELETE FROM state WHERE user_id = ?').bind(id), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id)]); return json(env, { ok: true }); }
        if (b.prem_days !== undefined) { const days = num(b.prem_days, 0, 3650); await env.DB.prepare('UPDATE users SET prem_until = ? WHERE id = ?').bind(days ? Date.now() + days * 864e5 : 0, id).run(); return json(env, { ok: true }); }
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
