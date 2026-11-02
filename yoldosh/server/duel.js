/* DUEL: 1v1 test bellashuvi (20 savol: kim ko'p va tez to'g'ri javob bersa, g'olib).
 *  - «Duelni boshlash»: haqiqiy raqib qidiriladi (navbatda kutayotgan odam bilan juftlashadi). Topilmasa o'yinchi xohlasa botga o'tadi.
 *  - BOT (ixtiyoriy, skript bilan — AI ishlatilmaydi): deyarli har doim 20/20, kam hollarda 19/20. Teng bo'lsa — bot yutadi.
 *    Odam botni faqat bot 19/20 qilganda va o'zi 20/20 yechganda yutadi; shunda «galichka» (✓) oladi, botni necha marta yutgani sanaladi.
 *    Botni ketma-ket 3 marta yutsa: ⭐ medal + 1 oylik Pro (hisob uchun 1 marta).
 *  - Ball: g'olib 20 + 2×to'g'ri, mag'lub = to'g'ri javoblar. Bot bilan o'yin reytingga ball bermaydi (faqat botni yutganda +30).
 *  - Liga (umumiy Duel ball bo'yicha): Bronza → Kumush (300) → Oltin (1000) → Olmos (2500).
 *  - Haftalik mukofot: o'tgan haftaning Duel g'olibiga 1 oylik Pro.
 * Marshrutlar: POST /duel/find · /duel/bot · /duel/:id/cancel · GET /duel/:id · POST /duel/:id/finish · GET /duel/board?p=d|w|a · GET /duel/me
 */
import QBANK from './qbank.js';
import { dayKey } from './extras.js';
import { tgCall } from './fsub.js';

const QN = QBANK.map((r) => r[0]), QB = new Map(QBANK.map((r) => [r[0], r]));
const NQ = 20, WAIT_MS = 90000, FORFEIT_MS = 240000, BOT_P19 = 0.07, BOT_WIN_PTS = 30, STREAK_GOAL = 3, DAY = 864e5;
export const LEAGUES = [['Bronza', 0], ['Kumush', 300], ['Oltin', 1000], ['Olmos', 2500]];
export const leagueOf = (pts) => { let i = 0; LEAGUES.forEach((l, k) => { if (pts >= l[1]) i = k; }); const nx = LEAGUES[i + 1]; return { i, name: LEAGUES[i][0], next: nx ? nx[0] : '', need: nx ? nx[1] - pts : 0, from: LEAGUES[i][1], to: nx ? nx[1] : 0 }; };
const wk = () => Math.floor((dayKey() + 3) / 7);
const periods = () => ['d' + dayKey(), 'w' + wk(), 'a'];
const TIERS = ['pro', 'premium', 'max'];
const tierOf = (u) => (u && (u.prem_until || 0) > Date.now() ? (TIERS.includes(u.prem_tier) ? u.prem_tier : 'pro') : '');

let _mig = false;
async function migrate(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    'CREATE TABLE IF NOT EXISTS duel_games (id INTEGER PRIMARY KEY AUTOINCREMENT, qs TEXT NOT NULL, p1 INTEGER NOT NULL, p2 INTEGER NOT NULL DEFAULT -1, status TEXT NOT NULL DEFAULT \'wait\', created INTEGER NOT NULL, started INTEGER NOT NULL DEFAULT 0, s1 INTEGER, t1 INTEGER, f1 INTEGER NOT NULL DEFAULT 0, s2 INTEGER, t2 INTEGER, f2 INTEGER NOT NULL DEFAULT 0, win INTEGER NOT NULL DEFAULT 0, pts1 INTEGER NOT NULL DEFAULT 0, pts2 INTEGER NOT NULL DEFAULT 0)',
    "ALTER TABLE duel_games ADD COLUMN ev TEXT NOT NULL DEFAULT ''",
    'CREATE INDEX IF NOT EXISTS duel_g_st ON duel_games (status, created)',
    'CREATE INDEX IF NOT EXISTS duel_g_p1 ON duel_games (p1, id)',
    'CREATE INDEX IF NOT EXISTS duel_g_p2 ON duel_games (p2, id)',
    'CREATE TABLE IF NOT EXISTS duel_pts (user_id INTEGER NOT NULL, period TEXT NOT NULL, pts INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, games INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, period))',
    'CREATE INDEX IF NOT EXISTS duel_pts_p ON duel_pts (period, pts)',
    'CREATE TABLE IF NOT EXISTS duel_prof (user_id INTEGER PRIMARY KEY, bot_wins INTEGER NOT NULL DEFAULT 0, bot_games INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, best INTEGER NOT NULL DEFAULT 0, medal INTEGER NOT NULL DEFAULT 0, tick INTEGER NOT NULL DEFAULT 0, pro_given INTEGER NOT NULL DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS duel_rewards (week INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, at INTEGER NOT NULL)']) {
    try { await env.DB.prepare(q).run(); } catch (e) { }
  }
}

