/* Qo'shimcha imkoniyatlar: analitika (/ev), story bonusi, avtodrom arizalari, botdagi kunlik 5 savol (cron).
 * Marshrutlar: POST /ev · GET /story/me · POST /story/claim · GET|POST /admin/story* · POST /autodrom/lead · GET /admin/ad · GET /admin/ev
 * worker.js dan chaqiriladi: extras(env, ctx, req, url, H) — mos marshrut bo'lmasa null qaytaradi.
 */
import QBANK from './qbank.js';
import { tg, staffIds, decideStory } from './staff.js';

const DAY = 864e5, TZ = 5 * 36e5;
export const dayKey = () => Math.floor((Date.now() + TZ) / DAY);
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));
const EV_RE = /^[a-z0-9_]{1,32}$/, SRC_RE = /^[a-z0-9_-]{0,24}$/;

let _mig = false;
export async function migrateExtras(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    'CREATE TABLE IF NOT EXISTS ev (day INTEGER NOT NULL, name TEXT NOT NULL, src TEXT NOT NULL DEFAULT \'\', n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, name, src))',
    "CREATE TABLE IF NOT EXISTS story_claims (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, handle TEXT NOT NULL DEFAULT '', platform TEXT NOT NULL DEFAULT '', img TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, decided INTEGER NOT NULL DEFAULT 0)",
    'CREATE INDEX IF NOT EXISTS story_user ON story_claims (user_id, status)',
    "CREATE TABLE IF NOT EXISTS ad_leads (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, user_id INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL)",
    'ALTER TABLE users ADD COLUMN daily INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE users ADD COLUMN daily_day INTEGER NOT NULL DEFAULT 0']) {
    try { await env.DB.prepare(q).run(); } catch (e) { /* bor */ }
  }
}

export async function setting(env, k, def) {
  try { const r = await env.DB.prepare('SELECT v FROM settings WHERE k = ?').bind(k).first(); if (r) { const v = JSON.parse(r.v); return v === null || v === undefined || v === '' ? def : v; } } catch (e) { /* default */ }
  return def;
}
export async function bump(env, name, src) {
  try { await env.DB.prepare('INSERT INTO ev (day, name, src, n) VALUES (?,?,?,1) ON CONFLICT(day, name, src) DO UPDATE SET n = n + 1').bind(dayKey(), name, src || '').run(); } catch (e) { /* analitika yiqilsa ham ish davom etadi */ }
}

/** foydalanuvchiga xos story kodi (kartada chop etiladi, admin tekshiradi) */
export async function storyCode(env, hmac, uid) { const h = String(await hmac(env, 'story:' + uid)).replace(/[^A-Za-z0-9]/g, '').toUpperCase(); return 'CH-' + h.slice(0, 5); }

const DATAURL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

async function sendPhotoStaff(env, chat, dataUrl, caption, rows) {
  const m = DATAURL.exec(dataUrl || ''); if (!m) return tg(env, 'sendMessage', { chat_id: chat, text: caption, reply_markup: { inline_keyboard: rows } });
  const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)), fd = new FormData();
  fd.append('chat_id', String(chat)); fd.append('caption', caption.slice(0, 1000)); fd.append('reply_markup', JSON.stringify({ inline_keyboard: rows }));
  fd.append('photo', new Blob([bin], { type: m[1] }), 'story.' + (m[1].split('/')[1] === 'jpeg' ? 'jpg' : m[1].split('/')[1]));
  try { const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd }); return await r.json(); } catch (e) { return { ok: false }; }
}

