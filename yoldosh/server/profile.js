/* PROFIL RASMI. Telegram rasmi avtomatik olinadi (bir marta, DB ga keshlanadi), foydalanuvchi o'zi almashtira oladi.
 * GET  /photo/:id|me  -> rasm (JPEG) yoki 404      POST /profile/photo {data:'data:image/jpeg;base64,...' | ''}  ('' = Telegram rasmiga qaytish)
 */
let _mig = false;
async function migrate(env) {
  if (_mig) return; _mig = true;
  for (const q of ['ALTER TABLE users ADD COLUMN photo TEXT', 'ALTER TABLE users ADD COLUMN photo_src TEXT', 'ALTER TABLE users ADD COLUMN photo_ts INTEGER DEFAULT 0']) { try { await env.DB.prepare(q).run(); } catch (e) { } }
}
const DAY = 864e5;
async function fromTelegram(env, tg) {
  if (!env.TELEGRAM_BOT_TOKEN || !tg) return '';
  try {
    const t = env.TELEGRAM_BOT_TOKEN;
    const pr = await (await fetch(`https://api.telegram.org/bot${t}/getUserProfilePhotos?user_id=${encodeURIComponent(tg)}&limit=1`)).json();
    const sizes = pr && pr.ok && pr.result && pr.result.photos && pr.result.photos[0]; if (!sizes || !sizes.length) return '';
    const pick = sizes.find((x) => x.width >= 160) || sizes[sizes.length - 1];
    const gf = await (await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${encodeURIComponent(pick.file_id)}`)).json(); if (!gf.ok) return '';
    const buf = new Uint8Array(await (await fetch(`https://api.telegram.org/file/bot${t}/${gf.result.file_path}`)).arrayBuffer());
    if (buf.length > 90000) return '';
    let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    return btoa(s);
  } catch (e) { return ''; }
}
export async function profile(env, req, url, H) {
  const p = url.pathname, { json, sessionUser, over } = H;
  const isPhoto = p.startsWith('/photo/'), isUp = p === '/profile/photo';
  if (!isPhoto && !isUp) return null;
  await migrate(env);
  if (isUp && req.method === 'POST') {
    const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
    if (await over(env, 'rl:ph:' + u.id, 12, 3600)) return json(env, { error: "juda ko'p urinish, keyinroq" }, 429);
    let b; try { b = await req.json(); } catch (e) { return json(env, { error: "noto'g'ri so'rov" }, 400); }
    const d = String(b.data || '');
    if (!d) { await env.DB.prepare("UPDATE users SET photo = NULL, photo_src = NULL, photo_ts = 0 WHERE id = ?").bind(u.id).run(); return json(env, { ok: true, reset: true }); }
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(d);
    if (!m || m[1].length > 90000 || !m[1].startsWith('/9j/')) return json(env, { error: "rasm noto'g'ri yoki juda katta" }, 400);
    await env.DB.prepare("UPDATE users SET photo = ?, photo_src = 'me', photo_ts = ? WHERE id = ?").bind(m[1], Date.now(), u.id).run();
    return json(env, { ok: true });
  }
  if (isPhoto && req.method === 'GET') {
    let id = p.slice(7), mine = false;
    if (id === 'me') { const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401); id = u.id; mine = true; }
    id = Number(id); if (!Number.isInteger(id) || id <= 0) return json(env, { error: 'topilmadi' }, 404);
    const r = await env.DB.prepare('SELECT tg_id, photo, photo_src, photo_ts FROM users WHERE id = ?').bind(id).first(); if (!r) return json(env, { error: 'topilmadi' }, 404);
    let ph = r.photo;
    if (r.photo_src !== 'me' && (!r.photo_ts || Date.now() - r.photo_ts > DAY)) {      // Telegram rasmini yangilash (kuniga 1 marta)
      const t = await fromTelegram(env, r.tg_id);
      if (t || !ph) ph = t || null;
      await env.DB.prepare("UPDATE users SET photo = ?, photo_src = 'tg', photo_ts = ? WHERE id = ?").bind(ph || null, Date.now(), id).run();
    }
    if (!ph) return json(env, { error: "rasm yo'q" }, 404);
    const bin = Uint8Array.from(atob(ph), (c) => c.charCodeAt(0));
    return new Response(bin, { headers: { 'content-type': 'image/jpeg', 'cache-control': mine ? 'private, no-cache' : 'public, max-age=600', ...H.cors(env) } });
  }
  return null;
}
