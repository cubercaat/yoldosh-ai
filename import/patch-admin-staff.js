const fs = require('fs');
const f = 'C:/Users/zafarx/yoldosh-ai/yoldosh/js/views-admin-live.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('yoq: ' + a.slice(0, 70)); s = s.replace(a, () => b); };

// 1) tablar
rep("['broadcast', '📣', 'Xabar yuborish'],", "['broadcast', '📣', 'Xabar va reklama'], ['staff', '🛡️', 'Adminlar'],");

// 2) broadcastBody -> yangi
const a = s.indexOf('  const broadcastBody = () =>');
const b = s.indexOf('  const countUp =');
if (a < 0 || b < 0) throw new Error('broadcastBody topilmadi');
const BODY_NEW = [
  "  const AUDL = { all: 'Hamma foydalanuvchilar', free: \"Premium bo'lmaganlar (reklama uchun eng yaxshisi)\", prem: 'Premium egalari' };",
  "  const bcItems = () => !A.bcs ? '<div class=\"adm-skel\" style=\"height:90px\"></div>' : A.bcs.length ? A.bcs.map(x => { const pc = x.total ? Math.min(100, Math.round((x.sent + x.failed) / x.total * 100)) : 100; return `<div class=\"card\" style=\"padding:16px\"><div class=\"row-between\"><b>#${x.id} · ${x.status === 'done' ? '✅ tugagan' : x.status === 'running' ? '⏳ yuborilmoqda' : esc(x.status)}</b><small class=\"mute\">${ago(x.created)} · ${esc(AUDL[x.audience] || x.audience)}</small></div><p class=\"mute\" style=\"margin:6px 0\">${x.photo ? '🖼 ' : ''}${esc(String(x.text || '').slice(0, 120))}${x.btn_text ? ' · 🔗 ' + esc(x.btn_text) : ''}</p><div class=\"adm-prog\" style=\"margin:8px 0\"><i style=\"width:${pc}%\"></i></div><small class=\"mute\">Yetkazildi: ${fmt(x.sent)} · Xato: ${fmt(x.failed)} · Jami: ${fmt(x.total)}</small></div>`; }).join('') : '<div class=\"card mute\" style=\"padding:20px\">Hali yuborish bo\\'lmagan.</div>';",
  "  const broadcastBody = () => `<div class=\"adm-hero\"><div><h1>Xabar va reklama</h1><p>Ro'yxatdan o'tgan foydalanuvchilarga Telegram bot orqali xabar yoki rasmli reklama yuboring. Tugma qo'shsangiz, bosganda sizning havolangiz ochiladi. Botning o'zida ham shu ishni qilish mumkin: /admin</p></div></div>",
  "    <div class=\"card adm-bc\" style=\"padding:22px\"><div class=\"field\"><label for=\"bc-t\">Matn (reklamada rasm izohi bo'ladi)</label><textarea id=\"bc-t\" class=\"input\" maxlength=\"1000\" placeholder=\"Masalan: 🎉 Bugun Premium 30% arzon! Faqat shu hafta.\"></textarea></div>",
  "    <div class=\"grid g2 keep2\" style=\"gap:12px\"><div class=\"field\"><label for=\"bc-a\">Kimga</label><select id=\"bc-a\" class=\"select\">${Object.entries(AUDL).map(([k, l]) => `<option value=\"${k}\">${l}</option>`).join('')}</select></div><div class=\"field\"><label for=\"bc-img\">Rasm (ixtiyoriy, reklama uchun)</label><input id=\"bc-img\" type=\"file\" accept=\"image/*\"></div>",
  "    <div class=\"field\"><label for=\"bc-bt\">Tugma matni (ixtiyoriy)</label><input id=\"bc-bt\" class=\"input\" maxlength=\"40\" placeholder=\"Premium olish\"></div><div class=\"field\"><label for=\"bc-bu\">Tugma havolasi</label><input id=\"bc-bu\" class=\"input\" maxlength=\"300\" placeholder=\"https://chorrahaa.uz\"></div></div>",
  "    <div class=\"mute\" id=\"bc-s\">Yuborishdan oldin matnni diqqat bilan tekshiring: qaytarib bo'lmaydi.</div><div class=\"ai-acts\" style=\"margin-top:14px\"><button class=\"btn primary\" data-act=\"bc-go\">📣 Yuborish</button></div></div>",
  "    <div class=\"h-sec mt\">So'nggi yuborishlar</div><div class=\"stack s12\" id=\"bc-list\">${bcItems()}</div>`;",
  "  const PL = { broadcast: 'Xabar va reklama yuborish', orders: \"To'lovlarni tasdiqlash\", users: 'Foydalanuvchilarga Premium berish', promo: 'Promokod yaratish', stats: \"Statistikani ko'rish\" };",
  "  const staffBody = () => { const S = A.staff; if (!S) return '<div class=\"adm-skel\"></div>'; return `<div class=\"adm-hero\"><div><h1>Adminlar</h1><p>Admin qo'shganda unga nimalarga ruxsat berishni o'zingiz tanlaysiz. Adminlar botda /admin buyrug'i orqali ishlaydi va faqat o'zi uchun ruxsat etilgan bo'limlarni ko'radi.</p></div></div>",
  "    <div class=\"card\" style=\"padding:20px\"><div class=\"h-sec\">Egalar (hamma huquq)</div><p class=\"mute\">${S.owners.map(o => '<code>' + esc(o) + '</code>').join(', ') || '—'}</p></div>",
  "    <div class=\"card mt\" style=\"padding:20px\"><div class=\"h-sec\">Yangi admin / ruxsatni o'zgartirish</div><div class=\"grid g2 keep2\" style=\"gap:12px\"><div class=\"field\"><label for=\"sf-id\">Telegram ID (raqam)</label><input id=\"sf-id\" class=\"input\" inputmode=\"numeric\" placeholder=\"123456789\"></div><div class=\"field\"><label for=\"sf-n\">Ismi (eslab qolish uchun)</label><input id=\"sf-n\" class=\"input\" maxlength=\"60\" placeholder=\"Ali\"></div></div>",
  "    <div class=\"stack s12\" style=\"margin:8px 0\">${Object.entries(S.perms).map(([k, l]) => `<label class=\"consent\"><input type=\"checkbox\" class=\"sf-p\" value=\"${k}\"> <span><b>${esc(l)}</b></span></label>`).join('')}</div><div class=\"ai-acts\"><button class=\"btn primary\" data-act=\"sf-save\">Saqlash</button></div>",
  "    <p class=\"mute\" style=\"font-size:13px\">Telegram ID ni bilmasangiz: odam @userinfobot ga /start yozsa, ID sini ko'rsatadi. Yoki botda /admin → «Adminlar» → «Admin qo'shish» orqali uning xabarini forward qilsangiz kifoya.</p></div>",
  "    <div class=\"h-sec mt\">Adminlar (${S.staff.length})</div><div class=\"stack s12\">${S.staff.length ? S.staff.map(x => `<div class=\"card sch\"><div class=\"sch-h\"><div><h3>${esc(x.name || x.tg_id)} <small class=\"mute\">${esc(x.tg_id)}</small></h3><small class=\"mute\">${x.perms.length ? x.perms.map(p => esc(PL[p] || p)).join(' · ') : 'ruxsat yo\\'q'}</small></div></div><div class=\"ai-acts\"><button class=\"btn soft sm\" data-act=\"sf-edit\" data-id=\"${esc(x.tg_id)}\">Tahrirlash</button><button class=\"btn ghost sm\" data-act=\"sf-del\" data-id=\"${esc(x.tg_id)}\">Olib tashlash</button></div></div>`).join('') : '<div class=\"card mute\" style=\"padding:20px\">Hali admin yo\\'q.</div>'}</div>`; };",
  ""].join('\n');
