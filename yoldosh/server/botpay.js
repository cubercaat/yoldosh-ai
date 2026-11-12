/* Telegram botda to'lov (admin tasdiqlaydi):
   tarif → muddat → karta turi (Humo / Uzcard / Visa / Uzum) → karta raqami (bir bosishda nusxalanadi)
   → 7 daqiqa ichida chek rasmi → adminlarga tugmali xabar → admin tasdiqlaydi → tarif ochiladi.
   7 daqiqada chek kelmasa buyurtma bekor qilinadi (har daqiqalik cron: sweepCardOrders).
   Kartalarni egasi boshqaradi: botda /kartalar (qo'shish, tahrirlash, yoqish/o'chirish, o'chirib tashlash) yoki sayt admin paneli → «Kartalar».
   Karta raqamlari faqat bazada (settings.pay_cards) saqlanadi — ochiq repoga yozilmaydi. */
import { tg, staffIds } from './staff.js';

const WAIT = 7 * 60 * 1000;                        // chek yuborish uchun vaqt
export const CARD_TYPES = {
  uzcard: { n: 'UZCARD', ic: '🔵' },
  humo: { n: 'HUMO', ic: '🟢' },
  visa: { n: 'VISA', ic: '💳' },
  uzumvisa: { n: 'UZUM VISA', ic: '🟣' },
  mastercard: { n: 'MASTERCARD', ic: '🟠' },
  unionpay: { n: 'UNIONPAY', ic: '🔴' },
  paynet: { n: 'PAYNET', ic: '📞' },
  other: { n: 'KARTA', ic: '💳' },
};
const CARDS = CARD_TYPES;
const cLabel = (c) => (c.label || (CARD_TYPES[c.type] || CARD_TYPES.other).n);
const cIcon = (c) => (CARD_TYPES[c.type] || CARD_TYPES.other).ic;
const pretty = (n) => String(n).replace(/(\d{4})(?=\d)/g, '$1 ');
const last4 = (n) => String(n).slice(-4);
const TN = { pro: 'Pro', premium: 'Premium', max: 'Max' };
const TD = { pro: 'AI yordamchi · Pro reyting · 5 ta mashina', premium: "Pro + ovozli sharhlar · ustozdan so'rash · Premium chat", max: 'Premium + haftada 1 soat online dars · Avtodrom 3D hamma mashina' };
const DEF = { pro: 99000, premium: 139000, max: 149000 };
const fmt = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const per = (m) => (m === 12 ? '1 yil' : m + ' oy');
const owners = (env) => String(env.ADMIN_TG_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const hhmm = (t) => new Date(t + 5 * 3600e3).toISOString().slice(11, 16);   // Toshkent vaqti

const send = (env, chat, text, rows) => tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(rows ? { reply_markup: { inline_keyboard: rows } } : {}) });
const kv = {
  get: async (env, k) => { try { return JSON.parse(await env.AUTH.get(k)) || null; } catch { return null; } },
  put: (env, k, v, ttl) => env.AUTH.put(k, JSON.stringify(v), { expirationTtl: ttl || 1800 }),
  del: (env, k) => env.AUTH.delete(k),
};

export async function migrateBotPay(env) {
  for (const q of ["ALTER TABLE orders ADD COLUMN method TEXT NOT NULL DEFAULT ''", 'ALTER TABLE orders ADD COLUMN expires INTEGER NOT NULL DEFAULT 0',
    'CREATE INDEX IF NOT EXISTS orders_exp ON orders (status, expires)']) { try { await env.DB.prepare(q).run(); } catch (e) { /* bor */ } }
}