/** bir xil o'yin uchun bir xil bot natijasi: deyarli har doim 20/20, ba'zan 19/20 */
export function botRun(id, n = NQ) {
  let s = (id * 2654435761) >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  return { score: rnd() < BOT_P19 ? n - 1 : n, ms: Math.round(n * (2300 + rnd() * 1500)) };
}
const pickQs = () => { const out = new Set(); while (out.size < NQ) out.add(QN[Math.floor(Math.random() * QN.length)]); return [...out]; };
const short = (u) => (u ? `${u.first} ${(u.last || '').slice(0, 1)}.` : 'Raqib');
const getProf = async (env, id) => (await env.DB.prepare('SELECT * FROM duel_prof WHERE user_id = ?').bind(id).first()) || { user_id: id, bot_wins: 0, bot_games: 0, streak: 0, best: 0, medal: 0, tick: 0, pro_given: 0 };
const apts = async (env, id) => { const r = await env.DB.prepare("SELECT pts FROM duel_pts WHERE user_id = ? AND period = 'a'").bind(id).first(); return r ? r.pts : 0; };

/** Pro berish: tarifi yuqori bo'lsa saqlanadi, muddat +days */
async function givePro(env, uid, days) {
  const now = Date.now();
  await env.DB.prepare("UPDATE users SET prem_tier = CASE WHEN prem_until > ?1 AND prem_tier IN ('premium','max') THEN prem_tier ELSE 'pro' END, prem_until = MAX(?1, prem_until) + ?2 WHERE id = ?3").bind(now, days * DAY, uid).run();
}
async function notify(env, uid, text) {
  try { const u = await env.DB.prepare('SELECT tg_id FROM users WHERE id = ?').bind(uid).first(); if (u && u.tg_id && env.TELEGRAM_BOT_TOKEN) await tgCall(env, 'sendMessage', { chat_id: u.tg_id, text }); } catch (e) { }
}

/** o'tgan haftaning g'olibiga 1 oylik Pro (bir marta) */
let _rwDay = -1; export const _resetReward = () => { _rwDay = -1; };
async function weeklyReward(env) {
  const d = dayKey(); if (_rwDay === d) return; _rwDay = d;
  const prev = wk() - 1;
  try {
    const top = await env.DB.prepare('SELECT user_id, pts FROM duel_pts WHERE period = ? AND pts > 0 ORDER BY pts DESC, wins DESC LIMIT 1').bind('w' + prev).first(); if (!top) return;
    const m = await env.DB.prepare('INSERT OR IGNORE INTO duel_rewards (week, user_id, at) VALUES (?,?,?)').bind(prev, top.user_id, Date.now()).run();
    if (m.meta && m.meta.changes) { await givePro(env, top.user_id, 30); await notify(env, top.user_id, '🏆 Tabriklaymiz! Siz o\'tgan haftaning Duel g\'olibisiz — sizga 1 oylik Pro sovg\'a qilindi.'); }
  } catch (e) { }
}

