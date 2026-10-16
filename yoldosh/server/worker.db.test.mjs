// D1 o'rniga node:sqlite bilan sinov: node --experimental-sqlite server/worker.db.test.mjs
import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs'; import w from './worker.js';
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const stmt = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, first: async () => db.prepare(sql).get(...a) ?? null, all: async () => ({ results: db.prepare(sql).all(...a) }), run: async () => { const x = db.prepare(sql).run(...a); return { meta: { last_row_id: Number(x.lastInsertRowid) } }; }, _run: () => db.prepare(sql).run(...a) }; return o; };
const DB = { prepare: stmt, batch: async (l) => { l.forEach(s => s._run()); } };
const kv = new Map(); const env = { DB, AUTH: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); } }, SESSION_SECRET: 'x'.repeat(32), WEBHOOK_SECRET: 's', BOT_USERNAME: 'b', SITE_URL: 'https://x/', TELEGRAM_BOT_TOKEN: 'T' };
const tgCalls = []; const pending = []; const ctx = { waitUntil: (p) => pending.push(p) };
const flush = async () => { while (pending.length) await pending.shift(); };
globalThis.fetch = async (u, o) => {
  u = String(u);
  if (u.startsWith('https://w/internal/bc')) return w.fetch(new Request(u, { method: 'POST', headers: o.headers, body: o.body }), env, ctx);
  const body = o && o.body ? JSON.parse(o.body) : null; tgCalls.push({ m: u.split('/').pop(), ...(body || {}) });
  return { ok: true, json: async () => ({ ok: true }) };
};
const call = (m, p, b, h = {}) => w.fetch(new Request('https://w' + p, { method: m, headers: h, body: b ? JSON.stringify(b) : undefined }), env, ctx).then(r => r.json().then(j => [r.status, j]));
const ok = (c, t) => { if (!c) { console.log('XATO:', t); process.exitCode = 1; } else console.log('ok  ', t); };
const verify = async (id, un) => { const [, s] = await call('POST', '/auth/start', {}); await call('POST', '/telegram/webhook', { message: { chat: { id, type: 'private' }, from: { id, first_name: 'A', username: un }, text: '/start ' + s.token } }, { 'x-telegram-bot-api-secret-token': 's' }); return s.token; };
let t = await verify(11, 'aziz'); let [st, r] = await call('POST', '/auth/complete', { token: t, first: 'Aziz', last: 'Karimov', region: 'Samarqand' });
ok(st === 200 && r.session && !r.existing && r.user.first === 'Aziz', 'yangi foydalanuvchi yaratildi');
const H = { authorization: 'Bearer ' + r.session };
[st, r] = await call('POST', '/sync', { state: { a: 1 }, points: 120 }, H); ok(st === 200, 'sync');
[st, r] = await call('GET', '/me', null, H); ok(r.state.a === 1 && r.user.points === 120, '/me holat va ball');
[st] = await call('GET', '/me', null, { authorization: 'Bearer 1.9999999999999.abc' }); ok(st === 401, 'soxta sessiya rad');
[st] = await call('POST', '/sync', { state: {}, points: 5 }); ok(st === 401, 'sessiyasiz sync rad');
t = await verify(11, 'aziz'); [st, r] = await call('POST', '/auth/complete', { token: t }); ok(r.existing && r.state.a === 1, 'qayta kirish: eski holat qaytdi');
[st, r] = await call('POST', '/auth/complete', { token: t }); ok(st === 400, 'token ikki marta ishlamaydi');
t = await verify(12, 'x'); [st] = await call('POST', '/auth/complete', { token: t, first: 'A', last: '' }); ok(st === 400, 'bo\'sh familya rad');
[st, r] = await call('GET', '/rank'); ok(r.top.length === 1 && r.top[0].name === 'Aziz K.' && r.top[0].points === 120, 'reyting (ism qisqartirilgan)');
// --- avtomaktablar ---
env.ADMIN_TG_IDS = '11';
const adminSess = (await call('POST', '/auth/complete', { token: await verify(11, 'aziz') }))[1].session; const AH = { authorization: 'Bearer ' + adminSess };
[st, r] = await call('POST', '/admin/school', { name: 'Test avtomaktab', region: 'Samarqand', city: 'Samarqand', phone: '+998901112233', price: '1 200 000' }, AH); ok(st === 200, 'admin avtomaktab qo\'shdi');
const userSess = (await call('POST', '/auth/complete', { token: await verify(77, 'u7'), first: 'Bek', last: 'Aliyev', region: 'Samarqand' }))[1].session; const UH = { authorization: 'Bearer ' + userSess };
[st] = await call('POST', '/admin/school', { name: 'X' }, UH); ok(st === 403, 'oddiy foydalanuvchi admin emas');
[st, r] = await call('GET', '/schools?region=Samarqand'); ok(r.schools.length === 1 && !('tg_chat' in r.schools[0]), 'ro\'yxat (ichki maydonlarsiz)');
const sid = r.schools[0].id; [st, r] = await call('POST', '/schools/apply', { school_id: sid, phone: '+998 90 111 22 33' }, UH); ok(st === 200 && !r.again, 'ariza yuborildi');
[st, r] = await call('POST', '/schools/apply', { school_id: sid }, UH); ok(r.again === true, 'ikkinchi ariza takrorlanmaydi');
[st] = await call('POST', '/schools/apply', { school_id: sid }); ok(st === 401, 'kirishsiz ariza rad');
[st, r] = await call('GET', '/admin/schools', null, AH); ok(r.schools[0].leads === 1, 'admin: arizalar soni');
[st] = await call('GET', '/admin/schools', null, UH); ok(st === 403, 'admin ro\'yxati yopiq');
[st, r] = await call('GET', '/admin/leads', null, AH); ok(r.leads.length === 1 && r.leads[0].first === 'Bek', 'admin: arizalar ro\'yxati');
// --- admin login/parol ---
import crypto from 'node:crypto';
const salt = crypto.randomBytes(16), hash = crypto.pbkdf2Sync('Sirli-Parol-123', salt, 100000, 32, 'sha256');
env.ADMIN_CRED = ['bosh', 100000, salt.toString('base64url'), hash.toString('base64url')].join(':');
[st] = await call('POST', '/admin/login', { user: 'bosh', password: 'xato' }); ok(st === 401, 'noto\'g\'ri parol rad');
[st, r] = await call('POST', '/admin/login', { user: 'BOSH', password: 'Sirli-Parol-123' }); ok(st === 200 && r.session.startsWith('a.'), 'to\'g\'ri login/parol');
const AD = { authorization: 'Bearer ' + r.session };
[st, r] = await call('GET', '/admin/stats', null, AD); ok(st === 200 && r.users >= 2 && Array.isArray(r.regions), 'admin statistikasi');
[st, r] = await call('GET', '/admin/users?q=aziz', null, AD); ok(r.users.length >= 1, 'foydalanuvchilar qidiruvi');
const uid = r.users[0].id; [st] = await call('POST', '/admin/user', { id: uid, prem_days: 30 }, AD); ok(st === 200, 'premium berildi');
[st, r] = await call('GET', '/rank', null); ok(r.top.some(x => x.prem), 'reytingda premium ko\'rinadi');
[st] = await call('GET', '/admin/stats', null, { authorization: 'Bearer a.99999999999999.abc' }); ok(st === 403, 'soxta admin sessiya rad');
[st] = await call('GET', '/admin/stats', null, UH); ok(st === 403, 'oddiy foydalanuvchi statistikani ololmaydi');
for (let i = 0; i < 9; i++) await call('POST', '/admin/login', { user: 'bosh', password: 'x' + i });
[st] = await call('POST', '/admin/login', { user: 'bosh', password: 'Sirli-Parol-123' }); ok(st === 429, 'urinishlar cheklangan (brute-force himoyasi)');
// --- CMS ---
[st] = await call('POST', '/admin/settings', { settings: { premiumPrice: 49000 } }); ok(st === 403, 'sozlamalarni ochiq o\'zgartirib bo\'lmaydi');
[st] = await call('POST', '/admin/settings', { settings: { premiumPrice: 49000, allFree: false, announcement: 'Salom' } }, AD); ok(st === 200, 'admin sozlama saqladi');
[st, r] = await call('GET', '/config'); ok(r.settings.premiumPrice === 49000 && r.settings.allFree === false, '/config ochiq va to\'g\'ri');
[st] = await call('POST', '/admin/cquestion', { text: 'Yangi savol matni?', options: ['A', 'B', 'C'], answer: 1, topic: 'rules', explain: 'Sabab' }, AD); ok(st === 200, 'yangi savol qo\'shildi');
[st] = await call('POST', '/admin/cquestion', { text: 'x', options: ['A'], answer: 0 }, AD); ok(st === 400, 'noto\'g\'ri savol rad');
[st] = await call('POST', '/admin/qedit', { n: 5, hide: true }, AD); ok(st === 200, 'savol yashirildi');
[st, r] = await call('GET', '/content'); ok(r.questions.length === 1 && r.edits.length === 1 && r.edits[0].hide === 1, '/content savol va tahrirlar');
[st, r] = await call('POST', '/admin/media', { data: 'data:image/png;base64,iVBORw0KGgo=' }, AD); ok(st === 200 && r.id > 0, 'rasm yuklandi');
const mres = await w.fetch(new Request('https://w/media/' + r.id), env); ok(mres.status === 200 && mres.headers.get('content-type') === 'image/png', 'rasm ochiq beriladi');
[st] = await call('POST', '/admin/promo', { code: 'yoz2026', days: 30, max_uses: 2 }, AD); ok(st === 200, 'promokod yaratildi');
[st] = await call('POST', '/admin/promo', { code: 'YOZ2026', days: 5 }, AD); ok(st === 400, 'takroriy kod rad');
[st, r] = await call('POST', '/promo/redeem', { code: 'yoz2026' }, UH); ok(st === 200 && r.days === 30, 'promokod ishladi (+30 kun)');
[st] = await call('POST', '/promo/redeem', { code: 'YOZ2026' }, UH); ok(st === 400, 'bir kishi ikki marta ishlata olmaydi');
[st] = await call('POST', '/promo/redeem', { code: 'YOKKOD' }, UH); ok(st === 400, 'noto\'g\'ri kod rad');
[st] = await call('POST', '/promo/redeem', { code: 'YOZ2026' }); ok(st === 401, 'kirishsiz promokod rad');
// ---- to'lov (buyurtma), batl, ommaviy xabar ----
[st, r] = await call('POST', '/order/create', { months: 3 }, UH); ok(st === 200 && r.id > 0 && r.amount === 49000 * 3, 'buyurtma yaratildi (3 oy, narx sozlamadan)');
const oid = r.id;
[st, r] = await call('POST', '/order/create', { months: 3 }, UH); ok(r.id === oid, 'ochiq buyurtma qayta ishlatiladi (dublikat yo\'q)');
[st] = await call('POST', '/order/create', { months: 1 }); ok(st === 401, 'kirishsiz buyurtma rad');
[st] = await call('POST', '/order/paid', { id: oid, note: 'Karta ...1234' }, UH); ok(st === 200, '"to\'ladim" belgilandi');
[st, r] = await call('GET', '/admin/orders?status=paid', null, AD); ok(st === 200 && r.orders.length === 1 && r.orders[0].note === 'Karta ...1234', 'admin to\'lovni ko\'rdi');
[st] = await call('GET', '/admin/orders'); ok(st === 403, 'to\'lovlar ro\'yxati yopiq');
[st] = await call('POST', '/admin/order', { id: oid, action: 'approve' }); ok(st === 403, 'tasdiqlash faqat admin');
[st] = await call('POST', '/admin/order', { id: oid, action: 'approve' }, AD); ok(st === 200, 'admin tasdiqladi');
[st] = await call('POST', '/admin/order', { id: oid, action: 'approve' }, AD); ok(st === 400, 'ikki marta tasdiqlab bo\'lmaydi');
[st, r] = await call('GET', '/admin/stats', null, AD); ok(r.revenue === 49000 * 3 && r.sales === 1 && r.pending === 0, 'daromad statistikada');
[st, r] = await call('POST', '/battle/result', { code: 'YB-ABC12-10-mix-0-5', name: 'Ali', score: 7, total: 10, sec: 90 }, UH); ok(st === 200, 'batl natijasi saqlandi');
[st] = await call('POST', '/battle/result', { code: 'xato', score: 1, total: 10, sec: 1 }, UH); ok(st === 400, 'noto\'g\'ri batl kodi rad');
[st, r] = await call('GET', '/battle/YB-ABC12-10-mix-0-5'); ok(st === 200 && r.results.length === 1 && r.results[0].score === 7, 'batl jadvali ochiq');
[st] = await call('POST', '/admin/broadcast', { text: 'Salom hammaga' }); ok(st === 403, 'ommaviy xabar faqat admin');

