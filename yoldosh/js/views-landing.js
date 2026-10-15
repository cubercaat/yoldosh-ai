/* Bosh sahifa — premium AI SaaS ko'rinishi.
   Bo'limlar alohida funksiyalar (qayta ishlatiladigan komponentlar); effektlar bitta mountLanding() ichida
   va unmount da to'liq tozalanadi. Kutubxonasiz: faqat transform/opacity, IntersectionObserver, rAF. */
(function () {
  const { ico, esc, ava } = UI;
  const V = (window.V = window.V || {});
  const CFG = window.YOLDOSH;
  const LIVE = () => !!(window.Cloud && Cloud.live());   // haqiqiy rejim: demo tugmalari yo'qoladi
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = () => window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- kichik vizual yordamchilar ---------- */
  let uid = 0;
  const ring = (pct, size, stroke, col, extra = '') => `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true"><circle cx="60" cy="60" r="${54}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/><circle class="rcirc ${extra}" pathLength="100" cx="60" cy="60" r="54" stroke="${col}" style="--len:${pct};stroke-width:${stroke}"/></svg>`;
  function smooth(pts) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
    return d;
  }
  function lineChart(vals, labels, { w = 560, h = 190, pad = 22, min, max } = {}) {
    const id = 'lc' + (++uid), lo = min ?? Math.min(...vals) - 6, hi = max ?? Math.max(...vals) + 6;
    const pts = vals.map((v, i) => [pad + i * (w - pad * 2) / (vals.length - 1), h - pad - (v - lo) / (hi - lo) * (h - pad * 2)]);
    const d = smooth(pts), area = `${d} L${pts[pts.length - 1][0]} ${h - pad} L${pts[0][0]} ${h - pad} Z`;
    return `<svg class="lc" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Chiziqli grafik" data-pts='${JSON.stringify(pts.map((p, i) => [p[0] / w, p[1] / h, vals[i], labels[i]]))}'>
      <defs><linearGradient id="${id}a" x1="0" x2="1"><stop offset="0" stop-color="#7BA6FF"/><stop offset=".55" stop-color="#6EE7B7"/><stop offset="1" stop-color="#B8F53B"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8F53B" stop-opacity=".28"/><stop offset="1" stop-color="#B8F53B" stop-opacity="0"/></linearGradient></defs>
      ${[0, 1, 2, 3].map(i => `<line class="gl" x1="${pad}" x2="${w - pad}" y1="${pad + i * (h - pad * 2) / 3}" y2="${pad + i * (h - pad * 2) / 3}"/>`).join('')}
      <path class="ar" d="${area}" style="fill:url(#${id}b)"/><path class="ln" pathLength="1" d="${d}" style="stroke:url(#${id}a)"/>
      ${pts.map(p => `<circle class="dt" cx="${p[0]}" cy="${p[1]}" r="4.2"/>`).join('')}</svg>`;
  }
  const spark = (seed) => { const r = BANK.rng(seed); let y = 30; const p = Array.from({ length: 9 }, (_, i) => { y = Math.max(8, Math.min(36, y + (r() - .62) * 12)); return [i * 12.5, y]; }); return `<svg class="spk" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sp${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8F53B" stop-opacity=".25"/><stop offset="1" stop-color="#B8F53B" stop-opacity="0"/></linearGradient></defs><path d="${smooth(p)} L100 44 L0 44 Z" fill="url(#sp${seed})"/><path d="${smooth(p)}" fill="none" stroke="#B8F53B" stroke-width="1.6" opacity=".8"/></svg>`; };

  /* ---------- BO'LIMLAR ---------- */
  const navHtml = () => `
    <nav class="l-nav" id="lnav" aria-label="Asosiy navigatsiya">
      <a class="l-brand" href="#/" aria-label="Chorraha — bosh sahifa">${UI.logo()}<span>Chorraha</span><i class="ai-dot" aria-hidden="true"></i></a>
      <div class="l-links" role="list"><a href="#f" data-s="f">Imkoniyatlar</a><a href="#roles" data-s="roles">Kim uchun</a><a href="#how" data-s="how">Qanday ishlaydi</a><a href="#price" data-s="price">Narxlar</a><a href="#faq" data-s="faq">Savollar</a></div>
      <div class="l-cta"><a class="lb gls sm" href="#/login">Kirish</a><button class="lb pri sm" data-act="demo-student">${LIVE() ? 'Boshlash' : 'Demoni ochish'}</button>
        <button class="l-burger" id="lburger" aria-label="Menyuni ochish" aria-expanded="false" aria-controls="lmenu"><i></i><i></i><i></i></button></div>
    </nav>
    <div class="l-menu" id="lmenu" aria-hidden="true">
      <a class="ml" href="#f" style="transition-delay:.05s">Imkoniyatlar</a><a class="ml" href="#roles" style="transition-delay:.1s">Kim uchun</a><a class="ml" href="#how" style="transition-delay:.15s">Qanday ishlaydi</a><a class="ml" href="#price" style="transition-delay:.18s">Narxlar</a><a class="ml" href="#faq" style="transition-delay:.2s">Savollar</a>
      <button class="lb pri xl" data-act="demo-student">${LIVE() ? 'Boshlash' : 'Demoni ochish'} ${ico('arrow', 'ar')}</button><a class="lb gls xl" href="#/login">Kirish</a>
    </div>`;

  const heroHtml = () => {
    const words = (t, start) => t.split(' ').map((w, i) => `<span class="w"><span style="--i:${start + i}">${w}</span></span>`).join(' ');
    return `
    <header class="l-hero" id="top"><div class="wrap">
      <div>
        <div class="l-badge seq" style="--t:.35s"><i>AI</i>Avtomaktablar uchun aqlli ta'lim platformasi</div>
        <h1 class="l-h1" aria-label="Pravani birinchi urinishda oling. 1276 ta rasmiy savol, ovozli tushuntirish.">
          <span class="ln" aria-hidden="true">${words('Pravani', 0)}</span>
          <span class="ln rot" aria-hidden="true"><span class="rot-w"><i>birinchi urinishda</i><i>xatosiz</i><i>qo'rqmasdan</i><i>tez va oson</i></span></span>
          <span class="ln" aria-hidden="true">${words('oling.', 4)}</span></h1>
        <div class="l-road seq" style="--t:.9s" aria-hidden="true"><i class="rd-line"></i><span class="rd-car"><svg viewBox="0 0 120 56"><path d="M8 38c0-6 3-9 9-10l14-12c3-3 7-4 11-4h28c5 0 9 2 12 5l10 11c8 1 12 4 12 10v4c0 2-2 4-4 4h-6a10 10 0 0 0-20 0H42a10 10 0 0 0-20 0h-8c-3 0-6-2-6-4z" fill="#b8f53b"/><path d="M38 28l9-9c2-2 4-3 7-3h20c3 0 5 1 7 3l8 9z" fill="#0b1020" opacity=".78"/><circle cx="32" cy="46" r="8" fill="#0b1020" stroke="#dfe6f7" stroke-width="3"/><circle cx="88" cy="46" r="8" fill="#0b1020" stroke="#dfe6f7" stroke-width="3"/></svg></span><span class="rd-sign">STOP</span></div>
        <div class="l-stats seq" style="--t:1s"><span><b>1276</b>rasmiy savol</span><span><b>🔊</b>ovozli tushuntirish</span><span><b>64</b>bilet</span><span><b>🔥</b>Test Pro</span></div>
        <p class="l-lead seq" style="--t:1.05s">Rasmiy savollar, xatongizni oddiy tilda tushuntiradigan ovozli yordamchi va eng qiyin savollar — hammasi bir joyda. Telefonda ham, kompyuterda ham, o'zbek tilida.</p>
        <div class="l-ctas seq" style="--t:1.2s"><button class="lb pri xl" data-act="demo-student">${LIVE() ? 'Bepul boshlash' : 'Talaba sifatida sinash'} ${ico('arrow', 'ar')}</button>${LIVE() ? '<a class="lb gls xl" href="#/login">Kirish</a>' : '<button class="lb gls xl" data-act="demo-teacher">Ustoz panelini ko\'rish</button>'}</div>
        <div class="l-trust seq" style="--t:1.35s"><span>${ico('check')}O'rnatish shart emas</span><span>${ico('check')}Telefon va kompyuterda</span><span>${ico('check')}O'zbek tilida</span></div>
      </div>
      <div class="stage" id="stage" aria-hidden="true">
        <div class="pv pv-l pv-main" data-depth="0" data-tilt="1"><div class="pv-f pv-glass pv-main-i" style="animation-duration:9s">
          <div class="pm-top"><span class="tp">Taqiqlovchi belgilar</span><span>Savol 7/10</span></div><div class="pm-prog"><i></i></div>
          <div class="pm-sign">${SIGNS.svg('b_overtake')}</div>
          <div class="pm-q">Bu belgi nimani anglatadi?</div>
          <div class="pm-o"><b>A</b>Kirish taqiqlanadi</div><div class="pm-o ok"><b>B</b>Quvib o'tish taqiqlanadi<span style="margin-left:auto">${ico('check')}</span></div><div class="pm-o"><b>C</b>Turish taqiqlanadi</div>
          <div class="pm-ai"><h5>${ico('sparkles')}Chorraha</h5>Ikki mashina yonma-yon: biri ikkinchisini quvmaydi. Eslab qoling<span class="caret"></span></div></div></div>
        <div class="pv pv-l pv-ring" data-depth="26"><div class="pv-f pv-glass" style="animation-delay:-2s;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:20px"><div class="rg">${ring(82, 62, 11, '#B8F53B', 'hero')}<b>82%</b></div><div><strong>Imtihonga<br>tayyorlik</strong><small>Tayyorga yaqin</small></div></div></div>
        <div class="pv pv-l pv-teacher" data-depth="-20"><div class="pv-f pv-glass" style="animation-delay:-4s;padding:14px;border-radius:20px"><h6>Ustoz paneli <em>jonli</em></h6>
          ${[['Madina Y.', 91, '#34D399'], ['Jasur R.', 64, '#FBBF24'], ['Bobur T.', 38, '#FF5C70']].map(r => `<div class="pt-r"><span class="a" style="background:hsl(${r[0].charCodeAt(0) * 5} 62% 48%)">${r[0][0]}</span><span class="bb"><i style="width:${r[1]}%;background:${r[2]}"></i></span><span>${r[1]}%</span></div>`).join('')}
          <div class="pt-al">${ico('alert')}3 talaba 3 kundan beri kirmagan</div></div></div>
        <div class="pv pv-l pv-tg" data-depth="30"><div class="pv-f pv-glass" style="animation-delay:-1s;display:flex;gap:11px;align-items:center;padding:12px 14px;border-radius:18px"><span class="ic">${ico('send')}</span><div><strong>Ustozga yuborildi</strong><small>«Turish va to'xtash farqini tushunmadim»</small></div></div></div>
        <div class="pv pv-l pv-sc" data-depth="-28"><div class="pv-f pv-glass" style="animation-delay:-5s;padding:13px 15px;border-radius:18px"><div class="row"><small>Kunlik faollik</small><strong>34 daq</strong></div><div class="sp">${[40, 62, 48, 80, 66, 92, 74].map((h, i) => `<i style="height:${h}%;animation-delay:${2.8 + i * .06}s"></i>`).join('')}</div></div></div>
      </div>
    </div></header>`;
  };

  const statsHtml = () => {
    const items = [['book', BANK.Q.length, '', 'savol, 3 qiyinlik darajasida'], ['grid', SIGNS.list.length, '', 'aniq chizilgan yo\'l belgisi'], ['target', BANK.TOPICS.length, '', 'mavzu va kesishma sahnalari'], ['clock', 24, '/7', 'AI yordamchi, har doim yonda']];
    return `<section class="l-sec" style="padding-top:20px" aria-label="Raqamlarda"><div class="wrap"><div class="l-stats">${items.map((s, i) => `
      <div class="spot tilt m-card rv" data-rv="scale" style="--d:${i * .08}s">${spark(7 + i * 11)}<span class="m-ic">${ico(s[0])}</span><div class="num"><span data-count="${s[1]}">0</span>${s[2] ? `<small>${s[2]}</small>` : ''}</div><div class="lbl">${s[3]}</div></div>`).join('')}</div></div></section>`;
  };

  const bentoHtml = () => {
    const sm = ST.summary(ST.DEMO), rows = sm.topics.filter(t => t.act).slice(0, 5);
    const short = (n) => n.replace(' belgilari', '').replace(' belgilar', '').replace(' va tartibga solish', '').replace(' va xavfsizlik', '');
    const tone = UI.tone;
    return `<section class="l-sec" id="f"><div class="wrap">
      <div class="l-sh rv"><div class="l-kick">Imkoniyatlar</div><h2 class="l-h2">Chorraha nima qiladi?</h2><p class="l-p">Test yechadigan oddiy ilova emas. Talabaning uydagi mashg'ulotlarini ham ko'rinadigan, tushunarli va boshqariladigan qiladigan tizim.</p></div>
      <div class="bento">
        <article class="spot tilt b-card c7 rv"><span class="b-tag">${ico('sparkles')}AI test tahlili</span><h3>Qayerda xato qilinayotganini AI topadi</h3><p>Har bir javob mavzular kesimida tahlil qilinadi. Zaif joylar avtomatik ajratiladi.</p>
          <div class="b-prev"><div class="hm">${rows.map((t, i) => { const a = t.avg; return `<div class="hm-r"><span>${esc(short(t.t.name))}</span><div class="tr"><i style="width:${a}%;background:linear-gradient(90deg,${tone(a)},${tone(a)}aa);--d:${i * .12}s"></i></div><em>${a}%</em></div>`; }).join('')}</div>
          <div class="ai-bub" style="margin-top:16px"><span class="av">${ico('sparkles')}</span><div><b>Tavsiya:</b> «${esc(short(rows.sort((a, b) => a.avg - b.avg)[0].t.name))}» mavzusini 10 ta savol bilan takrorlang.</div></div></div></article>
        <article class="spot tilt b-card c5 rv" style="--d:.1s"><span class="b-tag">${ico('bolt')}Aqlli tushuntirishlar</span><h3>Xato — o'rganish imkoniyati</h3><p>Noto'g'ri javobdan keyin AI sodda tilda tushuntiradi va eslab qolish usulini beradi.</p>
          <div class="b-prev"><div class="wrongx">${ico('x')}Siz tanlagan javob noto'g'ri</div><div class="ai-bub"><span class="av">${ico('sparkles')}</span><div>Bu belgi <b>turishni</b> taqiqlaydi, to'xtashni emas. <b>Bitta chiziq</b> — to'xtash mumkin, turish mumkin emas.</div></div></div></article>
        <article class="spot tilt b-card c5 rv"><span class="b-tag">${ico('chart')}Ustoz paneli</span><h3>Har bir talaba kaftingizda</h3><p>Tayyorlik, faollik va zaif mavzular — bir ekranda.</p>
          <div class="b-prev"><div class="mini-t">${ST.DEMO.slice(0, 4).map(s => { const r = ST.readiness(s), st = ST.status(r); return `<div class="mt-r"><span class="a" style="background:hsl(${s.name.charCodeAt(0) * 7} 60% 46%)">${UI.initials(s.name)}</span><div>${esc(s.name)}<small>${r}% tayyor</small></div><span class="chp ${st.key === 'ok' ? 'ok' : st.key === 'near' ? 'wn' : 'bd'}">${st.label}</span></div>`; }).join('')}</div></div></article>
        <article class="spot tilt b-card c7 rv" style="--d:.1s"><span class="b-tag">${ico('trend')}Talaba progressi</span><h3>O'sish ko'zga ko'rinadi</h3><p>Natijalar dinamikasi talaba va ustozni rag'batlantiradi.</p>
          <div class="b-prev">${lineChart([34, 41, 39, 52, 58, 66, 74], ['1', '2', '3', '4', '5', '6', '7'], { w: 560, h: 150, pad: 14 })}</div></article>
        <article class="spot tilt b-card c6 rv"><span class="b-tag">${ico('send')}Telegram bilan aloqa</span><h3>Ustozga bir bosishda</h3><p>Talaba tushunmagan joyini yozadi, xabar zaif mavzulari bilan birga ustozga boradi.</p>
          <div class="b-prev"><div class="tg-c"><div class="tg-m me">Ustoz, «Yo'l bering» va STOP farqini tushunmadim<small>Tayyorlik: 64% · Zaif: Imtiyozli belgilar</small></div><div class="tg-m bot">Salom! Ertaga darsda alohida ko'rib chiqamiz. Hozircha shu mavzuning 10 ta savolini yeching.</div></div></div></article>
        <article class="spot tilt b-card c6 rv" style="--d:.1s"><span class="b-tag">${ico('target')}Imtihonga tayyorlik</span><h3>Tayyormi yoki yo'q — aniq javob</h3><p>Natija, qamrov va imtihon ko'rsatkichlaridan foiz hisoblanadi.</p>
          <div class="b-prev"><div class="ring-w"><div class="rg">${ring(86, 128, 9, '#B8F53B')}<b>86%</b></div><div class="ck"><div>${ico('check')}Mavzularning 8 tasi o'zlashtirilgan</div><div>${ico('check')}3 ta sinov imtihoni topshirilgan</div><div class="no">${ico('clock')}1 ta mavzu takrorlanishi kerak</div></div></div></div></article>
      </div></div></section>`;
  };

  const demoHtml = () => `<section class="l-sec" id="roles"><div class="wrap"><div class="demo-g">
      <div class="rv" data-rv="left"><div class="l-kick">Talaba uchun</div><h2 class="l-h2">Tushunmagan joyi qolmaydi</h2><p class="l-p">Javob tanlang va AI qanday tushuntirishini o'zingiz sinab ko'ring. Bu haqiqiy savollar bazasi.</p>
        <ul class="l-list"><li>${ico('check')}<span>Mavzuli testlar va 20 savollik vaqtli imtihon</span></li><li>${ico('check')}<span>Har bir xatodan keyin darhol AI tushuntirishi</span></li><li>${ico('check')}<span>Xatolar ustida ishlash: faqat adashgan savollar</span></li><li>${ico('check')}<span>Kamerani belgiga tuting, tizim ma'nosini aytadi</span></li></ul></div>
      <div class="spot qd rv" data-rv="right" id="qdemo"></div></div></div></section>`;

  const dashHtml = () => {
    const sm = ST.summary(ST.DEMO), c = { ok: 0, near: 0, no: 0 }; sm.withR.forEach(x => c[ST.status(x.r).key]++);
    const days = Array.from({ length: 7 }, (_, i) => Math.round(ST.DEMO.reduce((a, s) => a + s.days[i], 0) / ST.DEMO.length)), mx = Math.max(...days);
    const WD = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha'], lab = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return WD[d.getDay()]; });
    const tot = c.ok + c.near + c.no; let acc = 0;
    const seg = [['#34D399', c.ok, 'Tayyor'], ['#FBBF24', c.near, 'Yaqin'], ['#FF5C70', c.no, 'Tayyor emas']].map(([col, n, name]) => { const p = n / tot * 100, rot = acc; acc += p; return { col, n, name, p, rot }; });
    return `<section class="l-sec" id="teacher"><div class="wrap">
      <div class="l-sh rv"><div class="l-kick">Ustoz va rahbar uchun</div><h2 class="l-h2">Butun guruh — bitta jonli panelda</h2><p class="l-p">Kim o'qiyapti, kim qiynalyapti, kim imtihonga tayyor — tizim ko'rsatadi, ustoz esa qaror qiladi.</p></div>
      <div class="spot dash rv" data-rv="scale" id="dash">
        <div class="dash-top"><div class="dash-t"><span class="dots"><i></i><i></i><i></i></span>${esc(CFG.school)} · Boshqaruv paneli</div><div class="seg" role="tablist" aria-label="Davr"><button class="on" data-p="w" role="tab" aria-selected="true">Hafta</button><button data-p="m" role="tab" aria-selected="false">Oy</button></div></div>
        <div class="dash-b">
          <div class="kpis">
            <div class="kpi"><small>Talabalar</small><b data-count="${sm.N}">0</b><em>+2</em></div>
            <div class="kpi"><small>Imtihonga tayyor</small><b><span data-count="${Math.round(sm.ready / sm.N * 100)}">0</span><small>%</small></b></div>
            <div class="kpi"><small>O'rtacha natija</small><b><span data-count="${sm.mastery}">0</span><small>%</small></b><em>+4%</em></div>
            <div class="kpi"><small>Kirmayotganlar</small><b data-count="${sm.inactive.length}">0</b></div></div>
          <div class="dgrid"><div class="dpan"><h4>O'rtacha natija dinamikasi <span id="dlbl">So'nggi 7 kun</span></h4><div class="chart-w" id="dchart">${lineChart([58, 61, 60, 64, 66, 69, 72], lab, { w: 560, h: 190, pad: 22 })}<div class="tip-b" id="dtip"></div></div></div>
            <div class="dpan"><h4>Tayyorlik taqsimoti <span>${tot} talaba</span></h4><div class="donut"><div class="rg"><svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="11"/>${seg.map((s, i) => `<circle class="rcirc" pathLength="100" cx="60" cy="60" r="54" stroke="${s.col}" style="--len:${Math.max(0, s.p - 1.5)};stroke-width:11;transform:rotate(${-90 + s.rot * 3.6}deg);transition-delay:${.3 + i * .25}s"/>`).join('')}</svg><b>${Math.round(c.ok / tot * 100)}%<small>tayyor</small></b></div>
              <div class="lgd">${seg.map(s => `<div><i style="background:${s.col}"></i>${s.name}<em>${s.n}</em></div>`).join('')}</div></div></div></div>
          <div class="dgrid b"><div class="dpan"><h4>Kunlik faollik <span>daqiqa (o'rtacha)</span></h4><div class="act" id="dact">${days.map((v, i) => `<div><i style="--h:${Math.max(6, v / mx * 100)}%;--d:${i * .08}s" title="${v} daq"></i>${lab[i]}</div>`).join('')}</div></div>
            <div class="dpan"><h4>Diqqat talab qiladi <span>AI tahlil</span></h4><div class="mini-t">${sm.withR.slice().sort((a, b) => a.r - b.r).slice(0, 3).map(({ s, r }) => { const st = ST.status(r); return `<div class="mt-r"><span class="a" style="background:hsl(${s.name.charCodeAt(0) * 7} 60% 46%)">${UI.initials(s.name)}</span><div>${esc(s.name)}<small>${s.lastActive >= 3 ? s.lastActive + ' kun kirmagan' : r + '% tayyor'}</small></div><span class="chp ${st.key === 'near' ? 'wn' : 'bd'}">${st.label}</span></div>`; }).join('')}</div></div></div>
        </div></div><p class="note">Namuna ma'lumotlar. Haqiqiy panel talabalaringiz natijalari bilan to'ladi.</p></div></section>`;
  };

  const storyHtml = () => {
    const names = ['Aziz Karimov', 'Madina Yusupova', 'Jasur Rahmonov', 'Sevara Ismoilova', 'Bobur Tursunov', 'Nilufar Abdullayeva'];
    const steps = [['Kursni ulaymiz', `Avtomaktab nomi, guruhlar va ustozlar tizimga kiritiladi. Tayyor shablonlar bilan bir kunda.`], ['Talabalar kiradi', `Har bir talaba telefon yoki kompyuterdan o'z hisobi bilan kiradi. O'rnatish shart emas.`], ['AI kuzatadi', `Tizim natija, vaqt va xatolarni yig'ib, tayyorlik foizini hisoblaydi va zaif joylarni topadi.`], ['Ustoz natijani ko\'radi', `Panel va Telegram orqali ustoz kerakli talabaga aynan o'z vaqtida yordam beradi.`]];
    return `<section class="l-sec" id="how" style="padding:100px 0 0"><div class="wrap"><div class="l-sh rv" style="margin-bottom:0"><div class="l-kick">Qanday ishlaydi</div><h2 class="l-h2">To'rt qadamda ishga tushadi</h2></div></div>
      <div class="l-story" id="story" data-step="0"><div class="st-in"><div class="wrap st-g">
        <div class="st-l"><div class="st-steps" id="stSteps">${steps.map((s, i) => `<div class="st-i ${i === 0 ? 'on' : ''}" data-n="${i + 1}"><h4>${s[0]}</h4><p>${s[1]}</p></div>`).join('')}</div></div>
        <div class="st-v" aria-hidden="true">
          <div class="sc" data-i="0"><div class="spot pv-glass sc-card"><h5>Yangi kurs <span>1/3</span></h5><b style="font-size:20px;letter-spacing:-.03em">${esc(CFG.school)}</b><div class="chips"><span class="on">A guruh · 8 talaba</span><span class="on">B guruh · 7 talaba</span><span>+ Yangi guruh</span></div><div class="checks" style="margin-top:18px"><div>${ico('check')}Ustozlar qo'shildi</div><div>${ico('check')}Savollar bazasi ulandi</div><div>${ico('check')}Telegram aloqa sozlandi</div></div></div></div>
          <div class="sc" data-i="1"><div class="spot pv-glass sc-card"><h5>Talabalar <span>Jonli</span></h5><div class="av-s">${names.map((n, i) => `<span style="--k:${i}">${ava(n, 46)}</span>`).join('').replace(/class="ava"/g, 'class="ava"')}</div><div class="feed"><div><i class="dot"></i>Aziz kirdi<small>hozir</small></div><div><i class="dot"></i>Madina test boshladi<small>1 daq</small></div><div><i class="dot"></i>Jasur imtihon topshirdi<small>3 daq</small></div></div></div></div>
          <div class="sc" data-i="2"><div class="spot pv-glass sc-card scanner"><div class="beam"></div><h5>AI tahlil <span>Real vaqt</span></h5><div class="hm in" style="--d:0s">${[['Taqiqlovchi', 52, '#FF5C70'], ['Imtiyozli', 71, '#FBBF24'], ['Chiziqlar', 88, '#34D399'], ['Kesishmalar', 64, '#FBBF24']].map((r, i) => `<div class="hm-r"><span>${r[0]}</span><div class="tr"><i style="width:${r[1]}%;background:${r[2]};--d:${i * .12}s"></i></div><em>${r[1]}%</em></div>`).join('')}</div><div class="ins-c">AI: «Taqiqlovchi belgilar» mavzusida xatolar ko'p. Qayta mashq tavsiya etiladi.</div></div></div>
          <div class="sc" data-i="3"><div class="stack" style="display:grid;gap:14px;width:min(460px,100%)"><div class="spot pv-glass sc-card"><h5>Ustoz paneli <span>Bugun</span></h5><div class="mini-t">${ST.DEMO.slice(2, 5).map(s => { const r = ST.readiness(s), st = ST.status(r); return `<div class="mt-r"><span class="a" style="background:hsl(${s.name.charCodeAt(0) * 7} 60% 46%)">${UI.initials(s.name)}</span><div>${esc(s.name)}<small>${r}% tayyor</small></div><span class="chp ${st.key === 'ok' ? 'ok' : st.key === 'near' ? 'wn' : 'bd'}">${st.label}</span></div>`; }).join('')}</div></div>
            <div class="pv-glass" style="display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:18px"><span class="pv-tg-ic" style="display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#2AABEE,#229ED9)">${ico('send')}</span><div style="font-size:13.5px;font-weight:700">Ustozga yangi xabar<br><small style="color:var(--m);font-weight:600">Jasur: «Turish va to'xtash farqini tushunmadim»</small></div></div></div></div>
        </div></div></div></div></section>`;
  };

  const FAQ = [
    [`Talabalar uchun qiyin bo'lmaydimi?`, `Yo'q. Ilova sodda: bosish, javob tanlash, tushuntirishni o'qish. Hech narsa o'rnatish shart emas, brauzer yetarli.`],
    [`Telefon orqali ishlaydimi?`, `Ha. Platforma telefon, planshet va kompyuterda brauzer orqali ishlaydi. Mobil ko'rinish alohida moslashtirilgan, kamera orqali yo'l belgisini aniqlash ham telefonda qulay.`],
    [`AI qanday yordam beradi?`, `Talaba xato qilgan savolga sodda tilda tushuntirish va eslab qolish usulini beradi, zaif mavzularni aniqlaydi va nimani takrorlash kerakligini tavsiya qiladi. Istalgan savolni AI yordamchidan so'rash mumkin.`],
    [`Ustoz qanday kuzatadi?`, `Ustoz panelida har bir talabaning tayyorlik foizi, o'zlashtirishi, kunlik faolligi va zaif mavzulari ko'rinadi. AI esa kimga e'tibor berish kerakligini o'zi ajratib beradi.`],
    [`Telegram orqali ishlaydimi?`, `Talaba tushunmagan joyini ustozga yozadi va xabar uning zaif mavzulari bilan birga ustozga boradi. Telegramga avtomatik yuborish serverni ulagandan keyin ishga tushadi. Demo versiyada xabar ustoz paneliga tushadi.`],
    [`Ustoz uchun qo'shimcha ish ko'payadimi?`, `Aksincha, kamayadi. Tizim o'zi tahlil qiladi va faqat e'tibor kerak bo'lgan talabalarni ko'rsatadi.`],
    [`Savollar bazasi amaldagi qoidalarga mos bo'ladimi?`, `Savollarni kursingiz ustozlari bilan birgalikda tekshirib, rasmiy qoidalar bo'yicha yangilab boramiz. Sizga o'z savollaringizni qo'shish imkoniyati ham beriladi.`],
    [`Ma'lumotlar xavfsizmi?`, `Talaba ma'lumotlari faqat o'z avtomaktabi ustozlari va rahbariga ko'rinadi.`],
    [`Narxi qancha?`, `Avtomaktab tarifi talabalar soniga qarab (Narxlar bo'limida taklif). Talaba Premiumi oyiga 99 000 so'm, birinchi 7 kun bepul. Shartlarni birga kelishamiz.`],
  ];
  const priceHtml = () => { const m = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return `<section class="l-sec" id="price"><div class="wrap"><div class="l-sh rv"><div class="l-kick">Narxlar</div><h2 class="l-h2">Avtomaktab uchun oddiy tarif</h2><p class="l-lead">Talabalar soniga qarab oylik to'lov. Narxlar taklif sifatida; shartlarni birga kelishamiz.</p></div>
    <div class="pr-g">${CFG.plans.map((p, i) => `<div class="pr-c rv ${p.hot ? 'hot' : ''}" style="--d:${i * .07}s">${p.hot ? `<span class="pr-tag">Eng ko'p tanlanadi</span>` : ''}<b>${esc(p.name)}</b><div class="pr-p">${p.price ? m(p.price) : 'Kelishuv'}<small>${p.price ? " so'm / oy" : ''}</small></div><p>${p.upTo ? p.upTo + ' tagacha talaba' : 'Bir nechta filial'}</p><ul><li>${ico('check')}Ustoz paneli va hisobotlar</li><li>${ico('check')}Guruh havolalari, guruh imtihoni</li><li>${ico('check')}Talabaga haftalik Telegram bot hisoboti</li>${p.price ? `<li>${ico('check')}Maktab nomi va logotipi</li>` : `<li>${ico('check')}Alohida sozlash</li>`}</ul></div>`).join('')}</div>
    <div class="pr-s rv"><div><b>Talaba uchun Premium</b><p>Cheksiz test, Test Pro, xato daftari, imtihon rejasi. Birinchi ${CFG.trialDays} kun bepul. Maktab tarifi to'langanda talabalarga bepul ochiladi.</p></div><div class="pr-p">${m(CFG.premiumPrice)}<small> so'm / oy</small></div></div>
    <div class="pr-s rv"><div><b>Telegram bot: maktabingiz nomidan</b><p>Talabaga haftalik natija o'z Telegramiga boradi. Umumiy botdan yoki o'z botingizdan foydalaning. To'lov muddati tugagan kuni bot avtomatik to'xtaydi.</p><div class="pr-bots">${CFG.botPlans.map(p => `<span><b>${m(p.price)}</b> so'm · ${p.upTo ? p.upTo + ' tagacha' : '400+'}</span>`).join('')}</div></div></div></div></section>`; };
  const faqHtml = () => `<section class="l-sec" id="faq"><div class="wrap"><div class="l-sh rv"><div class="l-kick">Savollar</div><h2 class="l-h2">Ko'p so'raladigan savollar</h2></div>
    <div class="fq">${FAQ.map((f, i) => `<div class="fq-i rv ${i === 0 ? 'open' : ''}" style="--d:${i * .04}s"><button class="fq-q" aria-expanded="${i === 0}" aria-controls="fa${i}" id="fq${i}"><span>${f[0]}</span><span class="pl">${ico('x')}</span></button><div class="fq-a" id="fa${i}" role="region" aria-labelledby="fq${i}"><div><p>${f[1]}</p></div></div></div>`).join('')}</div></div></section>`;

  const ctaHtml = () => `<section class="l-sec" style="padding-top:20px"><div class="wrap"><div class="cta-b rv" data-rv="scale"><div class="gl"></div><div class="pt"></div>
    <div class="l-kick" style="justify-content:center">Boshlang</div><h2>Prava imtihoniga tayyorgarlikni <span class="gt">aqlli tizimga</span> aylantiring.</h2><p>Talaba va ustoz ko'rinishini o'zingiz sinab ko'ring. Hech narsa o'rnatish shart emas.</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap"><button class="lb pri xl" data-act="demo-student">${LIVE() ? 'Bepul boshlash' : 'Demoni ochish'} ${ico('arrow', 'ar')}</button>${LIVE() ? '' : '<button class="lb gls xl" data-act="demo-teacher">Ustoz paneli demosi</button>'}</div></div></div></section>`;

  const footHtml = () => `<footer class="l-foot"><div class="wrap"><div><a class="l-brand" href="#/">${UI.logo()}<span>Chorraha</span></a><p>Haydovchilik kurslari uchun aqlli platforma: talaba tushunib o'rganadi, ustoz hammasini ko'radi.</p></div>
    <div><h6>Navigatsiya</h6><ul><li><a href="#f">Imkoniyatlar</a></li><li><a href="#roles">Kim uchun</a></li><li><a href="#how">Qanday ishlaydi</a></li><li><a href="#faq">Savollar</a></li></ul></div>
    <div><h6>Aloqa</h6><ul><li><a href="https://t.me/${esc(CFG.teacher.telegram)}" target="_blank" rel="noopener">Telegram</a></li><li><a href="#/login">Kirish</a></li><li><a href="#/privacy">Maxfiylik siyosati</a></li><li><a href="#/terms">Foydalanish shartlari</a></li></ul></div>
    <div class="l-copy"><span>© ${new Date().getFullYear()} Chorraha. Barcha huquqlar himoyalangan.</span><span>${LIVE() ? 'Imtihondan oldin amaldagi yo\'l harakati qoidalarini tekshiring.' : 'Savollar demo uchun; rasmiy qoidalar bilan tekshiriladi.'}</span></div></div></footer>`;

  V.landing = () => ({
    html: `<div class="land" id="land"><div class="l-bg" aria-hidden="true"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div><div class="grid"></div><canvas id="lpart"></canvas><div class="vig"></div><div class="grain"></div></div><div class="l-cursor" id="lcur" aria-hidden="true"></div>
      ${navHtml()}<main>${heroHtml()}${statsHtml()}<div class="l-div"></div>${bentoHtml()}<div class="l-div"></div>${demoHtml()}${dashHtml()}${storyHtml()}${priceHtml() + faqHtml()}${ctaHtml()}</main>${footHtml()}</div>`,
    mount: mountLanding,
  });

  /* ================= EFFEKTLAR ================= */
  function mountLanding() {
    const root = document.getElementById('land'); if (!root) return;
    const RM = reduce(), FINE = false, DESK = false;   // yengil rejim: kursor nuri, parallax, tilt va zarrachalar o'chirilgan (kuchsiz qurilmalar uchun)
    const offs = [], timers = [];
    const on = (t, e, f, o) => { t.addEventListener(e, f, o); offs.push(() => t.removeEventListener(e, f, o)); };
    const raf = []; const loop = (fn) => { let id, run = true; const tick = (t) => { if (!run) return; fn(t); id = requestAnimationFrame(tick); }; id = requestAnimationFrame(tick); const stop = () => { run = false; cancelAnimationFrame(id); }; raf.push(stop); return stop; };
    const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };

    /* 1) kirish ketma-ketligi */
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
    later(() => root.classList.add('ready'), 80);                  // fon tabda rAF to'xtab qolsa ham sahifa ko'rinadi
    later(() => root.querySelectorAll('.rcirc.hero').forEach(c => c.classList.add('go')), RM ? 0 : 2300);

    /* 2) navbar: scroll holati, faol bo'lim, mobil menyu */
    const nav = document.getElementById('lnav'), menu = document.getElementById('lmenu'), burger = document.getElementById('lburger');
    const onScroll = () => { nav.classList.toggle('scrolled', scrollY > 24); };
    on(window, 'scroll', onScroll, { passive: true }); onScroll();
    const setMenu = (open) => { nav.classList.toggle('open', open); menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); menu.setAttribute('aria-hidden', !open); document.body.style.overflow = open ? 'hidden' : ''; };
    on(burger, 'click', () => setMenu(!menu.classList.contains('open')));
    menu.querySelectorAll('a,button').forEach(a => on(a, 'click', () => setMenu(false)));
    on(document, 'keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    on(window, 'resize', () => { if (innerWidth > 980) setMenu(false); });
    offs.push(() => { document.body.style.overflow = ''; });
    const links = [...root.querySelectorAll('.l-links a')];
    const secIO = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { const id = e.target.id === 'teacher' ? 'roles' : e.target.id; links.forEach(l => l.classList.toggle('on', l.dataset.s === id)); } }), { rootMargin: '-45% 0px -50% 0px' });
    ['f', 'roles', 'teacher', 'how', 'faq'].forEach(id => { const el = document.getElementById(id); if (el) secIO.observe(el); });
    offs.push(() => secIO.disconnect());

    /* 3) scroll reveal + hisoblagichlar */
    const countUp = (el) => {
      const to = +el.dataset.count; if (RM) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 1500; const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => es.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target; el.classList.add('in'); io.unobserve(el); if (el.classList.contains('spot')) later(() => el.classList.add('settled'), 1500 + (parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0) * 1000);
      el.querySelectorAll('[data-count]').forEach(countUp); if (el.dataset.count) countUp(el);
    }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
    root.querySelectorAll('.rv').forEach(el => io.observe(el));
    offs.push(() => io.disconnect());

    /* 4) kursor nuri, parallax, spotlight/tilt */
    if (FINE) {
      const cur = document.getElementById('lcur'); let tx = innerWidth / 2, ty = innerHeight / 3, cx = tx, cy = ty, nx = 0, ny = 0, px = 0, py = 0;
      on(window, 'pointermove', (e) => { tx = e.clientX; ty = e.clientY; nx = (e.clientX / innerWidth - .5) * 2; ny = (e.clientY / innerHeight - .5) * 2; root.classList.add('cursor-on'); }, { passive: true });
      const pvs = [...root.querySelectorAll('.pv-l')];
      loop(() => {
        cx += (tx - cx) * .07; cy += (ty - cy) * .07; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
        px += (nx - px) * .06; py += (ny - py) * .06;
        if (scrollY < 900) pvs.forEach(p => { const d = +p.dataset.depth; p.style.transform = p.dataset.tilt ? `rotateY(${px * 5}deg) rotateX(${-py * 4}deg)` : `translate3d(${px * d}px,${py * d * .7}px,0)`; });
      });
      root.querySelectorAll('.spot').forEach(card => {
        const tilt = card.classList.contains('tilt'); let pend = false, ev;
        on(card, 'pointermove', (e) => { ev = e; if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; const r = card.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top; card.style.setProperty('--x', x + 'px'); card.style.setProperty('--y', y + 'px'); if (tilt) card.style.transform = `perspective(900px) rotateX(${((y / r.height) - .5) * -5}deg) rotateY(${((x / r.width) - .5) * 5}deg) translateY(-4px)`; }); });
        on(card, 'pointerleave', () => { card.style.transform = ''; });
      });
    }

    /* 5) zarrachalar (faqat katta ekran) */
    const cv = document.getElementById('lpart');
    if (cv && DESK && !RM) {
      const g = cv.getContext('2d'); let W, H; const P = Array.from({ length: 34 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + .4, vx: (Math.random() - .5) * .00006, vy: -Math.random() * .00008 - .00002, a: Math.random() * .4 + .1, c: i % 3 ? '255,255,255' : '184,245,59' }));
      const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; size(); on(window, 'resize', size);
      let last = performance.now();
      loop((t) => { if (document.hidden) return; const dt = Math.min(50, t - last); last = t; g.clearRect(0, 0, W, H); P.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); } if (p.x < 0 || p.x > 1) p.vx *= -1; g.beginPath(); g.fillStyle = `rgba(${p.c},${p.a})`; g.arc(p.x * W, p.y * H, p.r, 0, 6.283); g.fill(); }); });
    }

    /* 6) AI test demosi */
    const qd = document.getElementById('qdemo'), DQ = ['q_b_nopark', 'q_p_end', 'q_w_slip'].map(id => BANK.byId[id]).filter(Boolean); if (DQ.length < 3) { DQ.length = 0; BANK.Q.filter(q => !q.img).slice(5, 8).forEach(q => DQ.push(q)); }
    let qi = 0, typeT = null;
    const L = ['A', 'B', 'C', 'D'];
    const renderQ = () => {
      clearTimeout(typeT); const q = DQ[qi];
      qd.innerHTML = `<div class="qd-h"><span>${esc(q.topicName)} · ${qi + 1}/${DQ.length}</span><span class="chp ${q.level === 3 ? 'bd' : 'wn'}">${BANK.LEVEL[q.level]}</span></div>
        <div class="qd-sign">${q.sign ? SIGNS.svg(q.sign) : ''}</div><div class="qd-q">${esc(q.text)}</div>
        ${q.options.map((o, i) => `<button class="qd-o" data-i="${i}"><b>${L[i]}</b><span>${esc(o.label)}</span><span class="st">${ico('check')}</span></button>`).join('')}
        <div class="qd-ai" id="qdai"><div><div class="box"><h5>${ico('sparkles')}Chorraha tushuntiradi</h5><p id="qdp"></p><div class="tip" id="qdtip"></div></div></div></div>
        <div class="qd-f"><span id="qdhint">Javobni tanlang</span><button id="qdnext" style="visibility:hidden">Keyingi savol ${ico('arrow')}</button></div>`;
    };
    const typeText = (el, text, done) => { if (RM) { el.textContent = text; done && done(); return; } let i = 0; el.classList.add('caret'); const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) typeT = setTimeout(tick, 13); else { el.classList.remove('caret'); done && done(); } }; tick(); };
    if (qd && DQ.length) {
      renderQ();
      on(qd, 'click', (e) => {
        const nx = e.target.closest('#qdnext'); if (nx) { qi = (qi + 1) % DQ.length; renderQ(); return; }
        const b = e.target.closest('.qd-o'); if (!b || b.disabled) return;
        const q = DQ[qi], pick = +b.dataset.i; qd.querySelectorAll('.qd-o').forEach(x => x.disabled = true); b.classList.add('sel');
        later(() => {
          const ok = pick === q.answer; b.classList.remove('sel');
          qd.querySelectorAll('.qd-o')[q.answer].classList.add('good'); if (!ok) { b.classList.add('wrong'); b.querySelector('.st').innerHTML = ico('x'); }
          const ex = AI.explainWrong(q, pick);
          const txt = ok ? `To'g'ri! ${q.explain}` : `Javobingiz noto'g'ri. ${ex.body} ${ex.compare || ''}`.trim();
          const ai = document.getElementById('qdai'); ai.classList.add('show'); document.getElementById('qdhint').textContent = ok ? 'Barakalla!' : 'Xato — o\'rganish imkoniyati';
          later(() => typeText(document.getElementById('qdp'), txt, () => { const t = document.getElementById('qdtip'); t.textContent = (q.tip ? 'Eslab qoling: ' + q.tip : ''); ai.classList.add('done'); const n = document.getElementById('qdnext'); if (n) n.style.visibility = 'visible'; }), 380);
        }, 420);
      });
      offs.push(() => clearTimeout(typeT));
    }

    /* 7) ustoz paneli: davr almashtirish va grafik tooltip */
    const dash = document.getElementById('dash');
    if (dash) {
      const DATA = { w: { v: [58, 61, 60, 64, 66, 69, 72], l: (() => { const WD = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha']; return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return WD[d.getDay()]; }); })(), t: 'So\'nggi 7 kun' }, m: { v: [49, 53, 52, 58, 57, 62, 66, 70], l: ['1-h', '2-h', '3-h', '4-h', '5-h', '6-h', '7-h', '8-h'], t: 'So\'nggi 8 hafta' } };
      const host = document.getElementById('dchart'), tip = document.getElementById('dtip');
      const bind = () => {
        const svg = host.querySelector('svg'), pts = JSON.parse(svg.dataset.pts);
        on(svg, 'pointermove', (e) => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; let b = pts[0]; pts.forEach(p => { if (Math.abs(p[0] - x) < Math.abs(b[0] - x)) b = p; }); tip.textContent = `${b[3]} · ${b[2]}%`; tip.style.left = b[0] * 100 + '%'; tip.style.top = b[1] * r.height + 'px'; tip.classList.add('on'); });
        on(svg, 'pointerleave', () => tip.classList.remove('on'));
      };
      bind();
      dash.querySelectorAll('.seg button').forEach(btn => on(btn, 'click', () => {
        dash.querySelectorAll('.seg button').forEach(x => { x.classList.toggle('on', x === btn); x.setAttribute('aria-selected', x === btn); });
        const d = DATA[btn.dataset.p]; host.querySelector('svg').remove(); host.insertAdjacentHTML('afterbegin', lineChart(d.v, d.l, { w: 560, h: 190, pad: 22 }));
        const s = host.querySelector('svg'); document.getElementById('dlbl').textContent = d.t; bind(); requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('in')));
      }));
    }

    /* 8) "Qanday ishlaydi": scroll hikoyasi (desktop) */
    const story = document.getElementById('story');
    if (story) {
      const items = [...story.querySelectorAll('.st-i')]; let cur = -1;
      const upd = () => {
        if (innerWidth <= 980) return; const r = story.getBoundingClientRect(), total = r.height - innerHeight, p = Math.max(0, Math.min(1, -r.top / total)), step = Math.min(3, Math.floor(p * 4 + .0001));
        story.style.setProperty('--p', p.toFixed(3)); if (step !== cur) { cur = step; story.dataset.step = step; items.forEach((it, i) => { it.classList.toggle('on', i === step); it.classList.toggle('done', i < step); }); }
      };
      on(window, 'scroll', upd, { passive: true }); on(window, 'resize', upd); upd();
    }

    /* 9) FAQ akkordeon */
    root.querySelectorAll('.fq-q').forEach(q => on(q, 'click', () => {
      const it = q.closest('.fq-i'), open = !it.classList.contains('open');
      root.querySelectorAll('.fq-i.open').forEach(o => { o.classList.remove('open'); o.querySelector('.fq-q').setAttribute('aria-expanded', 'false'); });
      if (open) { it.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    }));

    V.landingCleanup = () => { offs.forEach(f => f()); raf.forEach(f => f()); timers.forEach(clearTimeout); document.body.style.overflow = ''; };
  }
  /* yo'naltirgich unmount ni chaqiradi: mount qaytargan funksiya o'rniga V.landing.unmount */
  const base = V.landing; V.landing = () => { const v = base(); v.unmount = () => { if (V.landingCleanup) { V.landingCleanup(); V.landingCleanup = null; } }; return v; };
})();





