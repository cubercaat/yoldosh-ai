// To'liq sinov: soxta Telegram API serveri + botni alohida jarayonda ishga tushirib, ssenariy bo'yicha tekshiradi.
// Ishga tushirish: node test/e2e.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const calls = [];
let queue = [], waiters = [], mid = 1000, pollN = 0, upd = 1;
const BOT = { id: 999, is_bot: true, username: 'chorraha_test_bot', first_name: 'Chorraha' };
const U = (id, username) => ({ id, is_bot: false, first_name: `User${id}`, username });
const ADMIN = U(1, 'boss'), A = U(2, 'ali'), B = U(3), C = U(4, 'vali');
const GROUP = { id: -100500, type: 'supergroup', title: 'Test guruh' };

function msgObj(p, extra = {}) {
  return { message_id: ++mid, date: Math.floor(Date.now() / 1000), chat: p.chat_id > 0 ? { id: p.chat_id, type: 'private' } : { ...GROUP, id: p.chat_id }, from: BOT, text: p.text, ...extra };
}
const handlers = {
  getMe: () => BOT,
  getWebhookInfo: () => ({ url: '' }),
  getUpdates: (p) => new Promise((res) => {
    if (queue.length) { const q = queue; queue = []; return res(q); }
    const w = (v) => { clearTimeout(t); res(v); };
    const t = setTimeout(() => { waiters = waiters.filter((x) => x !== w); res([]); }, 800);
    waiters.push(w);
  }),
  sendMessage: (p) => msgObj(p),
  editMessageText: (p) => msgObj(p, { message_id: p.message_id }),
  sendPhoto: (p) => msgObj(p, { photo: [{ file_id: 'F' + mid }] }),
  sendPoll: (p) => msgObj(p, { poll: { id: 'poll' + ++pollN, question: p.question, options: p.options } }),
  copyMessage: (p) => ({ message_id: ++mid }),
  getChatMemberCount: () => 42,
  getChatMember: (p) => ({ status: Number(p.user_id) === 999 ? 'administrator' : Number(p.user_id) === 2 ? 'creator' : 'member', user: { id: Number(p.user_id) } }),
  getAvailableGifts: () => ({ gifts: [{ id: '5170145012310081615', star_count: 15, sticker: { emoji: '🧸' } }] }),
  sendDocument: (p) => msgObj(p),
};
function push(u) { u.update_id = upd++; if (waiters.length) { const w = waiters.shift(); w([u]); } else queue.push(u); }

const server = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const method = req.url.split('/').pop();
  let p = {};
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart')) {
    const fd = await new Response(buf, { headers: { 'content-type': ct } }).formData();
    for (const [k, v] of fd) p[k] = typeof v === 'string' ? (/^[[{]/.test(v) ? JSON.parse(v) : v) : `<file ${v.name} ${v.size}b>`;
  } else if (buf.length) p = JSON.parse(buf);
  calls.push({ method, p, t: Date.now() });
  const h = handlers[method];
  const result = h ? await h(p) : true;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true, result }));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qb-'));
