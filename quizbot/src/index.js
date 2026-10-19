// Chorraha YHQ viktorina boti — kirish nuqtasi.
import { CFG, isAdmin } from './config.js';
import { all, get, run, getSetting, setSetting, upsertUser, upsertChat, getChat, migrateChat } from './db.js';
import { api, BOT, send, edit, kb, cb, answerCb, isChatAdmin, siteBtn, siteUrl, addGroupBtn, botLink, shareUrl, notifyAdmins, footer } from './core.js';
import * as game from './game.js';
import { topView, userSummary, board, boardLines } from './stats.js';
import { adminCommand, adminCallback, adminText } from './admin.js';
import { broadcastTick } from './broadcast.js';
import { contestTick, publicContests } from './contests.js';
import { QUESTIONS } from './questions.js';
import { esc, hhmm, dateKey, tashkent, periodRange, sleep, displayName } from './util.js';

// ---------------- Lichka menyusi ----------------
const BTN = {
  test: '📝 Test yechish', exam: '🎓 Imtihon rejimi', top: '🏆 Reyting', me: '👤 Natijalarim',
  contests: '🎁 Konkurslar', invite: '👥 Do\'stlarni taklif qilish', site: '🌐 Chorrahaa.uz', group: '➕ Guruhga qo\'shish',
  admin: '🛠 Admin panel', help: 'ℹ️ Yordam',
};
function mainKeyboard(uid) {
  const rows = [
    [{ text: BTN.test }, { text: BTN.exam }],
    [{ text: BTN.top }, { text: BTN.me }],
    [{ text: BTN.contests }, { text: BTN.invite }],
    [{ text: BTN.site }, { text: BTN.group }],
  ];
  if (isAdmin(uid)) rows.push([{ text: BTN.admin }]);
  return { keyboard: rows, resize_keyboard: true, is_persistent: true };
}

async function privateStart(msg, payload) {
  const u = msg.from;
  const prev = get('SELECT started, ref_by FROM users WHERE id=?', u.id);
  upsertUser(u, { started: 1 });
  // Taklif (referal) havolasi: t.me/bot?start=ref_123
  const ref = payload?.match(/^ref_(\d+)$/)?.[1];
  if (ref && Number(ref) !== u.id && !prev?.started && !prev?.ref_by && get('SELECT id FROM users WHERE id=?', Number(ref))) {
    run('UPDATE users SET ref_by=? WHERE id=?', Number(ref), u.id);
    const n = get('SELECT COUNT(*) c FROM users WHERE ref_by=?', Number(ref)).c;
    send(Number(ref), `🎉 Do'stingiz <b>${esc(displayName(u))}</b> sizning havolangiz orqali qo'shildi!\n👥 Jami taklif qilganlaringiz: <b>${n}</b>`).catch(() => {});
  }
  await send(u.id,
    `🚦 <b>Assalomu alaykum, ${esc(u.first_name || '')}!</b>\n\nMen <b>Chorraha</b> — haydovchilik imtihoniga tayyorlov botiman.\n\n` +
    `📝 <b>${QUESTIONS.length} ta rasmiy YHQ savoli</b> bo'yicha test yeching\n🎓 Haqiqiy imtihondagidek «Imtihon rejimi»\n🏆 Kunlik va haftalik reytingda bellashing\n` +
    `🎁 Konkurslarda sovrinlar yuting\n👥 Botni guruhingizga qo'shib, do'stlar bilan viktorina o'ynang\n\n` +
    `📱 To'liq kurs: har bir savolga izoh, video darslar, 3D avtodrom — <b>chorrahaa.uz</b>`,
    { reply_markup: mainKeyboard(u.id) });
  await send(u.id, '👇 Saytni to\'g\'ridan-to\'g\'ri Telegram ichida oching:', {
    reply_markup: kb([[siteBtn('📱 Chorrahaa.uz ni ochish', 'start', true)], [cb('📝 Hoziroq test boshlash', 'ps:n:10')]]),
  });
  if (payload === 'quiz') await game.privateTestMenu(u.id);
  if (payload === 'exam') await game.privateTestMenu(u.id, true);
}

