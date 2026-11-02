/* DO'STLAR: kuzatish (follow). Ikki kishi bir-birini kuzatsa — do'st; do'stlar o'zaro Duelga taklif qila oladi.
 * Marshrutlar: GET /friends · GET /friends/search?q= · POST /friends/follow {id} · POST /friends/unfollow {id}
 * Duelga taklif: server/duel.js (POST /duel/invite, /duel/:id/accept, /duel/:id/decline)
 */
import { leagueOf } from './duel.js';
import { tgCall } from './fsub.js';
import { migrate as profMigrate } from './profile.js';
async function notify(env, uid, text) { try { const u = await env.DB.prepare('SELECT tg_id FROM users WHERE id = ?').bind(uid).first(); if (u && u.tg_id && env.TELEGRAM_BOT_TOKEN) await tgCall(env, 'sendMessage', { chat_id: u.tg_id, text }); } catch (e) { } }

const TIERS = ['pro', 'premium', 'max'];
const tierOf = (u) => (u && (u.prem_until || 0) > Date.now() ? (TIERS.includes(u.prem_tier) ? u.prem_tier : 'pro') : '');
let _mig = false;
async function migrate(env) {
  if (_mig) return; _mig = true;
  for (const q of ['CREATE TABLE IF NOT EXISTS follows (a INTEGER NOT NULL, b INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (a, b))', 'CREATE INDEX IF NOT EXISTS follows_b ON follows (b)']) { try { await env.DB.prepare(q).run(); } catch (e) { } }
}
export const INVITE_MS = 600000;

/** do'st kartochkasi uchun ommaviy ma'lumot (ism, tarif, liga, galichka, medal) */
async function cards(env, ids) {
  if (!ids.length) return new Map();
  const ph = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(`SELECT u.id, u.first, u.last, u.region, u.secret, u.username, u.prem_until, u.prem_tier, COALESCE(f.tick,0) tick, COALESCE(f.medal,0) medal, COALESCE((SELECT pts FROM duel_pts x WHERE x.user_id = u.id AND x.period = 'a'),0) apts FROM users u LEFT JOIN duel_prof f ON f.user_id = u.id WHERE u.id IN (${ph})`).bind(...ids).all().catch(() => ({ results: [] }));
  const m = new Map();
  for (const r of rows.results || []) { const lg = leagueOf(r.apts); m.set(r.id, { id: r.id, name: `${r.first} ${(r.last || '').slice(0, 1)}.`, region: r.region || '', username: r.secret ? '' : (r.username || ''), tier: tierOf(r), tick: r.tick, medal: r.medal, league: lg.name, li: lg.i, pts: r.apts }); }
  return m;
}

