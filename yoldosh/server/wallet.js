/* Chorraha hamyoni (O'YIN ICHIDAGI so'm — real pul emas, yechib bo'lmaydi) va shahar simulyatori vaqti.
 *  - Test javobi uchun mukofot (tarifga qarab), har savol faqat 1 marta to'laydi; javobni server QBANK bilan tekshiradi.
 *  - Bepul tarif: shaharda haydash vaqti (10 daqiqa), to'g'ri javob +18 soniya.
 *  - Test Pro: birinchi o'tish -> vaucher, ketma-ket 3 marta -> katta vaucher (faqat Pro va undan yuqori).
 *  - Referal: ro'yxatdan o'tganda taklif qilgan odamga; do'st 3 kun ketma-ket kirsa, keyingi har kun uchun kunlik bonus.
 *  - Radar jarimasi: faqat radar qayd etgan tezlik oshishi; balans 0 bo'lsa haydab bo'lmaydi.
 * Marshrutlar: GET /wallet/me · POST /wallet/checkin · /wallet/answer · /wallet/pro · /wallet/fine · /wallet/play · GET /wallet/log
 * Sozlamalar (admin «settings», hammasi ixtiyoriy): walletStart, freePlaySec, freeSecPerAnswer, rewFree, rewPro, rewPremium, rewMax,
 *   voucherPro1, voucherPro3, refReg, refDay, refDayAfter, bhm, radarTol
 */
import QBANK from './qbank.js';
import { setting, dayKey } from './extras.js';
import { tg } from './staff.js';

const QB = new Map(QBANK.map((r) => [r[0], r]));
const DEF = { walletStart: 1000000, freePlaySec: 600, freeSecPerAnswer: 18, rewFree: 30000, rewPro: 80000, rewPremium: 120000, rewMax: 200000, voucherPro1: 5000000, voucherPro3: 20000000, refReg: 10000, refDay: 500000, refDayAfter: 3, bhm: 440000, radarTol: 10 };
const num = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const TIERS = ['pro', 'premium', 'max'];
export const tierName = (u, admin) => admin ? 'max' : ((u.prem_until || 0) > Date.now() ? (TIERS.includes(u.prem_tier) ? u.prem_tier : 'pro') : '');

let _mig = false;
export async function migrateWallet(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    "CREATE TABLE IF NOT EXISTS wallet (user_id INTEGER PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0, play_sec INTEGER NOT NULL DEFAULT 0, refcode TEXT, streak INTEGER NOT NULL DEFAULT 0, last_day INTEGER NOT NULL DEFAULT 0, pro_streak INTEGER NOT NULL DEFAULT 0, pro_first INTEGER NOT NULL DEFAULT 0, pro_master INTEGER NOT NULL DEFAULT 0, last_play INTEGER NOT NULL DEFAULT 0, last_fine INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL)",
    'CREATE UNIQUE INDEX IF NOT EXISTS wallet_ref ON wallet (refcode) WHERE refcode IS NOT NULL',
    "CREATE TABLE IF NOT EXISTS wallet_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, sec INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL)",
    'CREATE INDEX IF NOT EXISTS wallet_log_u ON wallet_log (user_id, id)',
    'CREATE TABLE IF NOT EXISTS qpaid (user_id INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (user_id, n))',
    'CREATE TABLE IF NOT EXISTS ref_days (referee INTEGER NOT NULL, day INTEGER NOT NULL, PRIMARY KEY (referee, day))',
  ]) { try { await env.DB.prepare(q).run(); } catch (e) { /* bor */ } }
}

async function S(env) { const o = {}; for (const k of Object.keys(DEF)) o[k] = num(await setting(env, k, DEF[k]), 0, 1e12); return o; }
async function ensure(env, uid, cfg) {
  let w = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(uid).first();
  if (!w) {
    try { await env.DB.prepare('INSERT INTO wallet (user_id, balance, play_sec, created) VALUES (?,?,?,?)').bind(uid, cfg.walletStart, cfg.freePlaySec, Date.now()).run(); await log(env, uid, 'start', cfg.walletStart, 0, "Boshlang'ich balans"); } catch (e) { /* poyga */ }
    w = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(uid).first();
  }
  return w;
}
const log = (env, uid, kind, amount, sec, note) => env.DB.prepare('INSERT INTO wallet_log (user_id, kind, amount, sec, note, ts) VALUES (?,?,?,?,?,?)').bind(uid, kind, amount, sec, clean(note, 80), Date.now()).run();
const credit = async (env, uid, amount, kind, note, sec = 0) => { await env.DB.prepare('UPDATE wallet SET balance = balance + ?, play_sec = play_sec + ? WHERE user_id = ?').bind(amount, sec, uid).run(); await log(env, uid, kind, amount, sec, note); };
const pub = (w, tier, cfg) => ({ balance: w.balance, play_sec: w.play_sec, tier, streak: w.streak, pro_first: !!w.pro_first, pro_master: !!w.pro_master, pro_streak: w.pro_streak, can_drive: w.balance > 0 && (tier !== '' || w.play_sec > 0), unlimited_time: tier !== '', reward: { '': cfg.rewFree, pro: cfg.rewPro, premium: cfg.rewPremium, max: cfg.rewMax }[tier], bhm: cfg.bhm });

