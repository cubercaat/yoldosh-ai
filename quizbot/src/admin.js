// Admin panel (faqat ADMIN_IDS dagi odamlar uchun, faqat bot lichkasida).
import fs from 'node:fs';
import path from 'node:path';
import { CFG, isAdmin } from './config.js';
import { all, get, run, getSetting, setSetting } from './db.js';
import { api, BOT, send, edit, kb, cb, answerCb, footer, sendPhotoCached, botLink } from './core.js';
import { InputFile } from './tg.js';
import { createBroadcast, runBroadcast, countTargets, TARGET_NAME, markup, broadcastHistory } from './broadcast.js';
import { contestText, finalize, announceStart, SCOPE_NAME, currentRanking } from './contests.js';
import { board, boardLines, METRIC_NAME, userSummary } from './stats.js';
import { runningCount } from './game.js';
import { esc, fmtDate, trunc, dayStart, weekStart, DAY, parseWhen, chunk, displayName, linkHtml, periodRange } from './util.js';

const state = new Map(); // adminId -> { step, d }
const S = (id) => state.get(id) || {};
const setStep = (id, step, d) => state.set(id, { step, d: d ?? S(id).d ?? {} });
const back = (to = 'ad:home') => [cb('⬅️ Orqaga', to)];
const yes = (v) => (v ? '✅' : '❌');

// ---------- Asosiy menyu ----------
function homeView() {
  const users = get('SELECT COUNT(*) c, SUM(started) s FROM users').c;
  const groups = get('SELECT COUNT(*) c, COALESCE(SUM(members),0) m FROM chats WHERE active=1');
  const today = get('SELECT COUNT(DISTINCT user_id) c FROM answers WHERE at>=?', dayStart()).c;
  const text = `🛠 <b>Admin panel</b>\n\n👤 Foydalanuvchilar: <b>${users}</b>\n👥 Guruhlar: <b>${groups.c}</b> (a'zolar: ${groups.m})\n🔥 Bugun faol: <b>${today}</b>\n🎮 Hozir ketayotgan testlar: ${runningCount()}`;
  return { text, reply_markup: kb([
    [cb('📊 Statistika', 'ad:stats'), cb('👥 Guruhlar', 'ad:groups:0')],
    [cb('👤 Foydalanuvchilar', 'ad:users'), cb('📣 Reklama / xabar yuborish', 'ad:bc')],
    [cb('🔥 Tayyor reklamalar (rasm + matn)', 'ad:presets')],
    [cb('🗂 Saqlangan reklamalar', 'ad:ads'), cb('⚙️ Avto-reklama', 'ad:auto')],
    [cb('🎁 Konkurslar', 'ad:ct'), cb('📜 Tarqatishlar tarixi', 'ad:bchist')],
    [cb('🏆 Reytinglar', 'ad:tops'), cb('🔧 Sozlamalar', 'ad:set')],
  ]) };
}

export async function adminCommand(msg) {
  if (!isAdmin(msg.from.id) || msg.chat.type !== 'private') return false;
  state.delete(msg.from.id);
  const v = homeView();
  await send(msg.chat.id, v.text, { reply_markup: v.reply_markup });
  return true;
}

// ---------- Statistika ----------
function statsView() {
  const now = Date.now(), d0 = dayStart(), w0 = weekStart();
  const u = get('SELECT COUNT(*) c, COALESCE(SUM(started),0) s, COALESCE(SUM(blocked),0) b FROM users');
  const nu = (t) => get('SELECT COUNT(*) c FROM users WHERE created_at>=?', t).c;
  const act = (t) => get('SELECT COUNT(DISTINCT user_id) c FROM answers WHERE at>=?', t).c;
  const g = get('SELECT COUNT(*) c, COALESCE(SUM(members),0) m, COALESCE(SUM(is_admin),0) a FROM chats WHERE active=1');
  const gl = get('SELECT COUNT(*) c FROM chats WHERE active=0').c;
  const games = (t, k) => get('SELECT COUNT(*) c FROM games WHERE created_at>=? AND kind=?', t, k).c;
  const ans = (t) => get('SELECT COUNT(*) c FROM answers WHERE at>=?', t).c;
  const refs = get('SELECT COUNT(*) c FROM users WHERE ref_by IS NOT NULL').c;
  const topG = all(`SELECT c.title, COUNT(*) n, COUNT(DISTINCT a.user_id) p FROM answers a JOIN chats c ON c.id=a.chat_id
    WHERE a.at>=? AND a.chat_id<0 GROUP BY a.chat_id ORDER BY n DESC LIMIT 5`, w0);
  const text = `📊 <b>Statistika</b> (${fmtDate(now)})\n\n` +
    `👤 <b>Foydalanuvchilar:</b> ${u.c}\n   • botni ishga tushirgan: ${u.s}\n   • botni bloklagan: ${u.b}\n   • faqat guruhda o'ynagan: ${u.c - u.s}\n` +
    `🆕 Yangi: bugun ${nu(d0)} · hafta ${nu(w0)}\n🔥 Faol: bugun ${act(d0)} · hafta ${act(w0)} · 30 kun ${act(now - 30 * DAY)}\n` +
    `👥 Taklif orqali kelgan: ${refs}\n\n` +
    `👥 <b>Guruhlar:</b> ${g.c} ta (jami a'zo: ${g.m})\n   • bot admin bo'lgan: ${g.a}\n   • botni chiqargan: ${gl}\n\n` +
    `🎮 <b>Testlar</b> (guruh / lichka)\n   • bugun: ${games(d0, 'group')} / ${games(d0, 'private')}\n   • hafta: ${games(w0, 'group')} / ${games(w0, 'private')}\n   • jami: ${games(0, 'group')} / ${games(0, 'private')}\n` +
    `✍️ Javoblar: bugun ${ans(d0)} · jami ${ans(0)}\n\n` +
    `🏅 <b>Haftaning eng faol guruhlari:</b>\n${topG.map((r, i) => `${i + 1}. ${esc(trunc(r.title, 30))} — ${r.n} javob, ${r.p} o'yinchi`).join('\n') || '—'}`;
  return { text, reply_markup: kb([[cb('🔄 Yangilash', 'ad:stats')], back()]) };
}

// ---------- Guruhlar ----------
const PAGE = 8;
function groupsView(page = 0, search = '') {
  const where = search ? 'active=1 AND title LIKE ?' : 'active=1';
  const args = search ? [`%${search}%`] : [];
  const total = get(`SELECT COUNT(*) c FROM chats WHERE ${where}`, ...args).c;
  const rows = all(`SELECT * FROM chats WHERE ${where} ORDER BY members DESC LIMIT ? OFFSET ?`, ...args, PAGE, page * PAGE);
  const text = `👥 <b>Guruhlar</b>${search ? ` (qidiruv: «${esc(search)}»)` : ''} — ${total} ta\n\nBatafsil ko'rish, reklamani boshqarish yoki guruhdan chiqish uchun tanlang:`;
  const nav = [];
  if (page > 0) nav.push(cb('◀️', `ad:groups:${page - 1}`));
  if ((page + 1) * PAGE < total) nav.push(cb('▶️', `ad:groups:${page + 1}`));
  return { text, reply_markup: kb([
    ...rows.map((c) => [cb(`${c.banned ? '⛔' : c.ads ? '' : '🔕 '}${trunc(c.title || c.id, 28)} · ${c.members}👤 · ${c.games}🎮`, `ad:g:${c.id}`)]),
    nav, [cb('🔎 Qidirish', 'ad:gsearch'), cb('📣 Barcha guruhlarga yozish', 'ad:bc:groups')], back(),
  ]) };
}