async function getSet(env, k) { try { const r = await env.DB.prepare('SELECT v FROM settings WHERE k = ?').bind(k).first(); return r ? JSON.parse(r.v) : null; } catch { return null; } }
async function putSet(env, k, v) { await env.DB.prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, JSON.stringify(v)).run(); }
/** kartalar ro'yxati: [{ id, type, n, name, label, on }]; eski {humo:{n,name}} ko'rinishi avtomatik o'giriladi */
export async function cardsOf(env) {
  const v = await getSet(env, 'pay_cards');
  if (Array.isArray(v)) return v.filter((c) => c && c.id && c.n);
  if (v && typeof v === 'object') return Object.entries(v).filter(([, c]) => c && c.n).map(([k, c]) => ({ id: k, type: k === 'uzum' ? 'uzumvisa' : k, n: c.n, name: c.name || '', label: '', on: true }));
  return [];
}
const newId = () => Math.random().toString(36).slice(2, 8);
/** ro'yxatni tekshirib saqlaydi (admin panel ham shuni ishlatadi) */
export async function saveCards(env, list) {
  const out = [];
  for (const c of (Array.isArray(list) ? list : []).slice(0, 20)) {
    const n = String(c.n || '').replace(/\D/g, ''); if (n.length < 16 || n.length > 19) return { error: `Karta raqami 16–19 xonali bo'lishi kerak: ${String(c.n || '').slice(0, 24)}` };
    out.push({ id: /^[a-z0-9]{2,12}$/.test(c.id) ? c.id : newId(), type: c.type in CARD_TYPES ? c.type : 'other', n, name: String(c.name || '').replace(/[<>]/g, '').trim().slice(0, 60), label: String(c.label || '').replace(/[<>]/g, '').trim().slice(0, 24), on: c.on !== false });
  }
  await putSet(env, 'pay_cards', out); return { ok: true, cards: out };
}

async function prices(env, tier) {
  const ks = ['price_' + tier, 'price3_' + tier, 'price12_' + tier], S = {};
  const rows = await env.DB.prepare('SELECT k, v FROM settings WHERE k IN (?,?,?)').bind(...ks).all();
  for (const r of rows.results || []) { try { S[r.k] = JSON.parse(r.v); } catch { /* yo'q */ } }
  const one = Number(S[ks[0]]) || DEF[tier];
  return { 1: one, 3: Number(S[ks[1]]) || one * 3, 12: Number(S[ks[2]]) || one * 12 };
}
const userByTg = (env, id) => env.DB.prepare('SELECT id, first, last, username, tg_id FROM users WHERE tg_id = ?').bind(String(id)).first();

/* ---------- ekranlar ---------- */
async function tiersScreen(env, chat, edit) {
  const P = {}; for (const t of ['pro', 'premium', 'max']) P[t] = (await prices(env, t))[1];
  const text = `💳 <b>Tarifni tanlang</b>\n\n${['pro', 'premium', 'max'].map((t) => `<b>${TN[t]}</b> — ${fmt(P[t])} so'm/oy\n<i>${TD[t]}</i>`).join('\n\n')}\n\nTo'lov kartaga o'tkazma orqali: Humo, Uzcard, Visa yoki Uzum.`;
  const rows = [['pro', 'premium', 'max'].map((t) => ({ text: `${TN[t]} · ${fmt(P[t])}`, callback_data: 'bp:t:' + t }))];
  return edit ? edit(text, rows) : send(env, chat, text, rows);
}
async function periodScreen(env, from, tier, edit) {
  const P = await prices(env, tier), pr = await kv.get(env, 'bpp:' + from.id), pct = pr && pr.pct || 0;
  const cut = (v) => Math.round(v * (100 - pct) / 100 / 1000) * 1000;
  const text = `<b>${TN[tier]}</b> — muddatni tanlang${pct ? `\n🎟 Promokod <b>${esc(pr.code)}</b>: −${pct}%` : ''}`;
  const rows = [[1, 3, 12].map((m) => ({ text: `${per(m)} · ${fmt(cut(P[m]))}`, callback_data: `bp:p:${tier}:${m}` }))];
  rows.push([{ text: pct ? '🎟 Promokodni almashtirish' : '🎟 Promokod bor', callback_data: 'bp:k:' + tier }], [{ text: '◀ Orqaga', callback_data: 'bp:m' }]);
  return edit(text, rows);
}
async function cardScreen(env, tier, m, edit) {
  const ks = (await cardsOf(env)).filter((c) => c.on);
  if (!ks.length) return edit("To'lov kartalari hali kiritilmagan. Iltimos, birozdan keyin urinib ko'ring yoki adminga yozing.", [[{ text: '🆘 Admin bilan bog\'lanish', callback_data: 'bp:h:0' }]]);
  const rows = [];
  for (let i = 0; i < ks.length; i += 2) rows.push(ks.slice(i, i + 2).map((c) => ({ text: `${cIcon(c)} ${cLabel(c)} ··${last4(c.n)}`, callback_data: `bp:c:${tier}:${m}:${c.id}` })));
  rows.push([{ text: '◀ Orqaga', callback_data: 'bp:t:' + tier }]);
  return edit(`<b>${TN[tier]} · ${per(m)}</b>\n\nQaysi karta orqali to'laysiz?`, rows);
}

