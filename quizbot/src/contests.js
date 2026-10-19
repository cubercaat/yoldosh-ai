// Konkurslar: shartlar, muddat, g'oliblarni aniqlash (eng yaxshi / eng faol / random / taklif), sovg'a yuborish.
import crypto from 'node:crypto';
import { all, get, run } from './db.js';
import { CFG } from './config.js';
import { api, send, kb, siteBtn, notifyAdmins, botLink, footer } from './core.js';
import { board, boardLines, METRIC_NAME } from './stats.js';
import { createBroadcast, runBroadcast } from './broadcast.js';
import { esc, fmtDate, rankIcon, displayName, linkHtml } from './util.js';

export const SCOPE_NAME = {
  all: '🌍 Hamma joyda (guruhlar + bot lichkasi)', groups: '👥 Barcha guruhlar', private: '💬 Faqat bot lichkasida', chat: '🎯 Tanlangan guruh(lar)',
};

export const parseScope = (c) => JSON.parse(c.scope || '{"type":"all"}');

export function scopeLabel(c) {
  const s = parseScope(c);
  if (s.type !== 'chat') return SCOPE_NAME[s.type];
  const names = (s.ids || []).map((id) => get('SELECT title FROM chats WHERE id=?', id)?.title || id);
  return '🎯 ' + names.map((n) => esc(n)).join(', ');
}

export function conditionText(c) {
  const m = METRIC_NAME[c.metric] || c.metric;
  const min = c.min_answers ? `\n📌 Shart: kamida <b>${c.min_answers}</b> ta ${c.metric === 'referrals' ? 'do\'st taklif qilish' : 'savolga javob berish'}` : '';
  return `📏 G'olib aniqlanadi: <b>${m}</b>${min}`;
}

export function contestText(c, { withStandings = false } = {}) {
  let t = `🎁 <b>KONKURS: ${esc(c.title)}</b>\n\n🏆 Sovrin: <b>${esc(c.prize)}</b>\n👑 G'oliblar soni: <b>${c.winners}</b>\n${conditionText(c)}\n📍 Qayerda: ${scopeLabel(c)}\n⏰ Muddat: ${fmtDate(c.start_at)} — <b>${fmtDate(c.end_at)}</b>`;
  if (withStandings && c.metric !== 'random') {
    const rows = currentRanking(c, 10);
    t += `\n\n📊 <b>Joriy holat:</b>\n${boardLines(rows, c.metric)}`;
  } else if (withStandings) {
    t += `\n\n🎲 Hozircha shartga mos qatnashchilar: <b>${eligible(c).length}</b>`;
  }
  return t;
}

const howToJoin = (c) => {
  const s = parseScope(c);
  if (c.metric === 'referrals') return `\n\n👉 Qatnashish: botdagi «👥 Do'stlarni taklif qilish» havolangizni do'stlaringizga yuboring.`;
  if (s.type === 'private') return '\n\n👉 Qatnashish: botda «📝 Test yechish» ni bosing.';
  if (s.type === 'all') return '\n\n👉 Qatnashish: guruhda /quiz orqali yoki botda test yeching — hamma javoblar hisoblanadi.';
  return '\n\n👉 Qatnashish: guruhda /quiz yozing va savollarga javob bering.';
};

export function currentRanking(c, limit = 10) {
  return board({ scope: parseScope(c), from: c.start_at, to: Math.min(Date.now(), c.end_at) + 1, metric: c.metric, limit, minAnswers: c.min_answers || 0 });
}
function eligible(c) {
  return board({ scope: parseScope(c), from: c.start_at, to: Math.min(Date.now(), c.end_at) + 1, metric: 'active', limit: 1e6, minAnswers: Math.max(1, c.min_answers || 0) });
}