async function groupCard(id) {
  const c = get('SELECT * FROM chats WHERE id=?', id);
  if (!c) return { text: 'Guruh topilmadi', reply_markup: kb([back('ad:groups:0')]) };
  try {
    const n = await api.getChatMemberCount({ chat_id: id });
    const me = await api.getChatMember({ chat_id: id, user_id: BOT.id });
    run('UPDATE chats SET members=?, is_admin=? WHERE id=?', n, me.status === 'administrator' ? 1 : 0, id);
    c.members = n; c.is_admin = me.status === 'administrator' ? 1 : 0;
  } catch (e) { if (/kicked|not found|not a member/i.test(e.description || '')) { run('UPDATE chats SET active=0 WHERE id=?', id); c.active = 0; } }
  const [w0] = periodRange('w');
  const a = get('SELECT COUNT(*) n, COUNT(DISTINCT user_id) p FROM answers WHERE chat_id=? AND at>=?', id, w0);
  const top = board({ scope: { type: 'chat', ids: [id] }, from: w0, metric: 'score', limit: 3 });
  const text = `👥 <b>${esc(c.title)}</b>${c.username ? ` (@${esc(c.username)})` : ''}\n🆔 <code>${c.id}</code>\n\n` +
    `👤 A'zolar: ${c.members}\n🤖 Bot admin: ${yes(c.is_admin)}\n📌 Holat: ${c.active ? 'faol' : 'bot chiqarilgan'}${c.banned ? ' · ⛔ bloklangan' : ''}\n` +
    `📣 Reklama: ${c.ads ? '✅ yoqilgan' : '🔕 o\'chirilgan'}\n🎮 Testlar: ${c.games} · oxirgisi: ${c.last_game ? fmtDate(c.last_game) : '—'}\n` +
    `📈 Shu hafta: ${a.n} javob, ${a.p} o'yinchi\n📅 Qo'shilgan: ${c.added_at ? fmtDate(c.added_at) : '—'}\n\n🏆 Haftaning eng yaxshilari:\n${boardLines(top)}`;
  return { text, reply_markup: kb([
    [cb('✉️ Shu guruhga xabar/reklama', `ad:gmsg:${id}`)],
    [cb(c.ads ? '🔕 Reklamani o\'chirish' : '🔔 Reklamani yoqish', `ad:gads:${id}`), cb('🔄 Yangilash', `ad:g:${id}`)],
    [cb('🚪 Guruhdan chiqish', `ad:gleave:${id}`), cb(c.banned ? '✅ Blokdan chiqarish' : '⛔ Bloklash', `ad:gban:${id}`)],
    back('ad:groups:0'),
  ]) };
}

// ---------- Foydalanuvchilar ----------
function usersView() {
  const u = get('SELECT COUNT(*) c, COALESCE(SUM(started),0) s, COALESCE(SUM(blocked),0) b FROM users');
  const recent = all('SELECT * FROM users WHERE started=1 ORDER BY created_at DESC LIMIT 8');
  const text = `👤 <b>Foydalanuvchilar</b>: ${u.c}\n• botda: ${u.s} · bloklagan: ${u.b}\n\n🆕 <b>Oxirgi qo'shilganlar:</b>\n` +
    (recent.map((r) => `• ${linkHtml(r)} ${r.username ? '@' + esc(r.username) : ''} — ${fmtDate(r.created_at)}`).join('\n') || '—');
  return { text, reply_markup: kb([
    [cb('🔎 Qidirish (ID / @username / ism)', 'ad:usearch')],
    [cb('📥 Ro\'yxatni yuklab olish (CSV)', 'ad:ucsv'), cb('👥 Eng ko\'p taklif qilganlar', 'ad:refs')],
    [cb('📣 Barcha foydalanuvchilarga yozish', 'ad:bc:users')],
    back(),
  ]) };
}

function userCard(id) {
  const u = get('SELECT * FROM users WHERE id=?', id);
  if (!u) return { text: 'Topilmadi', reply_markup: kb([back('ad:users')]) };
  const s = userSummary(id);
  const ref = u.ref_by ? get('SELECT * FROM users WHERE id=?', u.ref_by) : null;
  const text = `👤 ${linkHtml(u)} ${u.username ? '@' + esc(u.username) : ''}\n🆔 <code>${u.id}</code>\n` +
    `🤖 Botda: ${yes(u.started)} · Bloklagan: ${yes(u.blocked)}\n📅 Qo'shilgan: ${fmtDate(u.created_at)} · oxirgi faollik: ${fmtDate(u.last_seen)}\n` +
    `${ref ? `👥 Taklif qilgan: ${linkHtml(ref)}\n` : ''}\n✅ Bugun: ${s.d.score}/${s.d.answers} · Hafta: ${s.w.score}/${s.w.answers} · Jami: ${s.a.score}/${s.a.answers}\n` +
    `🎮 O'yinlar: ${s.games} · 📈 Haftalik o'rin: ${s.weekRank ? '#' + s.weekRank : '—'}\n👥 Taklif qilgan do'stlari: ${s.refs}`;
  return { text, reply_markup: kb([u.started && !u.blocked ? [cb('✉️ Xabar yozish', `ad:umsg:${id}`)] : [], back('ad:users')]) };
}

// ---------- Reklama yuborish (wizard) ----------
function bcButtonsView(d) {
  const b = d.buttons;
  const list = (b.rows || []).map((r) => `• ${esc(r[0].text)} → ${esc(r[0].url)}`).join('\n');
  const text = `✅ Post qabul qilindi.\n\n🔘 <b>Tugmalar</b>\n${b.site ? '• 🚗 chorrahaa.uz (UTM bilan, bosishlar sayt statistikasida ko\'rinadi)\n' : ''}${b.addGroup ? '• ➕ Botni guruhga qo\'shish\n' : ''}${list || (b.site || b.addGroup ? '' : '— tugmasiz')}\n\nO'z tugmangizni qo'shish uchun «✏️ Tugma qo'shish» ni bosing.`;
  return { text, reply_markup: kb([
    [cb(`${yes(b.site)} chorrahaa.uz tugmasi`, 'ad:bcsite'), cb(`${yes(b.addGroup)} Guruhga qo'shish tugmasi`, 'ad:bcag')],
    [cb('✏️ Tugma qo\'shish', 'ad:bcadd'), cb('🧹 Tozalash', 'ad:bcclr')],
    [cb('👁 Ko\'rinishini tekshirish', 'ad:bcprev')],
    [cb('➡️ Davom etish', 'ad:bcnext')], [cb('❌ Bekor qilish', 'ad:home')],
  ]) };
}

function bcTargetView(by) {
  const n = (t) => countTargets({ type: t }, by);
  return { text: '🎯 <b>Kimga yuboramiz?</b>\n\n<i>«Barcha guruhlar»ga reklama o\'chirilgan (🔕) guruhlar kirmaydi.</i>', reply_markup: kb([
    [cb(`🌍 Hammaga (${n('all')})`, 'ad:bct:all')],
    [cb(`👥 Barcha guruhlar (${n('groups')})`, 'ad:bct:groups'), cb(`👤 Foydalanuvchilar (${n('users')})`, 'ad:bct:users')],
    [cb('🎯 Guruhlarni tanlash', 'ad:bct:chats'), cb('🧪 Faqat menga (sinov)', 'ad:bct:self')],
    [cb('⬅️ Tugmalarga qaytish', 'ad:bcbtn'), cb('❌ Bekor', 'ad:home')],
  ]) };
}

