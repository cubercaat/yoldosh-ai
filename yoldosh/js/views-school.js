/* Avtomaktab rahbari/ustozi uchun: guruh imtihoni, ota-onalar hisoboti (Telegram), rahbar hisoboti (chop etiladi),
   tarif, maktab brendi, talabaning xato daftari. Narxlar taklif (config.js dan o'zgaradi). */
(function () {
  const { ico, esc, bar, ava, toast, modal, closeModal, copy } = UI;
  const { Store, TOPICS } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const DAY = 864e5, $ = (id) => document.getElementById(id), shell = (a, h) => V.shellTeacher(a, h);
  const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ` so'm`;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const fmtD = (t) => UI.dt(t);
  const schoolName = () => (Store.s.brand && Store.s.brand.name) || CFG.school;
  const stat = (icon, label, val, unit, sub) => `<div class="stat"><div class="lbl">${ico(icon)} ${label}</div><div class="val mono">${val}<small>${unit || ''}</small></div><div class="sub">${sub || ''}</div></div>`;

  /* ================= Talabaning xato daftari (ustoz ko'radi) ================= */
  function nbOf(s) {
    if (s.me) return Store.nbAll().sort((a, b) => b.count - a.count).map(e => ({ q: BANK.byId[e.q], count: e.count, done: e.done, next: e.next }));
    const weak = ST.weakTopics(s, 80).slice(0, 3), r = BANK.rng(BANK.hash(s.id)), out = [];
    weak.forEach(w => { const pool = BANK.Q.filter(q => q.topic === w.t.id); for (let i = 0; i < 3 && pool.length; i++) { const q = pool[Math.floor(r() * pool.length)]; if (!out.find(x => x.q.id === q.id)) out.push({ q, count: 1 + Math.floor(r() * 4), done: false, next: Date.now() + (Math.floor(r() * 6) - 2) * DAY }); } });
    return out.sort((a, b) => b.count - a.count);
  }
  V.studentExtra = (s) => {
    const l = nbOf(s), act = l.filter(x => !x.done), due = act.filter(x => x.next <= Date.now()).length;
    return `<div class="card mt"><div class="row-between"><div class="h-sec" style="margin:0">Xato daftari</div><span class="chip ${act.length ? 'warn' : 'ok'}">${act.length} ta faol${due ? ` · ${due} ta takror kutmoqda` : ''}</span></div>
      ${act.length ? `<p class="mute" style="font-size:13.5px;margin:6px 0 10px">Talaba adashgan savollar. Tizim ularni 1, 3, 7, 14 kunda qayta so'raydi. Eng ko'p adashilgani yuqorida.</p>${act.slice(0, 6).map(x => `<div class="trow" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(x.q.text)} <span class="mute">— ${esc(x.q.topicName)}</span></span><span class="chip ${x.count > 2 ? 'bad' : 'warn'}">${x.count}× xato</span></div>`).join('')}` : `<p class="mute" style="margin-top:10px">Hozircha faol xato yo'q.</p>`}</div>
      <div class="card mt"><div class="h-sec">Premium holati</div><span class="chip ${s.me && V.Prem && V.Prem.ok() ? 'ok' : 'warn'}">${s.me ? (V.Prem && V.Prem.status() === 'premium' ? 'Premium' : V.Prem && V.Prem.status() === 'trial' ? 'Bepul sinov' : V.Prem && V.Prem.status() === 'school' ? `Maktab to'lagan` : 'Bepul rejim') : (Store.s.school && Store.s.school.paid ? `Maktab to'lagan` : 'Demo')}</span></div>`;
  };

  /* ================= Guruh imtihoni ================= */
  const gexams = () => (Store.s.gexams = Store.s.gexams || []);
  function simResults(e) {   // demo talabalar uchun deterministik natijalar (vaqti o'tgan imtihon)
    if (e.at > Date.now()) return [];
    return ST.students().filter(s => (!e.groupId || s.group === e.groupId) && !s.me && !s.fresh).map(s => {
      const r = ST.readiness(s), rn = BANK.rng(BANK.hash(e.id + s.id)); if (s.lastActive >= 6 && rn() < .6) return null;
      const sc = Math.max(0, Math.min(e.count, Math.round(e.count * (r / 100) * (.9 + rn() * .2) + (rn() - .5) * 2)));
      return { name: s.name, score: sc, total: e.count, sec: Math.round(e.minutes * 60 * (.45 + rn() * .5)), id: s.id };
    }).filter(Boolean);
  }
  const resultsOf = (e) => [...simResults(e), ...(Store.s.gres || []).filter(r => r.exam === e.id)].sort((a, b) => b.score - a.score || a.sec - b.sec);
  V.gexam = () => {
    const gs = Store.groups(), list = gexams().slice().sort((a, b) => b.at - a.at);
    const pass = (e) => Math.ceil(e.count * (CFG.passPercent || 90) / 100);
    return {
      html: shell('ge', `<div class="page-h"><div><h1>Guruh imtihoni</h1><p>Sanani belgilang. Guruh talabalari bir vaqtda sinov imtihonini topshiradi, natijalar shu yerda ko'rinadi.</p></div></div>
      <div class="card"><div class="h-sec"><span>${ico('flag')} Yangi imtihon</span></div>
        <div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="gx-t">Nomi</label><input id="gx-t" class="input" maxlength="50" value="Oylik sinov imtihoni"></div>
        <div class="field"><label for="gx-g">Guruh</label><select id="gx-g" class="select"><option value="">Barcha guruhlar</option>${gs.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="gx-d">Sana va vaqt</label><input id="gx-d" type="datetime-local" class="input" value="${new Date(Date.now() + 2 * DAY - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 11)}10:00"></div>
        <div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="gx-n">Savollar</label><select id="gx-n" class="select"><option>20</option><option>30</option><option>50</option></select></div><div class="field"><label for="gx-m">Daqiqa</label><select id="gx-m" class="select"><option>25</option><option>35</option><option>60</option></select></div></div></div>
        <button class="btn primary" data-act="gx-add">${ico('check')} Imtihonni belgilash</button></div>
      <div class="stack mt">${list.length ? list.map(e => {
        const rs = resultsOf(e), ok = rs.filter(r => r.score >= pass(e)).length, past = e.at <= Date.now(), g = gs.find(x => x.id === e.groupId);
        return `<div class="card"><div class="row-between"><div><b style="font-size:18px">${esc(e.title)}</b><div class="mute" style="font-size:14px">${fmtD(e.at)} · ${esc(g ? g.name : 'Barcha guruhlar')} · ${e.count} savol · ${e.minutes} daq</div></div><div style="display:flex;gap:8px;align-items:center"><span class="chip ${past ? 'ok' : 'warn'}">${past ? 'O\'tgan' : 'Kutilmoqda'}</span><button class="btn sm soft" data-act="gx-del" data-id="${e.id}" aria-label="O'chirish">${ico('x')}</button></div></div>
        ${past && rs.length ? `<div class="grid g4 keep2" style="margin-top:14px;gap:12px"><div class="kpi"><small>Qatnashdi</small><b>${rs.length}</b></div><div class="kpi"><small>O'tdi (${CFG.passPercent}%)</small><b>${ok}<small>/${rs.length}</small></b></div><div class="kpi"><small>O'rtacha</small><b>${pct(rs.reduce((a, r) => a + r.score, 0), rs.length * e.count)}<small>%</small></b></div><div class="kpi"><small>Eng yuqori</small><b>${rs[0].score}<small>/${e.count}</small></b></div></div>
          <div class="scroll-x" style="margin-top:14px"><table class="tbl" style="min-width:420px"><thead><tr><th>#</th><th>Talaba</th><th>Natija</th><th>Vaqt</th><th>Holat</th></tr></thead><tbody>${rs.map((r, i) => `<tr><td class="mono">${i + 1}</td><td>${esc(r.name)}</td><td class="mono"><b>${r.score}/${r.total}</b> · ${pct(r.score, r.total)}%</td><td class="mono">${Math.floor(r.sec / 60)}:${String(r.sec % 60).padStart(2, '0')}</td><td><span class="chip ${r.score >= pass(e) ? 'ok' : 'bad'}">${r.score >= pass(e) ? `O'tdi` : `O'tmadi`}</span></td></tr>`).join('')}</tbody></table></div>` : `<p class="mute" style="margin-top:12px">${past ? `Hali hech kim topshirmagan.` : `Vaqti kelganda talabalar bosh sahifasida «Imtihonni boshlash» tugmasi chiqadi.`}</p>`}</div>`;
      }).join('') : `<div class="card" style="text-align:center;padding:40px"><b>Hali imtihon belgilanmagan</b><p class="mute" style="margin-top:8px">Yuqoridan birinchi guruh imtihonini yarating.</p></div>`}</div>`)
    };
  };

  /* ================= Talabalarga haftalik hisobot (Telegram bot) =================
     Hisobot TALABANING O'ZIGA boradi (ota-onaga emas); xohlasa ota-onasiga ko'rsatadi. */
  function weeklyText(s) {
    const o = ST.overall(s), r = ST.readiness(s), tot = s.days.reduce((a, b) => a + b, 0), w = ST.weakTopics(s)[0], first = s.name.split(' ')[0], act = s.days.filter(d => d > 0).length;
    const st = ST.status(r);
    return `Salom, ${first}! ${schoolName()} avtomaktabidan haftalik natijangiz (ID: ${s.uid || ''}):\n\n• Imtihonga tayyorlik: ${r}% (${st.label.toLowerCase()})\n• Bu hafta ${act} kun shug'ullandingiz, jami ${(tot / 60).toFixed(1)} soat\n• O'zlashtirish: ${Math.round(o.acc)}%${w ? `\n• Qiyin mavzu: ${w.t.name} (${w.acc}%)` : ''}${s.exams.length ? `\n• Oxirgi sinov imtihoni: ${s.exams[s.exams.length - 1]}%` : ''}\n\n${r >= 85 ? `Imtihonga tayyorsiz. Ustozingiz bilan imtihon sanasini belgilang.` : act < 3 ? `Bu hafta kam shug'ullandingiz. Kuniga 20–30 daqiqa mashq qiling.` : `Yaxshi harakat qilyapsiz. Davom eting, tez orada tayyor bo'lasiz.`}\n\n${CFG.teacher.name}`;
  }
  V.parents = () => {
    const list = V.fl().slice().sort((a, b) => ST.readiness(a) - ST.readiness(b)), on = !!(Store.s.parentAuto), sc = V.mySchool(), st = V.Bot.state(sc), [cls, lbl] = V.Bot.label(st);
    return {
      html: shell('pr', `<div class="page-h"><div><h1>Hisobotlar</h1><p>Haftalik natija talabaning o'ziga Telegram bot orqali boradi. Ustoz vaqt sarflamaydi.</p></div><span class="chip ${cls}">Bot: ${lbl}</span></div>
      <div class="card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="rw-i">${ico('send')}</span><div style="flex:1;min-width:220px"><b>Haftalik avtomatik yuborish</b><div class="mute" style="font-size:14px">Har yakshanba kechqurun, <b>${esc(V.Bot.name(sc))}</b> orqali, talabaning o'ziga. ${st === 'active' ? '' : `Bot hozir faol emas: <a href="#/panel/bot" style="color:var(--acc)">Telegram bot</a> bo'limiga qarang.`}</div></div><button class="btn ${on && st === 'active' ? 'primary' : 'soft'}" data-act="par-auto" ${st === 'active' ? '' : 'disabled'}>${on && st === 'active' ? `Yoqilgan ✓` : `Yoqish`}</button></div>
      <div class="stack s12 mt">${list.map(s => `<div class="card"><div class="row-between"><div style="display:flex;gap:12px;align-items:center">${ava(s.name, 42)}<div><b>${esc(s.name)}</b><div class="mute" style="font-size:13.5px"><b class="mono uid-t">${esc(s.uid || '')}</b> · ${esc(ST.groupName(s.group))} · tayyorlik ${ST.readiness(s)}%</div></div></div>
        <button class="btn sm primary" data-act="par-view" data-id="${esc(s.id)}">Hisobotni ko'rish</button></div></div>`).join('')}</div>`)
    };
  };
  /* ================= Rahbar hisoboti ================= */
  V.report = () => {
    const list = ST.students(), sm = ST.summary(list), N = list.length, ins = AI.insights(sm), now = new Date();
    const mon = UI.MONS[now.getMonth()] + ' ' + now.getFullYear();
    const hours = Math.round(list.reduce((a, s) => a + s.days.reduce((x, y) => x + y, 0), 0) / 60 * 4.3);
    const exAll = list.flatMap(s => s.exams), passN = exAll.filter(e => e >= CFG.passPercent).length;
    const top = sm.withR.slice().sort((a, b) => b.r - a.r).slice(0, 5), risk = sm.withR.filter(x => x.s.lastActive >= 3 || x.r < 50).sort((a, b) => a.r - b.r).slice(0, 6);
    const gs = Store.groups().map(g => ({ g, m: list.filter(s => s.group === g.id) })).filter(x => x.m.length).map(x => ({ ...x, sm: ST.summary(x.m) }));
    const worst = sm.topics.filter(t => t.act).sort((a, b) => b.pct - a.pct).slice(0, 3);
    return {
      html: shell('rp', `<div class="page-h noprint"><div><h1>Rahbar hisoboti</h1><p>Oylik natijalar bir sahifada. Chop eting yoki PDF qilib saqlang.</p></div><button class="btn primary" data-act="rp-print">${ico('print')} Chop etish / PDF</button></div>
      <div class="report">
        <div class="rp-head"><div><small>Oylik hisobot</small><h2>${esc(schoolName())}</h2><span>${esc(mon)}</span></div><div class="rp-gen">Tayyorladi: Chorraha<br>${now.toLocaleDateString('uz-UZ')}</div></div>
        <div class="grid g4 keep2">${stat('users', `Talabalar`, N, '', `${gs.length} ta guruh`)}${stat('bolt', `Haftalik faol`, pct(sm.activeWeek, N), '%', `${sm.activeWeek} ta talaba`)}${stat('shield', `Imtihonga tayyor`, pct(sm.ready, N), '%', `${sm.ready} ta talaba`)}${stat('target', `O'zlashtirish`, sm.mastery, '%', `O'rtacha`)}</div>
        <div class="grid g4 keep2" style="margin-top:14px">${stat('clock', `Jami o'qish`, hours, ' soat', `Oy davomida (taxminiy)`)}${stat('flag', `Sinov imtihonlari`, exAll.length, '', `${pct(passN, exAll.length)}% o'tgan`)}${stat('alert', `Xavf ostida`, risk.length, ' nafar', `3+ kun kirmagan yoki past natija`)}${stat('msg', `Faol`, sm.activeToday, `/${N}`, `Bugun`)}</div>
        <div class="grid g2 mt"><div class="card"><div class="h-sec">Guruhlar taqqoslash</div>${gs.map(x => `<div class="trow" style="grid-template-columns:minmax(0,1.2fr) minmax(70px,1fr) 70px"><span>${esc(x.g.name)} <small class="mute">(${x.m.length})</small></span>${bar(x.sm.mastery)}<span class="pc">${x.sm.mastery}%</span></div>`).join('')}</div>
          <div class="card"><div class="h-sec">Eng zaif mavzular</div>${worst.map(w => `<div class="trow" style="grid-template-columns:minmax(0,1.3fr) minmax(70px,1fr) 56px"><span>${w.t.name}</span>${bar(w.pct, '#FF5C70')}<span class="pc">${w.pct}%</span></div>`).join('')}<p class="mute" style="font-size:13px;margin-top:8px">Talabalarning shuncha foizi mavzuda 70% dan past.</p></div></div>
        <div class="grid g2 mt"><div class="card"><div class="h-sec">Eng yaxshi talabalar</div>${top.map((x, i) => `<div class="trow" style="grid-template-columns:24px minmax(0,1fr) 56px"><b class="mono">${i + 1}</b><span>${esc(x.s.name)}</span><span class="pc">${x.r}%</span></div>`).join('')}</div>
          <div class="card"><div class="h-sec">E'tibor kerak</div>${risk.map(x => `<div class="trow" style="grid-template-columns:minmax(0,1fr) auto"><span>${esc(x.s.name)}</span><span class="chip ${x.s.lastActive >= 3 ? 'bad' : 'warn'}">${x.s.lastActive >= 99 ? 'kirmagan' : x.s.lastActive >= 3 ? x.s.lastActive + ' kun kirmagan' : x.r + '% tayyor'}</span></div>`).join('') || `<p class="mute">Hamma faol.</p>`}</div></div>
        <div class="card mt"><div class="ai-h">${ico('sparkles')} Xulosa va tavsiyalar</div><div class="stack s12" style="margin-top:12px">${ins.map(i => `<div class="ins ${i.tone}"><span class="ii">${ico(i.tone === 'ok' ? 'check' : i.tone === 'info' ? 'target' : 'alert')}</span><div><b>${esc(i.title)}</b><p>${esc(i.text)}</p></div></div>`).join('')}</div></div>
        <p class="mute" style="font-size:12.5px;margin-top:14px">Eslatma: demo rejimida jadvaldagi talabalar namunaviy ma'lumot.</p></div>`)
    };
  };

  /* ================= Tarif ================= */
  const planFor = (n) => CFG.plans.filter(p => p.upTo).find(p => n <= p.upTo) || CFG.plans[CFG.plans.length - 1];
  V.tariff = () => {
    const sc = Store.s.school || {}, n = sc.n || 100, pl = planFor(n);
    return {
      html: shell('tf', `<div class="page-h"><div><h1>Tarif va obuna</h1><p>Avtomaktab uchun oylik to'lov. Narxlar taklif sifatida ko'rsatilgan.</p></div></div>
      <div class="grid g4 keep2" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">${CFG.plans.map(p => `<div class="card plan-c ${p.id === pl.id ? 'sel' : ''} ${p.hot ? 'hot' : ''}">${p.hot ? `<span class="chip warn">Ommabop</span>` : ''}<b style="font-size:19px">${esc(p.name)}</b><div class="price">${p.price ? money(p.price) : 'Kelishuv'}<small>${p.price ? '/oy' : ''}</small></div><div class="mute" style="font-size:14px">${p.upTo ? `${p.upTo} tagacha talaba` : `Cheklovsiz`}</div><div class="mute" style="font-size:13px;margin-top:6px">${esc(p.note)}</div></div>`).join('')}</div>
      <div class="card mt"><div class="h-sec">Hisoblagich</div><label for="tn" class="mute">Faol talabalar soni: <b id="tnv" style="color:var(--text)">${n}</b></label><input id="tn" type="range" min="10" max="500" step="5" value="${n}" data-input="tf-n" style="width:100%;margin:10px 0">
        <div id="tcalc">${calc(n)}</div></div>
      <div class="card mt" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="rw-i gold">${ico('crown')}</span><div style="flex:1;min-width:220px"><b>Talabalar premiumini maktab to'lasa</b><div class="mute" style="font-size:14px">Tarif to'langanda barcha talabalarga Premium (${money(CFG.premiumPrice)}/oy qiymatida) bepul ochiladi.</div></div><button class="btn ${sc.paid ? 'primary' : 'soft'}" data-act="tf-paid">${sc.paid ? `Yoqilgan ✓` : `Demo: yoqish`}</button></div>
      <div class="banner mt">${ico('alert')}<span><b>Demo:</b> to'lov tizimi ulanmagan. Haqiqiy hisob-faktura shartnoma asosida beriladi.</span></div>`)
    };
  };
  function calc(n) {
    const pl = planFor(n), per = pl.price ? Math.round(pl.price / n) : 0, own = n * CFG.premiumPrice;
    return pl.price ? `<div class="grid g3" style="gap:12px"><div class="kpi"><small>Tavsiya etilgan tarif</small><b>${esc(pl.name)}</b></div><div class="kpi"><small>Oyiga</small><b>${money(pl.price)}</b></div><div class="kpi"><small>Bir talabaga</small><b>${money(per)}</b></div></div><p class="mute" style="font-size:14px;margin-top:12px">Talabalar premiumni o'zlari olsa (${money(CFG.premiumPrice)}), ${n} ta talaba oyiga ${money(own)} to'laydi. Maktab tarifi arzonroq va ustoz paneli ham kiradi.</p>` : `<p>${n} dan ortiq talaba uchun: <b>Tarmoq</b> tarifi, kelishuv asosida.</p>`;
  }
  V.inputs['tf-n'] = (t) => { const n = +t.value; Store.s.school = Object.assign(Store.s.school || {}, { n }); Store.save(); $('tnv').textContent = n; $('tcalc').innerHTML = calc(n); document.querySelectorAll('.plan-c').forEach((c, i) => c.classList.toggle('sel', CFG.plans[i].id === planFor(n).id)); };

  /* ================= Brend ================= */
  const COLORS = ['#B8F53B', '#4D8DFF', '#FF6B3D', '#F7C600', '#22C7A9', '#B26BFF', '#FF4D8D'];
  V.brandPage = () => {
    const b = Store.s.brand || {};
    return {
      html: shell('bs', `<div class="page-h"><div><h1>Maktab brendi</h1><p>Ilova sizning avtomaktabingiz nomi, logotipi va rangida ko'rinadi. Talabalar buni o'z ilovasida ham ko'radi.</p></div></div>
      <div class="grid g2"><div class="card"><div class="field"><label for="bn">Avtomaktab nomi</label><input id="bn" class="input" maxlength="32" value="${esc(b.name || '')}" placeholder="Masalan: Yo'l Plus avtomaktabi"></div>
        <div class="field"><label>Logotip <span class="mute" style="font-weight:500">(kvadrat rasm)</span></label><div style="display:flex;gap:12px;align-items:center"><span class="logo-pv" id="bl">${b.logo ? `<img src="${b.logo}" alt="">` : ico('image')}</span><label class="btn soft sm" for="bf" style="cursor:pointer">${ico('upload')} Rasm tanlash</label><input id="bf" type="file" accept="image/*" hidden data-input="br-file"></div></div>
        <div class="field"><label>Asosiy rang</label><div class="swatches" id="bc">${COLORS.map(c => `<button class="sw ${(b.color || '#B8F53B').toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" data-act="br-col" data-c="${c}" aria-label="${c}"></button>`).join('')}</div></div>
        <div class="ai-acts"><button class="btn primary" data-act="br-save">${ico('check')} Saqlash</button><button class="btn soft" data-act="br-reset">Asl holiga</button></div></div>
        <div class="card"><div class="h-sec">Talaba ilovasida shunday ko'rinadi</div><div class="br-pv" id="bpv"></div></div></div>`),
      mount: () => { window.__br = { name: b.name || '', logo: b.logo || '', color: b.color || '#B8F53B' }; pv(); }
    };
  };
  function pv() {
    const b = window.__br, el = $('bpv'); if (!el) return; const ink = (parseInt(b.color.slice(1), 16) >> 8 & 255) > 170 ? '#0B1400' : '#fff';
    el.innerHTML = `<div class="br-top">${b.logo ? `<img src="${b.logo}" alt="">` : `<span class="br-l" style="background:${b.color}"></span>`}<div><b>${esc(b.name || `Chorraha`)}</b><small>Chorraha</small></div></div><div class="br-body"><div class="br-btn" style="background:${b.color};color:${ink}">Testni boshlash</div><div class="br-bar"><i style="background:${b.color}"></i></div><small>Natijalar, reyting, imtihonlar shu rangda</small></div>`;
  }
  V.inputs['br-file'] = (t) => {
    const f = t.files && t.files[0]; if (!f) return; if (f.size > 8e6) { toast(`Rasm juda katta (8 MB gacha)`); return; }
    const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), s = 160, z = Math.min(im.width, im.height); c.width = c.height = s; c.getContext('2d').drawImage(im, (im.width - z) / 2, (im.height - z) / 2, z, z, 0, 0, s, s); window.__br.logo = c.toDataURL('image/png'); $('bl').innerHTML = `<img src="${window.__br.logo}" alt="">`; pv(); }; im.onerror = () => toast(`Rasmni o'qib bo'lmadi`); im.src = r.result; }; r.readAsDataURL(f);
  };

  /* ================= amallar ================= */
  V.acts = Object.assign(V.acts || {}, {
    'gx-add'() {
      const t = $('gx-t').value.trim(), at = new Date($('gx-d').value).getTime(); if (!t || isNaN(at)) { toast(`Nomi va sanani kiriting`); return; }
      gexams().push({ id: 'GX' + Date.now().toString(36), title: t, groupId: $('gx-g').value || '', at, count: +$('gx-n').value, minutes: +$('gx-m').value });
      Store.notify(`Yangi guruh imtihoni belgilandi: ${t}, ${fmtD(at)}.`, 'bonus'); Store.save(); toast(`Imtihon belgilandi`); V.rerender();
    },
    'gx-del'(el) { UI.confirmBox(`Imtihonni o'chirasizmi?`, `O'chirish`, () => { Store.s.gexams = gexams().filter(e => e.id !== el.dataset.id); Store.save(); V.rerender(); }); },
    'par-auto'() { Store.s.parentAuto = !Store.s.parentAuto; Store.save(); toast(Store.s.parentAuto ? `Haftalik yuborish yoqildi` : `O'chirildi`); V.rerender(); },
    'par-view'(el) {
      const s = ST.students().find(x => x.id === el.dataset.id); if (!s) return; const tg = s.tg || (s.me ? Store.s.tg : '');
      modal(`<h3>Haftalik hisobot: ${esc(s.name.split(' ')[0])}</h3><textarea class="input" id="ptext" style="min-height:260px">${esc(weeklyText(s))}</textarea><div class="ai-acts"><button class="btn primary" data-act="par-copy">${ico('copy')} Nusxalash</button>${tg ? `<a class="btn soft" target="_blank" rel="noopener noreferrer" id="plink" href="#">${ico('send')} Telegramda ochish</a>` : ''}<button class="btn soft" data-act="close">Yopish</button></div><p class="mute" style="font-size:13px;margin-top:12px">Bot faol bo'lsa, bu xabar talabaga o'zi boradi. Qo'lda yuborish ham mumkin.</p>`);
      const a = $('plink'); if (a) { a.addEventListener('click', () => { a.href = `https://t.me/${String(tg).replace(/^@/, '')}`; copy($('ptext').value); toast(`Matn nusxalandi. Chatga qo'ying.`); }); }
    },    'par-copy'() { copy($('ptext').value).then(() => toast(`Nusxalandi`)); },
    'rp-print'() { try { window.print(); } catch (e) { toast(`Chop etish bu oynada yopiq. Saytni alohida oynada oching`); } },
    'tf-paid'() { const sc = Store.s.school = Store.s.school || {}; sc.paid = !sc.paid; Store.save(); toast(sc.paid ? `Talabalarga Premium ochildi (demo)` : `O'chirildi`); V.rerender(); },
    'br-col'(el) { window.__br.color = el.dataset.c; document.querySelectorAll('#bc .sw').forEach(b => b.classList.toggle('on', b === el)); pv(); },
    'br-save'() {
      const b = window.__br; b.name = $('bn').value.trim(); if (!b.name) { toast(`Avtomaktab nomini yozing`); return; }
      Store.s.brand = { name: b.name, logo: b.logo, color: b.color }; Store.save(); UI.applyBrand(); toast(`Brend saqlandi`); V.rerender();
    },
    'br-reset'() { delete Store.s.brand; Store.save(); UI.applyBrand(); toast(`Asl holiga qaytdi`); V.rerender(); },
  });
})();