export async function friends(env, req, url, H) {
  const p = url.pathname; if (!(p === '/friends' || p.startsWith('/friends/'))) return null;
  await migrate(env); await profMigrate(env);
  const { json, sessionUser, over } = H, GET = req.method === 'GET';
  const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
  if (await over(env, 'rl:fr:' + u.id, 120, 60)) return json(env, { error: "juda ko'p so'rov" }, 429);

  if (p === '/friends' && GET) {
    const out = (await env.DB.prepare('SELECT b id FROM follows WHERE a = ?').bind(u.id).all()).results.map((r) => r.id);
    const inn = (await env.DB.prepare('SELECT a id FROM follows WHERE b = ?').bind(u.id).all()).results.map((r) => r.id);
    const invs = (await env.DB.prepare("SELECT id, p1 FROM duel_games WHERE p2 = ? AND status = 'invite' AND created > ? ORDER BY id DESC LIMIT 10").bind(u.id, Date.now() - INVITE_MS).all().catch(() => ({ results: [] }))).results || [];
    const all = [...new Set([...out, ...inn, ...invs.map((r) => r.p1)])], c = await cards(env, all), inSet = new Set(inn), outSet = new Set(out);
    const pick = (ids) => ids.map((i) => c.get(i)).filter(Boolean);
    return json(env, {
      friends: pick(out.filter((i) => inSet.has(i))).sort((a, b) => b.pts - a.pts),
      following: pick(out.filter((i) => !inSet.has(i))),
      followers: pick(inn.filter((i) => !outSet.has(i))),
      invites: invs.map((r) => ({ game: r.id, from: c.get(r.p1) })).filter((x) => x.from),
      counts: { friends: out.filter((i) => inSet.has(i)).length, following: out.length, followers: inn.length },
    });
  }

  if (p === '/friends/search' && GET) {
    const q = String(url.searchParams.get('q') || '').trim().replace(/^@/, '').slice(0, 40);
    if (q.length < 1) return json(env, { list: [] });
    const like = '%' + q.replace(/[%_]/g, '') + '%', id = /^\d+$/.test(q) ? Number(q) : -1;
    const rows = (await env.DB.prepare('SELECT id FROM users WHERE id != ? AND ((id = ? AND secret = 0) OR (secret = 0 AND username LIKE ?) OR first LIKE ? OR last LIKE ? OR (first || \' \' || last) LIKE ?) ORDER BY points DESC LIMIT 12').bind(u.id, id, like, like, like, like).all()).results.map((r) => r.id);
    const c = await cards(env, rows);
    const mine = new Set((await env.DB.prepare('SELECT b id FROM follows WHERE a = ?').bind(u.id).all()).results.map((r) => r.id));
    const me2 = new Set((await env.DB.prepare('SELECT a id FROM follows WHERE b = ?').bind(u.id).all()).results.map((r) => r.id));
    return json(env, { list: rows.map((i) => c.get(i)).filter(Boolean).map((x) => ({ ...x, following: mine.has(x.id), followsMe: me2.has(x.id) })) });
  }

  if ((p === '/friends/follow' || p === '/friends/unfollow') && !GET) {
    let b; try { b = await req.json(); } catch (e) { return json(env, { error: "noto'g'ri so'rov" }, 400); }
    const id = Number(b.id); if (!Number.isInteger(id) || id <= 0 || id === u.id) return json(env, { error: "noto'g'ri foydalanuvchi" }, 400);
    if (p.endsWith('/follow')) {
      const ex = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first(); if (!ex) return json(env, { error: 'foydalanuvchi topilmadi' }, 404);
      const n = (await env.DB.prepare('SELECT COUNT(*) c FROM follows WHERE a = ?').bind(u.id).first()).c; if (n >= 500) return json(env, { error: 'kuzatuvlar chegarasi (500)' }, 400);
      const ins = await env.DB.prepare('INSERT OR IGNORE INTO follows (a, b, created) VALUES (?,?,?)').bind(u.id, id, Date.now()).run();
      const back0 = await env.DB.prepare('SELECT 1 x FROM follows WHERE a = ? AND b = ?').bind(id, u.id).first();
      if (ins.meta && ins.meta.changes) await notify(env, id, back0 ? `🤝 ${u.first} ${(u.last || '').slice(0, 1)}. do'stlik so'rovingizni qabul qildi! Endi siz do'stsiz — Duelga chaqirishingiz mumkin.` : `👋 ${u.first} ${(u.last || '').slice(0, 1)}. sizga do'stlik so'rovi yubordi. Ilovada Do'stlar bo'limini oching va qabul qiling.`);
    } else await env.DB.prepare('DELETE FROM follows WHERE a = ? AND b = ?').bind(u.id, id).run();
    const back = await env.DB.prepare('SELECT 1 x FROM follows WHERE a = ? AND b = ?').bind(id, u.id).first();
    return json(env, { ok: true, friend: !!back && p.endsWith('/follow') });
  }
  if (p === '/friends/decline' && !GET) {              // kelgan so'rovni rad etish
    let b; try { b = await req.json(); } catch (e) { return json(env, { error: "noto'g'ri so'rov" }, 400); }
    const id = Number(b.id); if (!Number.isInteger(id) || id <= 0) return json(env, { error: "noto'g'ri foydalanuvchi" }, 400);
    await env.DB.prepare('DELETE FROM follows WHERE a = ? AND b = ?').bind(id, u.id).run();
    return json(env, { ok: true });
  }
  return json(env, { error: 'topilmadi' }, 404);
}