function pickerView(prefix, selected, page, doneCb, title) {
  const total = get('SELECT COUNT(*) c FROM chats WHERE active=1').c;
  const rows = all('SELECT id,title,members FROM chats WHERE active=1 ORDER BY members DESC LIMIT ? OFFSET ?', PAGE, page * PAGE);
  const nav = [];
  if (page > 0) nav.push(cb('◀️', `${prefix}p:${page - 1}`));
  if ((page + 1) * PAGE < total) nav.push(cb('▶️', `${prefix}p:${page + 1}`));
  return { text: `${title}\n\nTanlangan: <b>${selected.length}</b> ta`, reply_markup: kb([
    ...rows.map((c) => [cb(`${selected.includes(c.id) ? '☑️' : '⬜️'} ${trunc(c.title, 30)} · ${c.members}👤`, `${prefix}s:${c.id}:${page}`)]),
    nav, [cb(`✅ Tayyor (${selected.length})`, doneCb)], [cb('❌ Bekor', 'ad:home')],
  ]) };
}

function bcOptionsView(d, by) {
  const n = countTargets(d.target, by);
  const hasGroups = ['all', 'groups', 'chats'].includes(d.target.type);
  const tName = TARGET_NAME[d.target.type] + (d.target.type === 'chats' || d.target.type === 'user' ? ` (${d.target.ids.length})` : '');
  const text = `📣 <b>Tarqatish sozlamalari</b>\n\n🎯 Kimga: ${tName}\n👥 Qabul qiluvchilar: <b>${n}</b>\n` +
    `${hasGroups ? `📌 Guruhlarda pin qilish: ${yes(d.pin)}\n` : ''}💾 Reklamalar ro'yxatiga saqlash: ${yes(d.save)}\n⏰ Vaqti: <b>${d.when ? fmtDate(d.when) : 'hozir'}</b>\n\n<i>Muhim: asl postni lichkangizdan o'chirmang — bot undan nusxa oladi.</i>`;
  return { text, reply_markup: kb([
    hasGroups ? [cb(`📌 Pin: ${yes(d.pin)}`, 'ad:bcpin'), cb(`💾 Saqlash: ${yes(d.save)}`, 'ad:bcsave')] : [cb(`💾 Saqlash: ${yes(d.save)}`, 'ad:bcsave')],
    [cb(d.when ? '⏰ Vaqtni o\'zgartirish' : '⏰ Keyinroq yuborish (vaqt belgilash)', 'ad:bcwhen'), ...(d.when ? [cb('⚡ Hozir', 'ad:bcnow')] : [])],
    [cb(d.when ? '🕒 Rejalashtirish' : `🚀 Yuborish (${n})`, 'ad:bcgo')],
    [cb('⬅️ Qabul qiluvchilar', d.preset ? 'ad:bcbtn' : 'ad:bcnext'), cb('❌ Bekor', 'ad:home')],
  ]) };
}

// ---------- Saqlangan reklamalar ----------
// ---------- Tayyor reklamalar (data/promo) ----------
function loadPresets() {
  try { return JSON.parse(fs.readFileSync(path.join(CFG.dataDir, 'promo', 'promo.json'), 'utf8')); } catch { return []; }
}
function presetsView() {
  const list = loadPresets();
  return { text: `🔥 <b>Tayyor reklamalar</b>\n\nRasm va matni tayyor postlar. Tanlang — bot avval sizga ko'rsatadi, keyin kimga yuborishni (hamma guruhlar, foydalanuvchilar yoki tanlangan guruhlar), pin va vaqtni tanlaysiz.\n\nPost ostiga «🤖 Botni ochish», «🚗 chorrahaa.uz» va «➕ Guruhga qo'shish» tugmalari avtomatik qo'shiladi.\n\n${list.map((p, i) => `${i + 1}. ${esc(p.title)}`).join('\n') || '—'}`,
    reply_markup: kb([...list.map((p, i) => [cb(`📣 ${i + 1}. ${trunc(p.title, 34)}`, `ad:preset:${i}`)]), [cb('📣 Hammasini avto-aylanmaga qo\'shish', 'ad:presetauto')], back()]) };
}
const PRESET_BUTTONS = () => ({ site: true, addGroup: true, rows: [[{ text: '🤖 Botni ochish — test yechish', url: botLink('quiz') }]] });
async function presetToAd(i, chatId, auto = 0) {
  const p = loadPresets()[i];
  if (!p) return null;
  const caption = p.caption.replaceAll('{BOT}', BOT.username);
  const buttons = PRESET_BUTTONS();
  const m = await sendPhotoCached(chatId, p.image, { caption, parse_mode: 'HTML', reply_markup: markup(buttons, 'preset_preview') });
  const title = 'Tayyor: ' + p.title;
  const old = get('SELECT id FROM ads WHERE title=?', title);
  if (old) run('UPDATE ads SET src_chat=?, src_msg=?, buttons=?, auto=MAX(auto,?) WHERE id=?', chatId, m.message_id, JSON.stringify(buttons), auto, old.id);
  else run('INSERT INTO ads(title,src_chat,src_msg,buttons,auto,created_at) VALUES(?,?,?,?,?,?)', title, chatId, m.message_id, JSON.stringify(buttons), auto, Date.now());
  return { src: { chat: chatId, msg: m.message_id }, buttons, title: p.title };
}

function adsView() {
  const ads = all('SELECT * FROM ads ORDER BY id DESC LIMIT 20');
  return { text: `🗂 <b>Saqlangan reklamalar</b> (${ads.length})\n\n🔁 = avto-reklama aylanmasida (har N testdan keyin va kunlik avto-yuborishda navbat bilan ishlatiladi)\n\nYangi reklama qo'shish: «📣 Reklama yuborish» → «💾 Saqlash» ni yoqing.`,
    reply_markup: kb([...ads.map((a) => [cb(`${a.auto ? '🔁 ' : ''}#${a.id} ${trunc(a.title, 30)} · ${a.uses}×`, `ad:ad:${a.id}`)]), back()]) };
}
function adCard(id) {
  const a = get('SELECT * FROM ads WHERE id=?', id);
  if (!a) return adsView();
  return { text: `🗂 <b>Reklama #${a.id}</b>\n${esc(a.title)}\n\n🔁 Avto: ${yes(a.auto)}\n📊 Avtomatik ishlatilgan: ${a.uses} marta\n📅 ${fmtDate(a.created_at)}`, reply_markup: kb([
    [cb('👁 Ko\'rish', `ad:adview:${id}`), cb('📣 Yuborish', `ad:adsend:${id}`)],
    [cb(a.auto ? '⏸ Avto-aylanmadan chiqarish' : '🔁 Avto-aylanmaga qo\'shish', `ad:adauto:${id}`)],
    [cb('🗑 O\'chirish', `ad:addel:${id}`)], back('ad:ads'),
  ]) };
}

