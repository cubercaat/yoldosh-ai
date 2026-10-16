const fs = require('fs');
const f = 'C:/Users/zafarx/yoldosh-ai/yoldosh/server/dev-auth.mjs';
let s = fs.readFileSync(f, 'utf8').split('\n');
s[11] = "const ctx = { waitUntil: (p) => { Promise.resolve(p).catch(() => { }); } };\n" +
  "globalThis.fetch = async (u, o) => { u = String(u); if (u.includes('/internal/bc')) return w.fetch(new Request(u.replace(/^https?:\\/\\/[^/]+/, 'http://w'), { method: 'POST', headers: o.headers, body: o.body }), env, ctx); const b = o && o.body ? JSON.parse(o.body) : {}; console.log('TG →', u.split('/').pop(), String(b.text || b.caption || '').split('\\n')[0], JSON.stringify(b.reply_markup || '')); return { ok: true, json: async () => ({ ok: true }) }; };";
let t = s.join('\n');
t = t.replace("body: rq.method === 'GET' || rq.method === 'HEAD' ? undefined : body }), env);", "body: rq.method === 'GET' || rq.method === 'HEAD' ? undefined : body }), env, ctx);");
t = t.replace("ADMIN_TG_IDS: '7'", "ADMIN_TG_IDS: '7'");
fs.writeFileSync(f, t);
console.log('ok', t.includes('env, ctx)'));