async function meText(uid) {
  const s = userSummary(uid);
  const pct = (x) => (x.answers ? Math.round((x.score / x.answers) * 100) : 0);
  return `👤 <b>Natijalaringiz</b>\n\n📅 Bugun: <b>${s.d.score}</b>/${s.d.answers} (${pct(s.d)}%)\n📆 Hafta: <b>${s.w.score}</b>/${s.w.answers} (${pct(s.w)}%)\n🏁 Jami: <b>${s.a.score}</b>/${s.a.answers} (${pct(s.a)}%)\n🎮 O'yinlar: ${s.games}\n📈 Haftalik reytingdagi o'rningiz: ${s.weekRank ? '<b>#' + s.weekRank + '</b>' : '—'}\n👥 Taklif qilgan do'stlaringiz: ${s.refs}`;
}

async function inviteText(uid) {
  const link = botLink(`ref_${uid}`);
  const n = get('SELECT COUNT(*) c FROM users WHERE ref_by=?', uid).c;
  return {
    text: `👥 <b>Do'stlaringizni taklif qiling!</b>\n\nSizning shaxsiy havolangiz:\n<code>${link}</code>\n\n✅ Taklif qilganlaringiz: <b>${n}</b>\n🎁 «Eng ko'p do'st taklif qilgan» konkurslarida aynan shu son hisoblanadi!`,
    reply_markup: kb([[{ text: '📤 Do\'stlarga yuborish', url: shareUrl(link, 'Haydovchilik imtihoniga birga tayyorlanamiz! 1276 ta rasmiy savol, test va konkurslar 🚦') }]]),
  };
}

async function onPrivateMessage(msg) {
  const text = (msg.text || '').trim();
  const [cmdRaw, ...args] = text.split(/\s+/);
  const cmd = cmdRaw.startsWith('/') ? cmdRaw.slice(1).split('@')[0].toLowerCase() : null;
  if (await adminText(msg)) return;
  const uid = msg.from.id;
  if (cmd === 'start') return privateStart(msg, args[0]);
  upsertUser(msg.from, { started: 1 });
  if (cmd === 'admin' || text === BTN.admin) { if (await adminCommand(msg)) return; }
  if (cmd === 'test' || cmd === 'quiz' || text === BTN.test) return game.privateTestMenu(uid);
  if (cmd === 'imtihon' || cmd === 'exam' || text === BTN.exam) return game.privateTestMenu(uid, true);
  if (cmd === 'stop') return game.stopCommand(msg);
  if (cmd === 'top' || text === BTN.top) { const v = topView('g', uid, 'w', 'score', true); return send(uid, v.text, { reply_markup: v.reply_markup }); }
  if (cmd === 'me' || text === BTN.me) return send(uid, await meText(uid), { reply_markup: kb([[siteBtn('📱 Chorrahaa.uz da natijani oshirish', 'me', true)]]) });
  if (cmd === 'konkurs' || text === BTN.contests) return send(uid, publicContests(uid, uid) + footer(), { reply_markup: kb([[cb('📝 Test yechish', 'ps:n:10')]]) });
  if (cmd === 'invite' || text === BTN.invite) { const v = await inviteText(uid); return send(uid, v.text, { reply_markup: v.reply_markup }); }
  if (cmd === 'site' || text === BTN.site) {
    return send(uid, '🚗 <b>chorrahaa.uz</b> — haydovchilik imtihoniga eng qulay tayyorgarlik:\n\n✅ 1276 ta rasmiy savol, har biriga izoh\n🔊 Ovozli tushuntirishlar\n🎓 Imtihon simulyatori\n🕹 3D avtodrom\n📱 Telefon va kompyuterda', {
      reply_markup: kb([[siteBtn('📱 Telegram ichida ochish', 'site_menu', true)], [{ text: '🌐 Brauzerda ochish', url: siteUrl('site_menu_browser') }]]),
    });
  }
  if (cmd === 'group' || text === BTN.group) {
    return send(uid, '➕ <b>Botni guruhingizga qo\'shing!</b>\n\n1. Pastdagi tugmani bosing va guruhni tanlang\n2. Botga admin huquqini bering (savollar va natijalarni to\'g\'ri chiqarishi uchun)\n3. Guruhda /quiz yozing — viktorina boshlanadi!\n\nGuruh a\'zolari xohlasa qatnashadi, oxirida g\'oliblar e\'lon qilinadi 🏆', {
      reply_markup: kb([[addGroupBtn()]]),
    });
  }
  if (cmd === 'help' || text === BTN.help || cmd) {
    return send(uid, `ℹ️ <b>Yordam</b>\n\n📝 /test — test yechish\n🎓 /imtihon — imtihon rejimi\n🏆 /top — reyting\n👤 /me — natijalarim\n🎁 /konkurs — konkurslar\n👥 /invite — do'stlarni taklif qilish\n⏹ /stop — testni to'xtatish\n\nGuruhda: /quiz, /top, /stop, /settings`, { reply_markup: mainKeyboard(uid) });
  }
  return send(uid, '👇 Menyudan tanlang:', { reply_markup: mainKeyboard(uid) });
}

