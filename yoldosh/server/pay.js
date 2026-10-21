/* Payme (Merchant API, JSON-RPC) va Click (Shop API: prepare/complete) orqali onlayn to'lov.
 * Kalitlar sirlar sifatida beriladi (wrangler secret put ...). Kalit bo'lmasa provayder o'chiq — qo'lda karta to'lovi ishlayveradi.
 *   Payme: PAYME_MERCHANT_ID, PAYME_KEY               Click: CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET
 * Marshrutlar: GET /pay/config · POST /pay/url · POST /pay/payme · POST /pay/click/prepare · POST /pay/click/complete
 * To'lov muvaffaqiyatli bo'lsa buyurtma avtomatik tasdiqlanadi (staff.decideOrder) va tarif ochiladi.
 */
import { decideOrder } from './staff.js';

/* ---- MD5 (Click imzosi uchun; Node va Workers da bir xil ishlashi uchun toza JS) ---- */
export function md5(str) {
  const rl = (x, c) => (x << c) | (x >>> (32 - c)), add = (a, b) => (a + b) | 0;
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21], K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0);
  const bytes = new TextEncoder().encode(str), n = bytes.length, len = ((n + 8) >> 6) + 1, w = new Int32Array(len * 16);
  for (let i = 0; i < n; i++) w[i >> 2] |= bytes[i] << ((i % 4) * 8);
  w[n >> 2] |= 0x80 << ((n % 4) * 8); w[len * 16 - 2] = n * 8; w[len * 16 - 1] = Math.floor(n * 8 / 4294967296);
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (let o = 0; o < w.length; o += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = D; D = C; C = B; B = add(B, rl(add(add(A, F), add(K[i], w[o + g])), S[(i >> 4) * 4 + (i % 4)])); A = tmp;
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D);
  }
  return [a0, b0, c0, d0].map(x => Array.from({ length: 4 }, (_, i) => ((x >>> (i * 8)) & 255).toString(16).padStart(2, '0')).join('')).join('');
}

let _mig = false;
async function migratePay(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    "CREATE TABLE IF NOT EXISTS ptx (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, ext_id TEXT NOT NULL, order_id INTEGER NOT NULL, amount INTEGER NOT NULL, state INTEGER NOT NULL DEFAULT 1, create_time INTEGER NOT NULL, perform_time INTEGER NOT NULL DEFAULT 0, cancel_time INTEGER NOT NULL DEFAULT 0, reason INTEGER, UNIQUE (provider, ext_id))",
    'CREATE INDEX IF NOT EXISTS ptx_order ON ptx (order_id, state)']) { try { await env.DB.prepare(q).run(); } catch (e) { /* bor */ } }
}
export const paymeOn = (env) => !!(env.PAYME_MERCHANT_ID && env.PAYME_KEY);
export const clickOn = (env) => !!(env.CLICK_SERVICE_ID && env.CLICK_MERCHANT_ID && env.CLICK_SECRET);

