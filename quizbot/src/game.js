// O'yin dvigateli: guruhda viktorina (taymer bilan) va lichkada shaxsiy test.
import { all, run, getChat, upsertUser, getSetting, upsertChat } from './db.js';
import { api, send, edit, kb, cb, answerCb, isChatAdmin, sendPhotoCached, siteBtn, addGroupBtn, footer, botLink, shareUrl } from './core.js';
import { QUESTIONS, TOPICS, topicName, pickQuestions, pollFits, byN } from './questions.js';
import { esc, trunc, rankIcon, displayName, LETTERS, fmtDur, chunk } from './util.js';
import { isGoneError, isRightsError } from './tg.js';
import { userSummary } from './stats.js';
import { maybeAutoAd } from './broadcast.js';

const games = new Map();   // chatId -> o'yin
const pollMap = new Map(); // poll_id -> o'yin
const setups = new Map();  // chatId -> sozlash bosqichi

const COUNTS = [5, 10, 15, 20, 30, 50];
const SECONDS = [10, 15, 20, 30, 45, 60];
const IDLE_LIMIT = 4; // ketma-ket shuncha savolga hech kim javob bermasa — to'xtaydi

export const isRunning = (chatId) => games.has(chatId);
export const runningCount = () => games.size;

const th = (g) => (g.thread ? { message_thread_id: g.thread } : {});

// ---------------- Guruh: sozlash ----------------
export async function groupStartCommand(msg, args = []) {
  const chat = msg.chat, user = msg.from;
  const thread = msg.is_topic_message ? msg.message_thread_id : undefined;
  const c = getChat(chat.id);
  if (c?.start_mode === 'admins' && !(await isChatAdmin(chat.id, user.id))) {
    return send(chat.id, '⛔ Bu guruhda testni faqat adminlar boshlay oladi.', { reply_parameters: { message_id: msg.message_id, allow_sending_without_reply: true }, message_thread_id: thread }).catch(() => {});
  }
  if (games.has(chat.id)) {
    return send(chat.id, '⏳ Test allaqachon davom etmoqda. To\'xtatish: /stop', { message_thread_id: thread }).catch(() => {});
  }
  const n = parseInt(args[0], 10);
  if (n > 0) {
    const s = parseInt(args[1], 10);
    return startGroupGame(chat, user, { count: Math.min(n, 100), seconds: SECONDS.includes(s) ? s : Number(getSetting('default_seconds')) || 20, topic: 'mix', thread });
  }
  const m = await send(chat.id, '🧠 <b>Chorraha YHQ testi</b>\n🚦 1276 ta rasmiy imtihon savoli (rasmlar bilan)\n\n❓ <b>Nechta savol bo\'lsin?</b>', {
    message_thread_id: thread,
    reply_markup: kb([...chunk(COUNTS.map((x) => cb(`${x} ta`, `gs:n:${x}`)), 3), [cb('❌ Bekor qilish', 'gs:x')]]),
  });
  setups.set(chat.id, { starter: user.id, msgId: m.message_id, thread, at: Date.now() });
}

export async function groupSetupCallback(q, parts) {
  const chat = q.message.chat, user = q.from;
  const s = setups.get(chat.id);
  if (!s || s.msgId !== q.message.message_id) return answerCb(q.id, 'Bu sozlash eskirgan. /quiz ni qayta yozing.', true);
  if (s.starter !== user.id && !(await isChatAdmin(chat.id, user.id))) return answerCb(q.id, 'Faqat testni boshlagan odam tanlaydi 🙂', true);
  const [, step, val] = parts;
  if (step === 'x') { setups.delete(chat.id); await answerCb(q.id, 'Bekor qilindi'); return api.deleteMessage({ chat_id: chat.id, message_id: s.msgId }).catch(() => edit(chat.id, s.msgId, '❌ Bekor qilindi.')); }
  if (step === 'n') {
    s.count = Number(val);
    await answerCb(q.id);
    return edit(chat.id, s.msgId, `✅ Savollar: <b>${s.count} ta</b>\n\n⏱ <b>Har bir savolga qancha vaqt?</b>`, {
      reply_markup: kb([...chunk(SECONDS.map((x) => cb(`${x} soniya`, `gs:t:${x}`)), 3), [cb('❌ Bekor qilish', 'gs:x')]]),
    });
  }
  if (step === 't') {
    s.seconds = Number(val);
    await answerCb(q.id);
    const topics = TOPICS.map((t) => cb(t.name, `gs:p:${t.id}`));
    return edit(chat.id, s.msgId, `✅ Savollar: <b>${s.count} ta</b> · ⏱ <b>${s.seconds} soniya</b>\n\n📚 <b>Mavzuni tanlang:</b>`, {
      reply_markup: kb([[cb('🔀 Aralash (barcha mavzular)', 'gs:p:mix')], ...chunk(topics, 2), [cb('❌ Bekor qilish', 'gs:x')]]),
    });
  }
  if (step === 'p') {
    setups.delete(chat.id);
    await answerCb(q.id, 'Boshladik! 🚀');
    if (games.has(chat.id)) return;
    await api.deleteMessage({ chat_id: chat.id, message_id: s.msgId }).catch(() => {});
    return startGroupGame(chat, user, { count: s.count || 10, seconds: s.seconds || 20, topic: val, thread: s.thread });
  }
}