function pickRandom(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

export function computeWinners(c) {
  if (c.metric === 'random') return pickRandom(eligible(c), c.winners);
  return currentRanking(c, c.winners);
}

// E'lon: admin lichkasiga namunani yuborib, undan nusxa ko'chirish orqali tarqatiladi
async function announce(c, text, buttons, adminId) {
  const s = parseScope(c);
  const target = s.type === 'chat' ? { type: 'chats', ids: s.ids } : s.type === 'groups' ? { type: 'groups' } : s.type === 'private' ? { type: 'users' } : { type: 'all' };
  const m = await send(adminId, text, { reply_markup: buttons });
  const id = createBroadcast({ src_chat: adminId, src_msg: m.message_id, buttons: { rows: buttons.inline_keyboard }, target, created_by: adminId, note: `konkurs #${c.id}` });
  runBroadcast(id).catch((e) => console.error('contest bc', e));
}

export async function announceStart(c, adminId) {
  const text = contestText(c) + howToJoin(c) + footer();
  const buttons = kb([
    [{ text: '📝 Botda test yechish', url: botLink('quiz') }],
    [siteBtn('🚗 chorrahaa.uz da tayyorlaning', `contest_${c.id}`)],
  ]);
  return announce(c, text, buttons, adminId);
}

export async function finalize(c, { announcePublic = true } = {}) {
  if (c.status !== 'active') return;
  run("UPDATE contests SET status='finishing' WHERE id=? AND status='active'", c.id);
  const winners = computeWinners(c);
  const giftResults = [];
  for (const [i, w] of winners.entries()) {
    let gift = '';
    if (c.gift_id) {
      try { await api.sendGift({ user_id: w.id, gift_id: c.gift_id, text: `Chorraha: ${c.title} — ${i + 1}-o'rin` }); gift = '🎁 sovg\'a yuborildi'; }
      catch (e) { gift = `⚠️ sovg'a yuborilmadi: ${e.description || e.message}`; }
    }
    giftResults.push(gift);
    const u = get('SELECT started, blocked FROM users WHERE id=?', w.id);
    if (u?.started && !u.blocked) {
      await send(w.id, `🎉 <b>Tabriklaymiz!</b>\n\nSiz «${esc(c.title)}» konkursida <b>${i + 1}-o'rin</b>ni egalladingiz!\n🏆 Sovrin: <b>${esc(c.prize)}</b>\n${c.gift_id && gift.startsWith('🎁') ? 'Sovg\'a Telegram profilingizga yuborildi 🎁' : 'Admin tez orada siz bilan bog\'lanadi.'}`, {
        reply_markup: kb([[siteBtn('🚗 chorrahaa.uz', 'winner', true)]]),
      }).catch(() => {});
    }
  }
  run("UPDATE contests SET status='finished', result=? WHERE id=?", JSON.stringify(winners.map((w, i) => ({ ...w, gift: giftResults[i] }))), c.id);

  const listPublic = winners.length
    ? winners.map((w, i) => `${rankIcon(i)} ${esc(displayName(w))}${c.metric === 'random' ? '' : c.metric === 'active' ? ` — ${w.answers} ta javob` : c.metric === 'referrals' ? ` — ${w.score} ta do'st` : ` — ${w.score} ✅`}`).join('\n')
    : '😔 Shartga mos qatnashchi topilmadi.';
  const pub = `🏆 <b>KONKURS YAKUNLANDI: ${esc(c.title)}</b>\n\n🎁 Sovrin: <b>${esc(c.prize)}</b>\n${conditionText(c)}\n\n<b>G'oliblar:</b>\n${listPublic}\n\n${winners.length ? '🎉 Tabriklaymiz! Keyingi konkursda siz ham yutishingiz mumkin!' : ''}${footer()}`;
  const listAdmin = winners.map((w, i) => `${i + 1}. ${linkHtml(w)} ${w.username ? '@' + esc(w.username) : ''} · ID <code>${w.id}</code> · ${w.score}✅/${w.answers} ${giftResults[i] || ''}`).join('\n') || '—';
  await notifyAdmins(`📋 <b>Konkurs #${c.id} natijasi (admin uchun)</b>\n«${esc(c.title)}»\n\n${listAdmin}\n\nSovrinlarni topshirish uchun ismga bosib yozing.`);
  if (announcePublic) {
    const buttons = kb([[siteBtn('🚗 chorrahaa.uz — imtihonga tayyorlaning', `contest_end_${c.id}`)], [{ text: '📝 Botda test yechish', url: botLink('quiz') }]]);
    const admin = c.created_by || CFG.admins[0];
    if (admin) await announce(c, pub, buttons, admin).catch((e) => console.error('announce end', e.message));
  }
  return winners;
}

export async function contestTick() {
  for (const c of all("SELECT * FROM contests WHERE status='active' AND end_at<=?", Date.now())) {
    await finalize(c).catch((e) => console.error('finalize', e));
  }
}

// /konkurs — foydalanuvchiga faol konkurslar va o'rni
export function publicContests(userId, chatId) {
  const list = all("SELECT * FROM contests WHERE status='active' ORDER BY end_at").filter((c) => {
    const s = parseScope(c);
    if (s.type === 'chat') return chatId < 0 ? s.ids.includes(chatId) : true;
    if (s.type === 'groups') return true;
    if (s.type === 'private') return true;
    return true;
  });
  if (!list.length) return '🎁 Hozircha faol konkurs yo\'q.\n\nYangi konkurslardan xabardor bo\'lish uchun botga /start bosing va testlarda faol qatnashing!';
  return list.map((c) => {
    let mine = '';
    if (userId) {
      const rows = currentRanking(c, 1000);
      const pos = rows.findIndex((r) => r.id === userId);
      mine = pos >= 0 ? `\n📍 Sizning o'rningiz: <b>#${pos + 1}</b>` : '\n📍 Siz hali qatnashmagansiz';
    }
    return contestText(c, { withStandings: true }) + mine;
  }).join('\n\n━━━━━━━━━━\n\n');
}
