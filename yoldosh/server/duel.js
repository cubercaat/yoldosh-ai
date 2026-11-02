/* DUEL: 1v1 test bellashuvi (10 savol: kim ko'p va tez to'g'ri javob bersa, g'olib).
 *  - Raqib topish: navbatda kutayotgan odam bo'lsa — u bilan; 8 soniyada topilmasa — bot (o'yinchiga «Bot» deb ko'rsatiladi).
 *  - Ikkala o'yinchi bir xil 10 savolni o'zi yechadi; javoblarni server QBANK bilan tekshiradi.
 *  - Ball: g'olib 20 + 2×to'g'ri, mag'lub = to'g'ri javoblar soni; bot bilan o'yinda yarmi, kuniga 20 ta botli o'yingacha.
 *  - Ball ikki joyga yoziladi: Duel reytingi (kunlik / haftalik / umumiy) va umumiy reyting (users.points).
 * Marshrutlar: POST /duel/find · GET /duel/:id · POST /duel/:id/finish · GET /duel/board?p=d|w|a · GET /duel/me
 */
import QBANK from './qbank.js';
import { dayKey } from './extras.js';

const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const QN = QBANK.map((r) => r[0]), QB = new Map(QBANK.map((r) => [r[0], r]));
const NQ = 10, WAIT_MS = 8000, FORFEIT_MS = 120000, BOT_DAILY = 20;
const wk = () => Math.floor((dayKey() + 3) / 7);
const periods = () => ['d' + dayKey(), 'w' + wk(), 'a'];

let _mig = false;
async function migrate(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    'CREATE TABLE IF NOT EXISTS duel_games (id INTEGER PRIMARY KEY AUTOINCREMENT, qs TEXT NOT NULL, p1 INTEGER NOT NULL, p2 INTEGER NOT NULL DEFAULT -1, status TEXT NOT NULL DEFAULT \'wait\', created INTEGER NOT NULL, started INTEGER NOT NULL DEFAULT 0, s1 INTEGER, t1 INTEGER, f1 INTEGER NOT NULL DEFAULT 0, s2 INTEGER, t2 INTEGER, f2 INTEGER NOT NULL DEFAULT 0, win INTEGER NOT NULL DEFAULT 0, pts1 INTEGER NOT NULL DEFAULT 0, pts2 INTEGER NOT NULL DEFAULT 0)',
    'CREATE INDEX IF NOT EXISTS duel_g_st ON duel_games (status, created)',
    'CREATE INDEX IF NOT EXISTS duel_g_p1 ON duel_games (p1, id)',
    'CREATE INDEX IF NOT EXISTS duel_g_p2 ON duel_games (p2, id)',
    'CREATE TABLE IF NOT EXISTS duel_pts (user_id INTEGER NOT NULL, period TEXT NOT NULL, pts INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, games INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, period))',
    'CREATE INDEX IF NOT EXISTS duel_pts_p ON duel_pts (period, pts)']) {
    try { await env.DB.prepare(q).run(); } catch (e) { }
  }
}

/** bir xil o'yin uchun bir xil bot natijasi (id bo'yicha) */
function botRun(id) {
  let s = (id * 2654435761) >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const acc = 0.5 + rnd() * 0.35; let ok = 0; for (let i = 0; i < NQ; i++) if (rnd() < acc) ok++;
  return { score: ok, ms: Math.round(NQ * (3500 + rnd() * 5500)) };
}
const pickQs = () => { const out = new Set(); while (out.size < NQ) out.add(QN[Math.floor(Math.random() * QN.length)]); return [...out]; };
const nameOf = async (env, id) => { if (id === 0) return 'Bot'; const u = await env.DB.prepare('SELECT first, last FROM users WHERE id = ?').bind(id).first(); return u ? `${u.first} ${(u.last || '').slice(0, 1)}.` : 'Raqib'; };

