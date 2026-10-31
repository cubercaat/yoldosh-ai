// Umumiy yordamchilar: API, xabar yuborish, admin tekshiruvi, reklama tugmalari.
import path from 'node:path';
import { CFG, isAdmin } from './config.js';
import { createApi, InputFile } from './tg.js';
import { get, run, getSetting } from './db.js';
import { shuffle } from './util.js';

export const api = createApi(CFG.token, CFG.apiRoot);
export const BOT = { id: 0, username: 'bot', name: 'Bot' };

// Tugma rangi (Telegram 2026+): success = yashil, primary = ko'k, danger = qizil.
// Rang berilmagan tugmalarga matniga qarab avtomatik rang beriladi.
const RED = /❌|🚫|🗑|⛔|🚪|Bekor|bekor|To'xtat|O'chirish/;
const GREEN = /chorrahaa|Chorrahaa|🚀|🔁|✅|Boshla|boshla|Yana|Yuborish|Tayyor|Test yechish|test yechish|Hoziroq|Imtihon|📝|🎓|➡️|Davom|🏁/;
export function autoStyle(b) {
  if (!b || b.style || b.pay) return b;
  const t = b.text || '';
  if (RED.test(t)) b.style = 'danger';
  else if (GREEN.test(t) || b.web_app || (b.url && b.url.includes('chorrahaa'))) b.style = 'success';
  else if (t.startsWith('• ')) b.style = 'success';
  else if (b.callback_data && /^(qa|ps:n|gs:n|gs:t)/.test(b.callback_data)) b.style = 'primary';
  else if (b.url) b.style = 'primary';
  return b;
}
export const kb = (rows) => ({ inline_keyboard: rows.filter((r) => r && r.length).map((r) => r.map(autoStyle)) });
export const cb = (text, data, style) => (style ? { text, callback_data: data, style } : { text, callback_data: data });

// ---- Pastki (reply) klaviaturalar ----
export const MENU = {
  test: '📝 Test yechish', exam: '🎓 Imtihon rejimi', top: '🏆 Reyting', me: '👤 Natijalarim',
  contests: '🎁 Konkurslar', invite: '👥 Do\'stlarni taklif qilish', site: '🌐 Chorrahaa.uz', group: '➕ Guruhga qo\'shish',
  admin: '🛠 Admin panel', help: 'ℹ️ Yordam', back: '⬅️ Orqaga',
};
export function mainKeyboard(uid) {
  const rows = [
    [{ text: MENU.test, style: 'success' }, { text: MENU.exam, style: 'success' }],
    [{ text: MENU.top, style: 'primary' }, { text: MENU.me, style: 'primary' }],
    [{ text: MENU.contests, style: 'primary' }, { text: MENU.invite, style: 'primary' }],
    [{ text: MENU.site, style: 'success' }, { text: MENU.group, style: 'primary' }],
  ];
  if (isAdmin(uid)) rows.push([{ text: MENU.admin, style: 'danger' }]);
  return { keyboard: rows, resize_keyboard: true, is_persistent: true };
}
// Bo'lim ichida: katta menyu yashirinadi, faqat bitta «Orqaga» tugmasi qoladi
export const backKeyboard = () => ({ keyboard: [[{ text: MENU.back, style: 'danger' }]], resize_keyboard: true, is_persistent: true });
export const showMain = (uid, text = '🏠 <b>Bosh menyu</b>') => send(uid, text, { reply_markup: mainKeyboard(uid) }).catch(() => {});
export const showBack = (uid, text) => send(uid, text, { reply_markup: backKeyboard() }).catch(() => {});

export function send(chatId, text, extra = {}) {
  return api.sendMessage({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra });
}
export async function edit(chatId, msgId, text, extra = {}) {
  try {
    return await api.editMessageText({ chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra });
  } catch (e) {
    if (/not modified/i.test(e.description || '')) return null;
    if (/no text in the message|message can't be edited|message to edit not found/i.test(e.description || '')) {
      return send(chatId, text, extra);
    }
    throw e;
  }
}
export const answerCb = (id, text, alert = false) => api.answerCallbackQuery({ callback_query_id: id, text, show_alert: alert }).catch(() => {});

const adminCache = new Map();
export async function isChatAdmin(chatId, userId) {
  if (isAdmin(userId)) return true;
  if (chatId > 0) return chatId === userId;
  const key = `${chatId}:${userId}`;
  const c = adminCache.get(key);
  if (c && c.t > Date.now() - 300000) return c.v;
  let v = false;
  try { const m = await api.getChatMember({ chat_id: chatId, user_id: userId }); v = ['creator', 'administrator'].includes(m.status); } catch {}
  adminCache.set(key, { v, t: Date.now() });
  return v;
}

// Rasmni bir marta yuklab, keyin file_id orqali tez yuborish
export async function sendPhotoCached(chatId, relPath, extra = {}) {
  const row = get('SELECT file_id FROM file_ids WHERE path=?', relPath);
  const abs = path.join(CFG.dataDir, relPath);
  if (row) {
    try { return await api.sendPhoto({ chat_id: chatId, photo: row.file_id, ...extra }); }
    catch (e) { if (!/file|identifier|wrong/i.test(e.description || '')) throw e; run('DELETE FROM file_ids WHERE path=?', relPath); }
  }
  const m = await api.sendPhoto({ chat_id: chatId, photo: new InputFile(abs), ...extra });
  const fid = m.photo?.[m.photo.length - 1]?.file_id;
  if (fid) run('INSERT OR REPLACE INTO file_ids(path,file_id) VALUES(?,?)', relPath, fid);
  return m;
}

export async function notifyAdmins(text, extra = {}) {
  for (const id of CFG.admins) await send(id, text, extra).catch(() => {});
}

// ---------- Reklama / chorrahaa.uz ga yo'naltirish ----------
export function siteUrl(campaign, p = '') {
  return `${CFG.site}${p}/?utm_source=telegram&utm_medium=quizbot&utm_campaign=${encodeURIComponent(campaign)}`;
}
// Lichkada web_app (Telegram ichida ochiladi), guruhda oddiy havola
export function siteBtn(text, campaign, isPrivate = false) {
  const url = siteUrl(campaign);
  return isPrivate ? { text, web_app: { url }, style: 'success' } : { text, url, style: 'success' };
}
export const botLink = (payload) => `https://t.me/${BOT.username}${payload ? `?start=${payload}` : ''}`;
export const addGroupUrl = () => `https://t.me/${BOT.username}?startgroup=quiz&admin=delete_messages+pin_messages+invite_users`;
export const addGroupBtn = () => ({ text: '➕ Botni guruhga qo\'shish', url: addGroupUrl(), style: 'primary' });
export const shareUrl = (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

export function footer() {
  if (!Number(getSetting('footer_on'))) return '';
  const parts = String(getSetting('footer_text') || '').split(/\n-{3,}\n/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  return '\n\n━━━━━━━━━━━━\n' + shuffle(parts)[0];
}