// ---------------- Guruh ----------------
async function onGroupMessage(msg) {
  const chat = msg.chat;
  if (msg.migrate_to_chat_id) return migrateChat(chat.id, msg.migrate_to_chat_id);
  upsertChat(chat);
  const text = (msg.text || '').trim();
  if (!text.startsWith('/')) return;
  const [cmdRaw, ...args] = text.split(/\s+/);
  const [cmdName, mention] = cmdRaw.slice(1).split('@');
  if (mention && mention.toLowerCase() !== BOT.username.toLowerCase()) return;
  const cmd = cmdName.toLowerCase();
  const c = getChat(chat.id);
  if (c?.banned) { await api.leaveChat({ chat_id: chat.id }).catch(() => {}); return; }
  if (!c?.active) run('UPDATE chats SET active=1 WHERE id=?', chat.id);
  if (msg.from) upsertUser(msg.from);
  const thread = msg.is_topic_message ? { message_thread_id: msg.message_thread_id } : {};

  if (['start', 'quiz', 'test', 'viktorina', 'savol'].includes(cmd)) return game.groupStartCommand(msg, args[0] === 'quiz' ? [] : args);
  if (cmd === 'stop') return game.stopCommand(msg);
  if (cmd === 'top' || cmd === 'reyting') { const v = topView('c', chat.id, 'w', 'score'); return send(chat.id, v.text, { reply_markup: v.reply_markup, ...thread }); }
  if (cmd === 'me') return send(chat.id, await meText(msg.from.id), { reply_parameters: { message_id: msg.message_id, allow_sending_without_reply: true }, ...thread });
  if (cmd === 'konkurs') return send(chat.id, publicContests(msg.from.id, chat.id), { ...thread, reply_markup: kb([[{ text: '📝 Botda test yechish', url: botLink('quiz') }]]) });
  if (cmd === 'settings' || cmd === 'sozlamalar') {
    if (!(await isChatAdmin(chat.id, msg.from.id))) return send(chat.id, '⛔ Faqat guruh adminlari uchun.', thread);
    return send(chat.id, groupSettingsText(chat.id), { reply_markup: groupSettingsKb(chat.id), ...thread });
  }
  if (cmd === 'help' || cmd === 'yordam') {
    return send(chat.id, `🚦 <b>Chorraha YHQ viktorina</b>\n\n▶️ /quiz — test boshlash (savollar soni, vaqt va mavzu tanlanadi)\n⚡ /quiz 20 — 20 ta savol bilan darhol\n⏹ /stop — to'xtatish\n🏆 /top — guruh reytingi (kun/hafta/oy)\n👤 /me — natijalarim\n🎁 /konkurs — konkurslar\n⚙️ /settings — sozlamalar (adminlar)`, thread);
  }
}

function groupSettingsText(chatId) {
  const c = getChat(chatId);
  return `⚙️ <b>Guruh sozlamalari</b>\n\n▶️ Testni kim boshlay oladi: <b>${c.start_mode === 'admins' ? 'faqat adminlar' : 'hamma'}</b>\n📅 Kunlik g'oliblar e'loni: <b>${c.summary ? 'yoqilgan' : 'o\'chirilgan'}</b>`;
}
function groupSettingsKb(chatId) {
  const c = getChat(chatId);
  return kb([
    [cb(c.start_mode === 'admins' ? '👥 Hamma boshlay olsin' : '👮 Faqat adminlar boshlasin', 'gst:mode')],
    [cb(c.summary ? '🔕 Kunlik e\'lonni o\'chirish' : '🔔 Kunlik e\'lonni yoqish', 'gst:sum')],
  ]);
}

