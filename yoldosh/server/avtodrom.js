/* AVTODROM 3D: amaliy maydon va nazariy mini-test natijalari (sayt hisobi bilan; alohida login yo'q).
 * Marshrutlar: GET /avtodrom/questions?n=20 (ochiq) · POST /avtodrom/result · GET /avtodrom/leaderboard · GET /avtodrom/stats
 * Reytingga faqat o'tgan va haqiqatga yaqin vaqtli (≥ 20 s) natijalar tushadi.
 */
import QBANK from './qbank.js';

const TEXT_QS = QBANK.filter((r) => !r[4] && r[1].length <= 220 && r[2].length >= 2 && r[2].length <= 5);   // rasmsiz savollar
const num = (v, a, b) => Math.max(a, Math.min(b, Math.floor(Number(v) || 0)));
const short = (u) => `${u.first} ${(u.last || '').slice(0, 1)}.`;

let _mig = false;
async function migrate(env) {
  if (_mig) return; _mig = true;
  for (const q of [
    'CREATE TABLE IF NOT EXISTS avto_results (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, kind TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, pen INTEGER NOT NULL DEFAULT 0, dur INTEGER NOT NULL DEFAULT 0, passed INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS avto_u ON avto_results (user_id, id)',
    'CREATE INDEX IF NOT EXISTS avto_k ON avto_results (kind, passed, dur)']) {
    try { await env.DB.prepare(q).run(); } catch (e) { }
  }
}

export async function avtodrom(env, req, url, H) {
  const p = url.pathname; if (!p.startsWith('/avtodrom/')) return null;
  await migrate(env);
  const { json, sessionUser, over } = H, GET = req.method === 'GET';

  if (p === '/avtodrom/questions' && GET) {
    if (await over(env, 'rl:avq:' + (req.headers.get('cf-connecting-ip') || 'x'), 60, 60)) return json(env, { error: "juda ko'p so'rov" }, 429);   // avval BUTUN sayt uchun bitta hisoblagich edi: bitta odam hammaga yopib qo'yishi mumkin edi
    const n = num(url.searchParams.get('n') || 20, 5, 40), pick = new Set();
    while (pick.size < Math.min(n, TEXT_QS.length)) pick.add(Math.floor(Math.random() * TEXT_QS.length));
    return json(env, { questions: [...pick].map((i) => { const r = TEXT_QS[i]; return { q: r[1], a: r[2], c: r[3] }; }) });
  }

  if (p === '/avtodrom/leaderboard' && GET) {
    const rows = await env.DB.prepare("SELECT r.user_id, r.dur, r.pen, u.first, u.last FROM avto_results r JOIN users u ON u.id = r.user_id WHERE r.kind = 'avtodrom' AND r.passed = 1 AND r.dur >= 20000 ORDER BY r.dur ASC, r.pen ASC LIMIT 300").all();
    const seen = new Set(), out = [];
    for (const r of rows.results || []) { if (seen.has(r.user_id)) continue; seen.add(r.user_id); out.push({ name: short(r), duration: r.dur, penalties: r.pen }); if (out.length >= 20) break; }
    return json(env, { rows: out });
  }

  const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
  if (await over(env, 'rl:avr:' + u.id, 60, 60)) return json(env, { error: "juda ko'p so'rov" }, 429);

  if (p === '/avtodrom/result' && !GET) {
    let b; try { b = await req.json(); } catch (e) { return json(env, { error: "noto'g'ri so'rov" }, 400); }
    const kind = b.type === 'test' ? 'test' : b.type === 'avtodrom' ? 'avtodrom' : ''; if (!kind) return json(env, { error: 'tur xato' }, 400);
    if (await over(env, 'rl:avh:' + u.id, 40, 3600)) return json(env, { error: "juda ko'p natija yuborildi, keyinroq urinib ko'ring" }, 429);   // jadval to'lib ketmasin
    const score = num(b.score, 0, 100), pen = num(b.penalties, 0, 99), dur = num(b.duration, 0, 36e5), passed = b.passed ? 1 : 0;
    await env.DB.prepare('INSERT INTO avto_results (user_id, kind, score, pen, dur, passed, created) VALUES (?,?,?,?,?,?,?)').bind(u.id, kind, score, pen, dur, passed, Date.now()).run();
    return json(env, { ok: true });
  }

  if (p === '/avtodrom/stats' && GET) {
    const t = await env.DB.prepare("SELECT COUNT(*) a, COALESCE(SUM(kind = 'avtodrom'),0) v, COALESCE(SUM(kind = 'test'),0) t FROM avto_results WHERE user_id = ?").bind(u.id).first();
    const bv = await env.DB.prepare("SELECT MIN(dur) d FROM avto_results WHERE user_id = ? AND kind = 'avtodrom' AND passed = 1 AND dur >= 20000").bind(u.id).first();
    const bt = await env.DB.prepare("SELECT MAX(score) s FROM avto_results WHERE user_id = ? AND kind = 'test'").bind(u.id).first();
    return json(env, { totals: { attempts: t.a, avtodrom: t.v, test: t.t }, best: { avtodrom: bv && bv.d != null ? bv.d : null, test: bt && bt.s != null ? bt.s : null } });
  }
  return json(env, { error: 'topilmadi' }, 404);
}
