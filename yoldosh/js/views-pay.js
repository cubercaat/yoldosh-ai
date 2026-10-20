/* Haqiqiy to'lov oqimi (jonli rejim): tarif tanlash → kartaga o'tkazma → "To'ladim" → admin tasdiqlaydi → Premium ochiladi.
   Demo "to'lash" tugmasi (pulsiz Premium berardi) jonli rejimda o'chiriladi. */
(function () {
  const { esc, toast, modal, closeModal, copy } = UI; const Store = (window.ST && ST.Store) || window.Store;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const live = () => !!(window.Cloud && Cloud.live());
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const H = () => ({ 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() });
  const sum = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
  const post = async (p, b) => { const r = await fetch(api() + p, { method: 'POST', headers: H(), body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'xato'); return j; };
  const TIERS = { pro: { n: 'Pro', p: 99000, d: ['Yozma AI yordamchi + kamera', 'Pro reytingi + viloyat reytingi', 'Cobalt · Gentra · Malibu · Isuzu', 'Battle: kuniga 10 ta'] }, premium: { n: 'Premium', p: 139000, d: ['Pro + ovozli sharhlar', 'Ustozdan so\'rash', 'Premium reyting va chat', 'Brabus G · Porsche · Battle 30 ta'] }, max: { n: 'Max', p: 149000, d: ['Premium + haftada 1 soat online dars (ustoz bilan video-chat)', 'Max chat: ovozli xabarlar bilan', 'Avtodrom 3D: hamma mashina, cheksiz', 'Battle cheksiz · maxsus Max logotipi'] } };
  const tprice = (t) => (CFG.tierPrices && CFG.tierPrices[t]) || TIERS[t].p;
  const plans = (t) => { const one = tprice(t); return [[1, one, ''], [3, one * 3, 'mashhur'], [12, one * 12, 'eng foydali']].map(([m, p, tag]) => ({ m, p, tag })); };
  const PS = { tier: 'premium', m: 1, pct: 0, code: '' };
  const STAT = { new: ["To'lov kutilmoqda", 'warn'], paid: ['Tekshirilmoqda', 'warn'], approved: ['Tasdiqlandi', 'ok'], rejected: ['Rad etildi', 'bad'] };

  const PCT = (n) => Math.round(n * (100 - PS.pct) / 100 / 1000) * 1000;
  function planModal() {
    modal(`<h3>Tarifni tanlang</h3><p class="mute">To'lov kartaga o'tkazma orqali. Tasdiqlangach tarif avtomatik ochiladi.</p>
      <div class="stack s12" style="margin:14px 0" id="pp-tiers">${['pro', 'premium', 'max'].map(t => `<button class="plan-opt" data-act="pay-tier" data-t="${t}" style="text-align:left;align-items:flex-start"><span><b>${TIERS[t].n}</b>${t === 'premium' ? ' <em class="chip acc">mashhur</em>' : ''}${t === 'max' ? ' <em class="chip ok">hammasi</em>' : ''}<small>${TIERS[t].d.join(' · ')}</small></span><strong>${sum(tprice(t))}<small>/oy</small></strong></button>`).join('')}</div>
      <div class="seg" id="pp-per" style="display:flex;gap:8px;margin-bottom:12px">${[1, 3, 12].map(m => `<button class="btn soft sm" style="flex:1" data-act="pay-per" data-m="${m}">${m === 12 ? '1 yil' : m + ' oy'}</button>`).join('')}</div>
      <div class="field"><label for="pp-code">🎟 Promokod bormi? (ixtiyoriy)</label><div style="display:flex;gap:8px"><input id="pp-code" class="input" maxlength="24" placeholder="Masalan: BLOGER20" autocapitalize="characters" style="text-transform:uppercase"><button class="btn soft" data-act="pay-code">Qo'llash</button></div><small id="pp-cm" class="mute"></small></div>
      <div class="co-sum"><span>Jami</span><b id="pp-sum"></b></div>
      <div class="ai-acts"><button class="btn primary lg" data-act="pay-plan">Davom etish</button><button class="btn soft" data-act="close">Keyinroq</button></div>`);
    paint(); try { const pc = Store.s.promo; if (pc) { document.getElementById('pp-code').value = pc; V.acts['pay-code'](); } } catch (e) { }
  }
  function paint() {
    document.querySelectorAll('#pp-tiers .plan-opt').forEach(b => { const on = b.dataset.t === PS.tier; b.classList.toggle('on', on); b.style.outline = on ? '2px solid var(--acc, #b7f537)' : ''; });
    document.querySelectorAll('#pp-per button').forEach(b => { const on = +b.dataset.m === PS.m; b.classList.toggle('primary', on); b.classList.toggle('soft', !on); });
    const base = tprice(PS.tier) * PS.m, el = document.getElementById('pp-sum'); if (el) el.innerHTML = PS.pct ? `<s class="mute">${sum(base)}</s> ${sum(PCT(base))}` : sum(base);
  }
  function payModal(o, months, tier) {
    const card = (CFG.payCard || '').trim(), name = (CFG.payName || '').trim(), contact = (CFG.supportTelegram || CFG.teacherTelegram || '').replace(/^@/, '');
    modal(`<h3>To'lov · ${(TIERS[tier] || TIERS.premium).n} · ${months === 12 ? '1 yil' : months + ' oy'}</h3>
      <div class="co-sum"><span>Summa${o.discount ? ' (−' + sum(o.discount) + ' chegirma)' : ''}</span><b>${sum(o.amount)}</b></div>
      ${card ? `<div class="card" style="margin:12px 0;padding:16px"><small class="mute">Karta raqami</small><div style="font-size:22px;font-weight:800;letter-spacing:.04em;margin:4px 0">${esc(card)}</div>${name ? `<small class="mute">${esc(name)}</small>` : ''}<div class="ai-acts" style="margin-top:10px"><button class="btn sm soft" data-act="pay-copy" data-v="${esc(card.replace(/\s/g, ''))}">Raqamni nusxalash</button></div></div>
      <ol class="mute" style="font-size:14px;line-height:1.7;padding-left:18px"><li>Yuqoridagi summani shu kartaga o'tkazing.</li><li>To'lov izohiga <b>CH-${o.id}</b> deb yozing${CFG.payNote ? ' (' + esc(CFG.payNote) + ')' : ''}.</li><li>Pastdagi «To'lov qildim» tugmasini bosing.</li></ol>
      <div class="field"><label for="pay-note">Kartangizning oxirgi 4 raqami yoki izoh (ixtiyoriy)</label><input id="pay-note" class="input" maxlength="100" placeholder="masalan: 1234"></div>
      <div class="ai-acts"><button class="btn primary lg" data-act="pay-sent" data-id="${o.id}">To'lov qildim</button><button class="btn soft" data-act="close">Yopish</button></div>`
        : `<div class="banner" style="margin:14px 0"><span>To'lov rekvizitlari hali kiritilmagan. ${contact ? `Iltimos, <a href="https://t.me/${esc(contact)}" target="_blank" rel="noopener">@${esc(contact)}</a> ga yozing.` : "Iltimos, keyinroq urinib ko'ring."}</span></div><div class="ai-acts"><button class="btn soft" data-act="close">Yopish</button></div>`}`);
  }

  const prevPay = V.acts && V.acts.pay, prevDo = V.acts && V.acts['pay-do'];
  V.acts = Object.assign(V.acts || {}, {
    pay(el) {
      if (!live()) { if (prevPay) prevPay(el); return; }
      if (!window.Cloud.token()) { closeModal(); toast("Avval ro'yxatdan o'ting"); location.hash = '#/register'; return; }
      closeModal(); PS.pct = 0; PS.code = ''; planModal();
    },
    'pay-do'(el) { if (!live() && prevDo) prevDo(el); },
    'pay-tier'(el) { PS.tier = el.dataset.t; paint(); },
    'pay-per'(el) { PS.m = +el.dataset.m; paint(); },
    async 'pay-code'() {
      const i = document.getElementById('pp-code'), m = document.getElementById('pp-cm'), code = (i.value || '').trim().toUpperCase(); PS.pct = 0; PS.code = '';
      if (!code) { m.textContent = ''; return paint(); }
      try { const j = await post('/promo/check', { code }); if (j.percent > 0) { PS.pct = j.percent; PS.code = code; m.textContent = '✅ −' + j.percent + '% chegirma qo\'llandi'; } else m.textContent = "🎁 Bu sovg'a kodi (" + j.days + " kun). «Promokod» bo'limida kiriting."; }
      catch (e) { m.textContent = '❌ ' + e.message; } paint();
    },
    async 'pay-plan'() {
      const months = PS.m, tier = PS.tier, ci = document.getElementById('pp-code'); if (ci && !PS.code && ci.value.trim()) { await V.acts['pay-code'](); if (!PS.code) return; }
      try { const o = await post('/order/create', { months, tier, promo: PS.code || undefined }); closeModal(); payModal(o, months, tier); } catch (e) { toast('Xato: ' + e.message); }
    },
    'pay-copy'(el) { copy(el.dataset.v).then(() => toast('Karta raqami nusxalandi')); },
    async 'pay-sent'(el) {
      const n = document.getElementById('pay-note'); try { await post('/order/paid', { id: +el.dataset.id, note: n ? n.value.trim() : '' }); closeModal(); modal(`<h3>Rahmat!</h3><p class="mute">To'lovingiz tekshirilmoqda. Tasdiqlangach Telegramga xabar keladi va Premium ochiladi (odatda bir necha daqiqa).</p><div class="ai-acts"><button class="btn primary" data-act="close">Yaxshi</button></div>`); if (V.rerender && /premium/.test(location.hash)) V.rerender(); } catch (e) { toast('Xato: ' + e.message); }
    },
  });

  // Premium sahifasi: "To'lovlarim" (jonli rejimda)
  const basePrem = V.premium;
  if (basePrem) V.premium = function () {
    const r = basePrem.apply(this, arguments); if (!live() || !r || !r.html) return r;
    r.html = r.html.replace(/<div class="card mt"><div class="h-sec">To'lovlar tarixi \(demo\)[\s\S]*$/, '') + '<div class="card mt" id="my-orders" style="display:none"><div class="h-sec">To\'lovlarim</div><div id="my-orders-l"></div></div>';
    const m = r.mount; r.mount = function () { if (m) m.apply(this, arguments); loadOrders(); };
    return r;
  };
  async function loadOrders() {
    if (!window.Cloud || !Cloud.token()) return;
    try {
      const j = await (await fetch(api() + '/orders/mine', { headers: H() })).json(); const el = document.getElementById('my-orders-l'); if (!el || !(j.orders || []).length) return;
      document.getElementById('my-orders').style.display = ''; el.innerHTML = j.orders.map(o => { const s = STAT[o.status] || [o.status, '']; return `<div class="trow" style="grid-template-columns:1fr auto auto"><span>#${o.id} · ${o.days} kun · ${sum(o.amount)}${o.reason ? `<br><small class="mute">${esc(o.reason)}</small>` : ''}</span><span class="chip ${s[1]}">${s[0]}</span>${o.status === 'new' ? `<button class="btn sm soft" data-act="pay-plan" data-m="${Math.round(o.days / 30)}">Davom etish</button>` : '<span></span>'}</div>`; }).join('');
    } catch (e) { }
  }
})();
