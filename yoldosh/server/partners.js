/* Hamkorlar: blogerlar promokodi komissiyasi, referal daromadi (HAQIQIY pul) va pul yechish.
 *
 *  Bloger promokodi: admin kod yaratadi va ikki foizni o'zi belgilaydi:
 *    percent    — kod bilan sotib olgan foydalanuvchiga chegirma (%)
 *    commission — har bir tasdiqlangan to'lovdan blogerga (% , chegirmadan keyingi summadan)
 *  Statistika: kod bilan ro'yxatdan o'tganlar, sotib olganlar, tushum, blogerga hisoblangan / to'langan / qarz.
 *
 *  Referal: taklif qilingan do'st Pro/Premium/Max sotib olsa (to'lov tasdiqlansa), taklif qilgan odam hisobiga
 *  summaning `ref_percent` foizi (standart 10%) tushadi. Agar to'lovda komissiyali bloger kodi ishlatilgan bo'lsa,
 *  referal foizi berilmaydi (bir to'lovdan ikki marta ulush to'lanmasin).
 *  Pul yechish: kamida `payout_min` (standart 50 000 so'm), kartaga; admin qo'lda o'tkazib «To'landi» bosadi.
 *
 * Marshrutlar: GET /earn/me · POST /earn/payout
 *   Admin: GET /admin/partners · POST /admin/payout · POST /admin/promo-paid
 * Bu hisob simulyatordagi o'yin so'midan (wallet.js) butunlay alohida.
 */
import { setting } from './extras.js';
import { tg, staffIds } from './staff.js';

const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));
const say = (env, chat, text) => tg(env, 'sendMessage', { chat_id: chat, text }).catch(() => { });
const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + " so'm";

let _mig = false;
export async function migratePartners(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    "ALTER TABLE promos ADD COLUMN owner TEXT NOT NULL DEFAULT ''",
    'ALTER TABLE promos ADD COLUMN commission INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE users ADD COLUMN promo_src TEXT NOT NULL DEFAULT ''",
    'CREATE INDEX IF NOT EXISTS users_promo_src ON users (promo_src)',
    'CREATE INDEX IF NOT EXISTS orders_promo ON orders (promo, status)',
    'CREATE TABLE IF NOT EXISTS earn (user_id INTEGER PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0)',
    "CREATE TABLE IF NOT EXISTS earn_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL, order_id INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL)",
    'CREATE INDEX IF NOT EXISTS earn_log_u ON earn_log (user_id, id)',
    "CREATE UNIQUE INDEX IF NOT EXISTS earn_log_ref ON earn_log (order_id) WHERE kind = 'ref'",
    "CREATE TABLE IF NOT EXISTS payouts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, amount INTEGER NOT NULL, card TEXT NOT NULL, holder TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, updated INTEGER NOT NULL)",
    'CREATE INDEX IF NOT EXISTS payouts_st ON payouts (status, id)',
    'CREATE INDEX IF NOT EXISTS payouts_u ON payouts (user_id, id)',
    'CREATE TABLE IF NOT EXISTS promo_comm (order_id INTEGER PRIMARY KEY, promo_id INTEGER NOT NULL, amount INTEGER NOT NULL, comm INTEGER NOT NULL, at INTEGER NOT NULL, paid_at INTEGER NOT NULL DEFAULT 0)',
    'CREATE INDEX IF NOT EXISTS promo_comm_p ON promo_comm (promo_id, paid_at)',
  ]) { try { await env.DB.prepare(q).run(); } catch (e) { /* bor */ } }
}

export async function cfg(env) {
  return {
    refPercent: num(await setting(env, 'ref_percent', 10), 0, 50),
    payoutMin: num(await setting(env, 'payout_min', 50000), 1000, 1e8),
  };
}

/** ro'yxatdan o'tishda: foydalanuvchi qaysi promokod (bloger) orqali kelganini eslab qolish */
export async function markPromoSource(env, userId, code) {
  await migratePartners(env);
  code = clean(code, 24).toUpperCase(); if (!code) return;
  const p = await env.DB.prepare('SELECT id FROM promos WHERE code = ?').bind(code).first(); if (!p) return;
  await env.DB.prepare("UPDATE users SET promo_src = ? WHERE id = ? AND promo_src = ''").bind(code, userId).run();
}