const site = (env) => (env.SITE_URL || 'https://chorrahaa.uz/').replace(/#.*$/, '').replace(/\/?$/, '/');
const okOrder = (o) => o && (o.status === 'new' || o.status === 'paid');
const PAYME_TIMEOUT = 12 * 36e5;

/* ---------------- Payme ---------------- */
const msg = (uz, ru, en) => ({ uz, ru, en });
const E = {
  auth: [-32504, msg('Ruxsat yo\'q', 'Недостаточно привилегий', 'Unauthorized')],
  method: [-32601, msg('Metod topilmadi', 'Метод не найден', 'Method not found')],
  amount: [-31001, msg("Noto'g'ri summa", 'Неверная сумма', 'Wrong amount')],
  order: [-31050, msg('Buyurtma topilmadi yoki to\'langan', 'Заказ не найден или оплачен', 'Order not found or paid')],
  busy: [-31099, msg('Buyurtma boshqa tranzaksiya bilan band', 'Заказ занят другой транзакцией', 'Order busy')],
  tx: [-31003, msg('Tranzaksiya topilmadi', 'Транзакция не найдена', 'Transaction not found')],
  state: [-31008, msg("Amalni bajarib bo'lmaydi", 'Невозможно выполнить операцию', 'Cannot perform')],
  nocancel: [-31007, msg("Buyurtma bajarilgan, bekor qilib bo'lmaydi", 'Заказ выполнен, отмена невозможна', 'Order completed, cannot cancel')],
};
class PErr extends Error { constructor(k, data) { super(k); this.k = k; this.data = data; } }

async function paymeCheck(env, params) {
  const orderId = +(params.account && params.account.order_id);
  const o = orderId ? await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first() : null;
  if (!okOrder(o)) throw new PErr('order', 'order_id');
  if (+params.amount !== o.amount * 100) throw new PErr('amount', 'amount');
  return o;
}
const txOut = (t) => ({ create_time: t.create_time, perform_time: t.perform_time, cancel_time: t.cancel_time, transaction: String(t.id), state: t.state, reason: t.reason === null || t.reason === undefined ? null : t.reason });

async function paymeCall(env, method, p) {
  if (method === 'CheckPerformTransaction') { await paymeCheck(env, p); return { allow: true }; }
  if (method === 'CreateTransaction') {
    const ex = await env.DB.prepare("SELECT * FROM ptx WHERE provider = 'payme' AND ext_id = ?").bind(String(p.id)).first();
    if (ex) {
      if (ex.state !== 1) throw new PErr('state');
      if (Date.now() - ex.create_time > PAYME_TIMEOUT) { await env.DB.prepare('UPDATE ptx SET state = -1, reason = 4, cancel_time = ? WHERE id = ?').bind(Date.now(), ex.id).run(); throw new PErr('state'); }
      return { create_time: ex.create_time, transaction: String(ex.id), state: 1 };
    }
    const o = await paymeCheck(env, p);
    const busy = await env.DB.prepare("SELECT id, create_time FROM ptx WHERE provider = 'payme' AND order_id = ? AND state = 1").bind(o.id).first();
    if (busy && Date.now() - busy.create_time <= PAYME_TIMEOUT) throw new PErr('busy');
    if (busy) await env.DB.prepare('UPDATE ptx SET state = -1, reason = 4, cancel_time = ? WHERE id = ?').bind(Date.now(), busy.id).run();
    const t0 = Math.floor(+p.time) || Date.now();
    const r = await env.DB.prepare("INSERT INTO ptx (provider, ext_id, order_id, amount, state, create_time) VALUES ('payme',?,?,?,1,?)").bind(String(p.id), o.id, +p.amount, t0).run();
    return { create_time: t0, transaction: String(r.meta.last_row_id), state: 1 };
  }
  const t = await env.DB.prepare("SELECT * FROM ptx WHERE provider = 'payme' AND ext_id = ?").bind(String(p.id)).first();
  if (method === 'CheckTransaction') { if (!t) throw new PErr('tx'); return txOut(t); }
  if (method === 'PerformTransaction') {
    if (!t) throw new PErr('tx');
    if (t.state === 2) return { transaction: String(t.id), perform_time: t.perform_time, state: 2 };
    if (t.state !== 1) throw new PErr('state');
    if (Date.now() - t.create_time > PAYME_TIMEOUT) { await env.DB.prepare('UPDATE ptx SET state = -1, reason = 4, cancel_time = ? WHERE id = ?').bind(Date.now(), t.id).run(); throw new PErr('state'); }
    const now = Date.now();
    await env.DB.prepare('UPDATE ptx SET state = 2, perform_time = ? WHERE id = ?').bind(now, t.id).run();
    await finish(env, t.order_id, 'payme');
    return { transaction: String(t.id), perform_time: now, state: 2 };
  }
  if (method === 'CancelTransaction') {
    if (!t) throw new PErr('tx');
    if (t.state === 1) { const now = Date.now(); await env.DB.prepare('UPDATE ptx SET state = -1, reason = ?, cancel_time = ? WHERE id = ?').bind(+p.reason || 0, now, t.id).run(); return { transaction: String(t.id), cancel_time: now, state: -1 }; }
    if (t.state === -1 || t.state === -2) return { transaction: String(t.id), cancel_time: t.cancel_time, state: t.state };
    throw new PErr('nocancel');                       // bajarilgan to'lov: qaytarish qo'lda (admin) qilinadi
  }
  if (method === 'GetStatement') {
    const rows = (await env.DB.prepare("SELECT * FROM ptx WHERE provider = 'payme' AND create_time >= ? AND create_time <= ? ORDER BY create_time").bind(+p.from || 0, +p.to || Date.now()).all()).results || [];
    return { transactions: rows.map(t => ({ id: t.ext_id, time: t.create_time, amount: t.amount, account: { order_id: t.order_id }, create_time: t.create_time, perform_time: t.perform_time, cancel_time: t.cancel_time, transaction: String(t.id), state: t.state, reason: t.reason ?? null })) };
  }
  throw new PErr('method');
}

/** buyurtmani tasdiqlaydi (tarif ochiladi, foydalanuvchiga Telegramdan xabar ketadi) */
async function finish(env, orderId, provider) {
  try { await env.DB.prepare("UPDATE orders SET note = ? WHERE id = ? AND (note IS NULL OR note = '')").bind(provider + ' (avtomatik)', orderId).run(); } catch (e) { /* izoh majburiy emas */ }
  const r = await decideOrder(env, orderId, 'approve');
  if (r && r.error && r.code !== 400) console.error('pay finish', provider, orderId, r.error);
}

async function payme(env, req) {
  const out = (o) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });
  let b = {}; try { b = await req.json(); } catch (e) { return out({ error: { code: -32700, message: 'Parse error' }, id: null }); }
  const eAuth = () => out({ error: { code: E.auth[0], message: E.auth[1] }, id: b.id ?? null });
  const h = req.headers.get('authorization') || '', m = /^Basic (.+)$/.exec(h); if (!paymeOn(env) || !m) return eAuth();
  let cred = ''; try { cred = atob(m[1]); } catch (e) { return eAuth(); }
  if (cred !== 'Paycom:' + env.PAYME_KEY) return eAuth();
  try { return out({ result: await paymeCall(env, b.method, b.params || {}), id: b.id ?? null }); }
  catch (e) { if (e instanceof PErr) { const [code, message] = E[e.k]; return out({ error: { code, message, ...(e.data ? { data: e.data } : {}) }, id: b.id ?? null }); } console.error('payme', e && e.stack || e); return out({ error: { code: -32400, message: 'Internal error' }, id: b.id ?? null }); }
}