/** o'yinni yakunlash: g'olibni aniqlaydi, ballarni yozadi (faqat bir marta) */
async function settle(env, g) {
  const bot = g.p2 === 0, r2 = bot ? botRun(g.id) : { score: g.s2 || 0, ms: g.t2 || 0 };
  const s1 = g.s1 || 0, t1 = g.t1 || 0, s2 = r2.score, t2 = r2.ms;
  const win = s1 > s2 || (s1 === s2 && t1 < t2) ? g.p1 : (s1 === s2 && t1 === t2 ? -1 : g.p2);
  const pts = (score, won, isBot) => { const v = (won ? 20 + 2 * score : score); return isBot ? Math.floor(v / 2) : v; };
  let a = pts(s1, win === g.p1, bot), b = bot ? 0 : pts(s2, win === g.p2, false);
  if (bot) { const c = await env.DB.prepare("SELECT COUNT(*) c FROM duel_games WHERE p1 = ? AND p2 = 0 AND status = 'done' AND created > ?").bind(g.p1, Date.now() - 864e5).first(); if ((c && c.c) >= BOT_DAILY) a = 0; }
  const m = await env.DB.prepare("UPDATE duel_games SET status = 'done', win = ?, s2 = ?, t2 = ?, pts1 = ?, pts2 = ? WHERE id = ? AND status != 'done'").bind(win, s2, t2, a, b, g.id).run();
  if (!m.meta || !m.meta.changes) return;
  const add = async (uid, pts, won) => {
    if (uid <= 0) return;
    const st = periods().map((p) => env.DB.prepare('INSERT INTO duel_pts (user_id, period, pts, wins, games) VALUES (?,?,?,?,1) ON CONFLICT(user_id, period) DO UPDATE SET pts = pts + ?, wins = wins + ?, games = games + 1').bind(uid, p, pts, won ? 1 : 0, pts, won ? 1 : 0));
    st.push(env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(pts, uid)); await env.DB.batch(st);
  };
  await add(g.p1, a, win === g.p1); await add(g.p2, b, win === g.p2);
}

async function view(env, g, uid) {
  const me1 = g.p1 === uid, bot = g.p2 === 0, oppId = me1 ? g.p2 : g.p1;
  const out = { id: g.id, status: g.status, qs: JSON.parse(g.qs), opp: { name: oppId === -1 ? '…' : await nameOf(env, oppId), bot: oppId === 0 }, myDone: !!(me1 ? g.f1 : g.f2) };
  if (g.status === 'done') {
    const r2 = bot ? botRun(g.id) : null, my = me1 ? { s: g.s1, t: g.t1 } : { s: g.s2, t: g.t2 }, op = me1 ? { s: bot ? r2.score : g.s2, t: bot ? r2.ms : g.t2 } : { s: g.s1, t: g.t1 };
    out.result = { me: my.s || 0, opp: op.s || 0, meMs: my.t || 0, oppMs: op.t || 0, win: g.win === uid ? 'win' : g.win === -1 ? 'draw' : 'lose', pts: me1 ? g.pts1 : g.pts2 };
  }
  return out;
}