/** to'lov tasdiqlanganda (staff.decideOrder) chaqiriladi: bloger komissiyasi + referal ulushi. Takroriy chaqiruv xavfsiz. */
export async function onOrderApproved(env, o) {
  await migratePartners(env);
  let bloggerPaid = false;
  if (o.promo) {
    const p = await env.DB.prepare('SELECT id, commission FROM promos WHERE code = ?').bind(o.promo).first();
    if (p && p.commission > 0) {
      bloggerPaid = true;
      const comm = Math.round(o.amount * p.commission / 100);
      await env.DB.prepare('INSERT OR IGNORE INTO promo_comm (order_id, promo_id, amount, comm, at) VALUES (?,?,?,?,?)').bind(o.id, p.id, o.amount, comm, Date.now()).run();
    }
    // kod bilan sotib olgan, lekin ro'yxatdan boshqa yo'l bilan o'tgan bo'lsa — manba sifatida shu kod yoziladi
    await env.DB.prepare("UPDATE users SET promo_src = ? WHERE id = ? AND promo_src = ''").bind(o.promo, o.user_id).run();
  }
  if (bloggerPaid) return;
  const c = await cfg(env); if (!c.refPercent) return;
  const buyer = await env.DB.prepare('SELECT ref, first FROM users WHERE id = ?').bind(o.user_id).first();
  const code = buyer && clean(buyer.ref, 12).toUpperCase(); if (!code || !/^R-[A-Z0-9]{6}$/.test(code)) return;
  let inv = null; try { inv = await env.DB.prepare('SELECT w.user_id, u.tg_id FROM wallet w JOIN users u ON u.id = w.user_id WHERE w.refcode = ?').bind(code).first(); } catch (e) { return; }
  if (!inv || inv.user_id === o.user_id) return;
  const amt = Math.floor(o.amount * c.refPercent / 100 / 100) * 100;      // 100 so'mga yaxlitlanadi
  if (amt <= 0) return;
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO earn_log (user_id, kind, amount, order_id, note, at) VALUES (?, 'ref', ?, ?, ?, ?)").bind(inv.user_id, amt, o.id, `${clean(buyer.first, 30)} ${o.tier || ''} sotib oldi`.trim(), Date.now()).run();
  if (!ins.meta || !ins.meta.changes) return;                                   // bu buyurtma uchun allaqachon yozilgan
  await env.DB.prepare('INSERT INTO earn (user_id, balance, total) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET balance = balance + excluded.balance, total = total + excluded.total').bind(inv.user_id, amt, amt).run();
  if (inv.tg_id) await say(env, inv.tg_id, `💰 Taklif qilgan do'stingiz tarif sotib oldi! Hisobingizga ${fmt(amt)} tushdi. Profil → «Referal daromad» bo'limidan kartangizga yechib olishingiz mumkin.`);
}

const maskCard = (c) => c.length >= 8 ? c.slice(0, 4) + ' **** **** ' + c.slice(-4) : c;