s = s.slice(0, a) + BODY_NEW + s.slice(b);

// 3) BODY xaritasi va yuklash
rep('const BODY = { orders: ordersBody,', 'const BODY = { staff: staffBody, orders: ordersBody,');
rep("else if (A.tab === 'orders') {", "else if (A.tab === 'staff') { A.staff = await get('/admin/staff'); }\n      else if (A.tab === 'broadcast') { A.bcs = (await get('/admin/broadcasts')).items; if (A.bcs.some(x => x.status === 'running')) { clearTimeout(A._bt); A._bt = setTimeout(() => { if (A.tab === 'broadcast') load(); }, 3000); } }\n      else if (A.tab === 'orders') {");
rep("['settings', 'questions', 'promos', 'broadcast'].includes(A.tab) && !A[{ stats: 'stats', users: 'users', schools: 'schools', leads: 'leads', orders: 'orders' }[A.tab]]",
    "['settings', 'questions', 'promos'].includes(A.tab) && !A[{ stats: 'stats', users: 'users', schools: 'schools', leads: 'leads', orders: 'orders', staff: 'staff', broadcast: 'bcs' }[A.tab]]");
rep("'al-tab'(el) { A.tab = el.dataset.t;", "'al-tab'(el) { A.tab = el.dataset.t; if (A.tab === 'staff') A.staff = null; if (A.tab === 'broadcast') A.bcs = null;");

// 4) bc-go va admin amallari
const c = s.indexOf("    async 'bc-go'() {");
const d = s.indexOf("    async 'au-prem'");
if (c < 0 || d < 0) throw new Error('bc-go topilmadi');
const ACT_NEW = fs.readFileSync('C:/Users/zafarx/yoldosh-ai/import/admin-staff-acts.txt', 'utf8');
s = s.slice(0, c) + ACT_NEW + s.slice(d);

// 5) kirgandan keyin botni yangilash (callback tugmalar uchun), jim
rep("setTok(j.session); A.err = '';", "setTok(j.session); A.err = ''; fetch(api() + '/admin/bot-setup', { method: 'POST', headers: H(), body: '{}' }).catch(() => { });");
fs.writeFileSync(f, s);
console.log('ok');