/** o'yinni yakunlash: g'olibni aniqlaydi, ballar va yutuqlarni yozadi (faqat bir marta) */
async function settle(env, g) {
  const n = JSON.parse(g.qs).length, bot = g.p2 === 0, r2 = bot ? botRun(g.id, n) : { score: g.s2 || 0, ms: g.t2 || 0 };
  const s1 = g.s1 || 0, t1 = g.t1 || 0, s2 = r2.score, t2 = r2.ms;
  const win = bot ? (s1 > s2 ? g.p1 : g.p2) : (s1 > s2 || (s1 === s2 && t1 < t2) ? g.p1 : (s1 === s2 && t1 === t2 ? -1 : g.p2));
  const pts = (score, won) => (won ? 20 + 2 * score : score);
  const a = bot ? (win === g.p1 ? BOT_WIN_PTS : 0) : pts(s1, win === g.p1), b = bot ? 0 : pts(s2, win === g.p2);
  const ev = {};
  if (bot) {
    const pr = await getProf(env, g.p1), won = win === g.p1, streak = won ? pr.streak + 1 : 0;
    let medal = pr.medal, tick = pr.tick, proGiven = pr.pro_given;
    if (won && !tick) { tick = 1; ev.tick = 1; }
    if (streak >= STREAK_GOAL && !medal) { medal = 1; ev.medal = 1; }
    if (medal && !proGiven) { proGiven = 1; ev.pro = 1; }
    ev.streak = streak; ev.botWins = pr.bot_wins + (won ? 1 : 0);
    await env.DB.prepare('INSERT INTO duel_prof (user_id, bot_wins, bot_games, streak, best, medal, tick, pro_given) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET bot_wins = ?, bot_games = ?, streak = ?, best = ?, medal = ?, tick = ?, pro_given = ?')
      .bind(g.p1, ev.botWins, pr.bot_games + 1, streak, Math.max(pr.best, streak), medal, tick, proGiven, ev.botWins, pr.bot_games + 1, streak, Math.max(pr.best, streak), medal, tick, proGiven).run();
  }
  const m = await env.DB.prepare("UPDATE duel_games SET status = 'done', win = ?, s2 = ?, t2 = ?, pts1 = ?, pts2 = ?, ev = ? WHERE id = ? AND status != 'done'").bind(win, s2, t2, a, b, JSON.stringify(ev), g.id).run();
  if (!m.meta || !m.meta.changes) return;
  if (ev.pro) { await givePro(env, g.p1, 30); await notify(env, g.p1, '⭐ Tabriklaymiz! Botni ketma-ket 3 marta yutdingiz — sizga medal va 1 oylik Pro sovg\'a qilindi.'); }
  const add = async (uid, p, won) => {
    if (uid <= 0 || (bot && p === 0 && !won)) { if (uid > 0) await env.DB.batch(periods().map((per) => env.DB.prepare('INSERT INTO duel_pts (user_id, period, pts, wins, games) VALUES (?,?,0,0,1) ON CONFLICT(user_id, period) DO UPDATE SET games = games + 1').bind(uid, per))); return; }
    const st = periods().map((per) => env.DB.prepare('INSERT INTO duel_pts (user_id, period, pts, wins, games) VALUES (?,?,?,?,1) ON CONFLICT(user_id, period) DO UPDATE SET pts = pts + ?, wins = wins + ?, games = games + 1').bind(uid, per, p, won ? 1 : 0, p, won ? 1 : 0));
    st.push(env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(p, uid)); await env.DB.batch(st);
  };
  await add(g.p1, a, win === g.p1); await add(g.p2, b, win === g.p2);
}

/** raqib / o'yinchi haqida ochiq ma'lumot: ism, tarif, galichka, medal, liga */
async function card(env, id) {
  if (id === 0) return { name: 'Bot', bot: true, tier: '', tick: 0, medal: 0, league: 'Olmos', li: 3, botWins: 0 };
  const u = await env.DB.prepare('SELECT first, last, prem_until, prem_tier FROM users WHERE id = ?').bind(id).first(), pr = await getProf(env, id), lg = leagueOf(await apts(env, id));
  return { name: short(u), bot: false, tier: tierOf(u), tick: pr.tick, medal: pr.medal, league: lg.name, li: lg.i, botWins: pr.bot_wins };
}

async function view(env, g, uid) {
  const me1 = g.p1 === uid, bot = g.p2 === 0, oppId = me1 ? g.p2 : g.p1;
  const out = { id: g.id, status: g.status, qs: JSON.parse(g.qs), opp: oppId === -1 ? { name: '…', bot: false, tier: '', tick: 0, medal: 0, league: '', li: 0 } : await card(env, oppId), me: await card(env, uid), myDone: !!(me1 ? g.f1 : g.f2) };
  if (g.status === 'done') {
    const n = out.qs.length, r2 = bot ? botRun(g.id, n) : null, my = me1 ? { s: g.s1, t: g.t1 } : { s: g.s2, t: g.t2 }, op = me1 ? { s: bot ? r2.score : g.s2, t: bot ? r2.ms : g.t2 } : { s: g.s1, t: g.t1 };
    let ev = {}; try { ev = JSON.parse(g.ev || '{}'); } catch (e) { }
    out.result = { me: my.s || 0, opp: op.s || 0, total: n, meMs: my.t || 0, oppMs: op.t || 0, win: g.win === uid ? 'win' : g.win === -1 ? 'draw' : 'lose', pts: me1 ? g.pts1 : g.pts2, ev: bot && me1 ? ev : {} };
  }
  return out;
}