export async function partners(env, req, url, H) {
  const p = url.pathname, json = H.json;
  if (!/^\/(earn\/|admin\/(partners|payout|promo-paid))/.test(p)) return null;
  await migratePartners(env);

  if (p === '/earn/me' && req.method === 'GET') {
    const u = await H.sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
    const [e, log, pays, w, c, invited] = await Promise.all([
      env.DB.prepare('SELECT balance, total FROM earn WHERE user_id = ?').bind(u.id).first(),
      env.DB.prepare('SELECT kind, amount, note, at FROM earn_log WHERE user_id = ? ORDER BY id DESC LIMIT 30').bind(u.id).all(),
      env.DB.prepare('SELECT id, amount, card, status, note, created, updated FROM payouts WHERE user_id = ? ORDER BY id DESC LIMIT 10').bind(u.id).all(),
      env.DB.prepare('SELECT refcode FROM wallet WHERE user_id = ?').bind(u.id).first().catch(() => null),
      cfg(env),
      env.DB.prepare('SELECT COUNT(*) c FROM users WHERE ref = (SELECT refcode FROM wallet WHERE user_id = ?)').bind(u.id).first().catch(() => ({ c: 0 })),
    ]);
    return json(env, {
      balance: (e && e.balance) || 0, total: (e && e.total) || 0, refcode: (w && w.refcode) || '', invited: (invited && invited.c) || 0,
      percent: c.refPercent, min: c.payoutMin,
      log: (log.results || []), payouts: (pays.results || []).map((x) => ({ ...x, card: maskCard(x.card) })),
    });
  }

  if (p === '/earn/payout' && req.method === 'POST') {
    const u = await H.sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
    if (await H.over(env, 'po:' + u.id, 10, 3600)) return H.tooMany(env);
    const b = await req.json().catch(() => ({}));
    const c = await cfg(env), amount = num(b.amount, 0, 1e9), card = String(b.card || '').replace(/\D/g, ''), holder = clean(b.holder, 60);
    if (!/^\d{16}$/.test(card)) return json(env, { error: "Karta raqami 16 ta raqam bo'lishi kerak" }, 400);
    if (holder.length < 3) return json(env, { error: 'Karta egasining ism-familiyasini yozing' }, 400);
    if (amount < c.payoutMin) return json(env, { error: `Eng kam yechish summasi ${fmt(c.payoutMin)}` }, 400);
    const open = await env.DB.prepare("SELECT id FROM payouts WHERE user_id = ? AND status = 'new'").bind(u.id).first();
    if (open) return json(env, { error: "Oldingi so'rovingiz hali ko'rib chiqilmoqda" }, 400);
    /* poyga himoyasi: balans faqat yetarli bo'lsa va bir marta kamayadi */
    const dec = await env.DB.prepare('UPDATE earn SET balance = balance - ? WHERE user_id = ? AND balance >= ?').bind(amount, u.id, amount).run();
    if (!dec.meta || !dec.meta.changes) return json(env, { error: 'Hisobingizda yetarli mablag\' yo\'q' }, 400);
    const now = Date.now();
    const r = await env.DB.prepare('INSERT INTO payouts (user_id, amount, card, holder, status, created, updated) VALUES (?,?,?,?,?,?,?)').bind(u.id, amount, card, holder, 'new', now, now).run();
    await env.DB.prepare("INSERT INTO earn_log (user_id, kind, amount, order_id, note, at) VALUES (?, 'payout', ?, ?, ?, ?)").bind(u.id, -amount, r.meta.last_row_id, 'Kartaga yechish so\'rovi', now).run();
    const ids = await staffIds(env, 'orders');
    await Promise.all(ids.map((id) => say(env, id, `💸 Pul yechish so'rovi #${r.meta.last_row_id}\n${u.first} ${u.last}${u.username ? ' (@' + u.username + ')' : ''}\nSumma: ${fmt(amount)}\nKarta: ${card.replace(/(\d{4})(?=\d)/g, '$1 ')}\nEgasi: ${holder}\n\nAdmin panel → Hamkorlar → «To'landi»`)));
    return json(env, { ok: true, id: r.meta.last_row_id });
  }

  /* ---------- admin ---------- */
  if (!(await H.adminAllowed(env, req))) return json(env, { error: 'ruxsat yoq' }, 403);

  if (p === '/admin/partners' && req.method === 'GET') {
    const [promos, pays, sums, c] = await Promise.all([
      env.DB.prepare(`SELECT p.id, p.code, p.owner, p.percent, p.commission, p.days, p.active, p.used,
          (SELECT COUNT(*) FROM users u WHERE u.promo_src = p.code) reg,
          (SELECT COUNT(*) FROM orders o WHERE o.promo = p.code AND o.status = 'approved') buys,
          (SELECT COUNT(DISTINCT o.user_id) FROM orders o WHERE o.promo = p.code AND o.status = 'approved') buyers,
          (SELECT COALESCE(SUM(o.amount),0) FROM orders o WHERE o.promo = p.code AND o.status = 'approved') revenue,
          (SELECT COALESCE(SUM(comm),0) FROM promo_comm m WHERE m.promo_id = p.id) comm,
          (SELECT COALESCE(SUM(comm),0) FROM promo_comm m WHERE m.promo_id = p.id AND m.paid_at > 0) comm_paid
        FROM promos p ORDER BY p.created DESC LIMIT 200`).all(),
      env.DB.prepare(`SELECT y.id, y.amount, y.card, y.holder, y.status, y.note, y.created, y.updated, u.first, u.last, u.username, u.tg_id
        FROM payouts y JOIN users u ON u.id = y.user_id ORDER BY CASE y.status WHEN 'new' THEN 0 ELSE 1 END, y.id DESC LIMIT 100`).all(),
      env.DB.prepare(`SELECT (SELECT COALESCE(SUM(balance),0) FROM earn) owed, (SELECT COALESCE(SUM(amount),0) FROM payouts WHERE status = 'paid') paid,
        (SELECT COALESCE(SUM(amount),0) FROM payouts WHERE status = 'new') pending, (SELECT COALESCE(SUM(total),0) FROM earn) earned`).first(),
      cfg(env),
    ]);
    return json(env, { promos: promos.results || [], payouts: (pays.results || []).map((x) => x.status === 'new' ? x : { ...x, card: maskCard(x.card) }), ref: sums || {}, settings: c });
  }

  if (p === '/admin/payout' && req.method === 'POST') {
    const b = await req.json().catch(() => ({})), id = num(b.id, 0, 1e9), now = Date.now();
    const y = await env.DB.prepare('SELECT y.*, u.tg_id FROM payouts y JOIN users u ON u.id = y.user_id WHERE y.id = ?').bind(id).first();
    if (!y) return json(env, { error: 'topilmadi' }, 404);
    if (b.action === 'paid') {
      /* to'langandan keyin to'liq karta raqami saqlanmaydi — faqat oxirgi 4 raqam */
      const ok = await env.DB.prepare("UPDATE payouts SET status = 'paid', card = ?, updated = ? WHERE id = ? AND status = 'new'").bind('************' + y.card.slice(-4), now, id).run();
      if (!ok.meta || !ok.meta.changes) return json(env, { error: 'allaqachon hal qilingan' }, 400);
      if (y.tg_id) await say(env, y.tg_id, `✅ ${fmt(y.amount)} kartangizga (**** ${y.card.slice(-4)}) o'tkazildi. Rahmat!`);
      return json(env, { ok: true });
    }
    if (b.action === 'reject') {
      const why = clean(b.note, 160);
      const ok = await env.DB.prepare("UPDATE payouts SET status = 'rejected', note = ?, card = ?, updated = ? WHERE id = ? AND status = 'new'").bind(why, '************' + y.card.slice(-4), now, id).run();
      if (!ok.meta || !ok.meta.changes) return json(env, { error: 'allaqachon hal qilingan' }, 400);
      await env.DB.batch([
        env.DB.prepare('UPDATE earn SET balance = balance + ? WHERE user_id = ?').bind(y.amount, y.user_id),
        env.DB.prepare("INSERT INTO earn_log (user_id, kind, amount, order_id, note, at) VALUES (?, 'payout_back', ?, ?, ?, ?)").bind(y.user_id, y.amount, id, 'Yechish rad etildi, pul hisobga qaytdi', now),
      ]);
      if (y.tg_id) await say(env, y.tg_id, `❌ Pul yechish so'rovi rad etildi${why ? ': ' + why : ''}. ${fmt(y.amount)} hisobingizga qaytarildi.`);
      return json(env, { ok: true });
    }
    return json(env, { error: 'amal yoq' }, 400);
  }

  if (p === '/admin/promo-paid' && req.method === 'POST') {             // blogerga hisoblangan komissiya to'landi deb belgilash
    const b = await req.json().catch(() => ({}));
    const r = await env.DB.prepare('UPDATE promo_comm SET paid_at = ? WHERE promo_id = ? AND paid_at = 0').bind(Date.now(), num(b.id, 0, 1e9)).run();
    return json(env, { ok: true, n: (r.meta && r.meta.changes) || 0 });
  }
  return json(env, { error: 'topilmadi' }, 404);
}