// ---- Telegram bot: adminlar, ommaviy xabar/reklama, to'lov tugmalari ----
const WH = { 'x-telegram-bot-api-secret-token': 's' };
const say = (id, text, extra = {}) => call('POST', '/telegram/webhook', { message: { chat: { id, type: 'private' }, from: { id, first_name: 'X' }, text, ...extra } }, WH);
const press = (id, data, mid = 5) => call('POST', '/telegram/webhook', { callback_query: { id: 'cb' + Math.random(), from: { id, first_name: 'X' }, data, message: { message_id: mid, chat: { id, type: 'private' }, text: 'msg' } } }, WH);
const last = (m) => [...tgCalls].reverse().find(c => c.m === m);
await call('POST', '/auth/complete', { token: await verify(900, 'staffx'), first: 'Xodim', last: 'Bek', region: 'Buxoro' });
tgCalls.length = 0; await say(900, '/admin'); ok(!tgCalls.some(c => /boshqaruv/i.test(c.text || '')), 'oddiy foydalanuvchiga boshqaruv paneli chiqmaydi');
tgCalls.length = 0; await say(11, '/admin'); ok(/boshqaruv paneli/.test(last('sendMessage').text) && JSON.stringify(last('sendMessage').reply_markup).includes('"bc"') && JSON.stringify(last('sendMessage').reply_markup).includes('"ad"'), "ega /admin: to'liq menyu (adminlar bilan)");
// admin qo'shish (ruxsatlari bilan)
await press(11, 'ada'); await say(11, '900');
tgCalls.length = 0; await press(11, 'adt:broadcast'); await press(11, 'adt:stats'); const kb = JSON.stringify(last('editMessageReplyMarkup').reply_markup); ok(kb.includes('☑️ Xabar va reklama') && kb.includes('☑️ Statistikani') && kb.includes("⬜ To'lovlarni"), 'ruxsatlar tugmalari belgilanadi');
await press(11, 'ads'); const rowA = db.prepare('SELECT * FROM admins WHERE tg_id = ?').get('900'); ok(rowA && JSON.parse(rowA.perms).join() === 'broadcast,stats', 'admin saqlandi (ruxsatlari bilan)');
ok(tgCalls.some(c => String(c.chat_id) === '900' && /admin etib tayinlandingiz/.test(c.text || '')), 'yangi adminga xabar bordi');
tgCalls.length = 0; await say(900, '/admin'); const mk = JSON.stringify(last('sendMessage').reply_markup); ok(mk.includes('"bc"') && mk.includes('"st"') && !mk.includes('"od"') && !mk.includes('"pm"') && !mk.includes('"ad"'), "admin faqat ruxsat etilgan tugmalarni ko'radi");
tgCalls.length = 0; await press(900, 'od'); ok(last('answerCallbackQuery') && /ruxsat yo/.test(last('answerCallbackQuery').text), "ruxsatsiz bo'limga kirish rad");
tgCalls.length = 0; await press(900, 'ad'); ok(!tgCalls.some(c => /Adminlar \(/.test(c.text || '')), 'admin boshqa adminlarni boshqara olmaydi');
// reklama: rasm + tugma + auditoriya
await press(900, 'bc'); await say(900, '', { photo: [{ file_id: 'small' }, { file_id: 'BIG' }], caption: '🔥 Premium 30% arzon!' });
ok(tgCalls.some(c => c.m === 'sendPhoto' && c.photo === 'BIG' && /Premium 30%/.test(c.caption)), "rasm bilan reklama ko'rinishi (katta rasm)");
await press(900, 'bcb'); tgCalls.length = 0; await say(900, 'xato format'); ok(/Format/.test(last('sendMessage').text), 'tugma formati tekshiriladi');
await say(900, 'Premium olish | https://chorrahaa.uz'); const ph = last('sendPhoto'); ok(ph && JSON.stringify(ph.reply_markup).includes('https://chorrahaa.uz'), "reklama tugmasi qo'shildi");
await press(900, 'bca:free'); await press(900, 'bcs'); ok(/Rostdan ham/.test(last('editMessageText').text), "yuborishdan oldin tasdiq so'raladi");
// auditoriya: faqat Premium bo'lmaganlar
db.prepare('UPDATE users SET prem_until = ? WHERE tg_id = ?').run(Date.now() + 864e5, '77');
tgCalls.length = 0; await press(900, 'bcy'); await flush();
const sentTo = tgCalls.filter(c => c.m === 'sendPhoto' && c.caption && /Premium 30%/.test(c.caption) && !c.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data).map(c => String(c.chat_id));
const nFree = db.prepare('SELECT COUNT(*) c FROM users WHERE prem_until IS NULL OR prem_until < ?').get(Date.now()).c;
ok(sentTo.length === nFree && !sentTo.includes('77'), `reklama faqat Premium bo'lmaganlarga yubordi (${sentTo.length}/${nFree})`);
const bj = db.prepare('SELECT * FROM broadcasts ORDER BY id DESC LIMIT 1').get(); ok(bj.status === 'done' && bj.sent === nFree && bj.btn_text === 'Premium olish', "ish yozuvi: tugagan, hisoblagich to'g'ri");
ok(tgCalls.some(c => String(c.chat_id) === '900' && /tugadi/.test(c.text || '')), 'yuboruvchiga yakuniy hisobot bordi');
// zanjir: 25 tadan ko'p foydalanuvchi bo'laklab yuboriladi
for (let i = 0; i < 60; i++) db.prepare('INSERT INTO users (tg_id, first, last, region, points, created, last_seen) VALUES (?,?,?,?,0,?,?)').run('5' + String(1000 + i), 'U' + i, 'Z', 'X', Date.now(), Date.now());
tgCalls.length = 0; [st, r] = await call('POST', '/admin/broadcast', { text: 'Ommaviy sinov xabari', audience: 'all' }, AD); await flush();
const got = new Set(tgCalls.filter(c => c.m === 'sendMessage' && c.text === 'Ommaviy sinov xabari').map(c => String(c.chat_id))); const nAll = db.prepare('SELECT COUNT(*) c FROM users').get().c;
ok(st === 200 && got.size === nAll && nAll > 60, `zanjirli yuborish: ${got.size}/${nAll} (25 talik bo'laklar)`);
[st] = await call('POST', '/internal/bc', { id: 1 }, { 'x-bc': 'soxta' }); ok(st === 403, 'ichki zanjir imzosiz ishlamaydi');
[st] = await call('POST', '/admin/broadcast', { text: 'Salom', btn_text: 'Bos', btn_url: 'javascript:alert(1)' }, AD); ok(st === 400, 'xavfli havolali tugma rad');
// to'lov tugmalari
tgCalls.length = 0; [st, r] = await call('POST', '/order/create', { months: 1 }, UH); const oid2 = r.id; await call('POST', '/order/paid', { id: oid2, note: 'bot test' }, UH);
ok(tgCalls.filter(c => c.m === 'sendMessage' && /Yangi to'lov/.test(c.text || '')).some(c => String(c.chat_id) === '11' && JSON.stringify(c.reply_markup).includes('ok:' + oid2)), "egaga to'lov xabari tasdiqlash tugmasi bilan bordi");
ok(!tgCalls.some(c => String(c.chat_id) === '900' && /Yangi to'lov/.test(c.text || '')), '"orders" ruxsati yo\'q admin to\'lov xabarini olmaydi');
await press(900, 'ok:' + oid2); ok(db.prepare('SELECT status FROM orders WHERE id = ?').get(oid2).status === 'paid', "ruxsatsiz admin to'lovni tasdiqlay olmaydi");
tgCalls.length = 0; await press(11, 'ok:' + oid2); ok(db.prepare('SELECT status FROM orders WHERE id = ?').get(oid2).status === 'approved', 'ega bot tugmasi bilan tasdiqladi');
ok(tgCalls.some(c => String(c.chat_id) === '77' && /tasdiqlandi/.test(c.text || '')), 'talabaga Telegramdan xabar bordi');
// promokod va Premium berish botdan
await press(11, 'pm'); await say(11, 'BOT30 30 5'); ok(db.prepare("SELECT days, max_uses FROM promos WHERE code = 'BOT30'").get().max_uses === 5, 'botdan promokod yaratildi');
await press(11, 'pr'); await say(11, '77 10'); ok(db.prepare("SELECT prem_until FROM users WHERE tg_id = '77'").get().prem_until > Date.now() + 9 * 864e5, 'botdan Premium berildi');
// web: adminlar boshqaruvi
[st, r] = await call('POST', '/admin/staff', { tg_id: '4242', name: 'Web admin', perms: ['promo', 'hack'] }, AD); ok(st === 200, "web orqali admin qo'shildi");
[st, r] = await call('GET', '/admin/staff', null, AD); ok(r.staff.some(x => x.tg_id === '4242' && x.perms.join() === 'promo') && r.owners.includes('11'), "noma'lum ruxsat tashlab yuboriladi");
[st] = await call('GET', '/admin/staff'); ok(st === 403, "adminlar ro'yxati yopiq");
await press(11, 'adr:4242'); ok(!db.prepare("SELECT 1 FROM admins WHERE tg_id = '4242'").get(), "admin o'chirildi");