// "Yana o'ynash" tugmasi
export async function againCallback(q, parts) {
  const chat = q.message.chat;
  const [, count, seconds, topic] = parts;
  if (games.has(chat.id)) return answerCb(q.id, 'Test allaqachon davom etmoqda', true);
  const c = getChat(chat.id);
  if (c?.start_mode === 'admins' && !(await isChatAdmin(chat.id, q.from.id))) return answerCb(q.id, 'Bu guruhda testni faqat adminlar boshlaydi', true);
  await answerCb(q.id, 'Boshladik! 🚀');
  const thread = q.message.is_topic_message ? q.message.message_thread_id : undefined;
  return startGroupGame(chat, q.from, { count: Number(count) || 10, seconds: Number(seconds) || 20, topic: topic || 'mix', thread });
}

async function startGroupGame(chat, user, { count, seconds, topic, thread }) {
  upsertChat(chat);
  upsertUser(user);
  const list = pickQuestions(chat.id, count, topic);
  const id = Number(run('INSERT INTO games(chat_id,starter,kind,total,seconds,topic,status,created_at) VALUES(?,?,?,?,?,?,?,?)',
    chat.id, user.id, 'group', list.length, seconds, topic, 'running', Date.now()).lastInsertRowid);
  const g = newGame({ id, chatId: chat.id, kind: 'group', total: list.length, seconds, topic, list, starter: user.id, thread });
  games.set(chat.id, g);
  await send(chat.id,
    `🚦 <b>Test boshlandi!</b>\n\n📚 Mavzu: <b>${esc(topicName(topic))}</b>\n❓ Savollar: <b>${list.length} ta</b> · ⏱ har biriga <b>${seconds} soniya</b>\n\n` +
    `👥 Qatnashish <b>ixtiyoriy</b> — xohlagan odam javob beradi, javob berganlar reytingga kiradi.\n` +
    `🏆 Oxirida g'oliblar e'lon qilinadi. To'xtatish: /stop`, th(g)).catch(() => {});
  setTimeout(() => askNext(g), 2500);
}

function newGame(o) {
  return { ...o, i: -1, players: new Map(), cur: null, timer: null, idle: 0, done: false, startedAt: Date.now(), pollIds: [], errors: 0 };
}

// ---------------- Lichka: shaxsiy test ----------------
export function privateTestMenu(chatId, exam = false) {
  if (exam) return startPrivateGame(chatId, { count: 20, topic: 'mix', exam: true });
  return send(chatId, '📝 <b>Shaxsiy test</b>\n\nNechta savol yechasiz?', {
    reply_markup: kb([
      [cb('10 ta', 'ps:n:10'), cb('20 ta', 'ps:n:20'), cb('30 ta', 'ps:n:30')],
      [cb('50 ta', 'ps:n:50'), cb('100 ta', 'ps:n:100')],
      [cb('🎓 Imtihon rejimi (20 savol, 2 ta xato)', 'ps:exam')],
    ]),
  });
}