/** yangi foydalanuvchi ro'yxatdan o'tganda: taklif qilgan odamga +refReg (worker.js /auth/complete dan chaqiriladi) */
export async function onRegister(env, uid, ref) {
  try {
    await migrateWallet(env); const code = clean(ref, 12).toUpperCase(); if (!/^R-[A-Z0-9]{6}$/.test(code)) return;
    const cfg = await S(env), me = await env.DB.prepare('SELECT user_id FROM wallet WHERE refcode = ?').bind(code).first();
    if (!me || me.user_id === uid) return;
    await credit(env, me.user_id, cfg.refReg, 'ref', "Do'st taklifi");
  } catch (e) { /* hamyon yiqilsa ham ro'yxatdan o'tish ishlaydi */ }
}

export async function wallet(env, ctx, req, url, H) {
  const p = url.pathname, GET = req.method === 'GET', POST = req.method === 'POST';
  if (!p.startsWith('/wallet/')) return null;
  await migrateWallet(env);
  const { json, sessionUser, adminAllowed, over } = H;
  const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
  const cfg = await S(env), tier = tierName(u, !!(await adminAllowed(env, req)));
  const w = await ensure(env, u.id, cfg);
  let b = {}; if (POST) { try { b = await req.json(); } catch (e) { return json(env, { error: "noto'g'ri so'rov" }, 400); } }
  if (await over(env, 'rl:wal:' + u.id, 240, 60)) return json(env, { error: "juda ko'p so'rov" }, 429);

  if (p === '/wallet/me' && GET) return json(env, pub(w, tier, cfg));

  if (p === '/wallet/log' && GET) {
    const rows = (await env.DB.prepare('SELECT kind, amount, sec, note, ts FROM wallet_log WHERE user_id = ? ORDER BY id DESC LIMIT 30').bind(u.id).all()).results || [];
    return json(env, { log: rows });
  }

  /* kunlik kirish: streak + (agar shu foydalanuvchini taklif qilgan odam bo'lsa) unga kunlik bonus */
  if (p === '/wallet/checkin' && POST) {
    const today = dayKey(), code = clean(b.refCode, 12).toUpperCase();
    if (/^R-[A-Z0-9]{6}$/.test(code) && !w.refcode) { try { await env.DB.prepare('UPDATE wallet SET refcode = ? WHERE user_id = ? AND refcode IS NULL').bind(code, u.id).run(); } catch (e) { /* band kod */ } }
    let streak = w.streak, gained = 0;
    if (w.last_day !== today) {
      streak = w.last_day === today - 1 ? w.streak + 1 : 1;
      await env.DB.prepare('UPDATE wallet SET streak = ?, last_day = ? WHERE user_id = ?').bind(streak, today, u.id).run();
      if (u.ref && streak > cfg.refDayAfter) {
        const inv = await env.DB.prepare('SELECT user_id FROM wallet WHERE refcode = ?').bind(clean(u.ref, 12).toUpperCase()).first();
        if (inv && inv.user_id !== u.id) { try { await env.DB.prepare('INSERT INTO ref_days (referee, day) VALUES (?,?)').bind(u.id, today).run(); await credit(env, inv.user_id, cfg.refDay, 'ref_day', "Do'stingiz ketma-ket kirdi"); gained = cfg.refDay; } catch (e) { /* bugun to'langan */ } }
      }
    }
    const w2 = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(u.id).first();
    return json(env, { ...pub(w2, tier, cfg), invited_bonus: gained });
  }

  /* test javobi: to'g'ri bo'lsa va savol hali to'lanmagan bo'lsa — mukofot */
  if (p === '/wallet/answer' && POST) {
    const n = num(b.n, 1, 1e6), q = QB.get(n), pick = Number.isInteger(b.pick) ? b.pick : -1;
    if (!q || pick >= q[2].length) return json(env, { error: 'savol topilmadi' }, 400);
    const correct = pick >= 0 && pick === q[3]; let paid = false, reward = 0, sec = 0;
    if (correct) {
      try { await env.DB.prepare('INSERT INTO qpaid (user_id, n) VALUES (?,?)').bind(u.id, n).run(); paid = true; } catch (e) { paid = false; }
      if (paid) { reward = { '': cfg.rewFree, pro: cfg.rewPro, premium: cfg.rewPremium, max: cfg.rewMax }[tier]; sec = tier === '' ? cfg.freeSecPerAnswer : 0; await credit(env, u.id, reward, 'answer', `Savol #${n}`, sec); }
    }
    const w2 = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(u.id).first();
    return json(env, { correct, paid, reward, sec, ...pub(w2, tier, cfg) });
  }

  /* Test Pro natijasi: barcha javob server tomonidan tekshiriladi */
  if (p === '/wallet/pro' && POST) {
    if (!tier) return json(env, { error: 'Pro tarifi kerak', need: 'pro' }, 403);
    const a = Array.isArray(b.answers) ? b.answers.slice(0, 60) : [], sec = num(b.sec, 0, 36000);
    const seen = new Set(); let allOk = a.length >= 10;
    for (const x of a) { const n = num(x && x.n, 1, 1e6), q = QB.get(n); if (!q || seen.has(n) || !Number.isInteger(x.pick) || x.pick !== q[3]) allOk = false; seen.add(n); }
    if (a.length < 10 || sec < a.length * 2) allOk = false;     // juda tez yechilgan — qabul qilinmaydi
    let first = 0, master = 0, streak = 0;
    if (!allOk) { await env.DB.prepare('UPDATE wallet SET pro_streak = 0 WHERE user_id = ?').bind(u.id).run(); }
    else {
      streak = w.pro_streak + 1; await env.DB.prepare('UPDATE wallet SET pro_streak = ? WHERE user_id = ?').bind(streak, u.id).run();
      if (!w.pro_first) { await env.DB.prepare('UPDATE wallet SET pro_first = 1 WHERE user_id = ? AND pro_first = 0').bind(u.id).run(); await credit(env, u.id, cfg.voucherPro1, 'voucher', 'Test Pro: birinchi g\'alaba vaucheri'); first = cfg.voucherPro1; }
      if (streak >= 3 && !w.pro_master) { await env.DB.prepare('UPDATE wallet SET pro_master = 1 WHERE user_id = ? AND pro_master = 0').bind(u.id).run(); await credit(env, u.id, cfg.voucherPro3, 'voucher', 'Test Pro: 3 ketma-ket g\'alaba vaucheri'); master = cfg.voucherPro3; }
    }
    const w2 = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(u.id).first();
    return json(env, { passed: allOk, voucher: first + master, first, master, ...pub(w2, tier, cfg) });
  }

  /* shahar simulyatori: bepul tarif vaqti (har ~15 soniyada) */
  if (p === '/wallet/play' && POST) {
    if (tier) return json(env, pub(w, tier, cfg));
    const now = Date.now(), gap = w.last_play ? Math.ceil((now - w.last_play) / 1000) + 2 : 30, use = Math.min(num(b.sec, 0, 60), gap, w.play_sec);
    if (use > 0) await env.DB.prepare('UPDATE wallet SET play_sec = play_sec - ?, last_play = ? WHERE user_id = ?').bind(use, now, u.id).run(); else await env.DB.prepare('UPDATE wallet SET last_play = ? WHERE user_id = ?').bind(now, u.id).run();
    const w2 = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(u.id).first();
    return json(env, pub(w2, tier, cfg));
  }

  /* radar jarimasi: tezlik chegarasidan oshganda yoki svetofor kamerasi qizil chiroqni qayd etganda; 1 BHM (admin o'zgartiradi).
     Foydalanuvchiga Telegram botdan bildirishnoma ketadi. */
  if (p === '/wallet/fine' && POST) {
    const speed = num(b.speed, 0, 400), limit = num(b.limit, 5, 200), where = clean(b.where, 40), kind = b.kind === 'redlight' ? 'redlight' : b.kind === 'radar' ? 'radar' : '';
    if (!kind || (kind === 'radar' && speed < limit + cfg.radarTol)) return json(env, { error: "jarima asosi yo'q" }, 400);
    if (Date.now() - w.last_fine < 8000) return json(env, { ...pub(w, tier, cfg), fine: 0, dup: true });
    const fine = Math.min(cfg.bhm, w.balance);
    await env.DB.prepare('UPDATE wallet SET balance = balance - ?, last_fine = ? WHERE user_id = ?').bind(fine, Date.now(), u.id).run();
    const why = kind === 'radar' ? `Radar: ${speed}/${limit} km/s` : 'Svetofor kamerasi: qizil chiroq';
    await log(env, u.id, 'fine', -fine, 0, `${why}${where ? ' · ' + where : ''}`);
    const w2 = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(u.id).first();
    const msg = `📸 ${kind === 'radar' ? `Radar jarimasi: tezlik ${speed} km/s (chegara ${limit}).` : 'Svetofor kamerasi: qizil chiroqda o\'tdingiz.'}\nJarima: ${fine.toLocaleString('en-US').replace(/,/g, ' ')} so'm.\nHamyonda qoldi: ${w2.balance.toLocaleString('en-US').replace(/,/g, ' ')} so'm.${w2.balance <= 0 ? "\nBalans tugadi: test yechib pul ishlang, shunda yana haydashingiz mumkin." : ''}`;
    if (/^\d+$/.test(String(u.tg_id)) && fine > 0) ctx.waitUntil(tg(env, 'sendMessage', { chat_id: u.tg_id, text: msg }).catch(() => { }));
    return json(env, { fine, kind, speed, limit, where, ...pub(w2, tier, cfg) });
  }
  return json(env, { error: 'topilmadi' }, 404);
}
