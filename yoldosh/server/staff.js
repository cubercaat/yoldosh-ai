/* Telegram bot orqali boshqaruv: egasi (ADMIN_TG_IDS) va u tayinlagan adminlar (ruxsatlari bilan).
   Imkoniyatlar: ommaviy xabar/reklama (rasm + tugma, auditoriya tanlash), to'lovlarni tasdiqlash, promokod, Premium berish, statistika, adminlarni boshqarish.
   Ommaviy yuborish Cloudflare cheklovi (bitta so'rovda ~50 ta tashqi chaqiruv) sababli bo'laklab, o'z-o'zini chaqirib davom etadi. */

import { getFsub, setFsub, MAX_CHANNELS } from './fsub.js';

export const PERMS = {
  broadcast: 'Xabar va reklama yuborish',
  orders: "To'lovlarni tasdiqlash",
  users: 'Foydalanuvchilarga Premium berish',
  promo: 'Promokod yaratish',
  stats: "Statistikani ko'rish",
  forcesub: "Majburiy obunani sozlash",
};
const CHUNK = 25;
const owners = (env) => String(env.ADMIN_TG_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const fmt = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export async function tg(env, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try { return await r.json(); } catch { return { ok: !!r.ok }; }
  } catch { return { ok: false }; }
}
const say = (env, chat, text, rows) => tg(env, 'sendMessage', { chat_id: chat, text, ...(rows ? { reply_markup: { inline_keyboard: rows } } : {}) });

export async function roleOf(env, id) {
  id = String(id);
  if (owners(env).includes(id)) return { owner: true, perms: Object.keys(PERMS) };
  const r = await env.DB.prepare('SELECT perms FROM admins WHERE tg_id = ?').bind(id).first();
  if (!r) return null;
  let p = []; try { p = JSON.parse(r.perms); } catch { /* bo'sh */ }
  return { owner: false, perms: (Array.isArray(p) ? p : []).filter(k => k in PERMS) };
}
export const can = (role, perm) => !!role && (role.owner || role.perms.includes(perm));

/** egalar + shu ruxsati bor adminlarning Telegram ID lari */
export async function staffIds(env, perm) {
  const ids = new Set(owners(env));
  const rows = (await env.DB.prepare('SELECT tg_id, perms FROM admins').all()).results || [];
  for (const r of rows) { try { if (JSON.parse(r.perms).includes(perm)) ids.add(String(r.tg_id)); } catch { /* o'tkazib yuboramiz */ } }
  return [...ids];
}