export async function duel(env, req, url, H) {
  const p = url.pathname; if (!p.startsWith('/duel/')) return null;
  await migrate(env);
  const { json, sessionUser, over } = H, GET = req.method === 'GET';
  const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
  if (await over(env, 'rl:duel:' + u.id, 300, 60)) return json(env, { error: "juda ko'p so'rov" }, 429);

  if (p === '/duel/find' && !GET) {
    const open = await env.DB.prepare("SELECT * FROM duel_games WHERE (p1 = ? OR p2 = ?) AND status != 'done' AND created > ? ORDER BY id DESC LIMIT 1").bind(u.id, u.id, Date.now() - 600000).first();
    if (open && !(open.f1 && open.p1 === u.id)) return json(env, { id: open.id });
    const w = await env.DB.prepare("SELECT * FROM duel_games WHERE status = 'wait' AND p1 != ? AND created > ? ORDER BY id LIMIT 1").bind(u.id, Date.now() - WAIT_MS).first();
    if (w) {
      const m = await env.DB.prepare("UPDATE duel_games SET p2 = ?, status = 'live', started = ? WHERE id = ? AND status = 'wait'").bind(u.id, Date.now(), w.id).run();
      if (m.meta && m.meta.changes) return json(env, { id: w.id });
    }
    const r = await env.DB.prepare("INSERT INTO duel_games (qs, p1, status, created) VALUES (?,?, 'wait', ?)").bind(JSON.stringify(pickQs()), u.id, Date.now()).run();
    return json(env, { id: r.meta.last_row_id });
  }

  if (p === '/duel/board' && GET) {
    const per = { d: 'd' + dayKey(), w: 'w' + wk(), a: 'a' }[url.searchParams.get('p')] || 'w' + wk();
    const rows = await env.DB.prepare('SELECT d.user_id, d.pts, d.wins, d.games, u.first, u.last, u.region FROM duel_pts d JOIN users u ON u.id = d.user_id WHERE d.period = ? AND d.pts > 0 ORDER BY d.pts DESC, d.wins DESC LIMIT 20').bind(per).all();
    const mine = await env.DB.prepare('SELECT pts, wins, games FROM duel_pts WHERE user_id = ? AND period = ?').bind(u.id, per).first();
    let rank = 0; if (mine && mine.pts > 0) rank = ((await env.DB.prepare('SELECT COUNT(*) c FROM duel_pts WHERE period = ? AND pts > ?').bind(per, mine.pts).first()).c || 0) + 1;
    const list = (rows.results || []).map((r, i) => ({ rank: i + 1, name: `${r.first} ${(r.last || '').slice(0, 1)}.`, region: r.region || '', pts: r.pts, wins: r.wins, games: r.games, me: r.user_id === u.id }));
    return json(env, { list, me: { pts: mine ? mine.pts : 0, wins: mine ? mine.wins : 0, games: mine ? mine.games : 0, rank } });
  }

  if (p === '/duel/me' && GET) {
    const rows = await env.DB.prepare('SELECT period, pts, wins, games FROM duel_pts WHERE user_id = ? AND period IN (?,?,?)').bind(u.id, ...periods()).all(), o = {};
    for (const r of rows.results || []) o[r.period[0]] = { pts: r.pts, wins: r.wins, games: r.games };
    return json(env, { d: o.d || { pts: 0, wins: 0, games: 0 }, w: o.w || { pts: 0, wins: 0, games: 0 }, a: o.a || { pts: 0, wins: 0, games: 0 } });
  }

  const mm = /^\/duel\/(\d+)(\/finish)?$/.exec(p); if (!mm) return json(env, { error: 'topilmadi' }, 404);
  let g = await env.DB.prepare('SELECT * FROM duel_games WHERE id = ?').bind(Number(mm[1])).first();
  if (!g || (g.p1 !== u.id && g.p2 !== u.id)) return json(env, { error: 'topilmadi' }, 404);

  if (mm[2] && !GET) {
    let b; try { b = await req.json(); } catch (e) { return json(env, { error: "noto'g'ri so'rov" }, 400); }
    if (g.status === 'wait') return json(env, { error: "o'yin hali boshlanmagan" }, 400);
    const me1 = g.p1 === u.id; if (me1 ? g.f1 : g.f2) return json(env, await view(env, g, u.id));
    const qs = JSON.parse(g.qs), picks = Array.isArray(b.picks) ? b.picks : []; let score = 0;
    qs.forEach((n, i) => { const q = QB.get(n); if (q && Number.isInteger(picks[i]) && picks[i] === q[3]) score++; });
    const ms = Math.max(NQ * 1200, Math.min(NQ * 60000, Math.floor(Number(b.ms) || 0)));   // juda tez (odamga imkonsiz) vaqt yozilmaydi
    await env.DB.prepare(me1 ? 'UPDATE duel_games SET s1 = ?, t1 = ?, f1 = 1 WHERE id = ?' : 'UPDATE duel_games SET s2 = ?, t2 = ?, f2 = 1 WHERE id = ?').bind(score, ms, g.id).run();
    g = await env.DB.prepare('SELECT * FROM duel_games WHERE id = ?').bind(g.id).first();
    if (g.p2 === 0 || (g.f1 && g.f2)) await settle(env, g);
    return json(env, await view(env, await env.DB.prepare('SELECT * FROM duel_games WHERE id = ?').bind(g.id).first(), u.id));
  }

  if (GET) {
    if (g.status === 'wait' && Date.now() - g.created > WAIT_MS) {          // raqib topilmadi: bot bilan
      await env.DB.prepare("UPDATE duel_games SET p2 = 0, status = 'live', started = ? WHERE id = ? AND status = 'wait'").bind(Date.now(), g.id).run();
      g = await env.DB.prepare('SELECT * FROM duel_games WHERE id = ?').bind(g.id).first();
    }
    if (g.status === 'live' && g.p2 !== 0 && (g.f1 !== g.f2) && Date.now() - g.started > FORFEIT_MS * 2) {   // raqib chiqib ketgan: texnik g'alaba
      const me1 = g.f1 === 1; await env.DB.prepare(me1 ? 'UPDATE duel_games SET s2 = 0, t2 = 9999999, f2 = 1 WHERE id = ?' : 'UPDATE duel_games SET s1 = 0, t1 = 9999999, f1 = 1 WHERE id = ?').bind(g.id).run();
      g = await env.DB.prepare('SELECT * FROM duel_games WHERE id = ?').bind(g.id).first(); await settle(env, g);
      g = await env.DB.prepare('SELECT * FROM duel_games WHERE id = ?').bind(g.id).first();
    }
    return json(env, await view(env, g, u.id));
  }
  return json(env, { error: 'topilmadi' }, 404);
}
