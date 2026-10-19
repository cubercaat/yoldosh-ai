// Reklama va xabar tarqatish: hamma guruhlarga, foydalanuvchilarga, tanlanganlarga; rejalashtirish; avto-reklama.
import { all, get, run, getSetting, setSetting, getChat, migrateChat } from './db.js';
import { api, send, edit, kb, siteUrl, notifyAdmins, addGroupBtn } from './core.js';
import { isGoneError } from './tg.js';
import { sleep, dateKey, hhmm, esc, fmtDate } from './util.js';

const running = new Set();

export const TARGET_NAME = {
  all: '🌍 Hammaga (guruhlar + foydalanuvchilar)', groups: '👥 Barcha guruhlar', users: '👤 Barcha foydalanuvchilar',
  chats: '🎯 Tanlangan guruh(lar)', user: '👤 Tanlangan foydalanuvchi', self: '🧪 Faqat menga (sinov)',
};

export function markup(buttons, campaign) {
  const b = typeof buttons === 'string' ? JSON.parse(buttons || '{}') : buttons || {};
  const rows = [];
  if (b.site) rows.push([{ text: b.siteText || '🚗 chorrahaa.uz — imtihonga tayyorlaning', url: siteUrl(campaign) }]);
  for (const r of b.rows || []) rows.push(r);
  if (b.addGroup) rows.push([addGroupBtn()]);
  return rows.length ? { inline_keyboard: rows } : undefined;
}

export function resolveTargets(target, createdBy) {
  const t = typeof target === 'string' ? JSON.parse(target) : target;
  const groups = () => all('SELECT id FROM chats WHERE active=1 AND banned=0 AND ads=1 ORDER BY members DESC').map((r) => ({ id: r.id, kind: 'group' }));
  const users = () => all('SELECT id FROM users WHERE started=1 AND blocked=0 ORDER BY last_seen DESC').map((r) => ({ id: r.id, kind: 'user' }));
  if (t.type === 'self') return [{ id: createdBy, kind: 'user' }];
  if (t.type === 'groups') return groups();
  if (t.type === 'users') return users();
  if (t.type === 'all') return [...groups(), ...users()];
  if (t.type === 'chats') return (t.ids || []).map((id) => ({ id, kind: 'group' }));
  if (t.type === 'user') return (t.ids || []).map((id) => ({ id, kind: 'user' }));
  return [];
}
export const countTargets = (target, by) => resolveTargets(target, by).length;

export function createBroadcast({ src_chat, src_msg, buttons, target, pin = 0, created_by, scheduled_at = null, note = '' }) {
  return Number(run(`INSERT INTO broadcasts(src_chat,src_msg,buttons,target,pin,status,created_by,created_at,scheduled_at,note)
    VALUES(?,?,?,?,?,?,?,?,?,?)`, src_chat, src_msg, JSON.stringify(buttons || {}), JSON.stringify(target), pin ? 1 : 0,
  scheduled_at ? 'scheduled' : 'queued', created_by, Date.now(), scheduled_at, note).lastInsertRowid);
}

export async function runBroadcast(id, progressChat) {
  if (running.has(id)) return;
  const b = get('SELECT * FROM broadcasts WHERE id=?', id);
  if (!b || !['queued', 'scheduled'].includes(b.status)) return;
  running.add(id);
  run("UPDATE broadcasts SET status='running' WHERE id=?", id);
  const targets = resolveTargets(b.target, b.created_by);
  const rm = markup(b.buttons, `bc_${id}`);
  let sent = 0, failed = 0, gone = 0, last = 0, pmsg = null;
  const pchat = progressChat || b.created_by;
  if (pchat) pmsg = await send(pchat, `📣 Tarqatish #${id} boshlandi: 0/${targets.length}`).catch(() => null);
  const progress = async (final = false) => {
    if (!pmsg) return;
    const t = final
      ? `✅ <b>Tarqatish #${id} tugadi</b>\n\n📨 Yuborildi: <b>${sent}</b> / ${targets.length}\n❌ Yetib bormadi: ${failed}${gone ? ` (shundan ${gone} tasi botni bloklagan yoki chiqargan)` : ''}`
      : `📣 Tarqatish #${id}: ${sent + failed}/${targets.length}\n📨 Yuborildi: ${sent} · ❌ ${failed}`;
    await edit(pchat, pmsg.message_id, t).catch(() => {});
  };
  for (const t of targets) {
    let chatId = t.id;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const m = await api.copyMessage({ chat_id: chatId, from_chat_id: b.src_chat, message_id: b.src_msg, reply_markup: rm });
        sent++;
        if (b.pin && t.kind === 'group') await api.pinChatMessage({ chat_id: chatId, message_id: m.message_id, disable_notification: true }).catch(() => {});
        break;
      } catch (e) {
        if (e.migrateTo && attempt === 0) { migrateChat(chatId, e.migrateTo); chatId = e.migrateTo; continue; }
        failed++;
        if (/message to copy not found|message_id_invalid/i.test(e.description)) {
          run("UPDATE broadcasts SET status='failed', note=? WHERE id=?", 'Asl xabar o\'chirilgan', id);
          running.delete(id);
          if (pchat) await send(pchat, `⚠️ Tarqatish #${id} to'xtadi: asl reklama xabari o'chirilgan. Uni qayta yuboring.`).catch(() => {});
          return;
        }
        if (isGoneError(e)) {
          gone++;
          if (t.kind === 'user') run('UPDATE users SET blocked=1 WHERE id=?', chatId);
          else run('UPDATE chats SET active=0 WHERE id=?', chatId);
        }
        break;
      }
    }
    await sleep(t.kind === 'group' ? 60 : 40);
    if (Date.now() - last > 3000) { last = Date.now(); run('UPDATE broadcasts SET sent=?, failed=?, total=? WHERE id=?', sent, failed, targets.length, id); progress(); }
  }
  run("UPDATE broadcasts SET status='done', sent=?, failed=?, total=?, finished_at=? WHERE id=?", sent, failed, targets.length, Date.now(), id);
  running.delete(id);
  await progress(true);
}