const env = { ...process.env, BOT_TOKEN: 'TEST', ADMIN_IDS: '1', API_ROOT: `http://127.0.0.1:${port}`, DB_PATH: path.join(tmp, 'bot.db'), TICK_MS: '1000', ENV_FILE: '/nonexistent', FORCE_QNS: '13,1,8,46,14' };
const child = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'src/index.js')], { env });
let logs = '';
child.stdout.on('data', (d) => { logs += d; });
child.stderr.on('data', (d) => { logs += d; process.stderr.write('[bot] ' + d); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
function ok(cond, name) { console.log(`${cond ? '✅' : '❌'} ${name}`); if (!cond) fails++; }
const since = (t) => calls.filter((c) => c.t >= t);
const waitFor = async (pred, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { const c = calls.find(pred); if (c) return c; await sleep(50); } return null; };
const waitForAfter = async (t, pred, ms = 8000) => waitFor((c) => c.t >= t && pred(c), ms);
const groupMsg = (from, text) => push({ message: { message_id: ++mid, date: 1, chat: GROUP, from, text } });
const privMsg = (from, text, extra = {}) => push({ message: { message_id: ++mid, date: 1, chat: { id: from.id, type: 'private' }, from, text, ...extra } });
const press = (from, msg, data) => push({ callback_query: { id: String(Math.random()), from, message: { message_id: msg, chat: msg.chat || (from && msg.chatId ? { id: msg.chatId } : GROUP) }, data } });
const pressIn = (from, chat, message_id, data) => push({ callback_query: { id: String(Math.random()), from, message: { message_id, chat, text: '' }, data } });

// Savollarga avtomatik javob beruvchi (poll va tugma rejimlari)
function autoAnswer(chatId, players, startT, correctRate = 0.7) {
  const seen = new Set();
  const iv = setInterval(() => {
    for (const c of calls) {
      if (c.t < startT || seen.has(c)) continue;
      if (c.method === 'sendPoll' && Number(c.p.chat_id) === chatId) {
        seen.add(c);
        const pollId = 'poll' + calls.slice(0, calls.indexOf(c) + 1).filter((x) => x.method === 'sendPoll').length;
        players.forEach((u, i) => setTimeout(() => push({ poll_answer: { poll_id: pollId, user: u, option_ids: [Math.random() < correctRate ? c.p.correct_option_id : (c.p.correct_option_id + 1) % c.p.options.length] } }), 200 + i * 150));
      }
      if (c.method === 'sendMessage' && Number(c.p.chat_id) === chatId && c.p.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data?.startsWith('qa:')) {
        seen.add(c);
        const row = c.p.reply_markup.inline_keyboard[0];
        const msgId = calls.indexOf(c); // xabar id ni javobdan olib bo'lmaydi — quyida keyinroq hal qilinadi
        players.forEach((u, i) => setTimeout(() => pressIn(u, chatId > 0 ? { id: chatId, type: 'private' } : GROUP, 0, row[i % row.length].callback_data), 200 + i * 150));
      }
    }
  }, 100);
  return () => clearInterval(iv);
}

try {
  await waitFor((c) => c.method === 'setMyCommands');
  await sleep(300);
  ok(calls.some((c) => c.method === 'setChatMenuButton' && c.p.menu_button.web_app.url.includes('chorrahaa.uz')), 'Menyu tugmasi chorrahaa.uz web_app');

  // 1) Bot guruhga qo'shiladi
  let t = Date.now();
  push({ my_chat_member: { chat: GROUP, from: A, date: 1, old_chat_member: { status: 'left', user: BOT }, new_chat_member: { status: 'administrator', user: BOT } } });
  const welcome = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === GROUP.id);
  ok(welcome && welcome.p.text.includes('/quiz'), 'Guruhga xush kelibsiz xabari');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 1 && c.p.text.includes('yangi guruhga')), 'Adminga «yangi guruh» xabari');

  // 2) /quiz sozlash — boshqa odam tanlay olmaydi
  t = Date.now();
  groupMsg(A, '/quiz');
  const setup = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data === 'gs:n:5');
  ok(setup, '/quiz → savollar soni so\'raladi');
  const setupId = mid; // oxirgi yuborilgan xabar id
  t = Date.now();
  pressIn(B, GROUP, setupId, 'gs:n:5');
  const alert = await waitForAfter(t, (c) => c.method === 'answerCallbackQuery' && c.p.show_alert);
  ok(alert && /boshlagan/.test(alert.p.text), 'Begona odam sozlay olmaydi');
  pressIn(A, GROUP, setupId, 'gs:n:5'); await sleep(300);
  pressIn(A, GROUP, setupId, 'gs:t:10'); await sleep(300);
  const topicEdit = await waitFor((c) => c.method === 'editMessageText' && c.p.text?.includes('Mavzuni'));
  ok(topicEdit, 'Vaqt → mavzu tanlash');
  t = Date.now();
  const stopAuto = autoAnswer(GROUP.id, [A, B, C], t);
  pressIn(A, GROUP, setupId, 'gs:p:mix');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('Test boshlandi')), 'Test boshlandi xabari');
  const firstPoll = await waitForAfter(t, (c) => c.method === 'sendPoll' || (c.method === 'sendMessage' && c.p.text?.startsWith('<b>[1/5]')), 10000);
  ok(firstPoll, 'Birinchi savol yuborildi');
  if (firstPoll?.method === 'sendPoll') ok(firstPoll.p.type === 'quiz' && firstPoll.p.is_anonymous === false && firstPoll.p.open_period === 10, 'Quiz poll: anonim emas, 10 soniya');
  const photos = await waitForAfter(t, (c) => c.method === 'sendPhoto', 60000);
  // ikkinchi /quiz — rad
  groupMsg(C, '/quiz');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('allaqachon')), 'Test ketayotganda ikkinchisi boshlanmaydi');
  const result = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('testi yakunlandi'), 90000);
  stopAuto();
  ok(result, 'Test yakunlandi, natija e\'lon qilindi');
  if (result) {
    console.log('--- natija ---\n' + result.p.text.replace(/<[^>]+>/g, '') + '\n--------------');
    ok(/🥇/.test(result.p.text) && result.p.text.includes('@ali'), 'Natijada medallar va ishtirokchilar');
    ok(result.p.text.includes('chorrahaa.uz'), 'Natija ostida chorrahaa.uz reklamasi');
    const btns = JSON.stringify(result.p.reply_markup);
    ok(btns.includes('utm_source=telegram') && btns.includes('ga:5:10:mix') && btns.includes('startgroup'), 'Natija tugmalari: sayt (UTM), yana o\'ynash, guruhga qo\'shish');
  }
  ok(!!photos, 'Rasmli savol rasm bilan yuborildi');
  const btnQ = calls.find((c) => c.method === 'sendMessage' && c.p.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data?.startsWith('qa:'));
  ok(btnQ, 'Uzun variantli savol tugmalar bilan yuborildi');
  ok(calls.some((c) => c.method === 'editMessageText' && c.p.text?.includes('To\'g\'ri javob:') && c.p.text.includes('Javob berdi: 3')), 'Tugmali savol yopilganda to\'g\'ri javob va statistika ko\'rsatildi');

  // 3) /top guruh reytingi
  t = Date.now();
  groupMsg(B, '/top');
  const top = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('Guruh reytingi'));
  ok(top && top.p.text.includes('@ali'), '/top — guruh reytingi');
  pressIn(B, GROUP, mid, 'top:c:d:active');
  ok(await waitForAfter(t, (c) => ['editMessageText', 'sendMessage'].includes(c.method) && c.p.text?.includes('Eng faollar') && c.p.text.includes('Bugun')), 'Reyting: kunlik / eng faollar tugmasi');

  // 4) Lichka: /start ref + shaxsiy test
  t = Date.now();
  privMsg(A, '/start');
  await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 2 && c.p.text?.includes('Assalomu'));
  t = Date.now();
  privMsg(B, '/start ref_2');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 2 && c.p.text?.includes('havolangiz orqali')), 'Referal: taklif qilganga xabar');
  const startMsg = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.reply_markup?.keyboard);
  ok(startMsg && JSON.stringify(startMsg.p.reply_markup).includes('Test yechish'), 'Lichka menyusi');
  ok(startMsg && startMsg.p.reply_markup.keyboard[0][0].style === 'success', 'Bosh menyu tugmalari rangli (yashil)');
  t = Date.now();
  const stopPriv = autoAnswer(3, [B], t, 0.8);
  pressIn(B, { id: 3, type: 'private' }, 1, 'ps:p:5:mix');
  const pres = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.text?.includes('Test yakunlandi'), 40000);
  stopPriv();
  ok(pres, 'Lichkada 5 savollik test yakunlandi');
  const startedMsg = calls.find((c) => c.t >= t && c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.text?.includes('Test boshlandi'));
  ok(startedMsg && JSON.stringify(startedMsg.p.reply_markup.keyboard) === JSON.stringify([[{ text: '⬅️ Orqaga', style: 'danger' }]]), 'Test paytida menyu yashirinib, faqat «Orqaga» tugmasi qoldi');
  ok(await waitForAfter(pres?.t || t, (c) => c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.text?.includes('Bosh menyu') && JSON.stringify(c.p.reply_markup).includes('Test yechish')), 'Test tugagach bosh menyu qaytdi');
  ok(pres && JSON.stringify(pres.p.reply_markup).includes('"style":"success"'), 'Natija tugmalari rangli');
  if (pres) { console.log('--- lichka natija ---\n' + pres.p.text.replace(/<[^>]+>/g, '') + '\n---'); ok(JSON.stringify(pres.p.reply_markup).includes('web_app'), 'Lichka natijasida web_app (chorrahaa.uz) tugmasi'); }

  // Imtihon rejimi to'xtatish
  t = Date.now();
  privMsg(B, '🎓 Imtihon rejimi');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.text?.includes('Imtihon rejimi')), 'Imtihon rejimi boshlandi');
  await sleep(1500);
  privMsg(B, '⬅️ Orqaga');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.text?.includes('to\'xtatildi')), '«Orqaga» tugmasi testni to\'xtatdi');
  t = Date.now();
  privMsg(B, '🏆 Reyting');
  const rb = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.reply_markup?.keyboard);
  ok(rb && rb.p.reply_markup.keyboard.length === 1 && rb.p.reply_markup.keyboard[0][0].text === '⬅️ Orqaga', 'Reyting bo\'limida ham faqat «Orqaga»');
  t = Date.now();
  privMsg(B, '⬅️ Orqaga');
  const mb = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 3 && c.p.reply_markup?.keyboard);
  ok(mb && mb.p.reply_markup.keyboard.length >= 4, '«Orqaga» → bosh menyu qaytdi');

  // 5) Admin panel
  t = Date.now();
  privMsg(ADMIN, '/start'); await sleep(400);
  privMsg(ADMIN, '/admin');
  const panel = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 1 && c.p.text?.includes('Admin panel'));
  ok(panel, 'Admin panel ochildi');
  t = Date.now(); pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:stats');
  const stats = await waitForAfter(t, (c) => c.method === 'editMessageText' && c.p.text?.includes('Statistika'));
  ok(stats && /Guruhlar:<\/b> 1/.test(stats.p.text), 'Statistika: 1 guruh');
  t = Date.now(); privMsg(A, '/admin');
  await sleep(500);
  ok(!since(t).some((c) => c.p.chat_id === 2 && c.p.text?.includes('Admin panel')), 'Oddiy foydalanuvchiga admin panel yo\'q');
  t = Date.now(); pressIn(ADMIN, { id: 1, type: 'private' }, mid, `ad:g:${GROUP.id}`);
  ok(await waitForAfter(t, (c) => c.method === 'editMessageText' && c.p.text?.includes('Test guruh') && c.p.text.includes('A\'zolar: 42')), 'Guruh kartochkasi');

  // Reklama tarqatish: hammaga + saqlash + pin
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bc'); await sleep(300);
  privMsg(ADMIN, 'Chorraha: yangi video darslar! 🚗');
  await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('Post qabul qilindi'));
  privMsg(ADMIN, '/cancel'); await sleep(300);
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bc'); await sleep(300);
  privMsg(ADMIN, 'Chorraha: yangi video darslar! 🚗'); await sleep(400);
  const srcId = mid;
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bcnext'); await sleep(300);
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bct:all'); await sleep(300);
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bcpin'); await sleep(200);
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bcsave'); await sleep(200);
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bcgo');
  const done = await waitForAfter(t, (c) => c.method === 'editMessageText' && c.p.text?.includes('tugadi'), 10000);
  const copies = since(t).filter((c) => c.method === 'copyMessage');
  ok(copies.some((c) => c.p.chat_id === GROUP.id) && copies.some((c) => c.p.chat_id === 2) && copies.some((c) => c.p.chat_id === 3), `Reklama guruh va foydalanuvchilarga ketdi (${copies.length} ta)`);
  ok(copies.every((c) => JSON.stringify(c.p.reply_markup).includes('chorrahaa.uz')), 'Reklamada chorrahaa.uz tugmasi');
  ok(since(t).some((c) => c.method === 'pinChatMessage' && c.p.chat_id === GROUP.id), 'Guruhda pin qilindi');
  ok(done, 'Tarqatish hisoboti');

  // Tayyor reklama (rasm + matn) -> barcha guruhlarga
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:presets'); await sleep(300);
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:preset:1');
  const prPhoto = await waitForAfter(t, (c) => c.method === 'sendPhoto' && c.p.chat_id == 1 && String(c.p.caption).includes('1276'));
  ok(prPhoto && String(prPhoto.p.caption).includes('@chorraha_test_bot'), 'Tayyor reklama: rasm+matn adminga ko\'rsatildi');
  await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 1 && c.p.text?.includes('Kimga yuboramiz'));
  await sleep(200);
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bct:groups'); await sleep(300);
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:bcgo');
  const prCopy = await waitForAfter(t, (c) => c.method === 'copyMessage' && c.p.chat_id === GROUP.id, 8000);
  ok(prCopy && JSON.stringify(prCopy.p.reply_markup).includes('start=quiz'), 'Tayyor reklama guruhga «Botni ochish» tugmasi bilan yuborildi');

  // Rejalashtirilgan tarqatish (1 daqiqa) — bekor qilish
  // Konkurs: random, guruhlar, hozir yakunlash
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:cnew'); await sleep(300);
  privMsg(ADMIN, 'Haftaning omadlisi'); await sleep(300);
  privMsg(ADMIN, 'Telegram gift 🧸'); await sleep(300);
  for (const d of ['ad:cs:groups', 'ad:cm:random', 'ad:cw:1', 'ad:cp:now7', 'ad:cmin:1', 'ad:cg:none', 'ad:cgo:1']) { pressIn(ADMIN, { id: 1, type: 'private' }, mid, d); await sleep(300); }
  const report = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 1 && c.p.text?.includes('natijasi (admin uchun)'), 10000);
  ok(report, 'Konkurs (random): admin uchun g\'oliblar ro\'yxati');
  ok(await waitForAfter(t, (c) => c.method === 'copyMessage' && c.p.chat_id === GROUP.id, 8000), 'Konkurs natijasi guruhga e\'lon qilindi');

  // Konkurs: eng ko'p to'g'ri javob + avto Telegram sovg'a
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:cnew'); await sleep(300);
  privMsg(ADMIN, 'Eng zo\'r haydovchi'); await sleep(300);
  privMsg(ADMIN, 'Gift'); await sleep(300);
  for (const d of ['ad:cs:all', 'ad:cm:score', 'ad:cw:2', 'ad:cp:7', 'ad:cmin:0', 'ad:cglist', 'ad:cgs:5170145012310081615', 'ad:cgo:0']) { pressIn(ADMIN, { id: 1, type: 'private' }, mid, d); await sleep(350); }
  const created = await waitForAfter(t, (c) => c.method === 'editMessageText' && c.p.text?.includes('boshlandi!'));
  ok(created, 'Konkurs (7 kun, avto-sovg\'a) yaratildi');
  t = Date.now();
  privMsg(C, '/konkurs');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 4 && c.p.text?.includes('Eng zo')), '/konkurs — foydalanuvchiga faol konkurs');
  const cid = created?.p.text.match(/#(\d+)/)?.[1];
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, `ad:cend:${cid}`);
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 1 && c.p.text?.includes(`Konkurs #${cid} natijasi`), 8000), 'Konkursni «hozir yakunlash»');

  // Konkurs: o'tgan 7 kun bo'yicha eng ko'p to'g'ri javob + avto Telegram sovg'a
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:cnew'); await sleep(300);
  privMsg(ADMIN, 'Sovg\'ali konkurs'); await sleep(300);
  privMsg(ADMIN, 'Gift 🧸'); await sleep(300);
  for (const d of ['ad:cs:all', 'ad:cm:score', 'ad:cw:2', 'ad:cp:now7', 'ad:cmin:1', 'ad:cglist', 'ad:cgs:5170145012310081615', 'ad:cgo:0']) { pressIn(ADMIN, { id: 1, type: 'private' }, mid, d); await sleep(350); }
  const gifts = (await waitForAfter(t, (c) => c.method === 'sendGift', 8000)) && since(t).filter((c) => c.method === 'sendGift');
  ok(gifts && gifts.length === 2 && gifts[0].p.gift_id === '5170145012310081615', `G'oliblarga Telegram sovg'a avtomatik yuborildi (${gifts?.length || 0})`);
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && [2, 3].includes(c.p.chat_id) && c.p.text?.includes('Tabriklaymiz')), 'G\'olibga lichkada tabrik');

  // Guruh sozlamalari
  t = Date.now();
  groupMsg(C, '/settings');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('Faqat guruh adminlari')), '/settings — oddiy a\'zoga yopiq');
  groupMsg(A, '/settings'); await sleep(400);
  pressIn(A, GROUP, mid, 'gst:mode'); await sleep(400);
  t = Date.now(); groupMsg(C, '/quiz');
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('faqat adminlar')), 'Rejim «faqat adminlar»: oddiy a\'zo boshlay olmaydi');

  // Avto-reklama: har 1 testdan keyin + kunlik g'oliblar e'loni
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:ae:-'); await sleep(250);
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:ae:-'); await sleep(250);
  t = Date.now();
  const stopAuto2 = autoAnswer(GROUP.id, [A, C], t);
  pressIn(A, GROUP, mid, 'ga:2:10:mix');
  const res2 = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.text?.includes('testi yakunlandi'), 60000);
  stopAuto2();
  ok(res2, '«Yana o\'ynash» tugmasi bilan yangi test');
  ok(await waitForAfter(t, (c) => c.t >= (res2?.t || 0) && c.method === 'sendMessage' && c.p.chat_id === GROUP.id && c.p.text?.includes('guvohnomasini'), 5000), 'Test yakunidan keyin guruhga avto-reklama');
  t = Date.now();
  pressIn(ADMIN, { id: 1, type: 'private' }, mid, 'ad:ast'); await sleep(300);
  privMsg(ADMIN, '00:00');
  const sum = await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === GROUP.id && /eng yaxshi o'yinchilari/.test(c.p.text || ''), 8000);
  ok(sum, 'Kunlik g\'oliblar e\'loni guruhda');
  if (sum) console.log('--- e\'lon ---\n' + sum.p.text.replace(/<[^>]+>/g, '') + '\n---');

  // Bot guruhdan chiqariladi
  t = Date.now();
  push({ my_chat_member: { chat: GROUP, from: A, date: 1, old_chat_member: { status: 'administrator', user: BOT }, new_chat_member: { status: 'kicked', user: BOT } } });
  ok(await waitForAfter(t, (c) => c.method === 'sendMessage' && c.p.chat_id === 1 && c.p.text?.includes('chiqarildi')), 'Admin: bot guruhdan chiqarildi xabari');

  await sleep(500);
  const errs = logs.split('\n').filter((l) => /error|Error|unhandled|❌/.test(l) && !/BOT_TOKEN/.test(l));
  ok(errs.length === 0, `Bot logida xato yo'q${errs.length ? ':\n' + errs.join('\n') : ''}`);
} finally {
  child.kill();
  server.close();
  console.log(`\n${fails ? `❌ ${fails} ta tekshiruv o'tmadi` : '🎉 Barcha tekshiruvlar o\'tdi'}`);
  process.exit(fails ? 1 : 0);
}