/* ---------- buyurtma ---------- */
async function createOrder(env, from, tier, m, card, edit, findPromo) {
  const u = await userByTg(env, from.id);
  if (!u) return edit(`Avval ro'yxatdan o'ting: saytga kiring va «Telegram orqali davom etish» tugmasini bosing. Keyin shu yerga qaytib to'lovni qiling.`, [[{ text: '🚗 Saytni ochish', url: (env.SITE_URL || 'https://chorrahaa.uz/').replace(/#.*$/, '') + '#/register' }]]);
  const C = (await cardsOf(env)).find((c) => c.id === card && c.on); if (!C) return edit('Bu karta hozir mavjud emas, boshqasini tanlang.', [[{ text: '◀ Orqaga', callback_data: `bp:p:${tier}:${m}` }]]);
  let amount = (await prices(env, tier))[m], discount = 0, promo = '';
  const pr = await kv.get(env, 'bpp:' + from.id);
  if (pr && pr.code) { const f = await findPromo(env, pr.code, u.id); if (!f.error && f.p.percent > 0) { discount = Math.round(amount * f.p.percent / 100 / 1000) * 1000; amount -= discount; promo = f.p.code; } }
  const now = Date.now(), until = now + WAIT;
  /* eski kutilayotgan karta buyurtmalari yopiladi — bir odamda bitta faol buyurtma */
  await env.DB.prepare("UPDATE orders SET status = 'expired', reason = 'Yangi buyurtma ochildi', updated = ? WHERE user_id = ? AND status = 'new' AND method LIKE 'card:%'").bind(now, u.id).run();
  const r = await env.DB.prepare("INSERT INTO orders (user_id, kind, days, amount, status, tier, promo, discount, method, expires, created, updated) VALUES (?,?,?,?,'new',?,?,?,?,?,?,?)")
    .bind(u.id, 'premium', m * 30, amount, tier, promo, discount, 'card:' + C.type, until, now, now).run();
  const id = r.meta.last_row_id;
  await kv.put(env, 'bp:' + from.id, { id, until, card: `${cLabel(C)} ··${last4(C.n)}` }, 3600);
  const num = String(C.n).replace(/\D/g, '');
  const text = `🧾 <b>Buyurtma #${id}</b> · ${TN[tier]} · ${per(m)}\n\n💰 Summa: <b>${fmt(amount)} so'm</b>${discount ? ` (−${fmt(discount)} promokod)` : ''}\n${cIcon(C)} ${esc(cLabel(C))}: <code>${pretty(num)}</code>${C.name ? `\n👤 ${esc(C.name)}` : ''}\n\n1. Karta raqamini nusxalang va summani o'tkazing.\n2. To'lov chekini (skrinshot) <b>shu chatga rasm qilib</b> yuboring.\n\n📸 <b>Chek rasmi shart</b> — cheksiz to'lov tasdiqlanmaydi.\n\n⏳ Chekni yuborish uchun <b>7 daqiqa</b> vaqtingiz bor — <b>${hhmm(until)}</b> gacha. Vaqt tugasa buyurtma bekor qilinadi.`;
  return edit(text, [
    [{ text: '📋 Karta raqamini nusxalash', copy_text: { text: num } }],
    [{ text: "📋 Summani nusxalash", copy_text: { text: String(amount) } }],
    [{ text: '🆘 Muammo bor', callback_data: 'bp:h:' + id }, { text: '✖ Bekor qilish', callback_data: 'bp:x:' + id }],
  ]);
}

async function toAdmins(env, text, fileId, isDoc, rows) {
  const ids = await staffIds(env, 'orders');
  await Promise.all(ids.map((c) => fileId
    ? tg(env, isDoc ? 'sendDocument' : 'sendPhoto', { chat_id: c, [isDoc ? 'document' : 'photo']: fileId, caption: text.slice(0, 1000), ...(rows ? { reply_markup: { inline_keyboard: rows } } : {}) })
    : tg(env, 'sendMessage', { chat_id: c, text, ...(rows ? { reply_markup: { inline_keyboard: rows } } : {}) })));
}
const who = (u, from) => `${(u && u.first) || from.first_name || ''} ${(u && u.last) || from.last_name || ''}`.trim() + ((u && u.username) || from.username ? ` (@${(u && u.username) || from.username})` : '') + ` · ID ${from.id}`;

/** chek (rasm yoki fayl) keldi */
async function onReceipt(env, m, st) {
  const from = m.from, chat = m.chat.id;
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(st.id).first(); const u = await userByTg(env, from.id);
  if (!o || !u || o.user_id !== u.id) { await kv.del(env, 'bp:' + from.id); return false; }
  if (o.status === 'paid') { await send(env, chat, 'Chekingiz allaqachon qabul qilingan ✅ Admin tekshirmoqda.'); return true; }
  if (o.status === 'approved') { await send(env, chat, "Bu buyurtma allaqachon tasdiqlangan ✅"); return true; }
  const fileId = m.photo && m.photo.length ? m.photo[m.photo.length - 1].file_id : m.document && m.document.file_id, isDoc = !m.photo;
  const late = Date.now() > (o.expires || st.until);
  const card = (o.method || '').replace('card:', ''), cn = st.card || (CARDS[card] ? CARDS[card].n : card);
  const claim = await env.DB.prepare("UPDATE orders SET status = 'paid', note = ?, updated = ? WHERE id = ? AND status IN ('new','expired')").bind((late ? 'KECHIKKAN chek · ' : 'chek · ') + cn, Date.now(), o.id).run();
  if (!claim.meta || !claim.meta.changes) { await send(env, chat, "Bu buyurtma yopilgan. Yangi to'lov uchun /tolov ni bosing."); return true; }
  await kv.del(env, 'bp:' + from.id);
  const cap = `${late ? '⚠️ VAQTI O\'TGANDAN KEYIN YUBORILGAN CHEK\n' : ''}💳 Chek: #${o.id}\n👤 ${who(u, from)}\n💰 ${fmt(o.amount)} so'm · ${TN[o.tier] || 'Premium'} · ${o.days} kun${o.promo ? ' · 🎟 ' + o.promo : ''}\n🏦 ${cn}`;
  await toAdmins(env, cap, fileId, isDoc, [[{ text: '✅ Tasdiqlash', callback_data: 'ok:' + o.id }, { text: '❌ Rad etish', callback_data: 'no:' + o.id }]]);
  await send(env, chat, late
    ? `⏰ 7 daqiqalik vaqt o'tib ketgan edi, lekin chekingizni baribir adminga yubordik. Tekshirib, <b>5 daqiqadan 1 soatgacha</b> javob beramiz.`
    : `✅ <b>Rahmat! Chekingiz qabul qilindi.</b>\n\nTo'lovingiz <b>5 daqiqadan 1 soatgacha</b> tekshiriladi va tarifingiz yoqiladi. Tasdiqlangach shu yerga xabar keladi.\n\nKutganingiz uchun rahmat! 🙏`);
  return true;
}

/* ---------- kartalarni boshqarish (egalar) ---------- */
async function cardsPanel(env, out, head) {
  const list = await cardsOf(env);
  const text = `${head ? head + '\n\n' : ''}💳 <b>To'lov kartalari</b> (${list.filter((c) => c.on).length}/${list.length} yoqilgan)\n\n${list.length ? list.map((c) => `${c.on ? '✅' : '⏸'} ${cIcon(c)} <b>${esc(cLabel(c))}</b> <code>${pretty(c.n)}</code>${c.name ? ' — ' + esc(c.name) : ''}`).join('\n') : 'Hali karta yo\'q.'}\n\n✅ — odamlarga ko'rinadi, ⏸ — yashirilgan.`;
  const rows = list.map((c) => [{ text: `${c.on ? '⏸ Yashirish' : '✅ Yoqish'} ··${last4(c.n)}`, callback_data: 'bp:ao:' + c.id }, { text: '✏️', callback_data: 'bp:ae:' + c.id }, { text: '🗑', callback_data: 'bp:ad:' + c.id }]);
  rows.push([{ text: "➕ Karta qo'shish", callback_data: 'bp:aa' }]);
  return out(text, rows);
}
/** xavfsizlik: kartalar o'zgarsa barcha egalarga xabar boradi (begona odam raqamni almashtirsa darhol bilinadi) */
export async function cardsChanged(env, from, what) {
  const by = from ? [from.first_name, from.username && '@' + from.username, '· ID ' + from.id].filter(Boolean).join(' ') : 'sayt admin paneli';
  await Promise.all(owners(env).map((c) => tg(env, 'sendMessage', { chat_id: c, text: `🔐 To'lov kartalari o'zgardi — ${what}\nKim: ${by}\nTekshirish: /kartalar` })));
}

/* ---------- kirish nuqtalari ---------- */
/** foydalanuvchi xabari: true — hal qilindi */
export async function botPayMessage(env, m, findPromo) {
  const chat = m.chat.id, from = m.from, text = String(m.text || '').trim();
  /* egasi: kartalarni boshqarish */
  const isOwner = owners(env).includes(String(from.id));
  if (isOwner && /^\/kartalar?(@\w+)?$/i.test(text) || isOwner && /^\/karta(@\w+)?$/i.test(text)) { await kv.del(env, 'bpa:' + from.id); await cardsPanel(env, (t, rows) => send(env, chat, t, rows)); return true; }
  const ca = isOwner && await kv.get(env, 'bpa:' + from.id);
  if (ca && text && !text.startsWith('/')) {
    const mm = /^([\d\s-]{16,26}?)\s*([^\d\s-].*)?$/.exec(text), d = mm ? mm[1].replace(/\D/g, '') : '';
    if (!mm || d.length < 16 || d.length > 19) { await send(env, chat, "Raqam 16–19 xonali bo'lishi kerak. Shunday yozing:\n<code>9860 1234 5678 9012 Ism Familiya</code>\nBekor qilish: /kartalar"); return true; }
    const list = await cardsOf(env), name = (mm[2] || '').trim();
    if (ca.mode === 'add') list.push({ id: newId(), type: ca.type, n: d, name, label: '', on: true });
    else { const c = list.find((x) => x.id === ca.id); if (!c) { await kv.del(env, 'bpa:' + from.id); await send(env, chat, 'Karta topilmadi.'); return true; } c.n = d; if (name) c.name = name; }
    const r = await saveCards(env, list); await kv.del(env, 'bpa:' + from.id);
    if (r.error) { await send(env, chat, '❌ ' + esc(r.error)); return true; }
    await cardsChanged(env, from, ca.mode === 'add' ? `qo'shildi: ··${last4(d)}` : `tahrirlandi: ··${last4(d)}`);
    await cardsPanel(env, (t, rows) => send(env, chat, t, rows), '✅ Saqlandi.'); return true;
  }
  if (/^\/(tolov|to'lov|pay|premium)(@\w+)?$/i.test(text) || /^\/start(@\w+)?\s+pay$/i.test(text) || text === "💳 Tarif sotib olish") { await tiersScreen(env, chat); return true; }
  /* promokod kutilmoqda */
  const pk = await kv.get(env, 'bpk:' + from.id);
  if (pk && text && !text.startsWith('/')) {
    await kv.del(env, 'bpk:' + from.id);
    const u = await userByTg(env, from.id), f = await findPromo(env, text, u && u.id);
    if (f.error) await send(env, chat, '❌ ' + esc(f.error));
    else if (!(f.p.percent > 0)) await send(env, chat, "🎁 Bu sovg'a kodi — uni saytdagi «Promokod» bo'limida kiriting.");
    else { await kv.put(env, 'bpp:' + from.id, { code: f.p.code, pct: f.p.percent }, 3600); await send(env, chat, `✅ <b>${esc(f.p.code)}</b>: −${f.p.percent}% chegirma qo'llandi.`); }
    await periodScreen(env, from, pk.tier, (t, rows) => send(env, chat, t, rows)); return true;
  }
  /* chek kutilmoqda */
  const st = await kv.get(env, 'bp:' + from.id); if (!st) return false;
  if ((m.photo && m.photo.length) || (m.document && /^(image\/|application\/pdf)/.test(m.document.mime_type || ''))) return onReceipt(env, m, st);
  if (text && !text.startsWith('/')) { await send(env, chat, "Iltimos, to'lov chekini <b>rasm</b> (skrinshot) ko'rinishida yuboring. Muammo bo'lsa, «🆘 Muammo bor» tugmasini bosing.", [[{ text: '🆘 Muammo bor', callback_data: 'bp:h:' + st.id }]]); return true; }
  return false;
}

/** tugmalar (bp:…) */
export async function botPayCallback(env, q, findPromo) {
  const data = String(q.data || ''), chat = q.message.chat.id, mid = q.message.message_id, from = q.from;
  const ans = (t, alert) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, ...(t ? { text: t, show_alert: !!alert } : {}) });
  const edit = (t, rows) => tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: t, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: rows || [] } });
  const p = data.split(':');
  if (/^a[lasoedy]$/.test(p[1] || '')) {                                  // kartalarni boshqarish (faqat egalar)
    if (!owners(env).includes(String(from.id))) { await ans("Bu faqat egasi uchun", true); return; }
    const k = p[1][1], list = await cardsOf(env), c = list.find((x) => x.id === p[2]);
    if (k === 'l') { await ans(); await kv.del(env, 'bpa:' + from.id); await cardsPanel(env, edit); return; }
    if (k === 'a') { await ans(); const ks = Object.keys(CARD_TYPES); const rows = []; for (let i = 0; i < ks.length; i += 2) rows.push(ks.slice(i, i + 2).map((k) => ({ text: `${CARD_TYPES[k].ic} ${CARD_TYPES[k].n}`, callback_data: 'bp:as:' + k }))); rows.push([{ text: '◀ Orqaga', callback_data: 'bp:al' }]); await edit('Qaysi turdagi karta?', rows); return; }
    if (k === 's' && CARD_TYPES[p[2]]) { await ans(); await kv.put(env, 'bpa:' + from.id, { mode: 'add', type: p[2] }, 900); await edit(`${CARD_TYPES[p[2]].ic} <b>${CARD_TYPES[p[2]].n}</b>\n\nKarta raqami va egasining ismini yozing:\n<code>9860 1234 5678 9012 Ism Familiya</code>`, [[{ text: '✖ Bekor', callback_data: 'bp:al' }]]); return; }
    if (!c) { await ans('Karta topilmadi', true); return; }
    if (k === 'o') { c.on = !c.on; await saveCards(env, list); await ans(c.on ? 'Yoqildi' : "O'chirildi"); await cardsChanged(env, from, `${c.on ? 'yoqildi' : "o'chirildi"}: ··${last4(c.n)}`); await cardsPanel(env, edit); return; }
    if (k === 'e') { await ans(); await kv.put(env, 'bpa:' + from.id, { mode: 'edit', id: c.id }, 900); await edit(`✏️ ${cIcon(c)} ${esc(cLabel(c))} ··${last4(c.n)}\n\nYangi raqam (va xohlasangiz ism) yozing:\n<code>9860 1234 5678 9012 Ism Familiya</code>`, [[{ text: '✖ Bekor', callback_data: 'bp:al' }]]); return; }
    if (k === 'd') { await ans(); await edit(`🗑 ${cIcon(c)} ${esc(cLabel(c))} ··${last4(c.n)} kartasini o'chirib tashlaymi?`, [[{ text: "Ha, o'chirish", callback_data: 'bp:ay:' + c.id }, { text: "Yo'q", callback_data: 'bp:al' }]]); return; }
    if (k === 'y') { await saveCards(env, list.filter((x) => x.id !== c.id)); await ans("O'chirildi"); await cardsChanged(env, from, `o'chirib tashlandi: ··${last4(c.n)}`); await cardsPanel(env, edit); return; }
    await ans(); return;
  }
  if (p[1] === 'm') { await ans(); await tiersScreen(env, chat, edit); return; }
  if (p[1] === 't' && TN[p[2]]) { await ans(); await periodScreen(env, from, p[2], edit); return; }
  if (p[1] === 'k' && TN[p[2]]) { await ans(); await kv.put(env, 'bpk:' + from.id, { tier: p[2] }, 600); await send(env, chat, '🎟 Promokodni yozib yuboring:'); return; }
  if (p[1] === 'p' && TN[p[2]] && [1, 3, 12].includes(+p[3])) { await ans(); await cardScreen(env, p[2], +p[3], edit); return; }
  if (p[1] === 'c' && TN[p[2]] && [1, 3, 12].includes(+p[3]) && /^[a-z0-9]{2,12}$/.test(p[4] || '')) { await ans(); await createOrder(env, from, p[2], +p[3], p[4], edit, findPromo); return; }
  if (p[1] === 'x') {
    const u = await userByTg(env, from.id);
    if (u) await env.DB.prepare("UPDATE orders SET status = 'expired', reason = 'Bekor qilindi', updated = ? WHERE id = ? AND user_id = ? AND status = 'new'").bind(Date.now(), +p[2], u.id).run();
    await kv.del(env, 'bp:' + from.id); await ans('Bekor qilindi');
    await edit(`✖ Buyurtma #${+p[2]} bekor qilindi.`, [[{ text: "💳 Qaytadan boshlash", callback_data: 'bp:m' }]]); return;
  }
  if (p[1] === 'h') {
    const k = 'bph:' + from.id; if (await env.AUTH.get(k)) { await ans('Xabaringiz adminga yuborilgan, tez orada yozadi', true); return; }
    await env.AUTH.put(k, '1', { expirationTtl: 300 });
    const u = await userByTg(env, from.id), o = +p[2] ? await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(+p[2]).first() : null;
    await toAdmins(env, `🆘 To'lovda muammo\n👤 ${who(u, from)}${o ? `\n🧾 #${o.id} · ${fmt(o.amount)} so'm · ${TN[o.tier] || ''} · ${(o.method || '').replace('card:', '').toUpperCase()} · holati: ${o.status}` : ''}\n\nFoydalanuvchiga yozing: tg://user?id=${from.id}`);
    await ans("Adminga xabar yuborildi. Tez orada siz bilan bog'lanadi.", true); return;
  }
  await ans();
}

/** har daqiqada: 7 daqiqa o'tib chek kelmagan karta buyurtmalarini bekor qiladi */
export async function sweepCardOrders(env) {
  const now = Date.now();
  const rows = (await env.DB.prepare("SELECT o.id, o.amount, u.tg_id FROM orders o JOIN users u ON u.id = o.user_id WHERE o.status = 'new' AND o.expires > 0 AND o.expires < ? LIMIT 50").bind(now).all()).results || [];
  for (const o of rows) {
    const r = await env.DB.prepare("UPDATE orders SET status = 'expired', reason = '7 daqiqada chek yuborilmadi', updated = ? WHERE id = ? AND status = 'new'").bind(now, o.id).run();
    if (r.meta && r.meta.changes && o.tg_id) await send(env, o.tg_id, `⏰ 7 daqiqa ichida chek kelmadi, buyurtma #${o.id} bekor qilindi.\n\nAgar pulni o'tkazgan bo'lsangiz — chekni hozir shu yerga yuboring, admin tekshiradi.`, [[{ text: '💳 Qaytadan boshlash', callback_data: 'bp:m' }]]);
  }
}