export async function duel(env, req, url, H) {
  const p = url.pathname; if (!p.startsWith('/duel/')) return null;
  await migrate(env);
  const { json, sessionUser, over } = H, GET = req.method === 'GET';
  const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
  if (await over(env, 'rl:duel:' + u.id, 300, 60)) return json(env, { error: "juda ko'p so'rov" }, 429);
  await weeklyReward(env);
  const one = (id) => env.DB.prepare('SELECT * FROM duel_games WHERE id = ?').bind(id).first();

  if (p === '/duel/find' && !GET) {
    const open = await env.DB.prepare("SELECT * FROM duel_games WHERE (p1 = ? OR p2 = ?) AND status != 'done' AND created > ? ORDER BY id DESC LIMIT 1").bind(u.id, u.id, Date.now() - 600000).first();
    if (open && !(open.status === 'wait' && Date.now() - open.created > WAIT_MS) && !(open.p2 === 0)) return json(env, { id: open.id });
    const w = await env.DB.prepare("SELECT * FROM duel_games WHERE status = 'wait' AND p1 != ? AND created > ? ORDER BY id LIMIT 1").bind(u.id, Date.now() - WAIT_MS).first();
    if (w) {
      const m = await env.DB.prepare("UPDATE duel_games SET p2 = ?, status = 'live', started = ? WHERE id = ? AND status = 'wait'").bind(u.id, Date.now(), w.id).run();
      if (m.meta && m.meta.changes) return json(env, { id: w.id });
    }
    const r = await env.DB.prepare("INSERT INTO duel_games (qs, p1, status, created) VALUES (?,?, 'wait', ?)").bind(JSON.stringify(pickQs()), u.id, Date.now()).run();
    return json(env, { id: r.meta.last_row_id });
  }

  if (p === '/duel/bot' && !GET) {                       // ixtiyoriy: bot bilan o'ynash (kutayotgan o'yin bo'lsa — botga aylanadi)
    const wait = await env.DB.prepare("SELECT * FROM duel_games WHERE p1 = ? AND status = 'wait' AND created > ? ORDER BY id DESC LIMIT 1").bind(u.id, Date.now() - 600000).first();
    if (wait) { await env.DB.prepare("UPDATE duel_games SET p2 = 0, status = 'live', started = ? WHERE id = ? AND status = 'wait'").bind(Date.now(), wait.id).run(); return json(env, { id: wait.id }); }
    const live = await env.DB.prepare("SELECT * FROM duel_games WHERE p1 = ? AND p2 = 0 AND status = 'live' AND f1 = 0 AND created > ? ORDER BY id DESC LIMIT 1").bind(u.id, Date.now() - 600000).first();
    if (live) return json(env, { id: live.id });
    const r = await env.DB.prepare("INSERT INTO duel_games (qs, p1, p2, status, created, started) VALUES (?,?,0,'live',?,?)").bind(JSON.stringify(pickQs()), u.id, Date.now(), Date.now()).run();
    return json(env, { id: r.meta.last_row_id });
  }

  if (p === '/duel/board' && GET) {
    const per = { d: 'd' + dayKey(), w: 'w' + wk(), a: 'a' }[url.searchParams.get('p')] || 'w' + wk();
    const rows = await env.DB.prepare("SELECT d.user_id, d.pts, d.wins, d.games, u.first, u.last, u.region, u.prem_until, u.prem_tier, COALESCE(f.tick,0) tick, COALESCE(f.medal,0) medal, COALESCE((SELECT pts FROM duel_pts x WHERE x.user_id = d.user_id AND x.period = 'a'),0) apts FROM duel_pts d JOIN users u ON u.id = d.user_id LEFT JOIN duel_prof f ON f.user_id = d.user_id WHERE d.period = ? AND d.pts > 0 ORDER BY d.pts DESC, d.wins DESC LIMIT 20").bind(per).all();
    const mine = await env.DB.prepare('SELECT pts, wins, games FROM duel_pts WHERE user_id = ? AND period = ?').bind(u.id, per).first();
    let rank = 0; if (mine && mine.pts > 0) rank = ((await env.DB.prepare('SELECT COUNT(*) c FROM duel_pts WHERE period = ? AND pts > ?').bind(per, mine.pts).first()).c || 0) + 1;
    const list = (rows.results || []).map((r, i) => ({ rank: i + 1, name: short(r), region: r.region || '', pts: r.pts, wins: r.wins, games: r.games, tier: tierOf(r), tick: r.tick, medal: r.medal, league: leagueOf(r.apts).name, li: leagueOf(r.apts).i, me: r.user_id === u.id }));
    return json(env, { list, me: { pts: mine ? mine.pts : 0, wins: mine ? mine.wins : 0, games: mine ? mine.games : 0, rank } });
  }

  if (p === '/duel/me' && GET) {
    const rows = await env.DB.prepare('SELECT period, pts, wins, games FROM duel_pts WHERE user_id = ? AND period IN (?,?,?)').bind(u.id, ...periods()).all(), o = {};
    for (const r of rows.results || []) o[r.period[0]] = { pts: r.pts, wins: r.wins, games: r.games };
    const z = { pts: 0, wins: 0, games: 0 }, pr = await getProf(env, u.id), lg = leagueOf((o.a || z).pts);
    return json(env, { d: o.d || z, w: o.w || z, a: o.a || z, league: lg, bot: { wins: pr.bot_wins, games: pr.bot_games, streak: pr.streak, best: pr.best, goal: STREAK_GOAL, medal: pr.medal, tick: pr.tick } });
  }

  const mm = /^\/duel\/(\d+)(\/finish|\/cancel)?$/.exec(p); if (!mm) return json(env, { error: 'topilmadi' }, 404);
  let g = await one(Number(mm[1]));
  if (!g || (g.p1 !== u.id && g.p2 !== u.id)) return json(env, { error: 'topilmadi' }, 404);

  if (mm[2] === '/cancel' && !GET) {
    if (g.status === 'wait' && g.p1 === u.id) await env.DB.prepare('DELETE FROM duel_games WHERE id = ? AND status = ?').bind(g.id, 'wait').run();
    return json(env, { ok: true });
  }

  if (mm[2] === '/finish' && !GET) {
    let b; try { b = await req.json(); } catch (e) { return json(env, { error: "noto'g'ri so'rov" }, 400); }
    if (g.status === 'wait') return json(env, { error: "o'yin hali boshlanmagan" }, 400);
    const me1 = g.p1 === u.id; if (me1 ? g.f1 : g.f2) return json(env, await view(env, g, u.id));
    const qs = JSON.parse(g.qs), picks = Array.isArray(b.picks) ? b.picks : []; let score = 0;
    qs.forEach((n, i) => { const q = QB.get(n); if (q && Number.isInteger(picks[i]) && picks[i] === q[3]) score++; });
    const ms = Math.max(qs.length * 1200, Math.min(qs.length * 60000, Math.floor(Number(b.ms) || 0)));   // odamga imkonsiz tez vaqt yozilmaydi
    await env.DB.prepare(me1 ? 'UPDATE duel_games SET s1 = ?, t1 = ?, f1 = 1 WHERE id = ?' : 'UPDATE duel_games SET s2 = ?, t2 = ?, f2 = 1 WHERE id = ?').bind(score, ms, g.id).run();
    g = await one(g.id);
    if (g.p2 === 0 || (g.f1 && g.f2)) await settle(env, g);
    return json(env, await view(env, await one(g.id), u.id));
  }

  if (GET) {
    if (g.status === 'live' && g.p2 !== 0 && (g.f1 !== g.f2) && Date.now() - g.started > FORFEIT_MS) {   // raqib chiqib ketgan: texnik g'alaba
      await env.DB.prepare(g.f1 === 1 ? 'UPDATE duel_games SET s2 = 0, t2 = 9999999, f2 = 1 WHERE id = ?' : 'UPDATE duel_games SET s1 = 0, t1 = 9999999, f1 = 1 WHERE id = ?').bind(g.id).run();
      await settle(env, await one(g.id)); g = await one(g.id);
    }
    return json(env, await view(env, g, u.id));
  }
  return json(env, { error: 'topilmadi' }, 404);
}