// ---------- Avto-reklama ----------
function autoView() {
  const every = Number(getSetting('auto_every'));
  const autoAds = get('SELECT COUNT(*) c FROM ads WHERE auto=1').c;
  const tgt = { groups: '👥 guruhlarga', users: '👤 foydalanuvchilarga', all: '🌍 hammaga' }[getSetting('daily_target')];
  const text = `⚙️ <b>Avto-reklama</b>\n\n` +
    `1️⃣ <b>Test natijasi ostidagi reklama matni:</b> ${yes(Number(getSetting('footer_on')))}\n<i>Har bir test natijasi, reyting va konkurs e'lonlari ostida chiqadi (bir nechta variant bo'lsa — navbat bilan).</i>\n\n` +
    `2️⃣ <b>Har ${every || '—'} ta testdan keyin</b> guruhga reklama posti: ${every ? '✅' : '❌ o\'chiq'}\n<i>Avto-aylanmadagi reklamalar: ${autoAds} ta${autoAds ? '' : ' (yo\'q bo\'lsa standart chorrahaa.uz reklamasi chiqadi)'}</i>\n\n` +
    `3️⃣ <b>Kunlik avto-yuborish:</b> ${yes(Number(getSetting('daily_on')))} · har kuni ${getSetting('daily_time')} da ${tgt}\n\n` +
    `4️⃣ <b>Kunlik/haftalik g'oliblar e'loni</b> guruhlarda: ${yes(Number(getSetting('summary_on')))} · ${getSetting('summary_time')} da (yakshanba — haftalik)\n\n` +
    `5️⃣ Savol izohida «chorrahaa.uz» yozuvi: ${yes(Number(getSetting('promo_in_expl')))}`;
  return { text, reply_markup: kb([
    [cb(`1️⃣ ${yes(Number(getSetting('footer_on')))} Yoqish/o'chirish`, 'ad:af'), cb('✏️ Matnni o\'zgartirish', 'ad:aft')],
    [cb('2️⃣ −', 'ad:ae:-'), cb(`har ${every} testda`, 'ad:noop'), cb('+', 'ad:ae:+')],
    [cb(`3️⃣ ${yes(Number(getSetting('daily_on')))} Kunlik`, 'ad:ado'), cb('🕘 Vaqt', 'ad:adt'), cb('🎯 Kimga', 'ad:adtg')],
    [cb(`4️⃣ ${yes(Number(getSetting('summary_on')))} G'oliblar e'loni`, 'ad:as'), cb('🕘 Vaqt', 'ad:ast')],
    [cb(`5️⃣ ${yes(Number(getSetting('promo_in_expl')))} Izohda sayt`, 'ad:ape')],
    [cb('👁 Natija ostidagi matn namunasi', 'ad:afprev')],
    back(),
  ]) };
}

// ---------- Konkurslar ----------
function contestsView() {
  const act = all("SELECT * FROM contests WHERE status='active' ORDER BY end_at");
  const fin = all("SELECT * FROM contests WHERE status IN ('finished','cancelled') ORDER BY id DESC LIMIT 5");
  return { text: `🎁 <b>Konkurslar</b>\n\nSiz istalgan shartli konkurs tuzishingiz mumkin: qaysi guruh(lar) uchun, qaysi mezon bo'yicha (eng ko'p to'g'ri javob, eng faol, random, eng aniq, eng ko'p do'st taklif qilgan), qancha g'olib, qancha muddat, minimal shart va sovrin (jumladan Telegram sovg'a — avtomatik).\n\n⚡ Faol: ${act.length} · ✅ Yakunlangan: ${fin.length}`,
    reply_markup: kb([
      [cb('➕ Yangi konkurs', 'ad:cnew')],
      ...act.map((c) => [cb(`⚡ #${c.id} ${trunc(c.title, 26)} · ${fmtDate(c.end_at)}`, `ad:c:${c.id}`)]),
      ...fin.map((c) => [cb(`${c.status === 'finished' ? '✅' : '🚫'} #${c.id} ${trunc(c.title, 30)}`, `ad:c:${c.id}`)]),
      back(),
    ]) };
}
function contestCard(id) {
  const c = get('SELECT * FROM contests WHERE id=?', id);
  if (!c) return contestsView();
  let text = contestText(c, { withStandings: c.status === 'active' });
  if (c.gift_id) text += `\n🎁 Telegram sovg'a: avtomatik (ID ${c.gift_id})`;
  if (c.status !== 'active') {
    const res = JSON.parse(c.result || '[]');
    text += `\n\n<b>Holat:</b> ${c.status === 'finished' ? 'yakunlangan' : 'bekor qilingan'}\n${res.map((w, i) => `${i + 1}. ${linkHtml(w)} ${w.username ? '@' + esc(w.username) : ''} <code>${w.id}</code> ${w.gift || ''}`).join('\n')}`;
  }
  return { text, reply_markup: kb([
    c.status === 'active' ? [cb('🏁 Hozir yakunlash', `ad:cend:${id}`), cb('🚫 Bekor qilish', `ad:ccan:${id}`)] : [],
    c.status === 'active' ? [cb('📣 Qayta e\'lon qilish', `ad:cann:${id}`), cb('🔄 Yangilash', `ad:c:${id}`)] : [],
    back('ad:ct'),
  ]) };
}

function cwView(d) {
  const step = d.cstep;
  const head = `🎁 <b>Yangi konkurs</b>\n${d.title ? `📝 ${esc(d.title)}\n` : ''}${d.prize ? `🏆 ${esc(d.prize)}\n` : ''}${d.scope ? `📍 ${SCOPE_NAME[d.scope.type]}${d.scope.type === 'chat' ? ` (${d.scope.ids.length})` : ''}\n` : ''}${d.metric ? `📏 ${METRIC_NAME[d.metric]}\n` : ''}${d.winners ? `👑 ${d.winners} ta g'olib\n` : ''}${d.period ? `⏰ ${d.periodText}\n` : ''}${d.min !== undefined ? `📌 Min: ${d.min}\n` : ''}\n`;
  const cancel = [cb('❌ Bekor qilish', 'ad:ct')];
  if (step === 'scope') return { text: head + '📍 <b>Konkurs qayerda o\'tadi?</b>', reply_markup: kb([
    [cb(SCOPE_NAME.all, 'ad:cs:all')], [cb(SCOPE_NAME.groups, 'ad:cs:groups')], [cb(SCOPE_NAME.private, 'ad:cs:private')], [cb(SCOPE_NAME.chat, 'ad:cs:chat')], cancel] ) };
  if (step === 'metric') return { text: head + '📏 <b>G\'olib qanday aniqlanadi?</b>', reply_markup: kb([
    [cb('🎯 Eng ko\'p to\'g\'ri javob', 'ad:cm:score')], [cb('🔥 Eng faol (eng ko\'p javob bergan)', 'ad:cm:active')],
    [cb('🎲 Random (shartga mos hamma orasidan)', 'ad:cm:random')], [cb('💯 Eng aniq (to\'g\'ri javob %)', 'ad:cm:accuracy')],
    [cb('👥 Eng ko\'p do\'st taklif qilgan', 'ad:cm:referrals')], cancel] ) };
  if (step === 'winners') return { text: head + '👑 <b>Nechta g\'olib?</b> (yoki raqam yozing)', reply_markup: kb([[1, 2, 3, 5, 10].map((n) => cb(String(n), `ad:cw:${n}`)), cancel]) };
  if (step === 'period') return { text: head + '⏰ <b>Muddat?</b> (yoki necha kun ekanini raqam bilan yozing, yoki tugash vaqtini «25.10 21:00» shaklida)', reply_markup: kb([
    [cb('Bugun kechgacha (23:59)', 'ad:cp:today'), cb('3 kun', 'ad:cp:3')],
    [cb('7 kun', 'ad:cp:7'), cb('14 kun', 'ad:cp:14'), cb('30 kun', 'ad:cp:30')],
    [cb('⚡ Hozir yakunlash (o\'tgan 7 kun natijasi bo\'yicha)', 'ad:cp:now7')],
    [cb('⚡ Hozir yakunlash (o\'tgan 24 soat bo\'yicha)', 'ad:cp:now1')], cancel] ) };
  if (step === 'min') return { text: head + `📌 <b>Qatnashish sharti:</b> kamida nechta ${d.metric === 'referrals' ? 'do\'st taklif qilish' : 'javob'} kerak? (yoki raqam yozing)`, reply_markup: kb([[0, 5, 10, 30, 50, 100].map((n) => cb(String(n), `ad:cmin:${n}`)), cancel]) };
  if (step === 'gift') return { text: head + '🎁 <b>Sovrin qanday topshiriladi?</b>\n\n• Qo\'lda — g\'oliblar ro\'yxati sizga yuboriladi, o\'zingiz topshirasiz (Telegram Premium, gift, pul, sovg\'a...)\n• Avtomatik Telegram sovg\'a (gift) — bot g\'oliblarga o\'zi yuboradi (botning Stars balansidan to\'lanadi).', reply_markup: kb([
    [cb('✋ Qo\'lda topshiraman', 'ad:cg:none')], [cb('🎁 Avtomatik Telegram sovg\'a tanlash', 'ad:cglist')], cancel] ) };
  if (step === 'confirm') return { text: head + (d.gift ? `🎁 Avto-sovg'a: ${esc(d.giftText)}\n` : '') + '\n✅ <b>Hammasi to\'g\'rimi?</b>', reply_markup: kb([
    [cb(d.instant ? '🏁 Hozir yakunlash va e\'lon qilish' : '🚀 Boshlash va e\'lon qilish', 'ad:cgo:1')],
    [cb(d.instant ? '🏁 Yakunlash (e\'lonsiz, faqat menga)' : '🚀 Boshlash (e\'lonsiz)', 'ad:cgo:0')], cancel] ) };
  return contestsView();
}