/* ---------------- marshrutlar ---------------- */
export async function extras(env, ctx, req, url, H) {
  const p = url.pathname, GET = req.method === 'GET', POST = req.method === 'POST';
  if (!(p === '/ev' || p.startsWith('/story/') || p.startsWith('/autodrom/') || p === '/admin/ev' || p === '/admin/ad' || p.startsWith('/admin/stor'))) return null;
  await migrateExtras(env);
  const { json, sessionUser, adminAllowed, over } = H;
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  try {
    if (p === '/ev' && POST) {
      let b = {}; try { b = await req.json(); } catch (e) { return json(env, { ok: false }, 400); }
      const n = String(b.n || ''), s = String(b.s || '');
      if (!EV_RE.test(n) || !SRC_RE.test(s)) return json(env, { ok: false }, 400);
      if (await over(env, 'rl:ev:' + ip, 120, 60)) return json(env, { ok: false }, 429);
      await bump(env, n, s); return json(env, { ok: true });
    }
    if (p === '/admin/ev' && GET) {
      if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
      const days = num(url.searchParams.get('days'), 1, 90) || 14;
      const rows = (await env.DB.prepare('SELECT day, name, src, n FROM ev WHERE day > ? ORDER BY day DESC').bind(dayKey() - days).all()).results || [];
      return json(env, { today: dayKey(), rows });
    }

    /* ---- story bonusi ---- */
    if (p === '/story/me' && GET) {
      const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
      const rows = (await env.DB.prepare('SELECT id, status, note, created, handle, platform FROM story_claims WHERE user_id = ? ORDER BY id DESC LIMIT 5').bind(u.id).all()).results || [];
      const approved = rows.some(r => r.status === 'approved'), pending = rows.some(r => r.status === 'new'), rejected = rows.filter(r => r.status === 'rejected').length;
      return json(env, { code: await storyCode(env, H.hmac, u.id), days: +(await setting(env, 'storyBonusDays', 15)) || 15, approved, pending, rejected, can: !approved && !pending && rejected < 3, claims: rows });
    }
    if (p === '/story/claim' && POST) {
      const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
      const b = await req.json().catch(() => ({}));
      if (await over(env, 'rl:sc:' + u.id, 6, 3600)) return H.tooMany(env);
      const st = (await env.DB.prepare('SELECT status FROM story_claims WHERE user_id = ?').bind(u.id).all()).results || [];
      if (st.some(r => r.status === 'approved')) return json(env, { error: 'Bonus allaqachon olingan' }, 400);
      if (st.some(r => r.status === 'new')) return json(env, { error: "Oldingi so'rovingiz ko'rib chiqilmoqda" }, 400);
      if (st.filter(r => r.status === 'rejected').length >= 3) return json(env, { error: "Urinishlar tugagan. Qo'llab-quvvatlashga yozing" }, 400);
      const img = String(b.img || ''); if (!DATAURL.test(img) || img.length > 900000) return json(env, { error: 'Skrinshot xato yoki katta (1 MB gacha)' }, 400);
      const platform = b.platform === 'telegram' ? 'telegram' : 'instagram', handle = clean(b.handle, 40);
      if (handle.length < 2) return json(env, { error: "Instagram yoki Telegram nomingizni yozing (@...)" }, 400);
      const r = await env.DB.prepare('INSERT INTO story_claims (user_id, handle, platform, img, status, created) VALUES (?,?,?,?,?,?)').bind(u.id, handle, platform, img, 'new', Date.now()).run();
      const id = r.meta && r.meta.last_row_id; await bump(env, 'story_claim', '');
      const code = await storyCode(env, H.hmac, u.id);
      const cap = `📸 Story bonus so'rovi #${id}\n👤 ${u.first} ${u.last || ''}${u.username ? ' (@' + u.username + ')' : ''}\n📱 ${platform}: ${handle}\n🔑 Kod: ${code}\n\nSkrinshotda ${code} kodi va chorrahaa.uz ko'rinayaptimi? Tasdiqlansa +${await setting(env, 'storyBonusDays', 15)} kun Pro beriladi.`;
      const rows = [[{ text: '✅ Tasdiqlash', callback_data: 'sok:' + id }, { text: '❌ Rad etish', callback_data: 'sno:' + id }]];
      ctx.waitUntil(Promise.all((await staffIds(env, 'orders')).map(c => sendPhotoStaff(env, c, img, cap, rows))));
      return json(env, { ok: true, id });
    }
    if (p === '/admin/stories' && GET) {
      if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
      const rows = (await env.DB.prepare("SELECT s.id, s.user_id, s.handle, s.platform, s.status, s.created, u.first, u.last, u.username FROM story_claims s JOIN users u ON u.id = s.user_id ORDER BY CASE s.status WHEN 'new' THEN 0 ELSE 1 END, s.id DESC LIMIT 60").all()).results || [];
      for (const r of rows) r.code = await storyCode(env, H.hmac, r.user_id);
      return json(env, { items: rows });
    }
    if (p === '/admin/story/img' && GET) {
      if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
      const r = await env.DB.prepare('SELECT img FROM story_claims WHERE id = ?').bind(num(url.searchParams.get('id'), 0, 1e12)).first(); const m = DATAURL.exec((r && r.img) || '');
      if (!m) return json(env, { error: 'topilmadi' }, 404);
      return new Response(Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)), { headers: { 'content-type': m[1], 'cache-control': 'private, max-age=3600', ...H.cors(env) } });
    }
    if (p === '/admin/story/decide' && POST) {
      if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
      const b = await req.json().catch(() => ({}));
      const r = await decideStory(env, num(b.id, 0, 1e12), b.ok ? 'approve' : 'reject', clean(b.note, 120));
      return r.error ? json(env, { error: r.error }, r.code || 400) : json(env, { ok: true });
    }

    /* ---- avtodrom: kutish ro'yxati va hamkor arizasi ---- */
    if (p === '/autodrom/lead' && POST) {
      const b = await req.json().catch(() => ({}));
      if (await over(env, 'rl:ad:' + ip, 6, 3600)) return H.tooMany(env);
      const u = await sessionUser(env, req), kind = b.kind === 'partner' ? 'partner' : 'wait';
      const name = clean(b.name, 60) || (u ? `${u.first} ${u.last || ''}`.trim() : ''), phone = clean(b.phone, 24).replace(/[^\d+]/g, ''), city = clean(b.city, 40), note = clean(b.note, 300);
      if (kind === 'partner' && (name.length < 2 || phone.length < 7)) return json(env, { error: 'Avtodrom nomi va telefon raqamini yozing' }, 400);
      if (u && kind === 'wait') { const had = await env.DB.prepare("SELECT id FROM ad_leads WHERE user_id = ? AND kind = 'wait'").bind(u.id).first(); if (had) return json(env, { ok: true, again: true }); }
      await env.DB.prepare('INSERT INTO ad_leads (kind, user_id, name, phone, city, note, created) VALUES (?,?,?,?,?,?,?)').bind(kind, u ? u.id : 0, name, phone, city, note, Date.now()).run();
      await bump(env, kind === 'partner' ? 'autodrom_partner' : 'autodrom_wait', '');
      if (kind === 'partner') ctx.waitUntil(Promise.all((await staffIds(env, 'orders')).map(c => tg(env, 'sendMessage', { chat_id: c, text: `🏁 Avtodrom hamkorlik arizasi\n🏷 ${name}\n📞 ${phone}\n📍 ${city || '—'}\n${note ? '📝 ' + note : ''}` }))));
      return json(env, { ok: true });
    }
    if (p === '/admin/ad' && GET) {
      if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);
      const rows = (await env.DB.prepare('SELECT a.id, a.kind, a.name, a.phone, a.city, a.note, a.created, u.first, u.last, u.username FROM ad_leads a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 100').all()).results || [];
      const c = await env.DB.prepare("SELECT kind, COUNT(*) n FROM ad_leads GROUP BY kind").all();
      return json(env, { items: rows, counts: Object.fromEntries((c.results || []).map(r => [r.kind, r.n])) });
    }
  } catch (e) { console.error('extras', e && e.stack || e); return H.json(env, { error: "Server xatosi. Birozdan keyin urinib ko'ring." }, 502); }
  return H.json(env, { error: 'topilmadi' }, 404);
}