export async function privateSetupCallback(q, parts) {
  const chatId = q.message.chat.id;
  const [, step, a, b] = parts;
  await answerCb(q.id);
  if (step === 'exam') return startPrivateGame(chatId, { count: 20, topic: 'mix', exam: true, from: q.from });
  if (step === 'n') {
    const topics = TOPICS.map((t) => cb(t.name, `ps:p:${a}:${t.id}`));
    return edit(chatId, q.message.message_id, `✅ Savollar: <b>${a} ta</b>\n\n📚 <b>Mavzuni tanlang:</b>`, {
      reply_markup: kb([[cb('🔀 Aralash (barcha mavzular)', `ps:p:${a}:mix`)], ...chunk(topics, 2)]),
    });
  }
  if (step === 'p') {
    await api.deleteMessage({ chat_id: chatId, message_id: q.message.message_id }).catch(() => {});
    return startPrivateGame(chatId, { count: Number(a), topic: b, from: q.from });
  }
  if (step === 'again') return startPrivateGame(chatId, { count: a === 'exam' ? 20 : Number(a) || 10, topic: b || 'mix', exam: a === 'exam', from: q.from });
}

async function startPrivateGame(chatId, { count, topic, exam = false, from }) {
  if (games.has(chatId)) await finish(games.get(chatId), 'replaced');
  if (from) upsertUser(from, { started: 1 });
  const list = pickQuestions(chatId, count, topic);
  const id = Number(run('INSERT INTO games(chat_id,starter,kind,total,seconds,topic,exam,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
    chatId, chatId, 'private', list.length, 0, topic, exam ? 1 : 0, 'running', Date.now()).lastInsertRowid);
  const g = newGame({ id, chatId, kind: 'private', total: list.length, seconds: 0, topic, list, starter: chatId, exam });
  games.set(chatId, g);
  await send(chatId, exam
    ? '🎓 <b>Imtihon rejimi</b>\n20 ta savol. 2 tadan ko\'p xato qilsangiz — imtihondan o\'tmaysiz (haqiqiy imtihondagidek).\n\nOmad! 🍀  To\'xtatish: /stop'
    : `📝 <b>Test boshlandi!</b> ${list.length} ta savol · ${esc(topicName(topic))}\nShoshilmang, har bir javobdan keyin keyingi savol keladi. To'xtatish: /stop`).catch(() => {});
  setTimeout(() => askNext(g), 800);
}

// ---------------- Savol berish ----------------
async function askNext(g) {
  if (g.done) return;
  clearTimeout(g.timer);
  g.i++;
  if (g.i >= g.total) return finish(g, 'done');
  const q = g.list[g.i];
  const prefix = `[${g.i + 1}/${g.total}] `;
  const cur = { q, idx: g.i, answered: new Map(), sentAt: 0, closed: false };
  try {
    if (q.image) await sendPhotoCached(g.chatId, q.image, { caption: `<b>${prefix}</b>${esc(q.question)}`, parse_mode: 'HTML', ...th(g) });
    if (pollFits(q, prefix)) {
      let expl = q.explanation || '';
      if (Number(getSetting('promo_in_expl'))) expl = trunc(expl, 182) + ' | chorrahaa.uz';
      const m = await api.sendPoll({
        chat_id: g.chatId, ...th(g),
        question: prefix + q.question,
        options: q.options.map((t) => ({ text: t })),
        type: 'quiz', correct_option_id: q.correct_index, is_anonymous: false,
        explanation: trunc(expl, 200),
        open_period: g.kind === 'group' ? g.seconds : undefined,
      });
      cur.mode = 'poll'; cur.pollId = m.poll.id; cur.msgId = m.message_id;
      pollMap.set(m.poll.id, g); g.pollIds.push(m.poll.id);
    } else {
      const lines = q.options.map((o, k) => `<b>${LETTERS[k]})</b> ${esc(o)}`).join('\n');
      const head = q.image ? `<b>${prefix}</b>⬆️ Rasmdagi savol` : `<b>${prefix}</b>${esc(q.question)}`;
      const tail = g.kind === 'group' ? `\n\n⏱ <i>${g.seconds} soniya</i>` : '';
      const m = await send(g.chatId, `${head}\n\n${lines}${tail}`, {
        ...th(g),
        reply_markup: kb([q.options.map((_, k) => cb(LETTERS[k], `qa:${g.id}:${g.i}:${k}`))]),
      });
      cur.mode = 'btn'; cur.msgId = m.message_id; cur.text = `${head}\n\n${lines}`;
    }
    g.errors = 0;
  } catch (e) {
    console.error('askNext', g.chatId, e.description || e.message);
    if (isGoneError(e)) { run('UPDATE chats SET active=0 WHERE id=?', g.chatId); return finish(g, 'gone'); }
    if (isRightsError(e)) {
      await send(g.chatId, '⚠️ Menga savol yuborish uchun ruxsat yetarli emas. Iltimos, meni <b>admin</b> qiling va /quiz ni qayta yozing.', th(g)).catch(() => {});
      return finish(g, 'rights');
    }
    if (++g.errors >= 3) return finish(g, 'error');
    g.i--; g.timer = setTimeout(() => askNext(g), 4000);
    return;
  }
  cur.sentAt = Date.now();
  g.cur = cur;
  if (g.kind === 'group') g.timer = setTimeout(() => closeQuestion(g), g.seconds * 1000 + 1500);
  else g.timer = setTimeout(() => finish(g, 'idle'), 20 * 60 * 1000);
}