// Guruhda har N ta testdan keyin avtomatik reklama
export async function maybeAutoAd(chatId, thread) {
  const every = Number(getSetting('auto_every')) || 0;
  if (!every || chatId > 0) return;
  const c = getChat(chatId);
  if (!c || !c.ads || c.banned || c.games % every !== 0) return;
  const ad = get('SELECT * FROM ads WHERE auto=1 ORDER BY uses ASC, id ASC LIMIT 1');
  const extra = thread ? { message_thread_id: thread } : {};
  if (ad) {
    try {
      await api.copyMessage({ chat_id: chatId, from_chat_id: ad.src_chat, message_id: ad.src_msg, reply_markup: markup(ad.buttons, `auto_${ad.id}`), ...extra });
      run('UPDATE ads SET uses=uses+1 WHERE id=?', ad.id);
      return;
    } catch (e) { console.error('autoAd copy', e.description); }
  }
  await send(chatId,
    '🚗 <b>Haydovchilik guvohnomasini olmoqchimisiz?</b>\n\n' +
    '✅ 1276 ta rasmiy imtihon savoli\n💡 Har bir savolga tushunarli izoh va ovozli tushuntirish\n🎓 Haqiqiy imtihon simulyatori\n🕹 3D avtodrom mashqi\n\n' +
    '👉 Hammasi bitta joyda: <b>chorrahaa.uz</b>', {
      ...extra,
      reply_markup: kb([[{ text: '🌐 chorrahaa.uz ni ochish', url: siteUrl('auto_default') }]]),
    }).catch(() => {});
}

// Har 30 soniyada: rejalashtirilgan tarqatishlar va kunlik avto-reklama
export async function broadcastTick() {
  for (const b of all("SELECT id FROM broadcasts WHERE status='scheduled' AND scheduled_at<=?", Date.now())) runBroadcast(b.id).catch((e) => console.error('bc', e));
  if (Number(getSetting('daily_on')) && hhmm() >= String(getSetting('daily_time')) && getSetting('daily_last') !== dateKey()) {
    setSetting('daily_last', dateKey());
    const ad = get('SELECT * FROM ads WHERE auto=1 ORDER BY uses ASC, id ASC LIMIT 1');
    if (!ad) return notifyAdmins('⚠️ Kunlik avto-reklama yoqilgan, lekin «avto» belgilangan saqlangan reklama yo\'q.\n/admin → 🗂 Saqlangan reklamalar');
    run('UPDATE ads SET uses=uses+1 WHERE id=?', ad.id);
    const id = createBroadcast({ src_chat: ad.src_chat, src_msg: ad.src_msg, buttons: JSON.parse(ad.buttons || '{}'), target: { type: getSetting('daily_target') || 'groups' }, created_by: ad.src_chat, note: `daily ad #${ad.id}` });
    runBroadcast(id).catch((e) => console.error('daily', e));
  }
}

export function broadcastHistory(limit = 10) {
  return all('SELECT * FROM broadcasts ORDER BY id DESC LIMIT ?', limit).map((b) => {
    const t = JSON.parse(b.target);
    const st = { queued: '⏳', scheduled: '🕒', running: '📤', done: '✅', failed: '⚠️', cancelled: '🚫' }[b.status] || b.status;
    return `${st} #${b.id} · ${TARGET_NAME[t.type] || t.type} · ${b.status === 'scheduled' ? fmtDate(b.scheduled_at) : `${b.sent}/${b.total}`} ${b.note ? '· ' + esc(b.note) : ''}`;
  }).join('\n') || '—';
}