async function onMyChatMember(u) {
  const chat = u.chat, st = u.new_chat_member.status, old = u.old_chat_member.status;
  if (chat.type === 'private') { run('UPDATE users SET blocked=? WHERE id=?', st === 'kicked' ? 1 : 0, chat.id); return; }
  const inNow = ['member', 'administrator', 'creator'].includes(st);
  const wasIn = ['member', 'administrator', 'creator'].includes(old);
  if (inNow) {
    const c = getChat(chat.id);
    if (c?.banned) { await api.leaveChat({ chat_id: chat.id }).catch(() => {}); return; }
    let members = 0; try { members = await api.getChatMemberCount({ chat_id: chat.id }); } catch {}
    upsertChat(chat, { active: 1, is_admin: st === 'administrator' ? 1 : 0, members, ...(wasIn ? {} : { added_by: u.from?.id, added_at: Date.now() }) });
    if (u.from) upsertUser(u.from);
    if (!wasIn) {
      await send(chat.id,
        `👋 <b>Assalomu alaykum!</b> Men <b>Chorraha</b> viktorina botiman.\n\n🚦 Guruhda haydovchilik (YHQ) bo'yicha viktorina o'tkazaman: <b>${QUESTIONS.length} ta rasmiy savol</b>, rasmlar bilan.\n\n` +
        `▶️ Boshlash: /quiz\n🏆 Reyting: /top\n⏹ To'xtatish: /stop\n⚙️ Sozlamalar: /settings\n\n` +
        (st === 'administrator' ? '✅ Admin huquqi uchun rahmat!' : '⚠️ To\'liq ishlashim uchun meni <b>admin</b> qiling.'),
        { reply_markup: kb([[cb('▶️ Viktorinani boshlash', 'gq:start')], [siteBtn('🚗 chorrahaa.uz', 'group_welcome')]]) }).catch(() => {});
      await notifyAdmins(`➕ <b>Bot yangi guruhga qo'shildi</b>\n${esc(chat.title)}${chat.username ? ' (@' + esc(chat.username) + ')' : ''}\n👤 A'zolar: ${members}\n🆔 <code>${chat.id}</code>\nQo'shgan: ${esc(displayName(u.from))}`, {
        reply_markup: kb([[cb('👥 Guruhni boshqarish', `ad:g:${chat.id}`)]]),
      });
    } else if (st === 'administrator' && old !== 'administrator') {
      await send(chat.id, '✅ Rahmat! Endi men adminman. Viktorina uchun: /quiz').catch(() => {});
    }
  } else if (['left', 'kicked'].includes(st)) {
    run('UPDATE chats SET active=0, is_admin=0 WHERE id=?', chat.id);
    await notifyAdmins(`➖ Bot guruhdan chiqarildi: ${esc(chat.title)} (<code>${chat.id}</code>)`);
  }
}