async function closeQuestion(g) {
  const cur = g.cur;
  if (!cur || g.done || cur.closed) return;
  cur.closed = true;
  const n = cur.answered.size;
  const right = [...cur.answered.values()].filter((x) => x === cur.q.correct_index).length;
  if (cur.mode === 'btn') {
    const ans = `${LETTERS[cur.q.correct_index]}) ${cur.q.options[cur.q.correct_index]}`;
    await edit(g.chatId, cur.msgId, `${cur.text}\n\n✅ To'g'ri javob: <b>${esc(ans)}</b>\n👥 Javob berdi: ${n} · to'g'ri: ${right}` +
      (cur.q.explanation ? `\n\n💡 <i>${esc(trunc(cur.q.explanation, 500))}</i>` : '')).catch(() => {});
  }
  g.idle = n === 0 ? g.idle + 1 : 0;
  if (g.idle >= IDLE_LIMIT) {
    await send(g.chatId, '😴 Ketma-ket bir nechta savolga hech kim javob bermadi — test to\'xtatildi.\nQayta boshlash: /quiz', th(g)).catch(() => {});
    return finish(g, 'idle');
  }
  g.timer = setTimeout(() => askNext(g), 1500);
}

// Javobni qayd etish (so'rovnoma yoki tugma orqali)
function recordAnswer(g, user, idx) {
  const cur = g.cur;
  if (!cur || cur.closed || g.done || cur.answered.has(user.id)) return null;
  cur.answered.set(user.id, idx);
  const correct = idx === cur.q.correct_index ? 1 : 0;
  const ms = Date.now() - cur.sentAt;
  const p = g.players.get(user.id) || { user, score: 0, ms: 0, answers: 0, wrong: [] };
  p.user = user; p.answers++; p.score += correct; p.ms += ms;
  if (!correct) p.wrong.push(cur.q.n);
  g.players.set(user.id, p);
  upsertUser(user);
  run('INSERT OR IGNORE INTO answers(game_id,chat_id,user_id,qn,idx,correct,ms,at) VALUES(?,?,?,?,?,?,?,?)',
    g.id, g.chatId, user.id, cur.q.n, idx, correct, ms, Date.now());
  return correct;
}

export async function onPollAnswer(pa) {
  const g = pollMap.get(pa.poll_id);
  if (!g || !pa.user || !pa.option_ids?.length) return;
  if (g.cur?.pollId !== pa.poll_id) return;
  const r = recordAnswer(g, pa.user, pa.option_ids[0]);
  if (r === null) return;
  if (g.kind === 'private') { clearTimeout(g.timer); g.timer = setTimeout(() => askNext(g), r ? 1200 : 2500); }
}