function settingsView() {
  const sec = Number(getSetting('default_seconds'));
  return { text: `🔧 <b>Sozlamalar</b>\n\n⏱ «/quiz 20» kabi tez boshlashda har bir savol vaqti: <b>${sec} soniya</b>\n🌐 Sayt: ${esc(CFG.site)}\n👮 Adminlar: ${CFG.admins.map((a) => `<code>${a}</code>`).join(', ')}\n\n<i>Admin qo'shish uchun .env faylidagi ADMIN_IDS ga ID yozing va botni qayta ishga tushiring.</i>`,
    reply_markup: kb([[10, 15, 20, 30, 45].map((s) => cb(`${s === sec ? '• ' : ''}${s}s`, `ad:sds:${s}`)), back()]) };
}

function topsView() {
  const [w0] = periodRange('w'), [d0] = periodRange('d');
  const t = `🏆 <b>Reytinglar</b>\n\n📅 <b>Bugun — eng yaxshilar:</b>\n${boardLines(board({ from: d0, limit: 5 }))}\n\n📆 <b>Hafta — eng yaxshilar:</b>\n${boardLines(board({ from: w0, limit: 10 }))}\n\n🔥 <b>Hafta — eng faollar:</b>\n${boardLines(board({ from: w0, metric: 'active', limit: 5 }), 'active')}\n\n👥 <b>Hafta — eng ko'p taklif qilganlar:</b>\n${boardLines(board({ from: w0, metric: 'referrals', limit: 5 }), 'referrals')}`;
  return { text: t, reply_markup: kb([[cb('🎁 Shulardan konkurs tuzish', 'ad:cnew')], back()]) };
}

