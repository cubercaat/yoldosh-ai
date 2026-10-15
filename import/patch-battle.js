const fs=require('fs');const B='C:/Users/zafarx/yoldosh-ai/yoldosh/';
let w=fs.readFileSync(B+'server/worker.js','utf8');
w=w.replace("        if (url.pathname === '/health')", `        if (url.pathname.startsWith('/battle/')) {              // ochiq: batl natijalari (kod bo'yicha)
          const code = clean(decodeURIComponent(url.pathname.slice(8)), 60); if (!/^YB-[A-Za-z0-9]{3,8}-\d+-[A-Za-z0-9_]+-\d+-\d+$/.test(code)) return json(env, { error: 'kod xato' }, 400);
          const rows = await env.DB.prepare('SELECT name, score, total, sec, created FROM battle_results WHERE code = ? ORDER BY score DESC, sec ASC LIMIT 50').bind(code).all();
          return json(env, { results: rows.results || [] });
        }
        if (url.pathname === '/health')`);
w=w.replace("      if (url.pathname === '/schools/apply') {", `      if (url.pathname === '/battle/result') {
        const u = await sessionUser(env, req); if (!u) return json(env, { error: 'kirish kerak' }, 401);
        const code = clean(b.code, 60); if (!/^YB-[A-Za-z0-9]{3,8}-\d+-[A-Za-z0-9_]+-\d+-\d+$/.test(code)) return json(env, { error: 'kod xato' }, 400);
        const total = num(b.total, 1, 200), score = num(b.score, 0, total), sec = num(b.sec, 0, 86400), name = clean(b.name, 30) || (u.first + ' ' + (u.last || '').slice(0, 1) + '.');
        const dup = await env.DB.prepare('SELECT id FROM battle_results WHERE code = ? AND user_id = ? AND created > ?').bind(code, u.id, Date.now() - 60000).first();
        if (!dup) await env.DB.prepare('INSERT INTO battle_results (code, user_id, name, score, total, sec, created) VALUES (?,?,?,?,?,?,?)').bind(code, u.id, name, score, total, sec, Date.now()).run();
        return json(env, { ok: true });
      }
      if (url.pathname === '/schools/apply') {`);
fs.writeFileSync(B+'server/worker.js',w);new Function(w.replace(/export default/,'const __d ='));
fs.appendFileSync(B+'server/schema.sql',"\nCREATE TABLE IF NOT EXISTS battle_results (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, sec INTEGER NOT NULL, created INTEGER NOT NULL);\nCREATE INDEX IF NOT EXISTS battle_code ON battle_results (code);\n");

let p=fs.readFileSync(B+'js/views-play.js','utf8');
// 1) natijani serverga yuborish
p=p.replace("Store.save(); R.battleCode = code; R.battleName = name;","Store.save(); R.battleCode = code; R.battleName = name;\n      if (live()) fetch(api() + '/battle/result', { method: 'POST', headers: authH(), body: JSON.stringify({ code, name, score: R.correct, total: R.total, sec: R.sec }) }).then(() => { if (location.hash === '#/app/result') loadBoard(code); }).catch(() => { });");
p=p.replace("  const rank = (L) =>",`  const live = () => !!(CFG.apiBase && CFG.telegramBot && window.Cloud && Cloud.token && Cloud.token());
  const api = () => CFG.apiBase.replace(/\/$/, '');
  const authH = () => ({ 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() });
  const BD = {};   // kod -> serverdagi natijalar
  async function loadBoard(code) { try { const j = await (await fetch(api() + '/battle/' + encodeURIComponent(code))).json(); BD[code] = j.results || []; const el = document.getElementById('bd-live'); if (el) el.innerHTML = boardHtml(code); } catch (e) { } }
  const boardHtml = (code) => { const L = BD[code]; if (!L) return '<span class="mute">Yuklanmoqda…</span>'; if (!L.length) return '<span class="mute">Hali hech kim natija yuborgani yo\'q.</span>'; return L.map((x, i) => \`<div class="trow" style="grid-template-columns:34px minmax(0,1.4fr) 1fr 90px"><b>\${i === 0 ? '🏆' : i + 1}</b><span class="nm"><span>\${esc(x.name)}</span></span>\${bar(Math.round(x.score / x.total * 100))}<span class="pc">\${x.score}/\${x.total} · \${fmtT(x.sec)}</span></div>\`).join(''); };
  const rank = (L) =>`);
// 2) natija sahifasida jonli jadval
p=p.replace("    h += `<div class=\"card mt\"><div class=\"ai-h\">${ico('bolt')} Batl natijalari</div>","    if (live()) { setTimeout(() => loadBoard(R.battleCode), 300); h += `<div class=\"card mt\"><div class=\"ai-h\">${ico('bolt')} Batl natijalari (onlayn)</div><p class=\"mute\" style=\"margin-bottom:10px\">Kod: <b style=\"color:var(--text)\">${esc(R.battleCode)}</b> · do'stingiz shu kod bilan yechsa, natijasi shu yerda ko'rinadi.</p><div id=\"bd-live\">${boardHtml(R.battleCode)}</div><div class=\"ai-acts\"><button class=\"btn sm soft\" data-act=\"b-refresh\" data-code=\"${esc(R.battleCode)}\">Yangilash</button><button class=\"btn sm primary\" data-act=\"b-hot\" data-code=\"${esc(R.battleCode)}\">${ico('users')} Do'stim ham shu qurilmada yechadi</button></div></div>`; return h; }\n    h += `<div class=\"card mt\"><div class=\"ai-h\">${ico('bolt')} Batl natijalari</div>");
p=p.replace("    'b-hot'(el) {","    'b-refresh'(el) { loadBoard(el.dataset.code); },\n    'b-lookup'() { const c = ($('#bjoin2').value || '').trim(); if (!keyOf(c)) { toast('Kod noto\'g\'ri'); return; } loadBoard(c).then(() => { const el = document.getElementById('bd-look'); if (el) el.innerHTML = boardHtml(c); }); },\n    'b-hot'(el) {");
// 3) batl sahifasi: matn va natijalarni ko'rish
p=p.replace(/<div class="banner mb">\$\{ico\('alert'\)\}<span>Hozircha batl kod orqali[^<]*<\/span><\/div>/,"<div class=\"banner mb\">${ico('alert')}<span>${live() ? 'Kod yarating va do\'stingizga yuboring: ikkingiz ham bir xil savollarni yechasiz, natijalar avtomatik umumiy jadvalda chiqadi.' : 'Natijalar onlayn jadvalda chiqishi uchun hisobga kiring. Hisobsiz: kod yuborib, natija kodlarini almashasiz.'}</span></div>");
p=p.replace("<div class=\"card\"><div class=\"h-sec\">3. Natijalarni solishtirish</div>","${live() ? `<div class=\"card\"><div class=\"h-sec\">3. Kod natijalarini ko'rish</div><div style=\"display:flex;gap:8px\"><input class=\"input\" id=\"bjoin2\" placeholder=\"YB-XXXXX-20-mix-25-630\" autocomplete=\"off\"><button class=\"btn soft\" data-act=\"b-lookup\">Ko'rish</button></div><div id=\"bd-look\" style=\"margin-top:12px\"></div></div>` : ''}<div class=\"card\"><div class=\"h-sec\">${live() ? '4' : '3'}. Natijalarni solishtirish</div>");
fs.writeFileSync(B+'js/views-play.js',p);