/* ---------------- kunlik 5 savol ---------------- */
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let _perm = null;
const perm = () => { if (_perm) return _perm; const r = mulberry(20261021), a = QBANK.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return (_perm = a); };
/** berilgan kun uchun 5 ta savol (kunlar o'tishi bilan hammasi aylanib chiqadi) */
export const dailyQuestions = (day) => { const P = perm(), N = P.length; return [0, 1, 2, 3, 4].map(k => QBANK[P[(day * 5 + k) % N]]); };

const site = (env) => (env.SITE_URL || 'https://chorrahaa.uz/').replace(/#.*$/, '').replace(/\/?$/, '/');
const LET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/** bitta savolni (rasm + viktorina so'rovi) yuboradi. Variant 100 belgidan uzun bo'lsa — harflar bilan */
async function sendOne(env, chat, q, idx, anon) {
  const [n, text, opts, ans, photo, expl] = q;
  if (photo) await tg(env, 'sendPhoto', { chat_id: chat, photo: `${site(env)}img/q/q${n}.jpg` });
  const longOpt = opts.some(o => o.length > 100) || text.length > 270;
  let question = `${idx}) ${text}`, options = opts;
  if (longOpt) {
    await tg(env, 'sendMessage', { chat_id: chat, text: `${idx}) ${text}\n\n${opts.map((o, i) => LET[i] + ') ' + o).join('\n')}`.slice(0, 4000) });
    question = `${idx}-savol: to'g'ri javobni tanlang`; options = opts.map((_, i) => LET[i]);
  }
  return tg(env, 'sendPoll', { chat_id: chat, question: question.slice(0, 300), options: options.map(o => o.slice(0, 100)), type: 'quiz', correct_option_id: ans, is_anonymous: !!anon, ...(expl ? { explanation: expl.slice(0, 200) } : {}) });
}
export async function sendQuiz(env, chat, day, anon) {
  const qs = dailyQuestions(day);
  for (let i = 0; i < qs.length; i++) await sendOne(env, chat, qs[i], i + 1, anon);
}
const cta = (env) => [[{ text: "🚀 Barcha savollar — saytda", url: site(env) + '?s=bot#/guest' }], [{ text: '🔕 Kunlik savollarni o\'chirish', callback_data: 'dq:off' }]];

/** inline tugma bosilganda (oddiy foydalanuvchi) */
export async function onDailyCallback(env, q) {
  const d = String(q.data || ''), chat = q.message && q.message.chat.id; if (!chat || !q.from) return;
  const ans = (t, alert) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: t, show_alert: !!alert });
  await migrateExtras(env);
  if (d === 'dq:off') { await env.DB.prepare('UPDATE users SET daily = 0 WHERE tg_id = ?').bind(String(q.from.id)).run(); await ans("Kunlik savollar o'chirildi. Qayta yoqish: /daily"); return; }
  const m = /^dq:(\d+)$/.exec(d); if (!m) return;
  await ans(); await bump(env, 'bot_daily_start', 'bot');
  const day = dayKey(); await sendQuiz(env, chat, +m[1] === day ? day : day, false);
  await tg(env, 'sendMessage', { chat_id: chat, text: "✅ Bugungi savollar tugadi! Ko'proq mashq qilish uchun saytga kiring: 20 ta savol ro'yxatsiz, keyin ovozli tushuntirish, AI yordamchi va 3D simulyator.", reply_markup: { inline_keyboard: cta(env) } });
}
/** /stop va /daily buyruqlari */
export async function onDailyCommand(env, m) {
  const t = String(m.text || '').trim().toLowerCase().split(/\s|@/)[0];
  if (t !== '/stop' && t !== '/daily') return false;
  await migrateExtras(env);
  const on = t === '/daily';
  await env.DB.prepare('UPDATE users SET daily = ? WHERE tg_id = ?').bind(on ? 1 : 0, String(m.from.id)).run();
  await tg(env, 'sendMessage', { chat_id: m.chat.id, text: on ? "✅ Kunlik 5 ta savol yoqildi. Har kuni ertalab yuboraman." : "🔕 Kunlik savollar o'chirildi. Qayta yoqish: /daily" });
  return true;
}