// ---------- Callbacklar ----------
export async function adminCallback(q, parts) {
  const uid = q.from.id;
  if (!isAdmin(uid)) return answerCb(q.id, 'Ruxsat yo\'q', true);
  const chatId = q.message.chat.id, mid = q.message.message_id;
  const show = async (v) => { await answerCb(q.id); return edit(chatId, mid, v.text, { reply_markup: v.reply_markup }); };
  const fresh = async (v) => { await answerCb(q.id); return send(chatId, v.text, { reply_markup: v.reply_markup }); };
  const [, a, b, c] = parts;
  const d = S(uid).d || {};

  switch (a) {
    case 'noop': return answerCb(q.id);
    case 'home': state.delete(uid); return show(homeView());
    case 'stats': return show(statsView());
    case 'tops': return show(topsView());
    case 'groups': state.delete(uid); return show(groupsView(Number(b) || 0));
    case 'gsearch': setStep(uid, 'gsearch', {}); await answerCb(q.id); return send(chatId, '🔎 Guruh nomidan bir qismini yozing:');
    case 'g': return show(await groupCard(Number(b)));
    case 'gads': run('UPDATE chats SET ads=1-ads WHERE id=?', Number(b)); return show(await groupCard(Number(b)));
    case 'gleave': await answerCb(q.id); return edit(chatId, mid, '🚪 Rostdan ham bot shu guruhdan chiqsinmi?', { reply_markup: kb([[cb('✅ Ha, chiqish', `ad:gleave2:${b}`), cb('❌ Yo\'q', `ad:g:${b}`)]]) });
    case 'gleave2': {
      await api.leaveChat({ chat_id: Number(b) }).catch(() => {});
      run('UPDATE chats SET active=0 WHERE id=?', Number(b));
      await answerCb(q.id, 'Bot guruhdan chiqdi');
      return edit(chatId, mid, groupsView(0).text, { reply_markup: groupsView(0).reply_markup });
    }
    case 'gban': {
      const cur = get('SELECT banned FROM chats WHERE id=?', Number(b));
      run('UPDATE chats SET banned=? WHERE id=?', cur?.banned ? 0 : 1, Number(b));
      if (!cur?.banned) { await api.leaveChat({ chat_id: Number(b) }).catch(() => {}); run('UPDATE chats SET active=0 WHERE id=?', Number(b)); }
      await answerCb(q.id, cur?.banned ? 'Blokdan chiqarildi' : 'Bloklandi: bot chiqdi va qayta qo\'shilsa ham chiqib ketadi', true);
      return show(await groupCard(Number(b)));
    }
    case 'gmsg': setStep(uid, 'bc_msg', { target: { type: 'chats', ids: [Number(b)] }, preset: true }); await answerCb(q.id); return send(chatId, '✉️ Shu guruhga yuboriladigan xabarni (matn, rasm, video, istalgan formatda) yuboring.\nBekor qilish: /cancel');

    case 'users': state.delete(uid); return show(usersView());
    case 'usearch': setStep(uid, 'usearch', {}); await answerCb(q.id); return send(chatId, '🔎 ID, @username yoki ism yozing:');
    case 'u': return show(userCard(Number(b)));
    case 'umsg': setStep(uid, 'bc_msg', { target: { type: 'user', ids: [Number(b)] }, preset: true }); await answerCb(q.id); return send(chatId, '✉️ Foydalanuvchiga yuboriladigan xabarni yuboring.\nBekor qilish: /cancel');
    case 'ucsv': {
      await answerCb(q.id, 'Tayyorlanmoqda...');
      const rows = all('SELECT u.*, (SELECT COUNT(*) FROM answers a WHERE a.user_id=u.id) answers, (SELECT COALESCE(SUM(correct),0) FROM answers a WHERE a.user_id=u.id) score FROM users u ORDER BY created_at');
      const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = ['id,username,first_name,last_name,started,blocked,ref_by,created_at,last_seen,answers,correct'];
      for (const r of rows) lines.push([r.id, r.username, r.first_name, r.last_name, r.started, r.blocked, r.ref_by, fmtDate(r.created_at), fmtDate(r.last_seen), r.answers, r.score].map(csvCell).join(','));
      const f = path.join(CFG.dataDir, 'tmp', `users_${Date.now()}.csv`);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, '﻿' + lines.join('\n'));
      await api.sendDocument({ chat_id: chatId, document: new InputFile(f, 'foydalanuvchilar.csv'), caption: `👤 ${rows.length} ta foydalanuvchi` });
      fs.unlinkSync(f);
      return;
    }
    case 'refs': {
      const rows = board({ metric: 'referrals', limit: 20 });
      return show({ text: `👥 <b>Eng ko'p do'st taklif qilganlar (umumiy)</b>\n\n${boardLines(rows, 'referrals')}`, reply_markup: kb([back('ad:users')]) });
    }

    // --- tarqatish ---
    case 'bc': {
      const target = b ? { type: b } : null;
      setStep(uid, 'bc_msg', target ? { target, preset: true } : {});
      await answerCb(q.id);
      return send(chatId, '📣 <b>Reklama / xabar yuborish</b>\n\n1) Postni yuboring yoki forward qiling — matn, rasm, video, GIF, ovozli xabar, albom bo\'lmagan har qanday format.\n2) Keyin tugmalar, kimga yuborish, pin va vaqtni tanlaysiz.\n\nBekor qilish: /cancel');
    }
    case 'bcsite': d.buttons.site = !d.buttons.site; return show(bcButtonsView(d));
    case 'bcag': d.buttons.addGroup = !d.buttons.addGroup; return show(bcButtonsView(d));
    case 'bcclr': d.buttons = { site: false, rows: [] }; return show(bcButtonsView(d));
    case 'bcadd': setStep(uid, 'bc_btn'); await answerCb(q.id); return send(chatId, '✏️ Tugmani shunday yozing:\n<code>Tugma matni | https://havola</code>\n\nBir nechta tugma — har biri yangi qatorda.');
    case 'bcbtn': setStep(uid, 'bc_wait'); return show(bcButtonsView(d));
    case 'bcprev': {
      await answerCb(q.id);
      await api.copyMessage({ chat_id: chatId, from_chat_id: d.src.chat, message_id: d.src.msg, reply_markup: markup(d.buttons, 'preview') }).catch((e) => send(chatId, '⚠️ ' + esc(e.description)));
      return send(chatId, '⬆️ Shunday ko\'rinadi.', { reply_markup: bcButtonsView(d).reply_markup });
    }
    case 'bcnext': if (d.preset) return show(bcOptionsView(d, uid)); return show(bcTargetView(uid));
    case 'bct':
      if (b === 'chats') { d.target = { type: 'chats', ids: [] }; return show(pickerView('ad:bcp', d.target.ids, 0, 'ad:bcpdone', '🎯 Guruhlarni tanlang')); }
      d.target = { type: b }; return show(bcOptionsView(d, uid));
    case 'bcps': {
      const id = Number(b), ids = d.target.ids;
      const k = ids.indexOf(id); k >= 0 ? ids.splice(k, 1) : ids.push(id);
      return show(pickerView('ad:bcp', ids, Number(c) || 0, 'ad:bcpdone', '🎯 Guruhlarni tanlang'));
    }
    case 'bcpp': return show(pickerView('ad:bcp', d.target.ids, Number(b) || 0, 'ad:bcpdone', '🎯 Guruhlarni tanlang'));
    case 'bcpdone': if (!d.target.ids.length) return answerCb(q.id, 'Kamida bitta guruh tanlang', true); return show(bcOptionsView(d, uid));
    case 'bcpin': d.pin = !d.pin; return show(bcOptionsView(d, uid));
    case 'bcsave': d.save = !d.save; return show(bcOptionsView(d, uid));
    case 'bcnow': d.when = null; return show(bcOptionsView(d, uid));
    case 'bcwhen': setStep(uid, 'bc_when'); await answerCb(q.id); return send(chatId, '⏰ Yuborish vaqtini yozing (Toshkent vaqti):\n<code>18:30</code> — bugun/ertaga\n<code>25.10 09:00</code> — aniq sana');
    case 'bcgo': {
      if (!d.src || !d.target) return answerCb(q.id, 'Xatolik: qaytadan boshlang', true);
      const id = createBroadcast({ src_chat: d.src.chat, src_msg: d.src.msg, buttons: d.buttons, target: d.target, pin: d.pin, created_by: uid, scheduled_at: d.when || null, note: d.title ? trunc(d.title, 30) : '' });
      if (d.save) run('INSERT INTO ads(title,src_chat,src_msg,buttons,auto,created_at) VALUES(?,?,?,?,0,?)', d.title || 'Reklama', d.src.chat, d.src.msg, JSON.stringify(d.buttons), Date.now());
      state.delete(uid);
      await answerCb(q.id, d.when ? 'Rejalashtirildi' : 'Yuborilmoqda...');
      if (d.when) return edit(chatId, mid, `🕒 Tarqatish #${id} rejalashtirildi: <b>${fmtDate(d.when)}</b>${d.save ? '\n💾 Reklama saqlandi' : ''}`, { reply_markup: kb([[cb('🚫 Bekor qilish', `ad:bccan:${id}`)], back()]) });
      await edit(chatId, mid, `🚀 Tarqatish #${id} boshlandi${d.save ? ' · 💾 saqlandi' : ''}.`, { reply_markup: kb([back()]) });
      runBroadcast(id, chatId).catch((e) => console.error('bc', e));
      return;
    }
    case 'bchist': {
      const sch = all("SELECT id, scheduled_at FROM broadcasts WHERE status='scheduled' ORDER BY scheduled_at");
      return show({ text: `📜 <b>Oxirgi tarqatishlar</b>\n\n${broadcastHistory(15)}`, reply_markup: kb([...sch.map((s) => [cb(`🚫 #${s.id} (${fmtDate(s.scheduled_at)}) ni bekor qilish`, `ad:bccan:${s.id}`)]), back()]) });
    }
    case 'bccan': run("UPDATE broadcasts SET status='cancelled' WHERE id=? AND status='scheduled'", Number(b)); await answerCb(q.id, 'Bekor qilindi'); return edit(chatId, mid, `🚫 #${b} bekor qilindi.`, { reply_markup: kb([back()]) });

    // --- saqlangan reklamalar ---
    case 'ads': return show(adsView());
    case 'presets': state.delete(uid); return show(presetsView());
    case 'preset': {
      await answerCb(q.id, 'Tayyorlanmoqda...');
      const r = await presetToAd(Number(b), chatId);
      if (!r) return send(chatId, '⚠️ Reklama topilmadi.');
      setStep(uid, 'bc_wait', r);
      await send(chatId, '⬆️ Reklama shunday ko\'rinadi. Endi kimga yuboramiz?');
      const v = bcTargetView(uid);
      return send(chatId, v.text, { reply_markup: v.reply_markup });
    }
    case 'presetauto': {
      await answerCb(q.id, 'Qo\'shilmoqda...');
      const n = loadPresets().length;
      for (let i = 0; i < n; i++) await presetToAd(i, chatId, 1);
      run("UPDATE ads SET auto=1 WHERE title LIKE 'Tayyor: %'");
      return send(chatId, `✅ ${n} ta tayyor reklama avto-aylanmaga qo'shildi.\nEndi ular har N ta testdan keyin guruhlarda va kunlik avto-yuborishda navbat bilan chiqadi.\n\n⚠️ Yuqoridagi reklama xabarlarini o'chirmang — bot ulardan nusxa oladi.`, { reply_markup: kb([[cb('⚙️ Avto-reklama sozlamalari', 'ad:auto')], back()]) });
    }
    case 'ad': return show(adCard(Number(b)));
    case 'adview': {
      const ad = get('SELECT * FROM ads WHERE id=?', Number(b));
      await answerCb(q.id);
      return api.copyMessage({ chat_id: chatId, from_chat_id: ad.src_chat, message_id: ad.src_msg, reply_markup: markup(ad.buttons, 'preview') }).catch((e) => send(chatId, '⚠️ Asl xabar topilmadi (o\'chirilgan bo\'lishi mumkin): ' + esc(e.description)));
    }
    case 'adsend': {
      const ad = get('SELECT * FROM ads WHERE id=?', Number(b));
      setStep(uid, 'bc_wait', { src: { chat: ad.src_chat, msg: ad.src_msg }, buttons: JSON.parse(ad.buttons || '{}'), title: ad.title });
      return show(bcTargetView(uid));
    }
    case 'adauto': run('UPDATE ads SET auto=1-auto WHERE id=?', Number(b)); return show(adCard(Number(b)));
    case 'addel': run('DELETE FROM ads WHERE id=?', Number(b)); await answerCb(q.id, 'O\'chirildi'); return edit(chatId, mid, adsView().text, { reply_markup: adsView().reply_markup });

    // --- avto-reklama ---
    case 'auto': state.delete(uid); return show(autoView());
    case 'af': setSetting('footer_on', Number(getSetting('footer_on')) ? 0 : 1); return show(autoView());
    case 'afprev': { await answerCb(q.id); return send(chatId, '🏁 <b>Namuna:</b> test natijasi...' + (footer() || '\n\n(o\'chirilgan)')); }
    case 'aft': {
      setStep(uid, 'footer', {}); await answerCb(q.id);
      await send(chatId, '✏️ Hozirgi matn(lar):');
      await send(chatId, esc(String(getSetting('footer_text'))));
      return send(chatId, 'Yangi matnni yuboring. Bir nechta variant bo\'lsa — orasiga alohida qatorda <code>---</code> qo\'ying (navbat bilan chiqadi). HTML: &lt;b&gt;qalin&lt;/b&gt;, &lt;i&gt;kursiv&lt;/i&gt;.\nBekor: /cancel');
    }
    case 'ae': { const v = Math.max(0, Math.min(50, Number(getSetting('auto_every')) + (b === '+' ? 1 : -1))); setSetting('auto_every', v); return show(autoView()); }
    case 'ado': setSetting('daily_on', Number(getSetting('daily_on')) ? 0 : 1); return show(autoView());
    case 'adt': setStep(uid, 'daily_time', {}); await answerCb(q.id); return send(chatId, '🕘 Kunlik avto-reklama vaqtini yozing (masalan <code>12:00</code>):');
    case 'adtg': { const order = ['groups', 'users', 'all']; const cur = order.indexOf(getSetting('daily_target')); setSetting('daily_target', order[(cur + 1) % 3]); return show(autoView()); }
    case 'as': setSetting('summary_on', Number(getSetting('summary_on')) ? 0 : 1); return show(autoView());
    case 'ast': setStep(uid, 'summary_time', {}); await answerCb(q.id); return send(chatId, '🕘 G\'oliblar e\'loni vaqtini yozing (masalan <code>21:00</code>):');
    case 'ape': setSetting('promo_in_expl', Number(getSetting('promo_in_expl')) ? 0 : 1); return show(autoView());

    // --- sozlamalar ---
    case 'set': return show(settingsView());
    case 'sds': setSetting('default_seconds', Number(b)); return show(settingsView());

    // --- konkurslar ---
    case 'ct': state.delete(uid); return show(contestsView());
    case 'c': return show(contestCard(Number(b)));
    case 'cend': {
      const ct = get('SELECT * FROM contests WHERE id=?', Number(b));
      await answerCb(q.id, 'Yakunlanmoqda...');
      if (ct) await finalize(ct);
      return edit(chatId, mid, contestCard(Number(b)).text, { reply_markup: contestCard(Number(b)).reply_markup });
    }
    case 'ccan': run("UPDATE contests SET status='cancelled' WHERE id=? AND status='active'", Number(b)); return show(contestCard(Number(b)));
    case 'cann': { const ct = get('SELECT * FROM contests WHERE id=?', Number(b)); await answerCb(q.id, 'E\'lon yuborilmoqda'); return announceStart(ct, uid); }
    case 'cnew': setStep(uid, 'c_title', { cstep: 'title' }); await answerCb(q.id); return send(chatId, '🎁 <b>Yangi konkurs</b>\n\n📝 Konkurs nomini yozing (masalan: «Haftaning eng zo\'r haydovchisi»):\nBekor: /cancel');
    case 'cs':
      if (b === 'chat') { d.scope = { type: 'chat', ids: [] }; return show(pickerView('ad:cp', d.scope.ids, 0, 'ad:cpdone', '🎯 Konkurs qaysi guruh(lar) uchun?')); }
      d.scope = { type: b }; d.cstep = 'metric'; return show(cwView(d));
    case 'cps': {
      const id = Number(b), ids = d.scope.ids; const k = ids.indexOf(id); k >= 0 ? ids.splice(k, 1) : ids.push(id);
      return show(pickerView('ad:cp', ids, Number(c) || 0, 'ad:cpdone', '🎯 Konkurs qaysi guruh(lar) uchun?'));
    }
    case 'cpp': return show(pickerView('ad:cp', d.scope.ids, Number(b) || 0, 'ad:cpdone', '🎯 Konkurs qaysi guruh(lar) uchun?'));
    case 'cpdone': if (!d.scope.ids.length) return answerCb(q.id, 'Kamida bitta guruh tanlang', true); d.cstep = 'metric'; return show(cwView(d));
    case 'cm': d.metric = b; d.cstep = 'winners'; setStep(uid, 'c_num', d); return show(cwView(d));
    case 'cw': d.winners = Number(b); d.cstep = 'period'; return show(cwView(d));
    case 'cp': {
      const now = Date.now();
      if (b === 'today') { d.start = now; d.end = dayStart() + DAY - 60000; d.instant = false; }
      else if (b === 'now7' || b === 'now1') { d.start = now - (b === 'now7' ? 7 : 1) * DAY; d.end = now; d.instant = true; }
      else { d.start = now; d.end = now + Number(b) * DAY; d.instant = false; }
      d.period = true; d.periodText = `${fmtDate(d.start)} — ${fmtDate(d.end)}`;
      d.cstep = 'min'; return show(cwView(d));
    }
    case 'cmin': d.min = Number(b); d.cstep = 'gift'; return show(cwView(d));
    case 'cg': d.gift = null; d.cstep = 'confirm'; return show(cwView(d));
    case 'cglist': {
      await answerCb(q.id);
      try {
        const gifts = (await api.getAvailableGifts()).gifts || [];
        d.gifts = Object.fromEntries(gifts.map((g) => [g.id, `${g.sticker?.emoji || '🎁'} ${g.star_count}⭐`]));
        const rows = chunk(gifts.slice(0, 24).map((g) => cb(`${g.sticker?.emoji || '🎁'} ${g.star_count}⭐${g.remaining_count !== undefined ? ` (${g.remaining_count} qoldi)` : ''}`, `ad:cgs:${g.id}`)), 3);
        return edit(chatId, mid, '🎁 <b>Sovg\'ani tanlang</b> (narxi — botning Stars balansidan, har bir g\'olib uchun):', { reply_markup: kb([...rows, [cb('✋ Qo\'lda topshiraman', 'ad:cg:none')]]) });
      } catch (e) { return send(chatId, '⚠️ Sovg\'alar ro\'yxatini olib bo\'lmadi: ' + esc(e.description || e.message)); }
    }
    case 'cgs': d.gift = b; d.giftText = d.gifts?.[b] || b; d.cstep = 'confirm'; return show(cwView(d));
    case 'cgo': {
      if (!d.title || !d.metric || !d.scope || !d.end) return answerCb(q.id, 'Ma\'lumot to\'liq emas — qaytadan boshlang', true);
      const id = Number(run(`INSERT INTO contests(title,prize,scope,metric,winners,min_answers,start_at,end_at,gift_id,status,created_by,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, d.title, d.prize, JSON.stringify(d.scope), d.metric, d.winners || 1, d.min || 0, d.start, d.end, d.gift || null, 'active', uid, Date.now()).lastInsertRowid);
      state.delete(uid);
      const ct = get('SELECT * FROM contests WHERE id=?', id);
      await answerCb(q.id, 'Tayyor!');
      if (d.instant) {
        const w = await finalize(ct, { announcePublic: b === '1' });
        return edit(chatId, mid, `🏁 Konkurs #${id} yakunlandi. G'oliblar: ${w.length} ta.`, { reply_markup: kb([[cb('📋 Natijani ko\'rish', `ad:c:${id}`)], back('ad:ct')]) });
      }
      if (b === '1') await announceStart(ct, uid);
      return edit(chatId, mid, `✅ Konkurs #${id} boshlandi! Tugash: <b>${fmtDate(ct.end_at)}</b>\nMuddat tugaganda bot o'zi g'oliblarni aniqlab, e'lon qiladi va sizga ro'yxat yuboradi.`, { reply_markup: kb([[cb('📋 Konkursni ko\'rish', `ad:c:${id}`)], back('ad:ct')]) });
    }
  }
  return answerCb(q.id);
}

