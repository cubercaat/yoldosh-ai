const fs = require('fs');
const dir = 'C:/Users/zafarx/yoldosh-ai/yoldosh/server/';
let s = fs.readFileSync(dir + 'worker.js', 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('yoq: ' + a.slice(0, 60)); s = s.replace(a, () => b); };
// 1) import va ctx
const firstConst = s.indexOf('\nconst ');
s = s.slice(0, firstConst) + "\nimport { handleStaff, decideOrder, notifyOrder, runChunk, createBroadcast, kickBroadcast, signBc, PERMS } from './staff.js';" + s.slice(firstConst);
rep('  async fetch(req, env) {', '  async fetch(req, env, ctx) {');
// 2) webhook
rep('await onUpdate(env, b); return json(env, { ok: true });', 'if (!(await handleStaff(env, ctx, url.origin, b))) await onUpdate(env, b); return json(env, { ok: true });');
rep("allowed_updates: ['message']", "allowed_updates: ['message', 'callback_query']");
// 3) /order/paid -> tugmali bildirishnoma
const a = s.indexOf("        if (o.status === 'new') {\n          const text = `💳 Yangi to'lov");
const bnd = s.indexOf("        return json(env, { ok: true });", a);
if (a < 0 || bnd < 0) throw new Error('order/paid topilmadi');
s = s.slice(0, a) + "        if (o.status === 'new') await notifyOrder(env, o, `${u.first} ${u.last}${u.username ? ' (@' + u.username + ')' : ''}`, clean(b.note, 200), siteUrl(env)).catch(() => { });\n" + s.slice(bnd);
// 4) /admin/order -> decideOrder
const c = s.indexOf("      if (url.pathname === '/admin/order') {");
const d = s.indexOf("      if (url.pathname === '/admin/broadcast')");
if (c < 0 || d < 0) throw new Error('admin/order topilmadi');
s = s.slice(0, c) + [
  "      if (url.pathname === '/admin/order') {",
  "        if (!(await adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);",
  "        const r = await decideOrder(env, num(b.id, 0, 1e9), b.action, b.reason);",
  "        return r.ok ? json(env, { ok: true }) : json(env, { error: r.error }, r.code || 400);",
  "      }",
  ""].join('\n') + s.slice(d);
// 5) /admin/broadcast -> ish tizimi + qo'shimcha endpointlar
const e = s.indexOf("      if (url.pathname === '/admin/broadcast')");
const f = s.indexOf("      if (url.pathname === '/admin/user') {");
if (e < 0 || f < 0) throw new Error('broadcast topilmadi');
const post = fs.readFileSync('C:/Users/zafarx/yoldosh-ai/import/staff-post.txt', 'utf8');
s = s.slice(0, e) + post + s.slice(f);
// 6) GET: staff va broadcasts
const get = fs.readFileSync('C:/Users/zafarx/yoldosh-ai/import/staff-get.txt', 'utf8');
rep("        if (url.pathname === '/health') return", get + "        if (url.pathname === '/health') return");
fs.writeFileSync(dir + 'worker.js', s);
let sc = fs.readFileSync(dir + 'schema.sql', 'utf8');
sc += "\n-- Telegram bot adminlari va ommaviy yuborish\nCREATE TABLE IF NOT EXISTS admins (tg_id TEXT PRIMARY KEY, name TEXT, perms TEXT NOT NULL, added_by TEXT, created INTEGER NOT NULL);\nCREATE TABLE IF NOT EXISTS broadcasts (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_tg TEXT NOT NULL, text TEXT, photo TEXT, btn_text TEXT, btn_url TEXT, audience TEXT NOT NULL, after INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, created INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0);\n";
fs.writeFileSync(dir + 'schema.sql', sc);
console.log('ok');