// ---------------- Callbacklar ----------------
async function onCallback(q) {
  const data = q.data || '';
  const parts = data.split(':');
  const p0 = parts[0];
  if (q.from) upsertUser(q.from);
  if (p0 === 'ad') return adminCallback(q, parts);
  if (!q.message) return answerCb(q.id);
  const chatId = q.message.chat.id;
  if (p0 === 'gs') return game.groupSetupCallback(q, parts);
  if (p0 === 'ga') return game.againCallback(q, parts);
  if (p0 === 'qa') return game.answerButtonCallback(q, parts);
  if (p0 === 'ps') return game.privateSetupCallback(q, parts);
  if (p0 === 'pm') return game.mistakesCallback(q, parts);
  if (p0 === 'gq') {
    await answerCb(q.id);
    const fake = { chat: q.message.chat, from: q.from, message_id: q.message.message_id, is_topic_message: q.message.is_topic_message, message_thread_id: q.message.message_thread_id };
    return game.groupStartCommand(fake, []);
  }
  if (p0 === 'top') {
    const [, scopeKey, period, metric] = parts;
    const v = topView(scopeKey, chatId, period, metric, chatId > 0);
    await answerCb(q.id);
    if (q.message.text?.includes('reyting')) return edit(chatId, q.message.message_id, v.text, { reply_markup: v.reply_markup });
    return send(chatId, v.text, { reply_markup: v.reply_markup, ...(q.message.is_topic_message ? { message_thread_id: q.message.message_thread_id } : {}) });
  }
  if (p0 === 'gst') {
    if (!(await isChatAdmin(chatId, q.from.id))) return answerCb(q.id, 'Faqat guruh adminlari uchun', true);
    if (parts[1] === 'mode') run("UPDATE chats SET start_mode=CASE start_mode WHEN 'admins' THEN 'all' ELSE 'admins' END WHERE id=?", chatId);
    if (parts[1] === 'sum') run('UPDATE chats SET summary=1-summary WHERE id=?', chatId);
    await answerCb(q.id, 'Saqlandi ✅');
    return edit(chatId, q.message.message_id, groupSettingsText(chatId), { reply_markup: groupSettingsKb(chatId) });
  }
  return answerCb(q.id);
}

// ---------------- Kunlik / haftalik g'oliblar e'loni ----------------
async function summaryTick() {
  if (!Number(getSetting('summary_on'))) return;
  if (hhmm() < String(getSetting('summary_time')) || getSetting('summary_last') === dateKey()) return;
  setSetting('summary_last', dateKey());
  const weekly = tashkent().dow === 0;
  const [d0] = periodRange('d'), [w0] = periodRange('w');
  const chats = all(`SELECT c.id FROM chats c WHERE c.active=1 AND c.banned=0 AND c.summary=1 AND EXISTS
    (SELECT 1 FROM answers a WHERE a.chat_id=c.id AND a.at>=? GROUP BY a.chat_id HAVING COUNT(DISTINCT a.user_id)>=2)`, weekly ? w0 : d0);
  for (const c of chats) {
    const from = weekly ? w0 : d0;
    const best = board({ scope: { type: 'chat', ids: [c.id] }, from, limit: 5 });
    const act = board({ scope: { type: 'chat', ids: [c.id] }, from, metric: 'active', limit: 3 });
    const text = `${weekly ? '📆 <b>Haftaning' : '📅 <b>Bugungi'} eng yaxshi o'yinchilari</b>\n\n🎯 <b>Eng ko'p to'g'ri javob:</b>\n${boardLines(best)}\n\n🔥 <b>Eng faollar:</b>\n${boardLines(act, 'active')}\n\n🏆 Tabriklaymiz! Ertaga yana bellashamiz — /quiz${footer()}`;
    await send(c.id, text, { reply_markup: kb([[siteBtn('🚗 chorrahaa.uz — to\'liq tayyorgarlik', weekly ? 'weekly_summary' : 'daily_summary')], [cb('▶️ Viktorinani boshlash', 'gq:start')]]) })
      .catch((e) => { if (e.code === 403) run('UPDATE chats SET active=0 WHERE id=?', c.id); });
    await sleep(120);
  }
}

// ---------------- Ishga tushirish ----------------
async function handle(u) {
  if (u.message) {
    const m = u.message;
    if (m.chat.type === 'private') return onPrivateMessage(m);
    if (['group', 'supergroup'].includes(m.chat.type)) return onGroupMessage(m);
    return;
  }
  if (u.callback_query) return onCallback(u.callback_query);
  if (u.poll_answer) return game.onPollAnswer(u.poll_answer);
  if (u.my_chat_member) return onMyChatMember(u.my_chat_member);
}