// ---------- Matnli kiritishlar ----------
export async function adminText(msg) {
  const uid = msg.from?.id;
  if (!isAdmin(uid) || msg.chat.type !== 'private') return false;
  const s = state.get(uid);
  if (!s) return false;
  const text = (msg.text || '').trim();
  if (text === '/cancel') { state.delete(uid); const v = homeView(); await send(msg.chat.id, '❌ Bekor qilindi.\n\n' + v.text, { reply_markup: v.reply_markup }); return true; }
  if (text.startsWith('/')) { state.delete(uid); return false; }
  const d = s.d;
  const reply = (v) => send(msg.chat.id, v.text, { reply_markup: v.reply_markup });

  switch (s.step) {
    case 'bc_msg': {
      if (msg.media_group_id) { await send(msg.chat.id, '⚠️ Albom (bir nechta rasm birga) qo\'llab-quvvatlanmaydi — bitta post yuboring.'); return true; }
      d.src = { chat: msg.chat.id, msg: msg.message_id };
      d.title = trunc((msg.text || msg.caption || '').split('\n')[0] || (msg.photo ? 'Rasm' : msg.video ? 'Video' : 'Media'), 40);
      d.buttons = d.buttons || { site: true, rows: [] };
      setStep(uid, 'bc_wait', d);
      await reply(bcButtonsView(d));
      return true;
    }
    case 'bc_btn': {
      const added = [];
      for (const line of text.split('\n')) {
        const m = line.match(/^(.+?)\s*\|\s*(https?:\/\/\S+|tg:\/\/\S+|t\.me\/\S+)\s*$/i);
        if (m) added.push([{ text: m[1].trim(), url: m[2].startsWith('t.me') ? 'https://' + m[2] : m[2] }]);
      }
      if (!added.length) { await send(msg.chat.id, '⚠️ Format: <code>Matn | https://havola</code>'); return true; }
      d.buttons.rows.push(...added);
      setStep(uid, 'bc_wait', d);
      await reply(bcButtonsView(d));
      return true;
    }
    case 'bc_when': {
      const ts = parseWhen(text);
      if (!ts || ts < Date.now()) { await send(msg.chat.id, '⚠️ Noto\'g\'ri vaqt. Masalan: <code>18:30</code> yoki <code>25.10 09:00</code>'); return true; }
      d.when = ts; setStep(uid, 'bc_wait', d);
      await reply(bcOptionsView(d, uid));
      return true;
    }
    case 'gsearch': state.delete(uid); await reply(groupsView(0, text)); return true;
    case 'usearch': {
      state.delete(uid);
      const t = text.replace(/^@/, '');
      const rows = /^\d+$/.test(t) ? all('SELECT * FROM users WHERE id=?', Number(t))
        : all('SELECT * FROM users WHERE username LIKE ? OR first_name LIKE ? OR last_name LIKE ? ORDER BY last_seen DESC LIMIT 10', `%${t}%`, `%${t}%`, `%${t}%`);
      if (!rows.length) { await send(msg.chat.id, 'Topilmadi.', { reply_markup: kb([back('ad:users')]) }); return true; }
      if (rows.length === 1) { await reply(userCard(rows[0].id)); return true; }
      await send(msg.chat.id, '🔎 Natijalar:', { reply_markup: kb([...rows.map((r) => [cb(`${displayName(r)} · ${r.id}`, `ad:u:${r.id}`)]), back('ad:users')]) });
      return true;
    }
    case 'footer': {
      if (!text) return true;
      try { await send(msg.chat.id, '👁 Namuna:\n\n━━━━━━━━━━━━\n' + text.split(/\n-{3,}\n/)[0]); } catch (e) { await send(msg.chat.id, '⚠️ HTML xato: ' + esc(e.description) + '\nQaytadan yuboring.'); return true; }
      setSetting('footer_text', text); state.delete(uid);
      await reply(autoView());
      return true;
    }
    case 'daily_time': case 'summary_time': {
      const m = text.match(/^(\d{1,2})[:.](\d{2})$/);
      if (!m || +m[1] > 23 || +m[2] > 59) { await send(msg.chat.id, '⚠️ Masalan: <code>12:00</code>'); return true; }
      setSetting(s.step, `${m[1].padStart(2, '0')}:${m[2]}`); state.delete(uid);
      await reply(autoView());
      return true;
    }
    case 'c_title': d.title = trunc(text, 80); d.cstep = 'prize'; setStep(uid, 'c_prize', d); await send(msg.chat.id, '🏆 Sovrinni yozing (masalan: «Telegram Premium 1 oy», «50 000 so\'m», «Telegram gift 🧸»):'); return true;
    case 'c_prize': d.prize = trunc(text, 120); d.cstep = 'scope'; setStep(uid, 'c_num', d); await reply(cwView(d)); return true;
    case 'c_num': {
      const n = parseInt(text, 10);
      if (d.cstep === 'winners' && n > 0) { d.winners = Math.min(n, 100); d.cstep = 'period'; await reply(cwView(d)); return true; }
      if (d.cstep === 'period') {
        const ts = parseWhen(text);
        if (ts && ts > Date.now()) { d.start = Date.now(); d.end = ts; }
        else if (n > 0) { d.start = Date.now(); d.end = Date.now() + n * DAY; }
        else { await send(msg.chat.id, '⚠️ Kun sonini (masalan <code>10</code>) yoki tugash vaqtini (<code>25.10 21:00</code>) yozing'); return true; }
        d.instant = false; d.period = true; d.periodText = `${fmtDate(d.start)} — ${fmtDate(d.end)}`; d.cstep = 'min'; await reply(cwView(d)); return true;
      }
      if (d.cstep === 'min' && n >= 0) { d.min = n; d.cstep = 'gift'; await reply(cwView(d)); return true; }
      await reply(cwView(d));
      return true;
    }
  }
  return false;
}

export { contestsView };