/** cron: ertalab (Toshkent 08:00 dan) kanalga 5 ta viktorina + foydalanuvchilarga taklif (har tikda 38 tagacha) */
export async function runDaily(env) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await migrateExtras(env);
  const today = dayKey();
  const chan = String(await setting(env, 'dailyChannel', '') || '').trim();
  if (chan && (await setting(env, 'dq_chan_day', 0)) !== today) {
    await env.DB.prepare("INSERT INTO settings (k, v) VALUES ('dq_chan_day', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(String(today)).run();
    await tg(env, 'sendMessage', { chat_id: chan, text: `🚦 Bugungi 5 ta savol — ${new Date(Date.now() + TZ).toISOString().slice(0, 10)}\nJavob bering, to'g'risi darrov ko'rinadi 👇` });
    await sendQuiz(env, chan, today, true);
    await tg(env, 'sendMessage', { chat_id: chan, text: "Ko'proq savol, ovozli tushuntirish va 3D simulyator — chorrahaa.uz", reply_markup: { inline_keyboard: [[{ text: '🚀 Saytga o\'tish', url: site(env) + '?s=tgchannel#/guest' }]] } });
  }
  if (!(await setting(env, 'dailyOn', true))) return;
  const rows = (await env.DB.prepare("SELECT id, tg_id FROM users WHERE daily = 1 AND daily_day < ? AND tg_id != '' ORDER BY id LIMIT 38").bind(today).all()).results || [];
  for (const u of rows) {
    const r = await tg(env, 'sendMessage', { chat_id: u.tg_id, text: "🚦 Bugungi 5 ta savol tayyor!\nHar biriga javob bering — to'g'ri javobdan keyin tushuntirish chiqadi.", reply_markup: { inline_keyboard: [[{ text: '▶️ Boshlash', callback_data: 'dq:' + today }]] } });
    if (r && r.ok === false && /blocked|deactivated|chat not found/i.test(String(r.description || ''))) await env.DB.prepare('UPDATE users SET daily = 0 WHERE id = ?').bind(u.id).run();
    else await env.DB.prepare('UPDATE users SET daily_day = ? WHERE id = ?').bind(today, u.id).run();
    if (r && r.ok) await bump(env, 'bot_daily_sent', 'bot');
  }
  /* tozalash: eski ovozli xabarlar va tashrif hisoblari */
  if (rows.length === 0) {
    try { await env.DB.prepare('DELETE FROM chat_voice WHERE created < ?').bind(Date.now() - 90 * DAY).run(); await env.DB.prepare('DELETE FROM ev WHERE day < ?').bind(today - 400).run(); } catch (e) { /* keyingi safar */ }
  }
}
