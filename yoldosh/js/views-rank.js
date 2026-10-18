/* Reyting (butun O'zbekiston / viloyat / guruh), ball tizimi, faxriylar, bildirishnomalar va Test Pro.
   DEMO: ro'yxatdagi boshqa ishtirokchilar namunaviy (deterministik). Haqiqiy umumrespublika reytingi uchun server kerak. */
(function () {
  const { ico, esc, bar, ava, toast, modal, closeModal } = UI;
  const { Store, TOPICS } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, S = V.S, shell = (a, h) => V.shellStudent(a, h);
  const $ = (id) => document.getElementById(id);
  const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const short = (name) => { const p = String(name || 'Talaba').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0]; };

  /* ---------- namunaviy ishtirokchilar ---------- */
  const FN = [`Aziz`, `Madina`, `Jasur`, `Sevara`, `Bobur`, `Nilufar`, `Sardor`, `Dilnoza`, `Otabek`, `Malika`, `Javohir`, `Zarina`, `Sherzod`, `Kamola`, `Dilshod`, `Gulnora`, `Akmal`, `Shahzoda`, `Rustam`, `Munisa`, `Bekzod`, `Feruza`, `Ulug'bek`, `Nodira`];
  const LN = [`Karimov`, `Yusupova`, `Rahmonov`, `Ismoilova`, `Tursunov`, `Abdullayeva`, `Ergashev`, `Qodirova`, `Nazarov`, `Hasanova`, `Saidov`, `Aliyeva`, `Mirzayev`, `Boboeva`, `Ahmedov`, `Sobirova`, `Xolmatov`, `Umarova`];
  const DEMO = (() => {
    const r = BANK.rng(20261004), out = []; const R = CFG.regions || [];
    for (let i = 0; i < 160; i++) {
      const pts = Math.round(40 + 3300 * Math.pow(r(), 3.2)), top = pts > 1500;
      out.push({ id: 'dr' + i, name: `${FN[Math.floor(r() * FN.length)]} ${LN[Math.floor(r() * LN.length)]}`, region: R[Math.floor(r() * R.length)] || '', points: pts, pro: pts > 900 && r() > .35, prem: r() > .72, master: top && r() > .6, group: ['A', 'B', null][i % 3] });
    }
    return out;
  })();
  /* Haqiqiy rejim: soxta ishtirokchilar o'rniga serverdagi haqiqiy foydalanuvchilar */
  if (window.Cloud && Cloud.live()) {
    DEMO.length = 0;
    Cloud.top().then((list) => { list.forEach((t, i) => DEMO.push({ id: 'u' + i, name: t.name, region: t.region || '', points: t.points, pro: false, prem: !!t.prem, master: false, group: null })); if (/rank/.test(location.hash) && V.rerender) V.rerender(); });
  }
  const HONOR_DEMO = [{ name: `Dilshod Tursunov`, region: `Samarqand`, rankAt: 12, when: `2 kun oldin` }, { name: `Gulnora Abdullayeva`, region: `Toshkent shahri`, rankAt: 3, when: `5 kun oldin` }, { name: `Rustam Xolmatov`, region: `Farg'ona`, rankAt: 41, when: `1 hafta oldin` }];

  const honored = () => Store.s.honor && Store.s.honor.status === 'approved';
  function meEntry(force) {
    if ((!force && Store.s.role !== 'student') || honored()) return null; Store._pts();
    const p = Store.proStat();
    return { id: 'me', name: Store.s.name || 'Siz', region: Store.s.region || '', points: Store.s.points, pro: p.badge, master: p.master, prem: !!(V.Prem && V.Prem.active()), group: Store.s.groupId || null, me: true };
  }
  const MON = [`Yanvar`, `Fevral`, `Mart`, `Aprel`, `May`, `Iyun`, `Iyul`, `Avgust`, `Sentyabr`, `Oktyabr`, `Noyabr`, `Dekabr`];
  const monName = (k) => `${MON[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
  const prevKey = (n) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return Store.seasonKey(d); };
  /* mavsum balli: demo ishtirokchilar uchun deterministik (joriy oyda — oy o'tgan sari ko'payadi) */
  function sPts(x, key) {
    if (x.me) return Store.seasonPts(key);
    const r = BANK.rng(BANK.hash(x.id + key))(), cur = key === Store.seasonKey(), prog = cur ? Math.min(1, .15 + new Date().getDate() / 28) : 1;
    return Math.round(x.points * (.12 + r * .38) * prog);
  }
  function board(scope, force, per, key) {
    const me = meEntry(force); let l = DEMO.slice(); if (me) l.push(me);
    if (per === 'season') { key = key || Store.seasonKey(); l = l.map(x => ({ ...x, points: sPts(x, key) })).filter(x => x.points > 0 || x.me); }
    if (scope === 'region' && Store.s.region) l = l.filter(x => x.region === Store.s.region);
    if (scope === 'group' && Store.s.groupId) l = l.filter(x => x.group === Store.s.groupId);
    return l.sort((a, b) => b.points - a.points || (a.me ? -1 : 0) - (b.me ? -1 : 0) || a.name.localeCompare(b.name));
  }
  const rankOf = (scope = 'all', force = false) => { const i = board(scope, force).findIndex(x => x.me); return i < 0 ? null : i + 1; };
  V.rankOf = rankOf;
  const badges = (x) => `${x.prem ? `<span class="bdg-pr" title="Premium obunachi">${ico('crown')} PREMIUM</span>` : ''}${x.master ? `<span class="bdg-m" title="Master">★ Master</span>` : ''}${x.pro ? `<span class="bdg-p" title="Test Pro dan o'tgan">${ico('check')}</span>` : ''}`;

  /* ---------- Reyting sahifasi ---------- */
  let SCOPE = 'all', PER = 'season';
  V.rank = () => {
    const me = meEntry(), l = board(SCOPE, false, PER), my = l.findIndex(x => x.me), top = l.slice(0, 50), h = Store.s.honor || {};
    const rows = (arr, off = 0) => arr.map((x, i) => { const n = off + i + 1; return `<div class="rk-r ${x.me ? 'me' : ''}"><span class="rk-n ${n <= 3 ? 'm' + n : ''}">${n <= 3 ? ['🥇', '🥈', '🥉'][n - 1] : n}</span>${ava(x.name, 38)}<span class="rk-nm"><b>${esc(short(x.name))}${x.me ? ' <em>Siz</em>' : ''}</b><small>${esc(x.region || '—')}</small></span><span class="rk-b">${badges(x)}</span><span class="rk-p">${fmtN(x.points)}<small>ball</small></span></div>`; }).join('');
    const nextCard = (() => {
      if (!me || my < 0) return '';
      if (my === 0) return `<div class="card mt rk-next"><b>🏆 Siz bu ro'yxatda birinchisiz!</b><p class="mute" style="margin-top:4px">O'rningizni saqlab qolish uchun har kuni test yeching.</p></div>`;
      const gap = Math.max(1, l[my - 1].points - l[my].points + 1), pct = Math.max(4, Math.min(100, Math.round(l[my].points / Math.max(1, l[my - 1].points + 1) * 100)));
      return `<div class="card mt rk-next"><div class="row-between"><div><b>${my + 1}-o'rindasiz</b><p class="mute" style="margin-top:2px">${my}-o'ringa chiqishga <b>${fmtN(gap)} ball</b> qoldi (~${fmtN(gap)} ta to'g'ri javob)</p></div><button class="btn primary" data-act="quick">${ico('bolt')} Tez test</button></div><div style="margin-top:12px">${bar(pct, 'var(--acc)')}</div></div>`;
    })();
    const hon = [...(honored() ? [{ name: Store.s.name, region: Store.s.region || '', rankAt: h.rankAt, when: 'yaqinda', me: true }] : []), ...HONOR_DEMO];
    return {
      html: shell('rank', `<div class="page-h"><div><h1>Reyting</h1><p>Butun O'zbekiston bo'yicha ball musobaqasi.</p></div><button class="btn ghost" data-act="rules-pts">${ico('target')} Ball qoidalari</button></div>
      <div class="banner mb">${ico('alert')}<span>Boshqa ishtirokchilar hozircha namunaviy (demo).</span></div>
      ${me ? `<div class="grid g3 mt rk-sum"><div class="stat"><div class="lbl">${ico('target')} Sizning ballingiz</div><div class="val mono">${fmtN(me.points)}</div></div><div class="stat"><div class="lbl">${ico('trend')} Respublikada</div><div class="val mono">${rankOf('all')}<small>-o'rin</small></div></div><div class="stat"><div class="lbl">${ico('users')} ${Store.s.region ? esc(Store.s.region) : 'Viloyatingiz'}</div><div class="val mono">${Store.s.region ? rankOf('region') + '<small>-o\'rin</small>' : '—'}</div></div></div>`
          : honored() ? `<div class="card mt" style="text-align:center"><b>Siz faxriylar ro'yxatidasiz.</b><p class="mute" style="margin-top:6px">Nazariy imtihondan o'tganingiz uchun reytingdan chiqarildingiz. Kelgusida omad!</p></div>` : ''}
      ${me && !Store.s.region ? `<div class="card mt"><div class="h-sec">Viloyatingizni tanlang</div><select class="select" data-input="set-region" aria-label="Viloyat"><option value="">Tanlang…</option>${(CFG.regions || []).map(r => `<option>${esc(r)}</option>`).join('')}</select></div>` : ''}
      ${nextCard}<div class="filters mt"><button class="pill ${PER === 'season' ? 'on' : ''}" data-act="rk-p" data-p="season">Shu oy (mavsum)</button><button class="pill ${PER === 'all' ? 'on' : ''}" data-act="rk-p" data-p="all">Barcha vaqt</button><span style="width:14px"></span><button class="pill ${SCOPE === 'all' ? 'on' : ''}" data-act="rk-s" data-s="all">Butun O'zbekiston</button><button class="pill ${SCOPE === 'region' ? 'on' : ''}" data-act="rk-s" data-s="region">Viloyatim</button><button class="pill ${SCOPE === 'group' ? 'on' : ''}" data-act="rk-s" data-s="group">Guruhim</button></div>
      <div class="card" style="padding:8px 16px">${SCOPE === 'region' && !Store.s.region ? '<p class="mute" style="padding:18px">Avval viloyatingizni tanlang.</p>' : SCOPE === 'group' && !Store.s.groupId ? '<p class="mute" style="padding:18px">Siz guruhga biriktirilmagansiz.</p>' : rows(top)}${my >= 50 ? `<div class="rk-gap">⋯</div>${rows([l[my]], my)}` : ''}</div>
            <div class="honor-b mt"><div class="hb-h">${ico('flag')}<div><b>Faxriylar</b><small>Nazariy imtihondan o'tganlar</small></div></div>
        ${hon.map(x => `<div class="hb-r ${x.me ? 'me' : ''}"><span class="hb-ic">${ico('check')}</span><div><b>${esc(short(x.name))}${x.me ? ' (Siz)' : ''} <small>· ${esc(x.region || '')}</small></b><p>Reytingda ${x.rankAt}-o'rinda turib nazariy imtihondan o'tdi. Kelgusida omad!</p></div></div>`).join('')}</div>
      ${seasonBox()}${me ? honorBox() : ''}`)
    };
  };
  /* ---------- o'tgan mavsumlar arxivi: har oy g'oliblari eslab qolinadi, hamma ko'ra oladi ---------- */
  function seasonBox() {
    const cur = Store.seasonKey(), left = Math.max(0, Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1) - Date.now()) / 864e5));
    const arch = [1, 2, 3].map(n => { const k = prevKey(n), l = board('all', false, 'season', k); return { k, l, top: l.slice(0, 3) }; });
    return `<div class="card mt"><div class="row-between"><div class="ai-h" style="margin:0">${ico('flag')} Mavsum g'oliblari</div><span class="chip warn">${monName(cur)} · ${left} kun qoldi</span></div>
      <p class="mute" style="font-size:14px;margin:8px 0 14px">Har oyning 1-sanasida reyting nolga tushadi va yangi mavsum boshlanadi. Oldingi g'oliblar shu yerda qoladi.</p>
      <div class="stack s12">${arch.map(a => `<div class="ssn"><div class="ssn-h"><b>${monName(a.k)}</b><button class="btn sm soft" data-act="ssn-top" data-k="${a.k}">Top 20</button></div><div class="ssn-p">${a.top.map((x, i) => `<div class="ssn-w m${i + 1}"><span>${['🥇', '🥈', '🥉'][i]}</span><b>${esc(short(x.name))}${x.me ? ' (Siz)' : ''}</b><small>${fmtN(x.points)} ball · ${esc(x.region || '')}</small></div>`).join('')}</div></div>`).join('')}</div></div>
      ${V.refCard ? V.refCard() : ''}`;
  }  function honorBox() {
    const h = Store.s.honor || {};
    if (h.status === 'pending') return `<div class="card mt"><div class="ai-h">${ico('clock')} Hujjatingiz tekshirilmoqda</div><p>Rasm ${new Date(h.ts).toLocaleDateString('uz-UZ')} da yuborildi. Ustoz yoki admin tekshirib, natijani bildiradi.</p></div>`;
    return `<div class="card mt"><div class="ai-h">${ico('flag')} Nazariy imtihondan o'tdingizmi?</div>${h.status === 'rejected' ? `<div class="banner" style="margin-bottom:14px">${ico('alert')}<span>Oldingi so'rov rad etildi${h.note ? ': ' + esc(h.note) : ''}. Aniqroq rasm bilan qayta yuboring.</span></div>` : ''}<p>Imtihondan o'tganingizni tasdiqlovchi hujjat rasmini yuboring. Ustoz yoki admin tekshiradi; tasdiqlansa, siz <b>Faxriylar</b> ro'yxatiga qo'shilasiz (reytingdagi o'rningiz bilan) va reytingdan chiqarilasiz.</p><p class="mute" style="font-size:13.5px;margin:8px 0 14px">Rasm boshqa foydalanuvchilarga ko'rsatilmaydi. Soxta hujjat yuborish hisobdan chetlatishga olib keladi.</p><button class="btn primary" data-act="honor-up">${ico('upload')} Hujjat rasmini yuborish</button></div>`;
  }

  /* ---------- Bosh sahifadagi ball kartasi ---------- */
  V.homeRank = () => {
    if (Store.s.role !== 'student') return ''; if (honored()) return `<div class="card mt"><b>Siz faxriylar ro'yxatidasiz.</b> Kelgusida omad!</div>`;
    Store._pts(); const r = Store.risk(), rk = rankOf('all'), p = Store.proStat();
    return `<div class="card mt pts-card"><div class="pts-l"><small>Sizning ballingiz</small><b>${fmtN(Store.s.points)}</b><span class="mute">Respublikada ${rk}-o'rin ${badges({ pro: p.badge, master: p.master, prem: !!(V.Prem && V.Prem.active()) })}</span></div>
      <div class="pts-r">${r ? (r.zero ? `<div class="banner">${ico('alert')}<span>Ballingiz tugagan. Test yechib qayta to'plang.</span></div>` : `<div class="banner">${ico('alert')}<span>Bugun test yechmadingiz. Yechmasangiz ertaga <b>−${r.amt} ball</b> yo'qotasiz.</span></div>`) : `<div class="banner ok-b">${ico('check')}<span>Bugun faolsiz — ball saqlanadi.</span></div>`}
        <div class="ai-acts" style="margin-top:12px"><button class="btn sm primary" data-act="quick">${ico('bolt')} Tez test</button><a class="btn sm soft" href="#/app/rank">Reyting</a><a class="btn sm soft" href="#/app/pro">Test Pro</a></div></div></div>`;
  };

  /* ---------- Bildirishnoma qo'ng'irog'i ---------- */
  V.bellFab = () => { if (Store.s.role !== 'student') return ''; const n = Store.unread(); return `<button class="bell-fab" data-act="bell" aria-label="Bildirishnomalar">${ico('bell')}${n ? `<i class="bdg">${n}</i>` : ''}</button>`; };

  /* ---------- Test Pro sahifasi ---------- */
  V.pro = () => {
    const p = Store.proStat(), need = CFG.masterStreak, secs = CFG.proQuestions * CFG.proSecPerQ;
    return {
      html: shell('tests', `<a class="back-b" href="#/app/tests">${ico('arrow', 'flip')} Orqaga</a>
      <div class="pro-h"><div class="pro-badge">${ico('flame')}</div><div><span class="chip warn">Eng qiyin</span><h1>Test Pro</h1><p>Miyani qotiradigan savollar. Bitta xato — yutqazasiz.</p></div></div>
      <div class="grid g3 mt"><div class="stat"><div class="lbl">${ico('list')} Savollar</div><div class="val mono">${CFG.proQuestions}</div><div class="sub">faqat eng qiyinlaridan</div></div><div class="stat"><div class="lbl">${ico('clock')} Vaqt</div><div class="val mono">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</div><div class="sub">savol uchun ${CFG.proSecPerQ} soniya</div></div><div class="stat"><div class="lbl">${ico('x')} Xato</div><div class="val mono">0</div><div class="sub">bittasi ham yutqazish</div></div></div>
      <div class="card mt"><div class="h-sec">Mukofotlar</div><div class="stack s12">
        <div class="rew ${p.badge ? 'on' : ''}"><span class="rw-i">${ico('check')}</span><div><b>Galichka (✓)</b><small>Pro testdan birinchi marta o'ting · +200 ball</small></div>${p.badge ? '<span class="chip ok">Olingan</span>' : ''}</div>
        <div class="rew ${p.master ? 'on' : ''}"><span class="rw-i gold">★</span><div><b>Master galichkasi</b><small>${need} marta ketma-ket xatosiz o'ting · +500 ball</small></div>${p.master ? '<span class="chip ok">Olingan</span>' : ''}</div></div>
        <div style="margin-top:18px"><div class="mute" style="font-weight:700;margin-bottom:8px">Ketma-ket g'alabalar: ${p.streak}/${need}</div><div class="dots-s">${Array.from({ length: need }, (_, i) => `<i class="${i < p.streak ? 'on' : ''}">${i < p.streak ? '✓' : i + 1}</i>`).join('')}</div><small class="mute" style="display:block;margin-top:8px">Bitta mag'lubiyat ketma-ketlikni 0 ga qaytaradi.</small></div></div>
      <div class="banner mt">${ico('alert')}<span>Test vaqtida boshqa oynaga o'tib ketsangiz (6 soniyadan ortiq) urinish hisoblanmaydi. Tushuntirishlar faqat test tugagach chiqadi.</span></div>
      <button class="go-b" data-act="pro-go">${ico('flame')} Pro testni boshlash</button>
      <p class="mute" style="text-align:center;margin-top:10px">Urinishlar: ${p.attempts} · g'alabalar: ${p.passes}</p>`)
    };
  };

  /* ---------- amallar ---------- */
  /* Test Pro: eng chalg'ituvchi savollar. Qiyinlik bahosi: variantlar soni, o'xshash variantlar, belgi/chorraha rasmlari,
     harf-belgili (А, Б, В) javoblar, raqam va "hammasi to'g'ri" tuzoqlari. Har urinishda eng qiyin ~25% dan tasodifiy 20 ta olinadi. */
  const words = (t) => new Set(String(t).toLowerCase().replace(/[^a-zа-я0-9' ]/g, ' ').split(/s+/).filter(w => w.length > 2));
  const sim = (a, b) => { const A = words(a), B = words(b); if (!A.size || !B.size) return 0; let c = 0; A.forEach(w => B.has(w) && c++); return c / Math.min(A.size, B.size); };
  const hardScore = (q) => {
    const o = q.options.map(x => x.label); let sc = 0;
    sc += Math.max(0, o.length - 2) * 2.2;
    let m = 0, n = 0; for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) { m += sim(o[i], o[j]); n++; } if (n) sc += (m / n) * 7;
    if (q.kind === 'photo') sc += 2.5;
    if (q.topic === 'cross') sc += 4; else if (q.topic === 'marks' || q.topic === 'signals') sc += 2;
    if (o.some(x => /[А-ЯЁа-яё]/.test(x) && /[«»]/.test(x))) sc += 2;
    if (o.some(x => /(barcha|hammasi|hech qaysi|hech kim)/i.test(x))) sc += 2.5;
    if (o.some(x => /d/.test(x))) sc += 2;
    if (/qaysi|nechanchi|kim yo'l|to'g'ri bo'lib|birinchi|oxirgi|chorraha/i.test(q.text)) sc += 1.5;
    const mean = o.reduce((p, x) => p + x.length, 0) / o.length; if (mean > 70) sc += 2;
    return sc;
  };
  let _hard = null;
  function proList() {
    const seed = (Date.now() & 0xffffff) + 17, n = CFG.proQuestions;
    if (!_hard || _hard.len !== BANK.Q.length) { const r = BANK.Q.map(q => ({ q, s: hardScore(q) + (BANK.hash(q.id) % 100) / 100 })).sort((a, b) => b.s - a.s); _hard = { len: BANK.Q.length, list: r.slice(0, Math.max(n * 8, Math.round(r.length * 0.25))).map(x => x.q) }; }
    const pool = BANK.shuffle(_hard.list.slice(), seed), out = [], cnt = {};
    for (const q of pool) { if (out.length >= n) break; if ((cnt[q.topic] || 0) >= Math.ceil(n * 0.45)) continue; cnt[q.topic] = (cnt[q.topic] || 0) + 1; out.push(q); }
    return out;
  }
  const prevHook = V.buildHook;
  V.buildHook = (key) => {
    if (key === 'pro') { const list = proList(); return { key, title: 'Test Pro', mode: 'pro', list, i: 0, picks: [], revealed: false, simple: false, start: Date.now(), endAt: Date.now() + list.length * CFG.proSecPerQ * 1000, done: false, hid: 0 }; }
    return prevHook ? prevHook(key) : null;
  };
  /* boshqa oynaga o'tish nazorati */
  document.addEventListener('visibilitychange', () => {
    const z = S.quiz; if (!z || z.mode !== 'pro' || z.done) return;
    if (document.hidden) z._h = Date.now(); else if (z._h) { z.hid = (z.hid || 0) + Date.now() - z._h; z._h = 0; if (z.hid > 6000) z.cheat = true; }
  });
  const prevFinish = V.onFinish;
  V.onFinish = (z, R) => {
    if (prevFinish) prevFinish(z, R);
    if (z.mode === 'pro') {
      const pass = R.correct === R.total && !z.cheat && !(z.endAt && Date.now() > z.endAt + 500); R.pass = pass; R.pro = { pass, cheat: !!z.cheat };
      Store.recordPro(pass); R.proStat = Object.assign({}, Store.proStat());
    } else if (R.total >= 10 && R.pct >= 70) { const g = Store.addPoints(R.pct >= 90 ? 20 : 5, `Test ${R.pct >= 90 ? '≥90%' : '≥70%'}: ${R.title || 'test'}`); if (g) R.bonus = g; }
    Store.save();
  };
  const prevExtra = V.resultExtra;
  V.resultExtra = (R) => {
    let h = prevExtra ? prevExtra(R) : '';
    if (R.mode === 'pro') {
      const p = R.proStat || Store.proStat(), need = CFG.masterStreak;
      h += `<div class="card mt"><div class="ai-h">${ico('flame')} Test Pro</div>${R.pass ? `<p><b>Tabriklaymiz!</b> ${p.master ? 'Siz Master galichkasiga egasiz ★' : p.badge ? 'Galichka (✓) sizda.' : ''}</p>` : `<p>${R.pro && R.pro.cheat ? 'Test paytida boshqa oynaga o\'tdingiz.' : R.timedOut ? 'Vaqt tugadi.' : 'Bitta xato qildingiz — yutqazdingiz.'} Ketma-ketlik 0 ga qaytdi.</p>`}
        <div class="dots-s" style="margin:10px 0">${Array.from({ length: need }, (_, i) => `<i class="${i < p.streak ? 'on' : ''}">${i < p.streak ? '✓' : i + 1}</i>`).join('')}</div><p class="mute">Ketma-ket g'alabalar: ${p.streak}/${need}</p><div class="ai-acts"><button class="btn primary" data-act="pro-go">Yana urinish</button><a class="btn soft" href="#/app/rank">Reyting</a></div></div>`;
    } else if (R.bonus) h += `<div class="banner ok-b mt" style="margin-top:16px">${ico('check')}<span>+${R.bonus} ball: yuqori natija uchun bonus.</span></div>`;
    return h;
  };

  const RULES_PTS = [[`+100`, `Ro'yxatdan o'tish`], [`+1`, `Har to'g'ri javob`], [`+5`, `Har kuni birinchi javob (kunlik bonus)`], [`+5`, `70% va undan yuqori natijali test (kamida 10 savol)`], [`+20`, `90% va undan yuqori natijali test (kamida 10 savol)`], [`+200`, `Test Pro dan birinchi marta o'tish (galichka)`], [`+100`, `Test Pro dan har keyingi o'tish`], [`+500`, `Master galichka (${CFG.masterStreak} marta ketma-ket)`], [`−10`, `Test yechmagan 1-kun`], [`−10`, `Test yechmagan 2-kun`], [`−20`, `3-kundan boshlab har kun (ball tugamaguncha)`]];
  V.acts = Object.assign(V.acts || {}, {
    'rk-s'(el) { SCOPE = el.dataset.s; V.rerender(); },
    'rk-p'(el) { PER = el.dataset.p; V.rerender(); },
    'ssn-top'(el) { const k = el.dataset.k, l = board('all', false, 'season', k).slice(0, 20); modal('<h3>' + monName(k) + ' — Top 20</h3><div style="margin-top:10px">' + l.map((x, i) => '<div class="rk-r ' + (x.me ? 'me' : '') + '"><span class="rk-n ' + (i < 3 ? 'm' + (i + 1) : '') + '">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span>' + ava(x.name, 34) + '<span class="rk-nm"><b>' + esc(short(x.name)) + '</b><small>' + esc(x.region || '—') + '</small></span><span class="rk-p">' + fmtN(x.points) + '<small>ball</small></span></div>').join('') + '</div>'); },
    'rules-pts'() { modal(`<h3>Ball qoidalari</h3><div class="stack s12" style="margin-top:14px">${RULES_PTS.map(r => `<div class="rule-p"><b class="${r[0].startsWith('−') ? 'neg' : 'pos'}">${r[0]}</b><span>${esc(r[1])}</span></div>`).join('')}</div><p class="mute" style="font-size:13.5px;margin-top:14px">Ball 0 dan pastga tushmaydi. Har kuni kamida bitta savolga javob bersangiz, ball yo'qolmaydi. Bugun test yechish — kunlik +5 bonus ham beradi.</p>`); },
    'pro-go'() { V.acts.start({ dataset: { key: 'pro' } }); },
    bell() {
      const notes = Store.s.notes || [], p = (window.Notification && Notification.permission) || 'unsupported';
      modal(`<h3>Bildirishnomalar</h3>${notes.length ? `<div class="stack s12" style="margin-top:14px">${notes.slice(0, 15).map(n => `<div class="note-i ${n.kind}"><span>${esc(n.text)}</span><small>${UI.dt(n.ts)}</small></div>`).join('')}</div>` : `<p class="mute" style="margin-top:12px">Hozircha yangi xabar yo'q.</p>`}
        ${p === 'default' ? `<button class="btn primary" style="margin-top:16px;width:100%" data-act="notif-on">${ico('bell')} Brauzer bildirishnomasini yoqish</button>` : p === 'granted' ? `<p class="mute" style="margin-top:14px;font-size:13.5px">Brauzer bildirishnomasi yoqilgan.</p>` : ''}
        <p class="mute" style="font-size:13px;margin-top:12px">Ilova yopiq bo'lganda eslatma yuborish uchun server (Telegram bot) kerak — keyingi bosqich.</p>`);
      (Store.s.notes || []).forEach(n => n.read = true); Store.save(); const f = document.querySelector('.bell-fab .bdg'); if (f) f.remove();
    },
    'notif-on'() { try { Notification.requestPermission().then(() => { closeModal(); toast(`Bildirishnoma yoqildi`); }); } catch (e) { toast(`Bu brauzerda bildirishnoma yo'q`); } },
    'honor-up'() {
      modal(`<h3>Hujjat rasmini yuboring</h3><p class="mute">Nazariy imtihondan o'tganingizni ko'rsatuvchi hujjat. Matn aniq o'qilishi kerak.</p>
        <label class="up-box" for="hfile">${ico('upload')}<b>Rasm tanlang yoki suratga oling</b><small>JPG yoki PNG</small></label><input id="hfile" type="file" accept="image/*" class="sr"><img id="hprev" alt="" style="display:none;max-width:100%;border-radius:14px;margin-top:12px">
        <div class="ai-acts"><button class="btn primary" id="hsend" disabled>Yuborish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      let data = null;
      $('hfile').addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0]; if (!f) return; const img = new Image();
        img.onload = () => { const sc = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * sc; c.height = img.height * sc; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); data = c.toDataURL('image/jpeg', .62); const p = $('hprev'); p.src = data; p.style.display = 'block'; $('hsend').disabled = false; URL.revokeObjectURL(img.src); };
        img.onerror = () => toast(`Rasm o'qilmadi`); img.src = URL.createObjectURL(f);
      });
      $('hsend').addEventListener('click', () => { if (!data) return; Store.s.honor = { status: 'pending', img: data, ts: Date.now(), name: Store.s.name }; Store.save(); closeModal(); toast(`Yuborildi. Tekshirilgach xabar beramiz.`); V.rerender(); });
    },
  });
  V.inputs = Object.assign(V.inputs || {}, { 'set-region'(el) { if (el.value) { Store.s.region = el.value; Store.save(); V.rerender(); } } });
  V.honorInfo = { rankOf, honored, board, short };
})();



