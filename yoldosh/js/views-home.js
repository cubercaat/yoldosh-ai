/* Talaba ilovasining yangi bosh sahifasi (telefon uchun qulay "ilova" ko'rinishi) va unga bog'langan bo'limlar:
   Biletlar, 50/100 talik, Chalg'ituvchi savollar, Saqlanganlar, Raqamli savollar, Shpargalkalar. */
(function () {
  const { ico, esc, bar, toast, modal, closeModal } = UI;
  const { Store, TOPICS } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, S = V.S, shell = (a, h) => V.shellStudent(a, h);
  const DAY = 864e5;

  /* ---------- daraja ---------- */
  const level = () => { const p = Store.s.points || 0, m = Store.proStat && Store.proStat().master; return m ? `MASTER` : p >= 1500 ? `USTA` : p >= 500 ? `HAYDOVCHI` : `YO'LOVCHI`; };

  /* ---------- tugmalar to'plami ---------- */
  const PILLS = [
    ['#/app/tests', 'book', `Mavzular`, '#B58CFF'], ['#/app/tickets', 'ticket', `Biletlar`, '#F7C600'],
    ['#/app/big', 'list', `50/100 talik`, '#58CC02'], ['#/app/exam', 'flag', `Real imtihon`, '#34D399'],
    ['act:hm-hard', 'alert', `Chalg'ituvchi`, '#FF5C70'], ['#/app/saved', 'bookmark', `Saqlanganlar`, '#F7C600'],
    ['#/app/signs', 'alert', `Yo'l belgilari`, '#29B6F6'], ['act:hm-num', 'hash', `Raqamli savollar`, '#8B7CFF'],
    ['#/app/cheats', 'bolt', `Shpargalkalar`, '#FF8A3D'], ['#/app/drive', 'cone', `Simulyator`, '#22C7A9'],
    ['#/app/lessons', 'note', `Qoidalar`, '#58CC02'], ['#/app/mistakes', 'redo', `Xato daftari`, '#FF4D8D'],
  ];
  const MORE = [['#/app/rank', 'trend', 'Reyting'], ['#/app/plan', 'calendar', 'Imtihon rejasi'], ['#/app/run', 'flame', 'Marafon'], ['#/app/marathon', 'calendar', '7 kunlik dastur'], ['#/app/ai', 'sparkles', 'AI yordamchi'], ['#/app/scan', 'camera', 'Kamera'], ['#/app/teacher', 'send', 'Ustozga yozish']];
  const pill = (p) => p[0].startsWith('act:')
    ? `<button class="hm-p" style="--c:${p[3]}" data-act="${p[0].slice(4)}"><span class="hm-pi">${ico(p[1])}</span><b>${p[2]}</b></button>`
    : `<a class="hm-p" style="--c:${p[3]}" href="${p[0]}"><span class="hm-pi">${ico(p[1])}</span><b>${p[2]}</b></a>`;

  /* ---------- simulyator rasmi (tepadan ko'rinish) ---------- */
  const carSvg = `<svg viewBox="0 0 64 120" class="hm-car" aria-hidden="true"><rect x="8" y="6" width="48" height="108" rx="18" fill="#F4F7FC"/><rect x="14" y="30" width="36" height="22" rx="7" fill="#27324A"/><rect x="14" y="76" width="36" height="16" rx="6" fill="#27324A"/><rect x="12" y="12" width="12" height="7" rx="3" fill="#FFE27A"/><rect x="40" y="12" width="12" height="7" rx="3" fill="#FFE27A"/><rect x="12" y="102" width="12" height="6" rx="3" fill="#FF5C70"/><rect x="40" y="102" width="12" height="6" rx="3" fill="#FF5C70"/><rect x="2" y="22" width="8" height="18" rx="3" fill="#141B2D"/><rect x="54" y="22" width="8" height="18" rx="3" fill="#141B2D"/><rect x="2" y="82" width="8" height="18" rx="3" fill="#141B2D"/><rect x="54" y="82" width="8" height="18" rx="3" fill="#141B2D"/></svg>`;

  /* ---------- Bosh sahifa: guruhlangan bo'limlar, tayyorlik halqasi, qidiruv ---------- */
  const ROWS = (st) => {
    const sets = Store.s.sets || {}, tk = Object.keys(sets).filter(k => k.startsWith('t:')).length, nm = Store.nbDue ? Store.nbDue().length : 0, sv = (Store.s.saved || []).length;
    return [
      [`O'rganish`, [['#/app/lessons', 'book', `Darslik`, `Qoidalar mavzular bo'yicha`, '#29B6F6'], ['#/app/tickets', 'ticket', `Biletlar`, `${tk} / ${ticketCount()} bilet yechilgan`, '#F7C600'], ['#/app/tests', 'grid', `Mavzular`, `Har mavzu bo'yicha mashq`, '#B58CFF'], ['#/app/similar', 'sparkles', `O'xshash savollar`, `20 talik, faqat o'xshashlar`, '#22C7A9'], ['#/app/signs', 'alert', `Yo'l belgilari`, `Belgilar lug'ati va qidiruv`, '#4D8DFF'], ['#/app/cheats', 'bolt', `Shpargalkalar`, `Imtihon oldidan tez ko'rish`, '#FF8A3D']]],
      [`Mashq`, [['act:hm-smart', 'play', `Test yechish`, `Sizga mos savollar`, '#58CC02'], ['#/app/big', 'list', `50 / 100 talik`, `Uzun testlar, vaqt bilan`, '#34D399'], ['act:hm-hard', 'target', `Chalg'ituvchi savollar`, `Eng qiyin va tuzoqli`, '#FF5C70'], ['act:hm-num', 'hash', `Raqamli savollar`, `Tezlik, masofa, vaqt`, '#8B7CFF'], ['#/app/mistakes', 'redo', `Xato daftari`, nm ? `${nm} ta savolni takrorlang` : `Adashganlaringiz shu yerda`, '#FF4D8D', nm], ['#/app/saved', 'bookmark', `Saqlanganlar`, `${sv} ta savol`, '#F7C600']]],
      [`Imtihon`, [['#/app/exam', 'flag', `Real imtihon`, `${CFG.examQuestions} savol, ${CFG.examMinutes} daqiqa`, '#22C7A9'], ['#/app/battle', 'swords', `Batl`, `Do'st bilan musobaqa`, '#8FA3C0'], ['#/app/plan', 'calendar', `Imtihon rejasi`, `Sanaga qarab kunlik reja`, '#29B6F6'], ['#/app/run', 'flame', `Marafon`, `Cheksiz test: 3 xatogacha`, '#FF8A3D'], ['#/app/marathon', 'calendar', `7 kunlik dastur`, `Imtihon oldi tayyorgarlik`, '#FFB020'], ['#/app/rank', 'trophy', `Reyting`, `Mavsum va butun O'zbekiston`, '#F7C600']]],
      [`Yordam`, [['#/app/schools', 'flag', `Avtomaktablar`, `Yaqin avtomaktabga ariza qoldiring`, '#22C7A9'], ['#/app/ai', 'sparkles', `AI yordamchi`, `Tushunmagan joyni so'rang`, '#B8F53B'], ['#/app/teacher', 'send', `Ustoz bilan aloqa`, `ID ingiz bilan yozing`, '#4D8DFF'], ['#/app/premium', 'crown', `Premium`, `Cheksiz testlar va Pro`, '#F7C600']]],
    ];
  };
  const rowH = (r) => { const act = r[0].startsWith('act:'), inner = `<span class="hx-i" style="--c:${r[4]}">${ico(r[1])}</span><span class="hx-t"><b>${r[2]}</b><small>${esc(r[3])}</small></span>${r[5] ? `<em class="hx-n">${r[5]}</em>` : `<span class="hx-c">${ico('arrow')}</span>`}`; return act ? `<button class="hx-r" data-act="${r[0].slice(4)}">${inner}</button>` : `<a class="hx-r" href="${r[0]}">${inner}</a>`; };
  V.home = () => {
    const st = Store.me(), r = ST.readiness(st), o = ST.overall(st), streak = Store.streakDays(), plan = Store.s.plan, nm = Store.nbDue ? Store.nbDue().length : 0, first = !o.n;
    const left = plan && plan.date ? Math.max(0, Math.round((new Date(plan.date) - Date.now()) / DAY)) : null, hr = new Date().getHours();
    const msg = first ? `Hali test yechmadingiz. Birinchi testdan keyin tayyorligingizni hisoblayman.` : r >= 85 ? `Ajoyib! Sinov imtihonida ham tasdiqlang.` : r >= 70 ? `Yaxshi ketyapsiz. Zaif mavzularni takrorlang.` : `Har kuni 20–30 daqiqa mashq qiling, natija tez o'sadi.`;
    const C = 2 * Math.PI * 44, free = V.Prem && !V.Prem.ok(), dleft = V.drive3dLib ? V.drive3dLib.Free.left() : 0;
    return {
      html: shell('home', `<div class="hx">
        <div class="hx-h"><a class="hx-who" href="#/app/id"><span class="hx-av">${esc((Store.s.name || 'T')[0].toUpperCase())}</span><span><small>${hr < 12 ? 'Xayrli tong' : hr < 18 ? 'Xayrli kun' : 'Xayrli kech'} · ${level()}</small><b>${esc(Store.s.name || 'Talaba')}</b></span></a>
          <div class="hx-ic"><button data-act="bell" aria-label="Bildirishnomalar" class="hm-bell">${ico('bell')}${Store.unread() ? `<i class="bdg">${Store.unread()}</i>` : ''}</button><button data-act="hm-set" aria-label="Sozlamalar">${ico('gear')}</button></div></div>
        <button class="hx-search" data-act="hm-search">${ico('search')}<span>Bo'lim qidirish: bilet, simulyator, belgilar…</span></button>
        <div class="hx-hero"><div class="hx-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" transform="rotate(-90 50 50)" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - Math.max(.02, r / 100))}"/></svg><b>${r}<small>%</small></b></div>
          <div class="hx-ht"><span class="chip ${ST.status(r).cls}">${first ? 'Boshlanmagan' : ST.status(r).label}</span><h2>Imtihonga tayyorlik</h2><p>${msg}</p>
          <div class="hx-st"><span>${ico('flame')} ${streak} kun</span><span>${ico('redo')} ${nm} takror</span>${left != null ? `<span>${ico('calendar')} ${left} kun qoldi</span>` : `<a href="#/app/plan">${ico('calendar')} Sana kiriting</a>`}</div></div>
          <button class="btn primary hx-cta" data-act="hm-smart">Davom etish ${ico('arrow')}</button></div>
        <div class="hx-quick"><a class="hx-q" href="#/app/drive"><span class="hx-i" style="--c:#22C7A9">${ico('cone')}</span><span class="hx-t"><b>Simulyator</b><small>${free ? (dleft > 0 ? `Bepul ${Math.floor(dleft / 60)}:${String(dleft % 60).padStart(2, '0')}` : 'Premium') : '3D · cheksiz'}</small></span></a><a class="hx-q" href="#/app/scan"><span class="hx-i" style="--c:#29B6F6">${ico('camera')}</span><span class="hx-t"><b>Belgini aniqlash</b><small>Kamera bilan</small></span></a></div>
        <div class="hx-gs">${((r) => [r[1], r[2], r[0], r[3]])(ROWS(st)).map(g => `<section class="hx-g"><h3>${g[0]}</h3><div class="hx-list">${g[1].map(rowH).join('')}</div></section>`).join('')}</div>
        ${V.homeRank ? `<div class="hm-extra">${V.homeRank()}</div>` : ''}
      </div>`),
      mount() { document.body.classList.add('hm-on'); }, unmount() { document.body.classList.remove('hm-on'); },
    };
  };
  /* ---------- Biletlar ---------- */
  const TICKET = 20, OFFICIAL = () => BANK.Q.filter(q => q.official).sort((a, b) => a.n - b.n), ticketCount = () => Math.ceil(OFFICIAL().length / TICKET);
  const ticketList = (n) => OFFICIAL().slice((n - 1) * TICKET, n * TICKET);
  V.tickets = () => {
    const sets = Store.s.sets || {}, N = ticketCount(), done = Array.from({ length: N }, (_, i) => sets['t:' + (i + 1)]).filter(Boolean), avg = done.length ? Math.round(done.reduce((a, b) => a + b.pct, 0) / done.length) : 0, perfect = done.filter(b => b.pct >= 90).length;
    const firstOpen = Array.from({ length: N }, (_, i) => i + 1).find(n => !sets['t:' + n]);
    return {
      html: shell('home', `<div class="page-h"><div><h1>Biletlar</h1><p>Rasmiy savollar ${OFFICIAL().length} ta, ${N} bilet · har bilet ${TICKET} savol. Biletni boshlang va natijangizni oshiring.</p></div><a class="btn ghost" href="#/app">← Bosh sahifa</a></div>
      <div class="tk-wrap"><div class="tk-sum"><div><b>${done.length}<small> / ${N}</small></b><small>yechilgan bilet</small></div><div><b>${avg}%</b><small>o'rtacha natija</small></div><div><b>${perfect}</b><small>90% dan yuqori</small></div></div>
      ${firstOpen ? `<button class="btn primary lg" data-act="start" data-key="t:${firstOpen}" style="justify-self:start">${ico('play')} Keyingi bilet: ${firstOpen}</button>` : ''}
      <div class="tk-g2">${Array.from({ length: N }, (_, i) => { const n = i + 1, b = sets['t:' + n], cnt = Math.min(TICKET, OFFICIAL().length - i * TICKET), img = ticketList(n).filter(q => q.img).length; return `<button class="tk2 ${b ? (b.pct >= 90 ? 'ok' : b.pct >= 70 ? 'mid' : 'low') : ''}" data-act="start" data-key="t:${n}">${b ? `<span class="pc">${b.pct}%</span>` : ''}<span class="n">${n}</span><small>${cnt} savol · ${img} rasmli</small><span class="st"><i style="width:${b ? b.pct : 0}%"></i></span></button>`; }).join('')}</div></div>`)
    };
  };

  /* ---------- O'xshash savollar: har to'plam 20 ta, hammasi bir mavzu/vaziyatga o'xshash ---------- */
  const THEMES = [
    ['order', `Chorrahadan o'tish tartibi`, `Kim birinchi, kim ikkinchi o'tadi`, '#F7C600', q => /chorraha/i.test(q.text) && /(o'tadi|o'tadilar|tartibda|bo'lib)/i.test(q.text)],
    ['tram', `Tramvay bilan vaziyatlar`, `Tramvayga yo'l berish va ustunlik`, '#22C7A9', q => /tramvay/i.test(q.text + q.options.map(o => o.label).join(' '))],
    ['yield', `Yo'l berish`, `Kim kimga yo'l beradi`, '#FF8A3D', q => /yo'l ber/i.test(q.text)],
    ['over', `Quvib o'tish va manyovr`, `Quvib o'tish, qayrilib olish, burilish`, '#4D8DFF', q => /(quvib|o'zib o't|qayrilib|manyovr|burilish)/i.test(q.text)],
    ['stop', `To'xtash va to'xtab turish`, `Qayerda mumkin, qayerda taqiqlanadi`, '#FF5C70', q => /(to'xtab tur|to'xtash|to'xta)/i.test(q.text)],
    ['light', `Chiroqlar va yoritish`, `Faralar, gabarit, tumanga qarshi`, '#FFB020', q => /(chiroq|fara|yoritish|ishora)/i.test(q.text)],
    ['sign', `Yo'l belgilari`, `Belgilar ma'nosi`, '#B58CFF', q => q.kind === 'sign' || /(belgi)/i.test(q.text)],
    ['mark', `Yo'l chiziqlari`, `Yotiq chiziqlar ma'nosi`, '#5CD0FF', q => /chiziq/i.test(q.text)],
    ['ped', `Piyodalar va o'tish joylari`, `Piyodalar, zebra, bekatlar`, '#7CE56B', q => /(piyoda|bekat)/i.test(q.text)],
    ['aid', `Birinchi tibbiy yordam`, `Jarohat, sinish, qon oqishi`, '#FF5C70', q => /(tibbiy|singan|suyak|jarohat|qon oqish|jgut|taxtakach|lat yeg)/i.test(q.text)],
    ['tech', `Texnik holat va shinalar`, `Tormoz, shina, nosozliklar`, '#8FA3C0', q => /(shina|tormoz|nosoz|rul|yonilg'i|ulagich|protektor)/i.test(q.text)],
    ['tow', `Shatakka olish va yuk tashish`, `Shatak, yuk, yo'lovchi tashish`, '#29B6F6', q => /(shatak|yuk |tirkama|odam tashish)/i.test(q.text)],
    ['speed', `Tezlik va masofa`, `Tezlik cheklovi, tormoz yo'li`, '#F7C600', q => /(km\/|tezlik|masofa|tormoz yo'li)/i.test(q.text)],
  ];
  const themeQs = (id) => { const t = THEMES.find(x => x[0] === id); return t ? BANK.Q.filter(q => t[4](q)) : []; };
  /* tasodifiy "o'xshash" to'plam: bitta savol tanlanadi va unga eng o'xshash 19 tasi olinadi */
  const tokOf = (q) => new Set((q.text + ' ' + q.options.map(o => o.label).join(' ')).toLowerCase().replace(/[^a-zа-яё'0-9 ]/g, ' ').split(/s+/).filter(w => w.length > 3));
  const nearest = (seed, n, from) => {
    const a = tokOf(seed), out = [];
    for (const o of (from || BANK.Q)) { if (o.id === seed.id) continue; const b = tokOf(o); let i = 0; for (const w of a) if (b.has(w)) i++; let sc = i / (a.size + b.size - i || 1); if (o.topic === seed.topic) sc += .08; if ((o.kind === 'sign') !== (seed.kind === 'sign')) sc -= .1; out.push([sc, o]); }
    return out.sort((x, y) => y[0] - x[0]).slice(0, n).map(x => x[1]);
  };
  V.similar = () => ({
    html: shell('tests', `<div class="page-h"><div><h1>O'xshash savollar</h1><p>Har to'plamda 20 ta savol, hammasi bir-biriga o'xshash. Chalkashtiradigan vaziyatlarni ketma-ket yechib, farqini his qilasiz.</p></div><a class="btn ghost" href="#/app">← Bosh sahifa</a></div>
    <div class="tk-wrap"><button class="btn primary lg" data-act="start" data-key="sm:rand:${(Date.now() & 0xfffff)}" style="justify-self:start">${ico('sparkles')} Tasodifiy o'xshash to'plam</button>
    <div class="tk-g2" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${THEMES.map(t => { const n = themeQs(t[0]).length, b = (Store.s.sets || {})['sm:' + t[0]]; return n < 6 ? '' : `<button class="tk2 ${b ? (b.pct >= 90 ? 'ok' : b.pct >= 70 ? 'mid' : 'low') : ''}" data-act="start" data-key="sm:${t[0]}">${b ? `<span class="pc">${b.pct}%</span>` : ''}<span style="width:12px;height:12px;border-radius:50%;background:${t[3]};box-shadow:0 0 14px ${t[3]}"></span><span class="n" style="font-size:19px;line-height:1.2">${esc(t[1])}</span><small>${esc(t[2])}</small><small style="margin-top:6px">${n} ta savol ichidan 20 tadan</small><span class="st"><i style="width:${b ? b.pct : 0}%"></i></span></button>`; }).join('')}</div></div>`)
  });

  /* ---------- 50/100 talik ---------- */
  V.big = () => ({
    html: shell('home', `<div class="page-h"><div><h1>50 / 100 talik</h1><p>Uzun testlar sabr va diqqatni mashq qildiradi. Vaqt savollar soniga qarab beriladi.</p></div><a class="btn ghost" href="#/app">← Bosh sahifa</a></div>
    <div class="grid g2">${[50, 100].map(n => `<div class="card"><div class="ai-h">${ico('list')} ${n} talik test</div><p class="mute" style="margin:6px 0 14px">Aralash savollar, ${Math.round(n * CFG.examMinutes / CFG.examQuestions)} daqiqa.</p><button class="btn primary" data-act="hm-big" data-n="${n}">Boshlash ${ico('arrow')}</button></div>`).join('')}</div>
    <p class="mute" style="font-size:13.5px;margin-top:14px">Bepul rejimda test hajmi ${CFG.freeTestSize} ta bilan cheklanadi.</p>`)
  });

  /* ---------- Saqlanganlar ---------- */
  const saved = () => (Store.s.saved = Store.s.saved || []);
  V.saved = () => {
    const l = saved().map(id => BANK.byId[id]).filter(Boolean);
    return {
      html: shell('home', `<div class="page-h"><div><h1>Saqlanganlar</h1><p>Savol ustidagi belgi bilan saqlangan savollar.</p></div><a class="btn ghost" href="#/app">← Bosh sahifa</a></div>
      ${l.length ? `<button class="go-b" data-act="start" data-key="sv">${ico('play')} Hammasini takrorlash (${Math.min(l.length, 30)} ta)</button><div class="stack s12 mt">${l.map(q => `<div class="nb-r"><div class="nb-t"><b>${esc(q.text.length > 120 ? q.text.slice(0, 117) + '…' : q.text)}</b><small>${esc(q.topicName)}</small></div><button class="btn sm soft" data-act="save-q" data-id="${q.id}" data-rr="1" aria-label="Olib tashlash">${ico('x')}</button></div>`).join('')}</div>`
        : `<div class="card" style="text-align:center;padding:44px"><div class="rw-i" style="margin:0 auto 12px">${ico('bookmark')}</div><h3>Hali saqlangan savol yo'q</h3><p class="mute" style="margin:8px 0 0">Test paytida savol yonidagi belgini bosing.</p></div>`}`)
    };
  };

  /* ---------- Shpargalkalar ---------- */
  const CHEATS = [
    [`Kesishmada kim ustun?`, [`1. Avval svetofor yoki tartibga soluvchining signali. U boshqa hamma qoidadan ustun.`, `2. Keyin yo'l belgilari: «Asosiy yo'l» va «Yo'l bering» / «STOP».`, `3. Teng yo'llarda o'ngdan kelayotganga yo'l bering.`, `4. Teng yo'lda tramvay ustun.`]],
    [`Svetofor signallari`, [`Yashil: harakatlanish mumkin.`, `Sariq: to'xtash chizig'i oldida to'xtang; agar xavfsiz to'xtay olmasangiz, o'tishingiz mumkin.`, `Qizil: to'xtang va yashilni kuting.`, `Miltillovchi yashil: signal tez almashadi, tayyor bo'ling.`]],
    [`Belgilar shakli va rangi`, [`Qizil hoshiyali uchburchak: ogohlantirish.`, `Qizil hoshiyali aylana: taqiq.`, `Ko'k aylana: buyruq (majburiy yo'nalish yoki harakat).`, `Ko'k to'rtburchak: axborot-ishora.`, `Uchi pastga uchburchak: yo'l bering. Sakkizburchak: STOP.`]],
    [`Yo'l chiziqlari`, [`Uzluksiz chiziq: kesib o'tish mumkin emas.`, `Uzuq chiziq: sharoit xavfsiz bo'lsa kesib o'tish mumkin.`, `Ikkita uzluksiz chiziq: qarama-qarshi oqimlarni ajratadi.`, `Yo'lning chetidagi chiziq: yo'l qirrasini ko'rsatadi.`]],
    [`Manyovr oldidan`, [`Ko'zgularga qarang.`, `Burilish ko'rsatkichini oldindan yoqing.`, `«Ko'r zona»ni boshingizni burib tekshiring.`, `Manyovrni boshlagach, signalni o'chirmang, to'xtamang.`]],
  ];
  V.cheats = () => ({
    html: shell('home', `<div class="page-h"><div><h1>Shpargalkalar</h1><p>Imtihon oldidan tez ko'z yugurtirish uchun qisqa eslatmalar.</p></div><a class="btn ghost" href="#/app">← Bosh sahifa</a></div>
    <div class="stack s12">${CHEATS.map((c, i) => `<details class="card ch" ${i === 0 ? 'open' : ''}><summary><b>${esc(c[0])}</b>${ico('arrow')}</summary><ul>${c[1].map(x => `<li>${ico('check')}<span>${esc(x)}</span></li>`).join('')}</ul></details>`).join('')}</div>
    <p class="mute" style="font-size:13px;margin-top:14px">Raqamlar (tezlik, masofa) va to'liq matn uchun rasmiy manbaga qarang: <a href="https://lex.uz/acts/-2850459" target="_blank" rel="noopener noreferrer" style="color:var(--acc)">lex.uz</a>.</p>`)
  });

  /* ---------- test kalitlari: bilet, saqlanganlar, raqamli ---------- */
  const mk = (key, title, list, setKey) => ({ key, title, mode: 'practice', list, i: 0, picks: [], revealed: false, simple: false, start: Date.now(), endAt: 0, done: false, setKey: setKey || null });
  const prevHook = V.buildHook;
  V.buildHook = (key) => {
    if (key.startsWith('t:')) { const n = +key.slice(2); if (!(n >= 1 && n <= ticketCount())) return null; return mk(key, `Bilet ${n}`, ticketList(n), key); }
    if (key.startsWith('sm:')) {
      const p = key.split(':'), seedN = (Date.now() & 0xffffff) + 9;
      if (p[1] === 'rand') { const pool = BANK.Q.filter(q => !q.img || true), sq = pool[(+p[2] * 2654435761 >>> 0) % pool.length]; const l = [sq, ...nearest(sq, 19)]; return mk(key, `O'xshash savollar · 20 ta`, l, null); }
      const all = themeQs(p[1]); let l; if (all.length > 40) { const sq = BANK.shuffle(all, seedN)[0]; l = [sq, ...nearest(sq, 19, all)]; } else l = BANK.shuffle(all, seedN).slice(0, 20); const t = THEMES.find(x => x[0] === p[1]); return l.length ? mk(key, `O'xshash: ${t[1]}`, l, key) : null;
    }
    if (key === 'sv') { const l = saved().map(id => BANK.byId[id]).filter(Boolean).slice(0, 30); return l.length ? mk(key, `Saqlanganlar · ${l.length} savol`, l) : null; }
    if (key === 'num') { const l = BANK.shuffle(BANK.Q.filter(q => /\d/.test(q.text)), (Date.now() & 0xffffff) + 5).slice(0, 20); return l.length ? mk(key, `Raqamli savollar · ${l.length} savol`, l) : null; }
    return prevHook ? prevHook(key) : null;
  };

  /* ---------- qidiruv va sozlamalar ---------- */
  const ALL = [...PILLS.filter(p => !p[0].startsWith('act:')).map(p => [p[0], p[2]]), ...MORE.map(m => [m[0], m[2]]), ['#/app/premium', 'Premium'], ['#/app/id', 'Mening ID'], ['#/app/bot', 'Telegram bot'], ['#/app/battle', 'Batl'], ['#/app/exam', 'Sinov imtihoni']];
  V.inputs = Object.assign(V.inputs || {}, { 'hm-s'(t) { const q = t.value.trim().toLowerCase(); document.getElementById('hm-sl').innerHTML = ALL.filter(a => !q || a[1].toLowerCase().includes(q)).map(a => `<a href="${a[0]}" data-act="close">${esc(a[1])}${ico('arrow')}</a>`).join('') || `<p class="mute">Topilmadi</p>`; } });

  V.acts = Object.assign(V.acts || {}, {
    'hm-smart'() { const st = Store.me(), w = ST.weakTopics(st); V.acts.start({ dataset: { key: w.length ? w[0].t.id : 'mix' } }); },
    'hm-hard'() { V.T.src = 'hard'; V.T.count = 20; V.T.mode = 'practice'; V.T.timed = false; V.acts.start({ dataset: { key: 'custom' } }); },
    'hm-num'() { V.acts.start({ dataset: { key: 'num' } }); },
    'hm-big'(el) { V.T.src = 'mix'; V.T.count = +el.dataset.n; V.T.mode = 'practice'; V.T.timed = true; V.acts.start({ dataset: { key: 'custom' } }); },
    'save-q'(el) {
      const id = el.dataset.id, l = saved(), i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id); Store.save();
      if (el.dataset.rr) { V.rerender(); return; }
      el.classList.toggle('on', i < 0); toast(i < 0 ? `Saqlandi` : `Olib tashlandi`);
    },
    'hm-search'() { modal(`<h3>Bo'limni toping</h3><input class="input" id="hm-si" placeholder="Masalan: bilet, simulyator…" data-input="hm-s" autocomplete="off"><div class="hm-sl" id="hm-sl">${ALL.map(a => `<a href="${a[0]}" data-act="close">${esc(a[1])}${ico('arrow')}</a>`).join('')}</div>`); const i = document.getElementById('hm-si'); if (i) i.focus(); },
    'hm-set'() {
      modal(`<h3>${esc(Store.s.name || 'Talaba')}</h3><p class="mute">ID: <b class="mono" style="color:var(--acc)">${esc(Store.myUid())}</b> · ${esc(level())}</p><div class="hm-sl"><a href="#/app/id" data-act="close">Mening ID${ico('arrow')}</a><a href="#/app/premium" data-act="close">Premium${ico('arrow')}</a><a href="#/app/bot" data-act="close">Telegram bot${ico('arrow')}</a><a href="#/app/teacher" data-act="close">Ustoz bilan aloqa${ico('arrow')}</a></div><button class="btn soft" style="width:100%;margin-top:14px" data-act="logout">${ico('logout')} Chiqish</button>`);
    },
  });
})();