/** tugmalar (callback_query) kelishi uchun webhookni bir marta yangilaydi: egasi /admin yozganda o'zi bajariladi */
export const BOT_ABOUT = "🚗 Chorraha — haydovchilik guvohnomasi (prava) imtihoniga tayyorlov: 1000+ savol, imtihon rejimi, Battle, reyting va Simulyator PRO.\n\nBotga /start bosing va saytda ro'yxatdan o'ting. Premium: Pro / Premium / Max.\n🎟 Promokod bo'lsa — ro'yxatdan o'tishda yoki to'lovda kiriting!";
export const BOT_SHORT = '🚗 Chorraha — prava imtihoniga tayyorlov: testlar, Battle, Simulyator. chorrahaa.uz';
/** bot «bio» (qisqa tavsif + «Bu bot nima qila oladi?» matni) va profil rasmi */
export async function applyBotProfile(env) {
  const out = {};
  out.desc = (await tg(env, 'setMyDescription', { description: BOT_ABOUT, language_code: '' })).ok;
  out.short = (await tg(env, 'setMyShortDescription', { short_description: BOT_SHORT, language_code: '' })).ok;
  try {
    const base = (env.SITE_URL || '').replace(/#.*$/, '').replace(/\/?$/, '/');
    const img = await fetch(base + 'img/bot-photo.jpg'); if (!img.ok) throw new Error('rasm yoq');
    const fd = new FormData(); fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://pic' })); fd.append('pic', new Blob([await img.arrayBuffer()], { type: 'image/jpeg' }), 'bot.jpg');
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setMyProfilePhoto`, { method: 'POST', body: fd });
    out.photo = !!(await r.json().catch(() => ({}))).ok;
  } catch (e) { out.photo = false; }
  return out;
}
async function ensureWebhook(env, origin) {
  if (!env.WEBHOOK_SECRET) return;
  if (!(await env.AUTH.get('bp:v1'))) { const r = await applyBotProfile(env); if (r.desc && r.short) await env.AUTH.put('bp:v1', '1'); }
  if (await env.AUTH.get('wh:v2')) return;
  const r = await tg(env, 'setWebhook', { url: origin + '/telegram/webhook', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] });
  await tg(env, 'setMyCommands', { commands: [{ command: 'start', description: 'Boshlash' }, { command: 'admin', description: 'Boshqaruv paneli (adminlar uchun)' }] });
  if (r && r.ok) await env.AUTH.put('wh:v2', '1');
}

/* ---------- holat (KV): ko'p bosqichli suhbatlar ---------- */
const stGet = async (env, chat) => { try { return JSON.parse(await env.AUTH.get('st:' + chat)) || null; } catch { return null; } };
const stSet = (env, chat, v) => env.AUTH.put('st:' + chat, JSON.stringify(v), { expirationTtl: 3600 });
const stDel = (env, chat) => env.AUTH.delete('st:' + chat);
const dGet = async (env, k) => { try { return JSON.parse(await env.AUTH.get(k)) || null; } catch { return null; } };
const dSet = (env, k, v) => env.AUTH.put(k, JSON.stringify(v), { expirationTtl: 3 * 3600 });

/* ---------- asosiy menyu ---------- */
const PM_HELP = "🎟 Promokod formati:\nKOD  KUN  TARIF  CHEGIRMA%  [LIMIT]\n\n• KUN — ro'yxatdan o'tganda beriladigan bepul kunlar (0 — bermaydi)\n• TARIF — pro, premium yoki max\n• CHEGIRMA% — sotib olishdagi chegirma (0 — yo'q)\n• LIMIT — nechta odam ishlata oladi (yozilmasa cheksiz)\n\nMasalan:\nBLOGER1 7 pro 20 100 — 7 kun Pro + 20% chegirma, 100 kishi\nCHEGIRMA30 0 premium 30 — faqat 30% chegirma\nBekor qilish: /cancel";
async function menu(env, chat, role, note) {
  const rows = [];
  if (can(role, 'stats')) rows.push([{ text: '📊 Statistika', callback_data: 'st' }]);
  if (can(role, 'broadcast')) rows.push([{ text: '📣 Xabar / reklama yuborish', callback_data: 'bc' }, { text: '📜 Yuborishlar', callback_data: 'bcl' }]);
  if (can(role, 'orders')) { const n = (await env.DB.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'paid'").first()).c; rows.push([{ text: `💳 To'lovlar${n ? ' (' + n + ')' : ''}`, callback_data: 'od' }]); }
  if (can(role, 'promo')) rows.push([{ text: '🎟 Promokod yaratish', callback_data: 'pm' }]);
  if (can(role, 'users')) rows.push([{ text: '👑 Premium berish', callback_data: 'pr' }]);
  if (can(role, 'forcesub')) rows.push([{ text: '🔒 Majburiy obuna', callback_data: 'fs' }]);
  if (role.owner) rows.push([{ text: '👥 Adminlar', callback_data: 'ad' }]);
  return say(env, chat, (note ? note + '\n\n' : '') + `Chorraha boshqaruv paneli${role.owner ? ' (ega)' : ''}. Kerakli bo'limni tanlang:`, rows);
}

/* ---------- ommaviy xabar ---------- */
const AUD = { all: 'Hamma', free: 'Premium bo\'lmaganlar', prem: 'Premium egalari' };
const audWhere = (a) => a === 'free' ? ' AND (prem_until IS NULL OR prem_until < ?)' : a === 'prem' ? ' AND prem_until >= ?' : '';
async function audCount(env, a) { const w = audWhere(a); return (await env.DB.prepare('SELECT COUNT(*) c FROM users WHERE 1=1' + w).bind(...(w ? [Date.now()] : [])).first()).c; }
const sendBc = (env, chat, j) => {
  const markup = j.btn_text && j.btn_url ? { reply_markup: { inline_keyboard: [[{ text: j.btn_text, url: j.btn_url }]] } } : {};
  return j.photo ? tg(env, 'sendPhoto', { chat_id: chat, photo: j.photo, caption: j.text || undefined, ...markup }) : tg(env, 'sendMessage', { chat_id: chat, text: j.text, ...markup });
};
async function bcPreview(env, chat) {
  const d = await dGet(env, 'bc:' + chat); if (!d) { await say(env, chat, 'Qoralama topilmadi. /admin ni bosing.'); return; }
  await sendBc(env, chat, { text: d.text, photo: d.photo, btn_text: d.btn && d.btn[0], btn_url: d.btn && d.btn[1] });
  const n = await audCount(env, d.aud);
  const A = (k) => ({ text: (d.aud === k ? '✅ ' : '') + AUD[k], callback_data: 'bca:' + k });
  await say(env, chat, `☝️ Xabar shunday ko'rinadi.\n\nAuditoriya: ${AUD[d.aud]} — ${n} kishi`, [
    [A('all'), A('free'), A('prem')],
    [d.btn ? { text: "🔗 Tugmani o'chirish", callback_data: 'bcbx' } : { text: "🔗 Tugma qo'shish (reklama)", callback_data: 'bcb' }],
    [{ text: '📨 Menga sinov', callback_data: 'bct' }, { text: "✏️ Matnni o'zgartirish", callback_data: 'bc' }],
    [{ text: `✅ Yuborish (${n})`, callback_data: 'bcs' }, { text: '✖ Bekor', callback_data: 'x' }],
  ]);
}
export async function createBroadcast(env, by, d) {
  const total = await audCount(env, d.aud);
  const r = await env.DB.prepare("INSERT INTO broadcasts (owner_tg, text, photo, btn_text, btn_url, audience, after, sent, failed, total, status, created, finished) VALUES (?,?,?,?,?,?,0,0,0,?,'running',?,0)")
    .bind(String(by), d.text || '', d.photo || '', (d.btn && d.btn[0]) || '', (d.btn && d.btn[1]) || '', d.aud || 'all', total, Date.now()).run();
  return { id: r.meta.last_row_id, total };
}
export async function signBc(env, id) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('bc:' + id))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** bitta bo'lak yuboradi va keyingisini chaqiradi (zanjir). origin — Worker manzili. */
export async function runChunk(env, ctx, origin, id) {
  const j = await env.DB.prepare('SELECT * FROM broadcasts WHERE id = ?').bind(id).first(); if (!j || j.status !== 'running') return { done: true };
  const w = audWhere(j.audience);
  const rows = (await env.DB.prepare(`SELECT id, tg_id FROM users WHERE id > ?${w} ORDER BY id LIMIT ${CHUNK}`).bind(j.after, ...(w ? [Date.now()] : [])).all()).results || [];
  let ok = 0, bad = 0;
  await Promise.all(rows.map(async (r) => { const res = await sendBc(env, r.tg_id, j); if (res && res.ok) ok++; else bad++; }));
  const last = rows.length ? rows[rows.length - 1].id : j.after, done = rows.length < CHUNK;
  await env.DB.prepare('UPDATE broadcasts SET after = ?, sent = sent + ?, failed = failed + ?, status = ?, finished = ? WHERE id = ?').bind(last, ok, bad, done ? 'done' : 'running', done ? Date.now() : 0, id).run();
  if (done) {
    const f = await env.DB.prepare('SELECT sent, failed, total FROM broadcasts WHERE id = ?').bind(id).first();
    await say(env, j.owner_tg, `✅ Yuborish #${id} tugadi.\nYetkazildi: ${f.sent}\nYetkazilmadi: ${f.failed} (botni bloklaganlar)\nAuditoriya: ${AUD[j.audience] || j.audience}`);
    return { done: true };
  }
  const next = fetch(origin + '/internal/bc', { method: 'POST', headers: { 'content-type': 'application/json', 'x-bc': await signBc(env, id) }, body: JSON.stringify({ id }) }).catch(() => { });
  if (ctx && ctx.waitUntil) ctx.waitUntil(next); else await next;
  return { done: false };
}
export async function kickBroadcast(env, ctx, origin, id) {
  const p = fetch(origin + '/internal/bc', { method: 'POST', headers: { 'content-type': 'application/json', 'x-bc': await signBc(env, id) }, body: JSON.stringify({ id }) }).catch(() => { });
  if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
}

/* ---------- to'lovlarni hal qilish (bot ham, web panel ham shu funksiyani ishlatadi) ---------- */
export async function decideOrder(env, id, action, reason) {
  const o = await env.DB.prepare('SELECT o.*, u.tg_id, u.prem_until FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?').bind(id).first();
  if (!o) return { error: 'topilmadi', code: 404 };
  if (o.status === 'approved' || o.status === 'rejected') return { error: o.status === 'approved' ? 'allaqachon tasdiqlangan' : 'allaqachon rad etilgan', code: 400, order: o };
  if (action === 'approve') {
    const until = Math.max(Date.now(), o.prem_until || 0) + o.days * 864e5;
    const tier = ['pro', 'premium', 'max'].includes(o.tier) ? o.tier : 'premium', TN = { pro: 'Pro', premium: 'Premium', max: 'Max' };
    const ops = [env.DB.prepare("UPDATE orders SET status = 'approved', updated = ? WHERE id = ?").bind(Date.now(), o.id), env.DB.prepare('UPDATE users SET prem_until = ?, prem_tier = ? WHERE id = ?').bind(until, tier, o.user_id)];
    if (o.promo) { const pr = await env.DB.prepare('SELECT id FROM promos WHERE code = ?').bind(o.promo).first(); if (pr) ops.push(env.DB.prepare('INSERT OR IGNORE INTO promo_uses (promo_id, user_id, at) VALUES (?,?,?)').bind(pr.id, o.user_id, Date.now()), env.DB.prepare('UPDATE promos SET used = used + 1 WHERE id = ?').bind(pr.id)); }
    await env.DB.batch(ops);
    await say(env, o.tg_id, `✅ To'lovingiz tasdiqlandi! ${TN[tier]} ${o.days} kunga faollashtirildi. Rahmat!`);
  } else if (action === 'reject') {
    const why = clean(reason, 160);
    await env.DB.prepare("UPDATE orders SET status = 'rejected', reason = ?, updated = ? WHERE id = ?").bind(why, Date.now(), o.id).run();
    await say(env, o.tg_id, `❌ To'lov tasdiqlanmadi${why ? ': ' + why : ''}. Savol bo'lsa, yozing.`);
  } else return { error: 'amal yoq', code: 400 };
  return { ok: true, order: o };
}
/** yangi to'lov haqida xodimlarga tugmali xabar */
export async function notifyOrder(env, order, who, note, siteUrl) {
  const text = `💳 Yangi to'lov: #${order.id}\n👤 ${who}\n💰 ${fmt(order.amount)} so'm · ${order.days} kun · ${({ pro: 'Pro', premium: 'Premium', max: 'Max' })[order.tier] || 'Premium'}${order.promo ? ' · 🎟 ' + order.promo + ' (−' + fmt(order.discount) + ')' : ''}${note ? '\n📝 ' + note : ''}`;
  const rows = [[{ text: '✅ Tasdiqlash', callback_data: 'ok:' + order.id }, { text: '❌ Rad etish', callback_data: 'no:' + order.id }], [{ text: '🌐 Admin panel', url: siteUrl + '#/admin' }]];
  await Promise.all((await staffIds(env, 'orders')).map(c => say(env, c, text, rows)));
}

/* ---------- adminlar ---------- */
const permRows = (perms, withBack) => [
  ...Object.entries(PERMS).map(([k, l]) => [{ text: (perms.includes(k) ? '☑️ ' : '⬜ ') + l, callback_data: 'adt:' + k }]),
  [{ text: '💾 Saqlash', callback_data: 'ads' }, { text: '✖ Bekor', callback_data: withBack || 'x' }],
];
async function adminList(env, chat) {
  const rows = (await env.DB.prepare('SELECT tg_id, name, perms FROM admins ORDER BY created').all()).results || [];
  const kb = rows.map(r => { let p = []; try { p = JSON.parse(r.perms); } catch { /* bo'sh */ } return [{ text: `${r.name || r.tg_id} · ${p.length} ta ruxsat`, callback_data: 'ade:' + r.tg_id }, { text: '🗑', callback_data: 'adr:' + r.tg_id }]; });
  kb.push([{ text: "➕ Admin qo'shish", callback_data: 'ada' }]);
  await say(env, chat, `Egalar (o'zgartirib bo'lmaydi): ${owners(env).join(', ')}\n\nAdminlar (${rows.length}):${rows.length ? '' : '\nHozircha yo\'q.'}\n🗑 — adminlikdan olish, nomni bossangiz ruxsatlarini o'zgartirasiz.`, kb);
}
const permText = (perms) => perms.length ? perms.map(k => '• ' + PERMS[k]).join('\n') : '(ruxsat yo\'q)';

async function findUserTg(env, q) {
  q = String(q).trim().replace(/^@/, '');
  if (/^\d{2,15}$/.test(q)) { const u = await env.DB.prepare('SELECT tg_id, first, last, username FROM users WHERE tg_id = ?').bind(q).first(); return u || { tg_id: q, first: '', last: '', username: '' }; }
  return await env.DB.prepare('SELECT tg_id, first, last, username FROM users WHERE username = ? COLLATE NOCASE').bind(q).first();
}

/* ---------- majburiy obuna ---------- */
async function fsPanel(env, chat, note) {
  const cfg = await getFsub(env), active = cfg.on && cfg.channels.length > 0;
  const kb = cfg.channels.map((c, i) => [{ text: '📢 ' + String(c.title || c.chat).slice(0, 30), url: c.url }, { text: '🗑', callback_data: 'fsd:' + i }]);
  if (cfg.channels.length < MAX_CHANNELS) kb.push([{ text: "➕ Kanal qo'shish", callback_data: 'fsa' }]);
  if (cfg.channels.length) kb.push([{ text: cfg.on ? "🔴 O'chirib qo'yish" : '🟢 Yoqish', callback_data: 'fst' }]);
  kb.push([{ text: '⬅️ Menyu', callback_data: 'mn' }]);
  await say(env, chat, (note ? note + '\n\n' : '') + `🔒 Majburiy obuna: ${active ? '🟢 yoqilgan' : "🔴 o'chiq"}\n\nYoqilganda foydalanuvchi ro'yxatdan o'tishdan oldin quyidagi kanal(lar)ga obuna bo'lishi shart.\n` +
    (cfg.channels.length ? `Kanallar: ${cfg.channels.length}/${MAX_CHANNELS}. 🗑 — kanalni olib tashlash.` : "Hozircha kanal yo'q. Avval botni kanalga ADMIN qilib qo'shing, so'ng «Kanal qo'shish» ni bosing."), kb);
}

/* ---------- xabar kirganda ---------- */
async function onMessage(env, ctx, origin, m, role) {
  const chat = m.chat.id, text = String(m.text || '').trim();
  if (/^\/(admin|panel|menu)(@\w+)?$/i.test(text)) { await stDel(env, chat); await ensureWebhook(env, origin); await menu(env, chat, role); return true; }
  if (/^\/cancel(@\w+)?$/i.test(text)) { await stDel(env, chat); await menu(env, chat, role, 'Bekor qilindi.'); return true; }
  const st = await stGet(env, chat); if (!st) return false;
  const a = st.a;
  if (a === 'bc_text' && can(role, 'broadcast')) {
    let d;
    if (m.photo && m.photo.length) d = { photo: m.photo[m.photo.length - 1].file_id, text: clean(m.caption, 1000) };
    else if (text && !text.startsWith('/')) d = { photo: '', text: text.slice(0, 3500) };
    else { await say(env, chat, 'Matn yoki rasm (izoh bilan) yuboring. Bekor qilish: /cancel'); return true; }
    const old = await dGet(env, 'bc:' + chat);
    await dSet(env, 'bc:' + chat, { ...d, btn: old ? old.btn : null, aud: old ? old.aud : 'all' }); await stDel(env, chat); await bcPreview(env, chat); return true;
  }
  if (a === 'bc_btn' && can(role, 'broadcast')) {
    const mm = /^(.{1,40}?)\s*\|\s*(https?:\/\/\S{4,300}|t\.me\/\S+)$/.exec(text);
    if (!mm) { await say(env, chat, "Format: tugma matni | havola\nMasalan: Premium olish | https://chorrahaa.uz\nBekor qilish: /cancel"); return true; }
    const d = await dGet(env, 'bc:' + chat); if (!d) { await stDel(env, chat); return true; }
    d.btn = [mm[1].trim(), mm[2].startsWith('t.me') ? 'https://' + mm[2] : mm[2]]; await dSet(env, 'bc:' + chat, d); await stDel(env, chat); await bcPreview(env, chat); return true;
  }
  if (a === 'pm' && can(role, 'promo')) {
    /* KOD  KUN  TARIF  CHEGIRMA%  [LIMIT]   masalan: BLOGER1 7 pro 20 100 */
    const mm = /^([A-Za-z0-9_-]{3,24})\s+(\d{1,4})\s+(pro|premium|max)\s+(\d{1,2})(?:\s+(\d{1,7}))?$/i.exec(text);
    if (!mm || (!+mm[2] && !+mm[4])) { await say(env, chat, PM_HELP); return true; }
    try { await env.DB.prepare('INSERT INTO promos (code, days, tier, percent, max_uses, expires, active, used, created) VALUES (?,?,?,?,?,?,1,0,?)').bind(mm[1].toUpperCase(), Math.min(3650, +mm[2]), mm[3].toLowerCase(), Math.min(90, +mm[4]), +(mm[5] || 0), 0, Date.now()).run(); }
    catch { await say(env, chat, 'Bu kod allaqachon mavjud. Boshqa kod yozing.'); return true; }
    await stDel(env, chat); await menu(env, chat, role, `🎟 Promokod yaratildi: ${mm[1].toUpperCase()}\n${+mm[2] ? '🎁 +' + mm[2] + ' kun ' + mm[3].toUpperCase() + '\n' : ''}${+mm[4] ? '💸 Sotib olishda −' + mm[4] + '%\n' : ''}${mm[5] ? '👥 Limit: ' + mm[5] : '👥 Limit: cheksiz'}`); return true;
  }
  if (a === 'pr' && can(role, 'users')) {
    const mm = /^(@?[A-Za-z0-9_]{3,32}|\d{2,15})\s+(\d{1,4})$/.exec(text);
    if (!mm) { await say(env, chat, "Format: Telegram ID yoki @username va kun\nMasalan: 123456789 30\nBekor qilish: /cancel"); return true; }
    const u = await env.DB.prepare(/^\d+$/.test(mm[1]) ? 'SELECT id, tg_id, first, prem_until FROM users WHERE tg_id = ?' : 'SELECT id, tg_id, first, prem_until FROM users WHERE username = ? COLLATE NOCASE').bind(mm[1].replace(/^@/, '')).first();
    if (!u) { await say(env, chat, "Bunday foydalanuvchi saytda ro'yxatdan o'tmagan."); return true; }
    const until = Math.max(Date.now(), u.prem_until || 0) + (+mm[2]) * 864e5;
    await env.DB.prepare('UPDATE users SET prem_until = ? WHERE id = ?').bind(until, u.id).run();
    await say(env, u.tg_id, `🎁 Sizga ${mm[2]} kun Premium sovg'a qilindi!`);
    await stDel(env, chat); await menu(env, chat, role, `👑 ${u.first || u.tg_id} ga +${mm[2]} kun Premium berildi.`); return true;
  }
  if (a === 'od_no' && can(role, 'orders')) {
    const r = await decideOrder(env, st.id, 'reject', text === '-' ? '' : text); await stDel(env, chat);
    await menu(env, chat, role, r.ok ? `❌ #${st.id} to'lov rad etildi.` : 'Xato: ' + r.error); return true;
  }
  if (a === 'fs_add' && can(role, 'forcesub')) {
    const cfg = await getFsub(env);
    if (cfg.channels.length >= MAX_CHANNELS) { await stDel(env, chat); await fsPanel(env, chat, `Eng ko'pi bilan ${MAX_CHANNELS} ta kanal qo'shish mumkin.`); return true; }
    let ref = null;                                           // @username yoki -100... ID
    const fc = m.forward_from_chat || (m.forward_origin && m.forward_origin.chat);
    if (fc && fc.id) ref = fc.id;
    else {
      const t = text.replace(/^(https?:\/\/)?t\.me\//i, '').replace(/[/?].*$/, '');
      if (/^-100\d{5,}$/.test(t)) ref = t; else if (/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(t)) ref = '@' + t.replace(/^@/, '');
    }
    if (!ref) { await say(env, chat, "Kanal @username ini yozing (masalan @chorraha_kanal) yoki kanaldan biror xabarni shu yerga forward qiling (yopiq kanal uchun).\nBekor qilish: /cancel"); return true; }
    const ch = await tg(env, 'getChat', { chat_id: ref });
    if (!ch.ok || !ch.result) { await say(env, chat, "Kanal topilmadi. Username to'g'riligini tekshiring va botni kanalga admin qilib qo'shing.\nBekor qilish: /cancel"); return true; }
    const c = ch.result;
    if (!['channel', 'supergroup', 'group'].includes(c.type)) { await say(env, chat, "Bu kanal yoki guruh emas. Kanal username ini yuboring.\nBekor qilish: /cancel"); return true; }
    const botId = String(env.TELEGRAM_BOT_TOKEN || '').split(':')[0];
    const me = await tg(env, 'getChatMember', { chat_id: c.id, user_id: +botId });
    if (!me.ok || !me.result || !['administrator', 'creator'].includes(me.result.status)) { await say(env, chat, `⚠️ Bot «${clean(c.title, 60)}» da admin emas. Kanal sozlamalari → Administratorlar → botni admin qiling, keyin kanalni qayta yuboring.\nBekor qilish: /cancel`); return true; }
    if (cfg.channels.some(x => String(x.chat) === String(c.id))) { await say(env, chat, "Bu kanal allaqachon qo'shilgan."); return true; }
    let url = c.username ? 'https://t.me/' + c.username : '';
    if (!url) { const l = await tg(env, 'exportChatInviteLink', { chat_id: c.id }); url = l.ok && typeof l.result === 'string' ? l.result : (c.invite_link || ''); }
    if (!url) { await say(env, chat, "Kanal yopiq va taklif havolasini olib bo'lmadi. Botga «Taklif havolasi orqali a'zo qo'shish» ruxsatini bering va qayta yuboring.\nBekor qilish: /cancel"); return true; }
    cfg.channels.push({ chat: String(c.id), title: clean(c.title, 60) || String(c.id), url }); cfg.on = true;
    await setFsub(env, cfg); await stDel(env, chat); await fsPanel(env, chat, `✅ «${clean(c.title, 60)}» qo'shildi, majburiy obuna yoqildi.`); return true;
  }
  if (a === 'ad_id' && role.owner) {
    let id = null, name = '';
    const fw = m.forward_from || (m.forward_origin && m.forward_origin.sender_user);
    if (fw && fw.id) { id = String(fw.id); name = [fw.first_name, fw.last_name].filter(Boolean).join(' ') || fw.username || ''; }
    else if (m.contact && m.contact.user_id) { id = String(m.contact.user_id); name = m.contact.first_name || ''; }
    else { const u = await findUserTg(env, text); if (u) { id = String(u.tg_id); name = [u.first, u.last].filter(Boolean).join(' ') || u.username || ''; } }
    if (!id) { await say(env, chat, "Topilmadi. Telegram ID raqamini yozing (masalan 123456789), saytdan ro'yxatdan o'tgan odamning @username ini yozing yoki uning xabarini shu yerga forward qiling.\nBekor qilish: /cancel"); return true; }
    if (owners(env).includes(id)) { await say(env, chat, 'Bu odam allaqachon ega.'); return true; }
    const ex = await env.DB.prepare('SELECT perms FROM admins WHERE tg_id = ?').bind(id).first(); let perms = []; try { perms = ex ? JSON.parse(ex.perms) : []; } catch { /* bo'sh */ }
    await dSet(env, 'adp:' + chat, { id, name, perms }); await stDel(env, chat);
    await say(env, chat, `${name || id} (${id}) ga qaysi ishlarni ruxsat berasiz?`, permRows(perms)); return true;
  }
  return false;
}

/* ---------- tugma bosilganda ---------- */
async function onCallback(env, ctx, origin, q, role) {
  const chat = q.message.chat.id, mid = q.message.message_id, data = String(q.data || '');
  const ans = (t, alert) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: t, show_alert: !!alert });
  const edit = (t, rows) => tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: t, ...(rows ? { reply_markup: { inline_keyboard: rows } } : {}) });
  const deny = () => ans("Sizda bu ishga ruxsat yo'q", true);
  if (data === 'x') { await stDel(env, chat); await ans(); await edit('Bekor qilindi.'); return; }
  if (data === 'st') {
    if (!can(role, 'stats')) return deny(); await ans();
    const one = async (sql, ...a) => (await env.DB.prepare(sql).bind(...a).first()) || {}, now = Date.now();
    const [u, n1, a1, pr, rv, pend] = await Promise.all([one('SELECT COUNT(*) c FROM users'), one('SELECT COUNT(*) c FROM users WHERE created > ?', now - 864e5), one('SELECT COUNT(*) c FROM users WHERE last_seen > ?', now - 864e5), one('SELECT COUNT(*) c FROM users WHERE prem_until > ?', now), one("SELECT COALESCE(SUM(amount),0) c, COUNT(*) n FROM orders WHERE status = 'approved'"), one("SELECT COUNT(*) c FROM orders WHERE status = 'paid'")]);
    await say(env, chat, `📊 Statistika\n\n👥 Foydalanuvchilar: ${fmt(u.c)}\n🆕 Bugun qo'shilgan: ${fmt(n1.c)}\n🔥 Faol (24 soat): ${fmt(a1.c)}\n👑 Premium: ${fmt(pr.c)}\n💰 Daromad: ${fmt(rv.c)} so'm (${rv.n} ta sotuv)\n⏳ Tasdiq kutayotgan to'lov: ${pend.c}`); return;
  }
  if (data === 'bc') { if (!can(role, 'broadcast')) return deny(); await ans(); await stSet(env, chat, { a: 'bc_text' }); await say(env, chat, "📣 Xabar matnini yuboring.\nRasm bilan reklama qilmoqchi bo'lsangiz — rasmni izoh (caption) bilan yuboring.\nBekor qilish: /cancel"); return; }
  if (data === 'bcl') {
    if (!can(role, 'broadcast')) return deny(); await ans();
    const rows = (await env.DB.prepare('SELECT id, status, sent, failed, total, created FROM broadcasts ORDER BY id DESC LIMIT 5').all()).results || [];
    const kb = rows.filter(r => r.status === 'running').map(r => [{ text: `▶ #${r.id} ni davom ettirish`, callback_data: 'bcr:' + r.id }]);
    await say(env, chat, rows.length ? 'So\'nggi yuborishlar:\n' + rows.map(r => `#${r.id} · ${r.status === 'done' ? '✅ tugagan' : r.status === 'running' ? '⏳ ketmoqda' : r.status} · ${r.sent}/${r.total} (xato ${r.failed})`).join('\n') : 'Hali yuborish bo\'lmagan.', kb.length ? kb : undefined); return;
  }
  if (data.startsWith('bcr:')) { if (!can(role, 'broadcast')) return deny(); await ans('Davom ettirilmoqda'); await kickBroadcast(env, ctx, origin, +data.slice(4)); return; }
  if (data.startsWith('bca:') || data === 'bcb' || data === 'bcbx' || data === 'bct' || data === 'bcs' || data === 'bcy') {
    if (!can(role, 'broadcast')) return deny();
    const d = await dGet(env, 'bc:' + chat); if (!d) { await ans('Qoralama eskirgan, qayta boshlang', true); return; }
    if (data.startsWith('bca:')) { const k = data.slice(4); if (k in AUD) { d.aud = k; await dSet(env, 'bc:' + chat, d); } await ans(); await tg(env, 'deleteMessage', { chat_id: chat, message_id: mid }); await bcPreview(env, chat); return; }
    if (data === 'bcb') { await ans(); await stSet(env, chat, { a: 'bc_btn' }); await say(env, chat, "Tugmani shu ko'rinishda yozing:\ntugma matni | havola\n\nMasalan:\nPremium olish | https://chorrahaa.uz\nBekor qilish: /cancel"); return; }
    if (data === 'bcbx') { d.btn = null; await dSet(env, 'bc:' + chat, d); await ans(); await tg(env, 'deleteMessage', { chat_id: chat, message_id: mid }); await bcPreview(env, chat); return; }
    if (data === 'bct') { await ans('Sinov xabari yuborildi'); await sendBc(env, chat, { text: d.text, photo: d.photo, btn_text: d.btn && d.btn[0], btn_url: d.btn && d.btn[1] }); return; }
    if (data === 'bcs') { const n = await audCount(env, d.aud); await ans(); await edit(`⚠️ Rostdan ham ${n} kishiga (${AUD[d.aud]}) yuborilsinmi?\nBu amalni qaytarib bo'lmaydi.`, [[{ text: `✅ Ha, ${n} kishiga yuborish`, callback_data: 'bcy' }, { text: "✖ Yo'q", callback_data: 'x' }]]); return; }
    if (data === 'bcy') {
      const j = await createBroadcast(env, q.from.id, d); await env.AUTH.delete('bc:' + chat);
      await ans('Yuborish boshlandi'); await edit(`📨 Yuborish #${j.id} boshlandi (${j.total} kishi). Tugagach sizga xabar keladi.`); await kickBroadcast(env, ctx, origin, j.id); return;
    }
  }
  if (data === 'od') {
    if (!can(role, 'orders')) return deny(); await ans();
    const rows = (await env.DB.prepare("SELECT o.id, o.amount, o.days, o.note, u.first, u.last, u.username FROM orders o JOIN users u ON u.id = o.user_id WHERE o.status = 'paid' ORDER BY o.id LIMIT 8").all()).results || [];
    if (!rows.length) { await say(env, chat, "Tasdiq kutayotgan to'lov yo'q 👍"); return; }
    for (const o of rows) await say(env, chat, `💳 #${o.id}\n👤 ${o.first} ${o.last || ''}${o.username ? ' (@' + o.username + ')' : ''}\n💰 ${fmt(o.amount)} so'm · ${o.days} kun${o.note ? '\n📝 ' + o.note : ''}`, [[{ text: '✅ Tasdiqlash', callback_data: 'ok:' + o.id }, { text: '❌ Rad etish', callback_data: 'no:' + o.id }]]);
    return;
  }
  if (data.startsWith('ok:')) {
    if (!can(role, 'orders')) return deny();
    const r = await decideOrder(env, +data.slice(3), 'approve'); await ans(r.ok ? 'Tasdiqlandi' : r.error, !r.ok);
    const who = [q.from.first_name, q.from.username && '@' + q.from.username].filter(Boolean).join(' ');
    await edit(`${q.message.text || ''}\n\n${r.ok ? '✅ Tasdiqlandi — ' + who : 'ℹ️ ' + r.error}`); return;
  }
  if (data.startsWith('no:')) { if (!can(role, 'orders')) return deny(); await ans(); await stSet(env, chat, { a: 'od_no', id: +data.slice(3) }); await say(env, chat, `#${data.slice(3)} to'lovni rad etish sababini yozing (talabaga yuboriladi).\nSababsiz rad etish uchun: -\nBekor qilish: /cancel`); return; }
  if (data === 'mn') { await ans(); await menu(env, chat, role); return; }
  if (data === 'fs' || data === 'fsa' || data === 'fst' || data.startsWith('fsd:')) {
    if (!can(role, 'forcesub')) return deny();
    if (data === 'fs') { await ans(); await fsPanel(env, chat); return; }
    if (data === 'fsa') { await ans(); await stSet(env, chat, { a: 'fs_add' }); await say(env, chat, "📢 Majburiy obuna uchun kanalni qo'shing.\n\n1) Botni o'sha kanalga ADMIN qilib qo'shing (aks holda obunani tekshira olmaydi).\n2) Kanal @username ini yozing (masalan @chorraha_kanal). Yopiq kanal bo'lsa, undan biror xabarni shu yerga forward qiling.\n\nBekor qilish: /cancel"); return; }
    const cfg = await getFsub(env);
    if (data === 'fst') { cfg.on = !cfg.on; await setFsub(env, cfg); await ans(cfg.on ? 'Yoqildi' : "O'chirildi"); await tg(env, 'deleteMessage', { chat_id: chat, message_id: mid }); await fsPanel(env, chat); return; }
    const i = +data.slice(4);
    if (!cfg.channels[i]) { await ans('Topilmadi', true); return; }
    const [gone] = cfg.channels.splice(i, 1); if (!cfg.channels.length) cfg.on = false;
    await setFsub(env, cfg); await ans('Olib tashlandi'); await tg(env, 'deleteMessage', { chat_id: chat, message_id: mid }); await fsPanel(env, chat, `🗑 «${gone.title}» olib tashlandi.`); return;
  }
  if (data === 'pm') { if (!can(role, 'promo')) return deny(); await ans(); await stSet(env, chat, { a: 'pm' }); await say(env, chat, PM_HELP); return; }
  if (data === 'pr') { if (!can(role, 'users')) return deny(); await ans(); await stSet(env, chat, { a: 'pr' }); await say(env, chat, "👑 Kimga necha kun Premium berasiz?\nTelegram ID yoki @username va kun:\n\nMasalan: 123456789 30\nBekor qilish: /cancel"); return; }
  if (data === 'ad' || data === 'ada' || data.startsWith('ade:') || data.startsWith('adr:') || data.startsWith('adt:') || data === 'ads') {
    if (!role.owner) return deny();
    if (data === 'ad') { await ans(); await adminList(env, chat); return; }
    if (data === 'ada') { await ans(); await stSet(env, chat, { a: 'ad_id' }); await say(env, chat, "➕ Yangi adminni qo'shish.\nQuyidagilardan birini yuboring:\n• uning Telegram ID raqami\n• saytdan ro'yxatdan o'tgan bo'lsa @username i\n• uning biror xabarini shu yerga forward qiling\n\nBekor qilish: /cancel"); return; }
    if (data.startsWith('ade:')) { const id = data.slice(4); const r = await env.DB.prepare('SELECT name, perms FROM admins WHERE tg_id = ?').bind(id).first(); if (!r) { await ans('Topilmadi', true); return; } let p = []; try { p = JSON.parse(r.perms); } catch { /* bo'sh */ } await dSet(env, 'adp:' + chat, { id, name: r.name, perms: p }); await ans(); await say(env, chat, `${r.name || id} (${id}) ruxsatlari:`, permRows(p)); return; }
    if (data.startsWith('adr:')) { const id = data.slice(4); await env.DB.prepare('DELETE FROM admins WHERE tg_id = ?').bind(id).run(); await ans('Adminlikdan olindi'); await say(env, id, 'Sizning Chorraha boti admin huquqlaringiz bekor qilindi.'); await adminList(env, chat); return; }
    const d = await dGet(env, 'adp:' + chat); if (!d) { await ans('Eskirgan, qayta boshlang', true); return; }
    if (data.startsWith('adt:')) { const k = data.slice(4); if (k in PERMS) { d.perms = d.perms.includes(k) ? d.perms.filter(x => x !== k) : [...d.perms, k]; await dSet(env, 'adp:' + chat, d); } await ans(); await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: permRows(d.perms) } }); return; }
    if (data === 'ads') {
      await env.DB.prepare('INSERT INTO admins (tg_id, name, perms, added_by, created) VALUES (?,?,?,?,?) ON CONFLICT(tg_id) DO UPDATE SET name = excluded.name, perms = excluded.perms').bind(d.id, clean(d.name, 60), JSON.stringify(d.perms), String(q.from.id), Date.now()).run();
      await env.AUTH.delete('adp:' + chat); await ans('Saqlandi'); await edit(`✅ ${d.name || d.id} admin qilindi.\nRuxsatlari:\n${permText(d.perms)}`);
      await say(env, d.id, `👋 Siz Chorraha botida admin etib tayinlandingiz.\n\nRuxsatlaringiz:\n${permText(d.perms)}\n\nBoshqaruv uchun /admin ni bosing.`); return;
    }
  }
  await ans();
}

/** webhook yangiligini qayta ishlaydi; true — bu xodimga tegishli va hal qilindi */
export async function handleStaff(env, ctx, origin, upd) {
  if (upd && upd.callback_query) {
    const q = upd.callback_query; if (!q.message || !q.from || q.message.chat.type !== 'private') return false;
    if (/^fsc:/.test(String(q.data || ''))) return false;        // majburiy obuna «Tekshirish» tugmasi: hamma uchun bir xil (worker.js)
    const role = await roleOf(env, q.from.id); if (!role) return false;
    await onCallback(env, ctx, origin, q, role); return true;
  }
  const m = upd && upd.message; if (!m || !m.from || m.chat.type !== 'private') return false;
  const role = await roleOf(env, m.from.id); if (!role) return false;
  if (/^\/start/.test(String(m.text || '')) && /^\/start(@\w+)?\s+\S+/.test(m.text)) return false;   // ro'yxatdan o'tish havolasi: oddiy oqim
  return await onMessage(env, ctx, origin, m, role);
}