export async function answerButtonCallback(q, parts) {
  const [, gid, i, k] = parts;
  const g = games.get(q.message.chat.id);
  if (!g || g.id !== Number(gid) || !g.cur || g.cur.idx !== Number(i) || g.cur.closed) return answerCb(q.id, '⌛ Bu savol yopilgan');
  const r = recordAnswer(g, q.from, Number(k));
  if (r === null) return answerCb(q.id, 'Siz allaqachon javob bergansiz');
  if (g.kind === 'group') return answerCb(q.id, r ? '✅ To\'g\'ri!' : '❌ Noto\'g\'ri', false);
  await answerCb(q.id, r ? '✅ To\'g\'ri!' : '❌ Noto\'g\'ri');
  const cur = g.cur; cur.closed = true;
  const ans = `${LETTERS[cur.q.correct_index]}) ${cur.q.options[cur.q.correct_index]}`;
  await edit(g.chatId, cur.msgId, `${cur.text}\n\n${r ? '✅ To\'g\'ri!' : `❌ Siz: ${LETTERS[Number(k)]}`}\nTo'g'ri javob: <b>${esc(ans)}</b>` +
    (cur.q.explanation ? `\n\n💡 <i>${esc(trunc(cur.q.explanation, 600))}</i>` : '')).catch(() => {});
  clearTimeout(g.timer);
  g.timer = setTimeout(() => askNext(g), r ? 1000 : 2500);
}

// ---------------- To'xtatish ----------------
export async function stopCommand(msg) {
  const chatId = msg.chat.id;
  const g = games.get(chatId);
  if (!g) { setups.delete(chatId); return send(chatId, 'Hozir test ketmayapti. Boshlash: ' + (chatId > 0 ? '📝 Test yechish' : '/quiz'), msg.is_topic_message ? { message_thread_id: msg.message_thread_id } : {}).catch(() => {}); }
  if (g.kind === 'group' && msg.from.id !== g.starter && !(await isChatAdmin(chatId, msg.from.id))) {
    return send(chatId, '⛔ Testni faqat uni boshlagan odam yoki guruh adminlari to\'xtata oladi.', th(g)).catch(() => {});
  }
  if (g.cur?.mode === 'poll' && g.kind === 'group') api.stopPoll({ chat_id: chatId, message_id: g.cur.msgId }).catch(() => {});
  return finish(g, 'stopped');
}

// ---------------- Yakun ----------------
async function finish(g, reason) {
  if (g.done) return;
  g.done = true;
  clearTimeout(g.timer);
  if (games.get(g.chatId) === g) games.delete(g.chatId);
  for (const id of g.pollIds) pollMap.delete(id);
  const asked = Math.max(0, Math.min(g.total, g.cur ? g.cur.idx + 1 : 0));
  run('UPDATE games SET status=?, asked=?, players=?, finished_at=? WHERE id=?', reason, asked, g.players.size, Date.now(), g.id);
  if (['gone', 'replaced'].includes(reason)) return;
  if (g.kind === 'group') {
    run('UPDATE chats SET games=games+1, last_game=? WHERE id=?', Date.now(), g.chatId);
    if (asked === 0 || reason === 'rights') return;
    await sendGroupResults(g, asked);
    await maybeAutoAd(g.chatId, g.thread).catch((e) => console.error('autoAd', e.message));
  } else {
    if (reason === 'idle' && !g.players.size) return;
    await sendPrivateResults(g, asked, reason);
  }
}

async function sendGroupResults(g, asked) {
  const rows = [...g.players.values()].sort((a, b) => b.score - a.score || a.ms - b.ms);
  const top = rows.slice(0, 20).map((p, i) => `${rankIcon(i)} ${esc(displayName(p.user))} – <b>${p.score}</b> (${(p.ms / 1000).toFixed(1)} soniya)`);
  const more = rows.length > 20 ? `\n… va yana ${rows.length - 20} kishi` : '';
  const body = rows.length
    ? `${top.join('\n')}${more}\n\n👥 Qatnashchilar: <b>${rows.length}</b>\n🏆 G'oliblarni tabriklaymiz!`
    : '😔 Hech kim javob bermadi.';
  const text = `🏁 <b>«Chorraha YHQ: ${esc(topicName(g.topic))}»</b> testi yakunlandi!\n\n<i>${asked} ta savolga javob berildi</i>\n\n${body}${footer()}`;
  await send(g.chatId, text, {
    ...th(g),
    reply_markup: kb([
      [siteBtn('🚗 1276 savol + izohlar — chorrahaa.uz', `group_result_${g.chatId}`)],
      [cb('🔁 Yana o\'ynash', `ga:${g.total}:${g.seconds}:${g.topic}`), cb('📊 Guruh reytingi', 'top:c:w:score')],
      [{ text: '🤖 Botda yolg\'iz yechish', url: botLink('quiz') }, addGroupBtn()],
    ]),
  }).catch((e) => console.error('results', e.description));
}

