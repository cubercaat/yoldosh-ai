/* Talaba ID si: har talabaga avtomatik beriladi (2 harf + 4 raqam, masalan AB1234).
   Pullik qisqa ID lar: config.js idTiers. Band ID lar config.js da.
   ID batlda do'stni chaqirish va ustozga murojaat qilishda ishlatiladi; ustoz paneldan ID bo'yicha topadi.
   DEMO: ID bandligi faqat shu brauzerdagi ma'lumotlar bilan tekshiriladi; haqiqiy noyoblik serverda (UNIQUE) ta'minlanadi. */
(function () {
  const { ico, esc, toast, modal, closeModal, copy } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, shell = (a, h) => V.shellStudent(a, h);
  const $ = (id) => document.getElementById(id);
  const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ` so'm`;
  const reserved = () => (CFG.reservedIds || []).map(x => x.toUpperCase());

  function known() {   // [{uid, name, me}]
    const out = [], seen = {};
    const add = (uid, name, me) => { if (uid && !seen[uid]) { seen[uid] = 1; out.push({ uid, name, me: !!me }); } };
    if (Store.s.role === 'student' || Store.s.uid) add(Store.myUid(), Store.s.name || 'Siz', true);
    ST.students().forEach(s => add(s.uid, s.name, s.me));
    try { V.honorInfo.board('all', true).forEach(x => { if (!x.me) add(ST.genUid(x.id), x.name); }); } catch (e) { }
    return out;
  }
  const find = (uid) => known().find(k => k.uid === uid);
  function priceOf(id) { const t = (CFG.idTiers || []).find(t => new RegExp(t.re).test(id)); return t ? t.price : 0; }
  function status(raw) {
    const id = String(raw || '').toUpperCase().replace(/\s/g, '');
    if (!id) return { cls: '', msg: `Harf va raqamlardan iborat qisqa ID yozing: AB12, A12, A1, 7 yoki Q` };
    if (!priceOf(id)) return { cls: 'bad', msg: `Bunday ID sotilmaydi. Variantlar pastda ko'rsatilgan` };
    if (id === Store.myUid()) return { cls: 'warn', msg: `Bu sizning hozirgi ID ingiz` };
    if (reserved().includes(id)) return { cls: 'bad', msg: `${id} band, egasi bor`, id };
    const k = find(id); if (k && !k.me) return { cls: 'bad', msg: `${id} band`, id };
    return { cls: 'ok', msg: `${id} bo'sh. Narxi: ${money(priceOf(id))}`, id, price: priceOf(id) };
  }

  /* ---------- sahifa ---------- */
  V.myid = () => {
    const uid = Store.myUid(), bought = Store.s.uidBought;
    return {
      html: shell('id', `<div class="page-h"><div><h1>Mening ID</h1><p>Batlda do'stlaringiz sizni shu ID bilan chaqiradi, ustozga yozganda ham shu ID ni aytasiz.</p></div></div>
      <div class="idcard"><div class="idc-top"><span class="chip ${bought ? 'warn' : ''}">${bought ? 'Chiroyli ID' : 'Avtomatik ID'}</span><small>${esc(CFG.school)}</small></div><div class="idc-n">${esc(uid)}</div><div class="idc-b"><div><small>Talaba</small><b>${esc(Store.s.name || 'Talaba')}</b></div><button class="btn sm soft" data-act="id-copy">${ico('copy')} Nusxalash</button></div></div>
      <div class="card mt"><div class="h-sec">${ico('crown')} Chiroyli ID tanlash</div>
        <p class="mute" style="font-size:14.5px;margin-bottom:14px">O'zingizga yoqqan ID ni oling. Eslab qolish oson va ajralib turasiz.</p>
        <div class="tiers">${(CFG.idTiers || []).map(t => `<div class="kpi"><small>${t.label}</small><b>${money(t.price)}</b><small>masalan ${t.ex}</small></div>`).join('')}</div><div class="field"><label for="uidn">Kerakli ID</label><input id="uidn" class="input mono" maxlength="4" autocomplete="off" placeholder="AB12" data-input="uid-in" style="text-transform:uppercase;letter-spacing:.06em"></div>
        <div id="uids" class="uid-s">${status('').msg}</div>
        <button class="btn primary" id="uidb" data-act="id-buy" style="margin-top:12px" disabled>${ico('crown')} ID ni olish</button>
        <p class="mute" style="font-size:13px;margin-top:12px">Eski ID bo'shaydi. ID ni almashtirish har safar to'lanadi.</p></div>`)
    };
  };
  V.inputs = Object.assign(V.inputs || {}, {
    'uid-in'(t) { t.value = t.value.toUpperCase(); const s = status(t.value); const el = $('uids'); el.className = 'uid-s ' + s.cls; el.textContent = s.msg; $('uidb').disabled = !s.price; $('uidb').dataset.id = s.id || ''; },
    'uid-find'(t) { const id = t.value.toUpperCase().replace(/\s/g, ''); t.value = id; const el = $('bidr'); if (!el) return; if (id.length < 4) { el.className = 'uid-s'; el.textContent = `Do'stingiz ID sini yozing`; $('bidb').disabled = true; return; } const k = find(id); if (!k) { el.className = 'uid-s bad'; el.textContent = `Bu ID topilmadi`; $('bidb').disabled = true; } else if (k.me) { el.className = 'uid-s warn'; el.textContent = `Bu sizning ID ingiz`; $('bidb').disabled = true; } else { el.className = 'uid-s ok'; el.textContent = `Topildi: ${k.name}`; $('bidb').disabled = false; $('bidb').dataset.id = id; $('bidb').dataset.nm = k.name; } },
  });

  /* ---------- bosh sahifa kartasi ---------- */
  const baseHome = V.homeRank;
  V.homeRank = () => (baseHome ? baseHome() : '') + (Store.s.role === 'student' ? `<a class="card mt idmini" href="#/app/id"><span class="rw-i">${ico('star')}</span><div><small class="mute">Mening ID</small><b class="mono">${esc(Store.myUid())}</b></div><span class="chip">${Store.s.uidBought ? 'Chiroyli ID' : 'Chiroyli ID olish'}</span></a>` : '');

  /* ---------- batl: ID orqali chaqirish ---------- */
  const baseBattle = V.battle;
  V.battle = () => {
    const v = baseBattle(); if (!v || !v.html) return v;
    const card = `<div class="card mb"><div class="h-sec">${ico('users')} Do'stni ID orqali chaqirish</div><p class="mute" style="font-size:14px;margin-bottom:10px">Do'stingizning ID sini yozing, chaqiruv matni tayyor bo'ladi.</p><div style="display:flex;gap:8px"><input class="input mono" id="bid" maxlength="8" placeholder="AB123456" autocomplete="off" data-input="uid-find" style="text-transform:uppercase"><button class="btn primary" id="bidb" data-act="id-invite" disabled>${ico('bolt')} Chaqirish</button></div><div id="bidr" class="uid-s">Do'stingiz ID sini yozing</div><div class="mute" style="font-size:13px;margin-top:8px">Sizning ID: <b class="mono" style="color:var(--text)">${esc(Store.myUid())}</b></div></div>`;
    v.html = v.html.replace('<div class="grid g2">', card + '<div class="grid g2">'); return v;
  };

  V.acts = Object.assign(V.acts || {}, {
    'id-copy'() { copy(Store.myUid()).then(() => toast(`ID nusxalandi`)); },
    'id-buy'(el) {
      const s = status($('uidn').value); if (!s.price) return;
      modal(`<h3>ID uchun to'lov</h3><div class="co-sum"><span>ID: <b class="mono">${esc(s.id)}</b></span><b>${money(s.price)}</b></div>
        <div class="field"><label>To'lov usuli</label><div class="cfg-row" id="pm">${['Click', 'Payme', 'Uzum', 'Uzcard'].map((m, i) => `<button class="bigp ${i === 0 ? 'on' : ''}" data-act="pm">${m}</button>`).join('')}</div></div>
        <div class="banner" style="margin-top:16px">${ico('alert')}<span><b>Demo:</b> pul yechilmaydi. Haqiqiy to'lov Click/Payme ulangach ishlaydi.</span></div>
        <div class="ai-acts"><button class="btn primary lg" data-act="id-pay" data-id="${esc(s.id)}">${ico('check')} To'lash (demo)</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
    },
    'id-pay'(el) {
      const s = status(el.dataset.id); if (!s.price) { toast(`ID band bo'lib qoldi`); closeModal(); return; }
      const st = Store.s; st.uid = s.id; st.uidBought = true; st.payments = st.payments || []; st.payments.push({ ts: Date.now(), title: `ID: ${s.id}`, sum: s.price });
      const r = (st.roster || []).find(x => x.id === st.meId); if (r) r.uid = s.id;
      Store.notify(`Yangi ID ingiz: ${s.id}. Tabriklaymiz!`, 'bonus'); Store.save(); closeModal(); toast(`Sizning yangi ID: ${s.id}`); V.rerender();
    },
    'id-invite'(el) {
      const id = el.dataset.id, nm = el.dataset.nm, seed = Math.random().toString(36).slice(2, 7).toUpperCase(), code = `YB-${seed}-20-mix-25-${BANK.Q.length}`;
      const text = `${id}, salom! Men ${Store.s.name || 'do\'stingiz'} (ID: ${Store.myUid()}). Chorraha da batlga chaqiryapman. Kod: ${code}`;
      modal(`<h3>${esc(nm)} ga chaqiruv</h3><p class="mute">ID: <b class="mono">${esc(id)}</b>. Matnni Telegramda do'stingizga yuboring.</p><textarea class="input" id="invt" style="min-height:120px" readonly>${esc(text)}</textarea>
        <div class="ai-acts"><button class="btn primary" data-act="inv-copy">${ico('copy')} Nusxalash</button><a class="btn soft" target="_blank" rel="noopener noreferrer" href="https://t.me/share/url?url=${encodeURIComponent(CFG.siteUrl)}&text=${encodeURIComponent(text)}">${ico('send')} Telegram</a><button class="btn soft" data-act="inv-go" data-code="${code}">Men boshlayman</button></div>
        <p class="mute" style="font-size:13px;margin-top:12px">Demo: chaqiruv ilova ichida emas, Telegram orqali boradi. Ilova ichidagi bildirishnoma server ulangach ishlaydi.</p>`);
    },
    'inv-copy'() { copy($('invt').value).then(() => toast(`Nusxalandi`)); },
    'inv-go'(el) { closeModal(); const p = el.dataset.code.split('-'); V.acts.start({ dataset: { key: `b:${p[1]}:${p[2]}:${p[3]}:${p[4]}:${p[5]}` } }); },
  });
})();

