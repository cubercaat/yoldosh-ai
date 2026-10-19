// Umumiy yordamchilar: API, xabar yuborish, admin tekshiruvi, reklama tugmalari.
import path from 'node:path';
import { CFG, isAdmin } from './config.js';
import { createApi, InputFile } from './tg.js';
import { get, run, getSetting } from './db.js';
import { shuffle } from './util.js';

export const api = createApi(CFG.token, CFG.apiRoot);
export const BOT = { id: 0, username: 'bot', name: 'Bot' };

export const kb = (rows) => ({ inline_keyboard: rows.filter((r) => r && r.length) });
export const cb = (text, data) => ({ text, callback_data: data });

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
  return isPrivate ? { text, web_app: { url } } : { text, url };
}
export const botLink = (payload) => `https://t.me/${BOT.username}${payload ? `?start=${payload}` : ''}`;
export const addGroupUrl = () => `https://t.me/${BOT.username}?startgroup=quiz&admin=delete_messages+pin_messages+invite_users`;
export const addGroupBtn = () => ({ text: '➕ Botni guruhga qo\'shish', url: addGroupUrl() });
export const shareUrl = (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

export function footer() {
  if (!Number(getSetting('footer_on'))) return '';
  const parts = String(getSetting('footer_text') || '').split(/\n-{3,}\n/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  return '\n\n━━━━━━━━━━━━\n' + shuffle(parts)[0];
}