async function setup() {
  const me = await api.getMe();
  Object.assign(BOT, { id: me.id, username: me.username, name: me.first_name });
  const wh = await api.getWebhookInfo();
  if (wh.url) {
    if (!CFG.deleteWebhook) {
      console.error(`\n❌ Bu token webhook bilan boshqa joyda ishlatilmoqda (${wh.url}).\nViktorina uchun alohida bot oching (@BotFather → /newbot) yoki webhookni o'chirish uchun .env ga DELETE_WEBHOOK=1 yozing.\n`);
      process.exit(3);
    }
    await api.deleteWebhook({ drop_pending_updates: false });
  }
  const priv = [
    { command: 'start', description: 'Bosh menyu' }, { command: 'test', description: 'Test yechish' },
    { command: 'imtihon', description: 'Imtihon rejimi' }, { command: 'top', description: 'Reyting' },
    { command: 'me', description: 'Natijalarim' }, { command: 'konkurs', description: 'Konkurslar' },
    { command: 'invite', description: 'Do\'stlarni taklif qilish' }, { command: 'stop', description: 'Testni to\'xtatish' },
  ];
  const grp = [
    { command: 'quiz', description: 'Viktorinani boshlash' }, { command: 'stop', description: 'To\'xtatish' },
    { command: 'top', description: 'Guruh reytingi' }, { command: 'me', description: 'Natijalarim' },
    { command: 'konkurs', description: 'Konkurslar' }, { command: 'settings', description: 'Sozlamalar (adminlar)' },
  ];
  await api.setMyCommands({ commands: priv, scope: { type: 'all_private_chats' } }).catch(() => {});
  await api.setMyCommands({ commands: grp, scope: { type: 'all_group_chats' } }).catch(() => {});
  for (const id of CFG.admins) await api.setMyCommands({ commands: [...priv, { command: 'admin', description: 'Admin panel' }], scope: { type: 'chat', chat_id: id } }).catch(() => {});
  await api.setChatMenuButton({ menu_button: { type: 'web_app', text: '🚦 Chorraha', web_app: { url: siteUrl('menu_button') } } }).catch(() => {});
  await api.setMyShortDescription({ short_description: `Haydovchilik imtihoni: ${QUESTIONS.length} ta rasmiy savol, guruh viktorinalari, konkurslar. To'liq kurs: chorrahaa.uz` }).catch(() => {});
  await api.setMyDescription({ description: `🚦 Chorraha — haydovchilik imtihoniga tayyorlov boti.\n\n📝 ${QUESTIONS.length} ta rasmiy YHQ savoli (rasmlar bilan)\n👥 Guruhda viktorina va reyting\n🎁 Konkurslar va sovrinlar\n\n📱 To'liq kurs, izohlar va imtihon simulyatori: chorrahaa.uz` }).catch(() => {});
  game.closeStaleGames();
  console.log(`✅ @${BOT.username} ishga tushdi. Savollar: ${QUESTIONS.length}. Adminlar: ${CFG.admins.join(', ') || '(yo\'q — .env da ADMIN_IDS ni yozing)'}`);
}

async function tick() {
  try { await contestTick(); } catch (e) { console.error('contestTick', e); }
  try { await broadcastTick(); } catch (e) { console.error('broadcastTick', e); }
  try { await summaryTick(); } catch (e) { console.error('summaryTick', e); }
}

async function main() {
  if (!CFG.token) { console.error('❌ BOT_TOKEN yo\'q. .env faylini to\'ldiring (README ga qarang).'); process.exit(1); }
  await setup();
  setInterval(tick, CFG.tickMs);
  setTimeout(tick, 3000);
  let offset = 0;
  const allowed = ['message', 'callback_query', 'poll_answer', 'my_chat_member'];
  for (;;) {
    try {
      const ups = await api.getUpdates({ offset, timeout: 50, allowed_updates: allowed });
      for (const u of ups) {
        offset = u.update_id + 1;
        try { await handle(u); } catch (e) { console.error('update', u.update_id, e.description || e.stack || e); }
      }
    } catch (e) {
      console.error('getUpdates', e.description || e.message);
      if (e.code === 409) console.error('Boshqa nusxa ishlayapti yoki webhook o\'rnatilgan.');
      await sleep(3000);
    }
  }
}

process.on('unhandledRejection', (e) => console.error('unhandled', e?.description || e));
main().catch((e) => {
  if (e?.code === 401 || e?.code === 404) { console.error('\n❌ Token noto\'g\'ri. @BotFather dan olingan tokenni tekshiring.\n'); process.exit(2); }
  console.error('❌ Ishga tushmadi:', e?.description || e?.message || e);
  process.exit(1);
});