async function sendPrivateResults(g, asked, reason) {
  const p = g.players.get(g.chatId) || { score: 0, answers: 0, ms: 0, wrong: [] };
  const wrong = p.answers - p.score;
  const pct = p.answers ? Math.round((p.score / p.answers) * 100) : 0;
  const s = userSummary(g.chatId);
  let verdict = '';
  if (g.exam) verdict = asked >= g.total && wrong <= 2 ? '\n\n🎉 <b>Imtihondan o\'tdingiz!</b> Haqiqiy imtihonga tayyorsiz.' : '\n\n😕 <b>Imtihondan o\'ta olmadingiz</b> (2 tadan ko\'p xato yoki tugatilmadi). Mashq qilishda davom eting!';
  else if (pct >= 90) verdict = '\n\n🔥 Ajoyib natija!';
  else if (pct < 60 && p.answers >= 5) verdict = '\n\n📚 Biroz ko\'proq mashq kerak — izohli savollar chorrahaa.uz da.';
  const text = `🏁 <b>Test yakunlandi${reason === 'stopped' ? ' (to\'xtatildi)' : ''}!</b>\n\n` +
    `✅ To'g'ri: <b>${p.score}</b> / ${p.answers} (${pct}%)\n❌ Xato: <b>${wrong}</b>\n⏱ Vaqt: ${fmtDur(Date.now() - g.startedAt)}` +
    (s.weekRank ? `\n📈 Haftalik reytingdagi o'rningiz: <b>#${s.weekRank}</b>` : '') + verdict + footer();
  const again = g.exam ? 'ps:again:exam:mix' : `ps:again:${g.total}:${g.topic}`;
  await send(g.chatId, text, {
    reply_markup: kb([
      [siteBtn('📱 chorrahaa.uz — to\'liq tayyorgarlik', 'private_result', true)],
      wrong ? [cb(`❌ Xatolarim (${wrong})`, `pm:${g.id}`), cb('🔁 Yana test', again)] : [cb('🔁 Yana test', again)],
      [cb('🏆 Reyting', 'top:g:w:score'), { text: '👥 Do\'stga yuborish', url: shareUrl(botLink(`ref_${g.chatId}`), 'Men Chorraha botida YHQ testini yechdim! Sen ham sinab ko\'r 🚦') }],
    ]),
  }).catch(() => {});
}

// Lichkada: xato qilingan savollar ro'yxati
export async function mistakesCallback(q, parts) {
  const gid = Number(parts[1]);
  const rows = all('SELECT qn, idx FROM answers WHERE game_id=? AND user_id=? AND correct=0 ORDER BY at', gid, q.from.id);
  await answerCb(q.id);
  if (!rows.length) return send(q.from.id, 'Xato yo\'q 👏');
  const lines = rows.slice(0, 25).map((r) => {
    const qq = byN.get(r.qn);
    return `<b>№${r.qn}.</b> ${esc(trunc(qq.question, 120))}\n❌ Siz: ${esc(trunc(qq.options[r.idx] || '-', 80))}\n✅ To'g'ri: <b>${esc(trunc(qq.options[qq.correct_index], 100))}</b>`;
  });
  return send(q.from.id, `📕 <b>Xatolaringiz</b>\n\n${lines.join('\n\n')}\n\n💡 Har bir savolning batafsil izohi va ovozli tushuntirishi — chorrahaa.uz da.`, {
    reply_markup: kb([[siteBtn('📱 Izohlarni chorrahaa.uz da ko\'rish', 'mistakes', true)]]),
  });
}

// Qayta ishga tushganda yarim qolgan o'yinlar yopiladi
export function closeStaleGames() { run("UPDATE games SET status='interrupted' WHERE status='running'"); }
export const stats = () => ({ total: QUESTIONS.length });
