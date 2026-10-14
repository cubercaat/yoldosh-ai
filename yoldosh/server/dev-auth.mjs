// Mahalliy sinov serveri (Cloudflare o'rniga): node --experimental-sqlite server/dev-auth.mjs  → http://localhost:8787
// Soxta KV va Telegram; haqiqiy bot tokeni kerak emas. /sim/start <token> — botda Start bosilganini taqlid qiladi.
import http from 'http';
import w from './worker.js';
import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs';
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const stmt = (sql) => { let a = []; const o = { bind: (...x) => { a = x; return o; }, first: async () => db.prepare(sql).get(...a) ?? null, all: async () => ({ results: db.prepare(sql).all(...a) }), run: async () => { db.prepare(sql).run(...a); return {}; }, _run: () => db.prepare(sql).run(...a) }; return o; };
const DB = { prepare: stmt, batch: async (l) => { l.forEach(s => s._run()); } };
const kv = new Map();
const env = { DB, SESSION_SECRET: 'dev-secret-dev-secret-dev-secret-1', ADMIN_TG_IDS: '7', AUTH: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); } }, WEBHOOK_SECRET: 's3', BOT_USERNAME: 'chorraha_test_bot', SITE_URL: 'http://localhost:5173/', TELEGRAM_BOT_TOKEN: 'T' };
globalThis.fetch = async (u, o) => { console.log('TG →', JSON.parse(o.body).text.split('\n')[0], JSON.stringify(JSON.parse(o.body).reply_markup || '')); return { ok: true }; };
http.createServer(async (rq, rs) => {
  let body = ''; for await (const c of rq) body += c;
  const url = new URL(rq.url, 'http://x');
  if (url.pathname === '/sim/start') { // brauzerda: http://localhost:8787/sim/start?token=...
    const t = url.searchParams.get('token');
    await w.fetch(new Request('http://w/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 's3' }, body: JSON.stringify({ message: { chat: { id: 7, type: 'private' }, from: { id: 7, first_name: 'Aziz', last_name: 'Karimov', username: 'aziz_k' }, text: '/start ' + t } }) }), env);
    rs.setHeader('access-control-allow-origin','*'); rs.end('Start bosildi (taqlid). Saytga qayting: http://localhost:5173/#/tg/' + t); return;
  }
  const r = await w.fetch(new Request('http://w' + rq.url, { method: rq.method, headers: rq.headers, body: rq.method === 'GET' || rq.method === 'HEAD' ? undefined : body }), env);
  const h = {}; r.headers.forEach((v, k) => h[k] = v); rs.writeHead(r.status, h); rs.end(await r.text());
}).listen(8787, () => console.log('http://localhost:8787'));