/* ---------------- Click ---------------- */
async function click(env, req, step) {
  const out = (o) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });
  let f = {}; try { const ct = req.headers.get('content-type') || ''; if (ct.includes('json')) f = await req.json(); else for (const [k, v] of (await req.formData()).entries()) f[k] = String(v); } catch (e) { return out({ error: -8, error_note: 'Error in request from click' }); }
  const g = (k) => String(f[k] ?? '');
  const base = { click_trans_id: g('click_trans_id'), merchant_trans_id: g('merchant_trans_id') };
  if (!clickOn(env)) return out({ ...base, error: -1, error_note: 'SIGN CHECK FAILED!' });
  const want = step === 'prepare'
    ? md5(g('click_trans_id') + g('service_id') + env.CLICK_SECRET + g('merchant_trans_id') + g('amount') + g('action') + g('sign_time'))
    : md5(g('click_trans_id') + g('service_id') + env.CLICK_SECRET + g('merchant_trans_id') + g('merchant_prepare_id') + g('amount') + g('action') + g('sign_time'));
  if (want !== g('sign_string').toLowerCase() || g('service_id') !== String(env.CLICK_SERVICE_ID)) return out({ ...base, error: -1, error_note: 'SIGN CHECK FAILED!' });
  if (g('action') !== (step === 'prepare' ? '0' : '1')) return out({ ...base, error: -3, error_note: 'Action not found' });
  const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(+g('merchant_trans_id') || 0).first();
  if (!o) return out({ ...base, error: -5, error_note: 'User does not exist' });
  if (Math.abs(+g('amount') - o.amount) > 0.01) return out({ ...base, error: -2, error_note: 'Incorrect parameter amount' });
  const ex = await env.DB.prepare("SELECT * FROM ptx WHERE provider = 'click' AND ext_id = ?").bind(g('click_trans_id')).first();
  if (step === 'prepare') {
    if (o.status === 'approved') return out({ ...base, error: -4, error_note: 'Already paid' });
    if (o.status !== 'new' && o.status !== 'paid') return out({ ...base, error: -9, error_note: 'Transaction cancelled' });
    if (ex) return out({ ...base, merchant_prepare_id: ex.id, error: 0, error_note: 'Success' });
    const r = await env.DB.prepare("INSERT INTO ptx (provider, ext_id, order_id, amount, state, create_time) VALUES ('click',?,?,?,1,?)").bind(g('click_trans_id'), o.id, o.amount, Date.now()).run();
    return out({ ...base, merchant_prepare_id: r.meta.last_row_id, error: 0, error_note: 'Success' });
  }
  if (!ex || String(ex.id) !== g('merchant_prepare_id')) return out({ ...base, error: -6, error_note: 'Transaction does not exist' });
  if (ex.state === 2) return out({ ...base, merchant_confirm_id: ex.id, error: -4, error_note: 'Already paid' });
  if (ex.state < 0) return out({ ...base, error: -9, error_note: 'Transaction cancelled' });
  if (+g('error') < 0) { await env.DB.prepare('UPDATE ptx SET state = -1, cancel_time = ?, reason = ? WHERE id = ?').bind(Date.now(), +g('error'), ex.id).run(); return out({ ...base, error: -9, error_note: 'Transaction cancelled' }); }
  await env.DB.prepare('UPDATE ptx SET state = 2, perform_time = ? WHERE id = ?').bind(Date.now(), ex.id).run();
  await finish(env, o.id, 'click');
  return out({ ...base, merchant_confirm_id: ex.id, error: 0, error_note: 'Success' });
}

