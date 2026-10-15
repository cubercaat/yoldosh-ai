/* Haqiqiy to'lov oqimi (jonli rejim): tarif tanlash → kartaga o'tkazma → "To'ladim" → admin tasdiqlaydi → Premium ochiladi.
   Demo "to'lash" tugmasi (pulsiz Premium berardi) jonli rejimda o'chiriladi. */
(function () {
  const { esc, toast, modal, closeModal, copy } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const live = () => !!(window.Cloud && Cloud.live());
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const H = () => ({ 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() });
  const sum = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
  const post = async (p, b) => { const r = await fetch(api() + p, { method: 'POST', headers: H(), body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'xato'); return j; };
  const plans = () => { const one = CFG.premiumPrice || 99000; return [[1, one, ''], [3, CFG.price3 || one * 3, 'mashhur'], [12, CFG.price12 || one * 12, 'eng foydali']].map(([m, p, tag]) => ({ m, p, tag, save: Math.max(0, one * m - p) })); };
  const STAT = { new: ["To'lov kutilmoqda", 'warn'], paid: ['Tekshirilmoqda', 'warn'], approved: ['Tasdiqlandi', 'ok'], rejected: ['Rad etildi', 'bad'] };

  function planModal() {
    modal(`<h3>Premium tarifini tanlang</h3><p class="mute">To'lov kartaga o'tkazma orqali. Tasdiqlangach Premium avtomatik ochiladi.</p>
      <div class="stack s12" style="margin:14px 0">${plans().map(x => `<button class="plan-opt" data-act="pay-plan" data-m="${x.m}"><span><b>${x.m === 12 ? '1 yil' : x.m + ' oy'}</b>${x.tag ? ` <em class="chip acc">${x.tag}</em>` : ''}<small>${x.save ? 'Tejaysiz: ' + sum(x.save) : 'Oylik to\'lov'}</small></span><strong>${sum(x.p)}</strong></button>`).join('')}</div>
      <div class="ai-acts"><button class="btn soft" data-act="close">Keyinroq</button></div>`);
  }
  function payModal(o, months) {
    const card = (CFG.payCard || '').trim(), name = (CFG.payName || '').trim(), contact = (CFG.supportTelegram || CFG.teacherTelegram || '').replace(/^@/, '');
    modal(`<h3>To'lov · ${months === 12 ? '1 yil' : months + ' oy'}</h3>
      <div class="co-sum"><span>Summa</span><b>${sum(o.amount)}</b></div>
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
      closeModal(); planModal();
    },
    'pay-do'(el) { if (!live() && prevDo) prevDo(el); },
    async 'pay-plan'(el) {
      const months = +el.dataset.m;
      try { const o = await post('/order/create', { months }); closeModal(); payModal(o, months); } catch (e) { toast('Xato: ' + e.message); }
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
