// Mahalliy sinov: node server/worker.test.mjs  (KV va Telegram soxta)
import w from './worker.js';
const kv = new Map(), sent = [];
const env = { AUTH: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); } }, WEBHOOK_SECRET: 's3', BOT_USERNAME: 'chorraha_bot', SITE_URL: 'https://x.github.io/app/', TELEGRAM_BOT_TOKEN: 'T' };
globalThis.fetch = async (u, o) => { sent.push({ u, b: JSON.parse(o.body) }); return { ok: true }; };
const call = (p, b, h = {}) => w.fetch(new Request('https://w' + p, { method: 'POST', headers: h, body: JSON.stringify(b) }), env).then(r => r.json().then(j => [r.status, j]));
const ok = (c, m) => { if (!c) { console.log('XATO:', m); process.exitCode = 1; } else console.log('ok  ', m); };
const [, s] = await call('/auth/start', {}); ok(s.token && s.link === 'https://t.me/chorraha_bot?start=' + s.token, 'start token + link');
let [, c0] = await call('/auth/check', { token: s.token }); ok(!c0.ok && c0.pending, 'tasdiqlanmagan (pending)');
let [st] = await call('/telegram/webhook', {}, {}); ok(st === 403, 'webhook sirsiz rad');
const upd = { message: { chat: { id: 5, type: 'private' }, from: { id: 5, first_name: 'Aziz', username: 'aziz_k' }, text: '/start ' + s.token } };
[st] = await call('/telegram/webhook', upd, { 'x-telegram-bot-api-secret-token': 's3' }); ok(st === 200, 'webhook qabul');
ok(sent[0].b.reply_markup.inline_keyboard[0][0].url === 'https://x.github.io/app/#/tg/' + s.token, 'qaytish tugmasi');
let [, c1] = await call('/auth/check', { token: s.token, consume: true }); ok(c1.ok && c1.tg.username === 'aziz_k' && c1.tg.id === 5, 'tasdiqlandi');
[, c1] = await call('/auth/check', { token: s.token }); ok(!c1.ok, 'bir martalik');
sent.length = 0; await call('/telegram/webhook', { message: { ...upd.message, text: '/start AAAAAAAAAAAAAAAAAAAAAA' } }, { 'x-telegram-bot-api-secret-token': 's3' }); ok(/eskirgan/.test(sent[0].b.text), 'nomalum token');