/* ---------------- marshrutlar ---------------- */
export async function payRoutes(env, req, url, H) {
  const p = url.pathname; if (!p.startsWith('/pay/')) return null;
  await migratePay(env);
  if (p === '/pay/config' && req.method === 'GET') return H.json(env, { payme: paymeOn(env), click: clickOn(env) });
  if (p === '/pay/payme' && req.method === 'POST') return payme(env, req);
  if (p === '/pay/click/prepare' && req.method === 'POST') return click(env, req, 'prepare');
  if (p === '/pay/click/complete' && req.method === 'POST') return click(env, req, 'complete');
  if (p === '/pay/url' && req.method === 'POST') {
    const u = await H.sessionUser(env, req); if (!u) return H.json(env, { error: 'kirish kerak' }, 401);
    const b = await req.json().catch(() => ({})); const o = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(+b.id || 0, u.id).first();
    if (!okOrder(o)) return H.json(env, { error: 'buyurtma topilmadi' }, 404);
    const back = site(env) + '?s=pay#/app/pro';
    if (b.provider === 'payme' && paymeOn(env)) {
      const raw = `m=${env.PAYME_MERCHANT_ID};ac.order_id=${o.id};a=${o.amount * 100};l=uz;c=${back}`;
      return H.json(env, { url: 'https://checkout.paycom.uz/' + btoa(raw) });
    }
    if (b.provider === 'click' && clickOn(env)) {
      return H.json(env, { url: `https://my.click.uz/services/pay?service_id=${encodeURIComponent(env.CLICK_SERVICE_ID)}&merchant_id=${encodeURIComponent(env.CLICK_MERCHANT_ID)}&amount=${o.amount}&transaction_param=${o.id}&return_url=${encodeURIComponent(back)}` });
    }
    return H.json(env, { error: "Bu to'lov usuli hozircha ulanmagan" }, 400);
  }
  return H.json(env, { error: 'topilmadi' }, 404);
}
