/* O'qish vositalari: imtihon sanasiga shaxsiy reja, Xato daftari (intervalli takrorlash),
   imtihon simulyatsiyasi, qoida bobi izohi va "Imtihon oldi marafoni". */
(function () {
  const { ico, esc, bar, tone, toast, modal, closeModal } = UI;
  const { Store, TOPICS } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, S = V.S, shell = (a, h) => V.shellStudent(a, h);
  const $ = (id) => document.getElementById(id);
  const DAY = 864e5;
  const dk = ST.dayKey;
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const diff = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
  const addD = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return dk(d); };
  const MON = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const fmtDate = (k) => { const d = parse(k); return `${d.getDate()}-${MON[d.getMonth()]}`; };
  const todayQ = () => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); return Store.s.history.filter(h => h.ts >= t0.getTime()).length; };
  const hrs = (m) => m >= 60 ? `${Math.floor(m / 60)} soat${m % 60 ? ' ' + (m % 60) + ' daq' : ''}` : `${m} daq`;
  const topicName = (id) => (BANK.topicById[id] || {}).name || id;

  /* ================= IMTIHON SANASIGA REJA ================= */
  function calc() {
    const p = Store.s.plan; if (!p || !p.date) return null;
    const left = diff(dk(), p.date), st = Store.me(), r = ST.readiness(st), seen = st.seen, unseen = Math.max(0, ST.total - seen);
    const weak = ST.weakTopics(st), nb = Store.nbActive().length;
    const days = Math.max(1, left - 1);                                         // oxirgi kun — dam olish
    const need = unseen * .8 + (r < 88 ? (88 - r) * 7 : 20) + nb * 1.5;
    const qDay = Math.min(160, Math.max(15, Math.ceil(need / days))), minDay = Math.round(qDay * 1.15);
    const avail = Math.round((p.hours || 1.5) * 60), ok = minDay <= avail;
    return { left, r, qDay, minDay, avail, ok, weak, nb, p, unseen };
  }
  function schedule(c) {
    const order = TOPICS.map(t => ({ id: t.id, a: ST.topicAcc(Store.me(), t.id) })).sort((x, y) => (x.a == null ? 50 : x.a) - (y.a == null ? 50 : y.a)).map(x => x.id);
    const out = [], n = Math.min(7, Math.max(0, c.left));
    for (let i = 0; i < n; i++) {
      const date = addD(dk(), i), last = c.left - i <= 1, t1 = order[(i * 2) % order.length], t2 = order[(i * 2 + 1) % order.length];
      let items;
      if (last) items = [`Dam oling, erta yoting`, `Faqat yengil takrorlash: xato daftari`];
      else if (c.left - i <= 3) items = [`Sinov imtihoni (20 savol, ${CFG.examMinutes} daq)`, `Test Pro urinishi`, `Xato daftarini takrorlash`];
      else items = [`${c.qDay} ta savol: ${topicName(t1)}, ${topicName(t2)}`, `Xato daftari: ${Math.min(c.nb || 10, 15)} ta`, i % 3 === 2 ? `Sinov imtihoni` : `Belgilar katalogini ko'rib chiqish`];
      out.push({ date, items, today: i === 0 });
    }
    return out;
  }
  V.plan = () => {
    const c = calc(), p = Store.s.plan || {}, tmr = addD(dk(), 1);
    if (!c) return { html: shell('plan', `<div class="page-h"><div><h1>Imtihon rejasi</h1><p>Imtihon sanangizni kiriting, men sizga shaxsiy reja tuzaman.</p></div></div>
      <div class="card plan-ask"><div class="plan-ic">${ico('calendar')}</div><h2>Imtihon qachon?</h2><p class="mute">Sanaga qarab kuniga necha soat shug'ullanish va nechta savol yechish kerakligini hisoblab beraman.</p>
        <div class="field"><label for="pdate">Imtihon sanasi</label><input id="pdate" type="date" class="input" min="${tmr}" value="${addD(dk(), 30)}"></div>
        <div class="field"><label for="phours">Kuniga necha soat ajrata olasiz?</label><select id="phours" class="select"><option value="0.5">30 daqiqa</option><option value="1">1 soat</option><option value="1.5" selected>1,5 soat</option><option value="2">2 soat</option><option value="3">3 soat</option></select></div>
        <button class="go-b" data-act="plan-save">${ico('check')} Reja tuzish</button></div>`) };
    const sc = schedule(c), tq = todayQ(), tm = Math.round(Store.todaySec() / 60), pqp = Math.min(100, Math.round(tq / c.qDay * 100)), pmp = Math.min(100, Math.round(tm / c.minDay * 100));
    return {
      html: shell('plan', `<div class="page-h"><div><h1>Imtihon rejasi</h1><p>${fmtDate(p.date)} — imtihon kuni</p></div><button class="btn ghost" data-act="plan-edit">${ico('calendar')} Sanani o'zgartirish</button></div>
      <div class="plan-hero"><div class="ph-days"><b>${Math.max(0, c.left)}</b><span>kun qoldi</span></div><div class="ph-t"><span class="chip ${c.r >= 85 ? 'ok' : c.r >= 70 ? 'warn' : 'bad'}">Hozirgi tayyorlik: ${c.r}%</span><h2>${c.left <= 0 ? 'Imtihon kuni keldi. Omad!' : c.left <= 3 ? 'Intensiv rejim: oxirgi kunlar' : 'Siz uchun reja tayyor'}</h2><p>${c.ok ? `Kuniga <b>${hrs(c.minDay)}</b> shug'ullansangiz, imtihonga tayyor bo'lasiz.` : `Kuniga <b>${hrs(c.minDay)}</b> kerak, siz esa ${hrs(c.avail)} ajratgansiz. Vaqtni oshiring yoki imtihonni kechroqqa suring.`}</p></div></div>
      <div class="grid g3 mt"><div class="stat"><div class="lbl">${ico('clock')} Kuniga vaqt</div><div class="val mono">${(c.minDay / 60).toFixed(1)}<small>soat</small></div><div class="sub">${c.minDay} daqiqa</div></div><div class="stat"><div class="lbl">${ico('list')} Kuniga savol</div><div class="val mono">${c.qDay}<small>ta</small></div><div class="sub">test savollari</div></div><div class="stat"><div class="lbl">${ico('redo')} Xato daftari</div><div class="val mono">${c.nb}<small>ta</small></div><div class="sub">takrorlash kerak</div></div></div>
      <div class="card mt"><div class="h-sec"><span>Bugungi bajarilish</span></div><div class="stack s12"><div><div class="row-between"><b>Savollar</b><span class="mute">${tq} / ${c.qDay}</span></div>${bar(pqp, 'var(--acc)')}</div><div><div class="row-between"><b>Vaqt</b><span class="mute">${tm} / ${c.minDay} daq</span></div>${bar(pmp, 'var(--blue)')}</div></div>
        <div class="ai-acts"><button class="btn primary" data-act="quick">${ico('bolt')} Tez test</button><a class="btn soft" href="#/app/mistakes">Xato daftari</a><a class="btn soft" href="#/app/exam">Sinov imtihoni</a></div></div>
      ${c.weak.length ? `<div class="card mt"><div class="ai-h">${ico('sparkles')} AI tavsiyasi</div><p>Birinchi navbatda shu mavzularga e'tibor bering: ${c.weak.slice(0, 3).map(w => `<b>${esc(w.t.name)}</b> (${w.acc}%)`).join(', ')}. Reja ularni har kuni takrorlaydi.</p></div>` : ''}
      <div class="h-sec mt"><span>${ico('calendar')} Keyingi ${sc.length} kun</span></div><div class="stack s12">${sc.map(d => `<div class="plan-d ${d.today ? 'today' : ''}"><div class="pd-h"><b>${fmtDate(d.date)}</b>${d.today ? '<span class="chip acc">Bugun</span>' : ''}</div><ul>${d.items.map(x => `<li>${ico('check')}<span>${esc(x)}</span></li>`).join('')}</ul></div>`).join('')}</div>`)
    };
  };

  /* ================= XATO DAFTARI ================= */
  const when = (t) => { const d = Math.ceil((t - Date.now()) / DAY); return d <= 0 ? 'Bugun' : d === 1 ? 'Ertaga' : `${d} kundan keyin`; };
  V.mistakes = () => {
    const act = Store.nbActive(), due = Store.nbDue(), done = Store.nbAll().filter(e => e.done).length, list = act.sort((a, b) => a.next - b.next);
    return {
      html: shell('mistakes', `<div class="page-h"><div><h1>Xato daftari</h1><p>Adashgan savollaringiz shu yerda yig'iladi va 1, 3, 7, 14 kunda qayta so'raladi. Ustozingiz ham shu daftarni ko'radi.</p></div></div>
      <div class="grid g3"><div class="stat"><div class="lbl">${ico('clock')} Bugun takrorlash</div><div class="val mono" style="color:${due.length ? 'var(--warn)' : 'var(--ok)'}">${due.length}</div><div class="sub">savol</div></div><div class="stat"><div class="lbl">${ico('redo')} Daftarda</div><div class="val mono">${act.length}</div><div class="sub">faol savol</div></div><div class="stat"><div class="lbl">${ico('check')} O'zlashtirilgan</div><div class="val mono" style="color:var(--ok)">${done}</div><div class="sub">daftardan chiqqan</div></div></div>
      ${act.length ? `<button class="go-b" data-act="start" data-key="nb">${ico('play')} ${due.length ? `Bugun takrorlash (${Math.min(due.length, 20)} ta)` : `Hammasini takrorlash`}</button>` : `<div class="card mt" style="text-align:center;padding:44px"><div class="chip ok" style="margin-bottom:14px">${ico('check')}</div><h3>Daftar bo'sh</h3><p class="mute" style="margin-top:8px">Test yeching: adashgan savollar avtomatik shu yerga tushadi.</p><a class="btn primary" style="margin-top:18px" href="#/app/tests">Testlarga o'tish</a></div>`}
      ${list.length ? `<div class="h-sec mt"><span>Savollar (${list.length})</span></div><div class="stack s12">${list.slice(0, 40).map(e => { const q = BANK.byId[e.q]; return `<div class="nb-r"><div class="nb-t"><b>${esc(q.text.length > 120 ? q.text.slice(0, 117) + '…' : q.text)}</b><small>${esc(topicName(e.t))} · ${e.count} marta xato</small></div><div class="nb-s"><div class="boxes">${[0, 1, 2, 3].map(i => `<i class="${i < e.box ? 'on' : ''}"></i>`).join('')}</div><span class="chip ${e.next <= Date.now() ? 'warn' : ''}">${when(e.next)}</span></div></div>`; }).join('')}</div>` : ''}`)
    };
  };
  const hookPrev = V.buildHook;
  V.buildHook = (key) => {
    if (key === 'nb') {
      const due = Store.nbDue(), src = due.length ? due : Store.nbActive();
      const list = BANK.shuffle(src.map(e => BANK.byId[e.q]).filter(Boolean), (Date.now() & 0xffffff)).slice(0, 20);
      return { key, title: 'Xato daftari', mode: 'practice', list, i: 0, picks: [], revealed: false, simple: false, start: Date.now(), endAt: 0, done: false };
    }
    return hookPrev ? hookPrev(key) : null;
  };

  /* ================= QOIDA BOBI IZOHI (kichik, xalaqit bermaydi) ================= */
  const CH = { VII: `Svetofor va tartibga soluvchi signallari`, XI: `Harakat tezligi`, XII: `Quvib o'tish`, XIII: `To'xtash va turish`, XIV: `Chorrahalardan o'tish`, XV: `Tartibga solinadigan chorrahalar`, XVI: `Tartibga solinmaydigan chorrahalar` };
  function chapterOf(q) {
    const t = (q.text || '').toLowerCase();
    if (q.topic === 'signals') return ['VII'];
    if (/quvib o'tish/.test(t)) return ['XII'];
    if (/to'xtash|to'xtab|turish|to'xtatib/.test(t) && ['rules', 'prohibitory', 'info', 'marks'].includes(q.topic)) return ['XIII'];
    if (/tezlik/.test(t) && q.topic === 'rules') return ['XI'];
    if (q.topic === 'cross') return ['XIV', 'XV', 'XVI'];
    return null;
  }
  V.chapterRef = (q) => { const c = chapterOf(q); if (!c) return ''; return `<div class="ref-l">${ico('book')}<span>YHQ: ${c.map(x => `${x} bob`).join(', ')} — ${esc(CH[c[0]])}${c.length > 1 ? ' va boshqalar' : ''}</span><a href="https://lex.uz/acts/-2850459" target="_blank" rel="noopener noreferrer">matn</a></div>`; };

  /* ================= IMTIHON SIMULYATSIYASI ================= */
  function countdown(done) {
    const l = $('layer'), o = document.createElement('div'); o.className = 'cd-ov'; l.appendChild(o);
    const steps = [`Chuqur nafas oling…`, `3`, `2`, `1`, `Boshladik!`]; let i = 0;
    const tick = () => { if (i >= steps.length) { o.remove(); done(); return; } o.innerHTML = `<div class="cd-b ${i > 0 && i < 4 ? 'num' : ''}">${steps[i]}</div>`; i++; setTimeout(tick, i === 1 ? 1700 : 800); };
    tick();
  }
  V.exam = () => ({
    html: shell('exam', `<div class="page-h"><div><h1>Sinov imtihoni</h1><p>Haqiqiy imtihondagidek: ${CFG.examQuestions} savol, ${CFG.examMinutes} daqiqa, natija oxirida.</p></div></div>
      <div class="hero-card" style="grid-template-columns:1fr"><div><span class="chip acc">${ico('flag')} Imtihon rejimi</span><h2>Tayyormisiz?</h2>
        <div class="ck-l"><div>${ico('check')}<span>Xotirjam o'tiring, telefon ovozini o'chiring</span></div><div>${ico('check')}<span>Savollar barcha mavzulardan teng olinadi</span></div><div>${ico('check')}<span>Savollar orasida o'tish mumkin: yuqoridagi raqamlardan</span></div><div>${ico('check')}<span>O'tish chegarasi: ${CFG.passPercent}% (${Math.ceil(CFG.examQuestions * CFG.passPercent / 100)} ta to'g'ri javob)</span></div></div>
        <button class="go-b" data-act="exam-go">${ico('flag')} Tayyorman, boshlash</button></div></div>
      ${Store.s.exams.length ? `<div class="card mt"><div class="h-sec">Oldingi urinishlar</div>${Store.s.exams.slice(-5).reverse().map(e => { const p = Math.round(e.score / e.total * 100); return `<div class="trow"><span class="nm">${new Date(e.ts).toLocaleDateString('uz-UZ')} · ${e.score}/${e.total}</span>${bar(p)}<span class="pc">${p}%</span></div>`; }).join('')}</div>` : ''}`)
  });

  /* ================= MARAFON (7 kun) ================= */
  const MDAYS = (st) => [
    { t: `Zaif joylarni aniqlash`, q: 30, tasks: [`Aralash 30 ta savol`, `Natijani tahlil qiling`] },
    { t: `Belgilar kuni`, q: 40, tasks: [`Belgilar katalogini ko'ring`, `Belgilar bo'yicha 40 ta savol`] },
    { t: `Chorrahalar`, q: 30, tasks: [`Darslikdagi «Chorrahalar» darsi`, `30 ta chorraha savoli`, `Xato daftari`] },
    { t: `Test Pro kuni`, q: 20, tasks: [`Test Pro ga urinish`, `Xatolar tahlili`] },
    { t: `Sinov imtihoni`, q: 40, tasks: [`2 ta sinov imtihoni`, `Xato daftari`] },
    { t: `Qiyin savollar`, q: 40, tasks: [`40 ta qiyin savol`, `Xato daftari`] },
    { t: `Yakuniy imtihon`, q: 20, tasks: [`Sinov imtihoni (${CFG.passPercent}% dan yuqori)`, `Dam oling, erta yoting`] },
  ];
  const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' so\'m';
  V.moneyUz = money;
  V.marathon = () => {
    const m = Store.s.marathon, days = MDAYS();
    if (!m) return { html: shell('marathon', `<div class="page-h"><div><h1>7 kunlik imtihon dasturi</h1><p>7 kunlik tezlashtirilgan dastur: kunma-kun vazifalar, ustoz nazorati va tugagach sertifikat.</p></div></div>
      <div class="plan-hero"><div class="ph-days"><b>7</b><span>kun</span></div><div class="ph-t"><span class="chip warn">Imtihon oldidan</span><h2>Eng muhim hafta uchun</h2><p>Har kun aniq vazifa, har kun natija. Oxirida marafon sertifikati.</p></div></div>
      <div class="stack s12 mt">${days.map((d, i) => `<div class="plan-d"><div class="pd-h"><b>${i + 1}-kun · ${esc(d.t)}</b><span class="chip">${d.q} savol</span></div><ul>${d.tasks.map(x => `<li>${ico('check')}<span>${esc(x)}</span></li>`).join('')}</ul></div>`).join('')}</div>
      <div class="card mt pay-c"><div><small class="mute">Marafon narxi</small><b class="price">${money(CFG.marathonPrice)}</b><small class="mute">bir martalik, 7 kun</small></div><button class="btn primary lg" data-act="pay" data-what="marathon">${ico('crown')} Marafonni boshlash</button></div>`) };
    const start = m.start, today = Math.min(6, Math.max(0, diff(start, dk()))), done = m.done || {}, doneCount = Object.keys(done).filter(k => done[k]).length;
    return {
      html: shell('marathon', `<div class="page-h"><div><h1>Marafon: ${today + 1}-kun</h1><p>${fmtDate(start)} da boshlangan · ${doneCount}/7 kun bajarildi</p></div></div>
      <div class="dots-s" style="margin-bottom:18px">${days.map((_, i) => `<i class="${done[i] ? 'on' : ''}">${done[i] ? '✓' : i + 1}</i>`).join('')}</div>
      <div class="stack s12">${days.map((d, i) => { const open = i <= today; return `<div class="plan-d ${i === today ? 'today' : ''} ${open ? '' : 'lock'}"><div class="pd-h"><b>${i + 1}-kun · ${esc(d.t)}</b>${done[i] ? '<span class="chip ok">Bajarildi</span>' : open ? '<span class="chip acc">Ochiq</span>' : `<span class="chip">${fmtDate(addD(start, i))}</span>`}</div><ul>${d.tasks.map(x => `<li>${ico('check')}<span>${esc(x)}</span></li>`).join('')}</ul>${open && !done[i] ? `<button class="btn sm primary" data-act="mday" data-i="${i}">Kunni bajardim</button>` : ''}</div>`; }).join('')}</div>
      ${doneCount >= 7 ? `<div class="card mt" style="text-align:center"><h3>Marafon yakunlandi!</h3><p class="mute" style="margin:8px 0 14px">Tabriklaymiz, 7 kunlik dasturni tugatdingiz.</p><button class="btn primary" data-act="card-marathon">${ico('image')} Sertifikat rasmini olish</button></div>` : ''}`)
    };
  };

  V.acts = Object.assign(V.acts || {}, {
    'plan-save'() { const d = $('pdate').value, h = parseFloat($('phours').value) || 1.5; if (!d || diff(dk(), d) < 1) { toast(`Imtihon sanasini kelajakdan tanlang`); return; } Store.s.plan = { date: d, hours: h }; Store.save(); Store.notify(`Imtihon rejangiz tayyor: ${fmtDate(d)} gacha.`, 'bonus'); V.rerender(); },
    'plan-edit'() { Store.s.plan = null; Store.save(); V.rerender(); },
    'exam-go'() { countdown(() => V.acts.start({ dataset: { key: 'exam' } })); },
    jump(el) { const z = S.quiz; if (z && !z.done) { clearTimeout(S.autoT); z.i = +el.dataset.i; z.revealed = z.mode !== 'exam' && z.picks[z.i] != null; z.simple = false; V.qRender && V.qRender(); } },
    mday(el) { const m = Store.s.marathon; m.done = m.done || {}; m.done[+el.dataset.i] = true; Store.save(); if (Object.keys(m.done).length >= 7) Store.notify(`Marafon yakunlandi! Sertifikatingiz tayyor.`, 'bonus'); V.rerender(); },
  });
})();
