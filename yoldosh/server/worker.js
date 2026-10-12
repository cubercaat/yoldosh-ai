/* Chorraha — backend (Cloudflare Worker). Uchta vazifa:
 *   POST /telegram  — talaba xabarini ustozning Telegramiga yuboradi
 *   POST /ai        — AI yordamchi (Claude)
 *   POST /vision    — kamera suratidagi yo'l belgisini aniqlaydi (Claude ko'rish)
 * Sirlar (wrangler secret put ...): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ANTHROPIC_API_KEY
 * O'zgaruvchi: ALLOWED_ORIGIN (saytingiz manzili, masalan https://yoldosh.uz)
 */
const MODEL = 'claude-haiku-4-5-20251001';
const SYSTEM = `Sen Chorraha — avtomaktab talabalari uchun yo'l harakati qoidalari bo'yicha yordamchisan.
O'zbek tilida (lotin), sodda, qisqa va do'stona javob ber. Murakkab atamalarni oddiy so'z bilan tushuntir va eslab qolish usulini ayt.
Aniq raqam yoki jarima haqida ishonching komil bo'lmasa, "ustozingizdan tasdiqlang" de. Mavzudan tashqari savollarga muloyim rad javobi ber.`;

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
