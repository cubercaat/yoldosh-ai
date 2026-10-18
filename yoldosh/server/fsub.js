/* Majburiy obuna: foydalanuvchi ro'yxatdan o'tishdan (botda Start) oldin admin belgilagan kanal(lar)ga a'zo bo'lishi shart.
   Sozlama D1 `settings` jadvalida ('fsub' kaliti) saqlanadi: { on: true, channels: [{ chat, title, url }] }.
   Bot kanalda ADMIN bo'lishi kerak, aks holda Telegram a'zolikni tekshirishga ruxsat bermaydi. */

const KEY = 'fsub';
export const MAX_CHANNELS = 5;
const OK_STATUS = ['creator', 'administrator', 'member'];

export async function tgCall(env, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try { return await r.json(); } catch { return { ok: !!r.ok }; }
  } catch { return { ok: false }; }
}

export async function getFsub(env) {
  try {
    const r = await env.DB.prepare('SELECT v FROM settings WHERE k = ?').bind(KEY).first();
    const j = r ? JSON.parse(r.v) : null;
    const channels = Array.isArray(j && j.channels) ? j.channels.filter(c => c && c.chat && c.url).slice(0, MAX_CHANNELS) : [];
    return { on: !!(j && j.on), channels };
  } catch { return { on: false, channels: [] }; }
}

export async function setFsub(env, cfg) {
  const v = JSON.stringify({ on: !!cfg.on, channels: (cfg.channels || []).slice(0, MAX_CHANNELS) });
  await env.DB.prepare('INSERT INTO settings (k, v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(KEY, v).run();
}

/** foydalanuvchi a'zo bo'lmagan kanallar. Tekshirib bo'lmasa (bot kanalda admin emas va h.k.) shu kanal o'tkazib yuboriladi,
    shunda sozlama xatosi sababli hamma foydalanuvchi to'siqda qolib ketmaydi. */
export async function missingChannels(env, userId) {
  const cfg = await getFsub(env); if (!cfg.on || !cfg.channels.length) return [];
  const res = await Promise.all(cfg.channels.map(async (ch) => {
    const r = await tgCall(env, 'getChatMember', { chat_id: ch.chat, user_id: userId });
    if (!r || !r.ok || !r.result) return null;
    const s = r.result.status;
    return OK_STATUS.includes(s) || (s === 'restricted' && r.result.is_member) ? null : ch;
  }));
  return res.filter(Boolean);
}

export const subText = (missing) => `📢 Davom etish uchun avval ${missing.length > 1 ? 'quyidagi kanallarga' : 'quyidagi kanalga'} obuna bo'ling, keyin «✅ Tekshirish» tugmasini bosing.`;
export const subKeyboard = (missing, token) => [
  ...missing.map(ch => [{ text: '📢 ' + String(ch.title || 'Kanal').slice(0, 40), url: ch.url }]),
  [{ text: '✅ Tekshirish', callback_data: 'fsc:' + token }],
];
