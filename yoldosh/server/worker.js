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

const cors = (env) => ({ 'access-control-allow-origin': env.ALLOWED_ORIGIN || '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST,OPTIONS' });
const json = (env, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(env) } });

async function claude(env, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM, ...body }) });
  if (!r.ok) throw new Error('AI xatosi ' + r.status);
  const j = await r.json(); return (j.content || []).map(c => c.text || '').join('').trim();
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (req.method !== 'POST') return json(env, { error: 'POST kerak' }, 405);
    const url = new URL(req.url); let b; try { b = await req.json(); } catch { return json(env, { error: 'JSON xato' }, 400); }
    try {
      if (url.pathname === '/telegram/webhook') {
        if (!env.WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return json(env, { error: 'ruxsat yoq' }, 403);
        await onUpdate(env, b); return json(env, { ok: true });
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
