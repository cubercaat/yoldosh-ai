/* Referal daromad (HAQIQIY pul): do'stingiz tarif sotib olsa, summaning foizi sizga; kartaga yechish.
   Simulyatordagi o'yin so'midan (wallet.js) alohida. Profil sahifasida «Referal daromad» kartasi. */
(function () {
  'use strict';
  const { esc, toast, modal, closeModal, copy } = UI;
  const V = (window.V = window.V || {});
  const CFG = window.YOLDOSH || {};
  const api = () => (CFG.apiBase || '').replace(/\/$/, ''), tok = () => (window.Cloud && Cloud.live() && Cloud.token()) || '';
  const fmt = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const site = () => (CFG.siteUrl || location.origin + location.pathname).replace(/#.*$/, '');

  /* Bloger havolasi: chorrahaa.uz/?promo=KOD — kod ro'yxatdan o'tish formasiga o'zi yoziladi */
  try {
    const m = /[?&]promo=([A-Za-z0-9_-]{3,24})/.exec(location.search);
    if (m) localStorage.setItem('chq_promo_link', m[1].toUpperCase());
  } catch (e) { }

  async function call(path, body) {
    const r = await fetch(api() + path, { method: body ? 'POST' : 'GET', headers: Object.assign({ authorization: 'Bearer ' + tok() }, body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Xato'); return j;
  }

  let D = null;
  const KIND = { ref: "Do'stingiz sotib oldi", payout: 'Kartaga yechish', payout_back: 'Yechish qaytarildi' };
  const PST = { new: ['warn', 'Kutilmoqda (1–3 soat)'], paid: ['ok', "O'tkazildi"], rejected: ['bad', 'Rad etildi'] };
  const link = () => D && D.refcode ? `${site()}#/register/${D.refcode}` : '';

  function inner() {
    if (!D) return '<p class="mute">Yuklanmoqda…</p>';
    const pend = (D.payouts || []).find((y) => y.status === 'new');
    return `<p class="mute" style="font-size:14px">Do'stingiz havolangiz orqali ro'yxatdan o'tib Pro, Premium yoki Max sotib olsa — to'lagan summasining <b>${D.percent}%</b> hisobingizga tushadi. Kamida <b>${fmt(D.min)} so'm</b> bo'lsa kartangizga yechib olasiz.</p>
      <div class="grid g2 keep2" style="gap:10px;margin:12px 0"><div class="card" style="padding:12px"><small class="mute">Hisobingizda</small><div style="font-size:22px;font-weight:800">${fmt(D.balance)} so'm</div></div>
        <div class="card" style="padding:12px"><small class="mute">Jami ishlagan · taklif qilganlar</small><div style="font-size:22px;font-weight:800">${fmt(D.total)} · ${D.invited}</div></div></div>
      ${link() ? `<div class="field"><label>Taklif havolangiz</label><div style="display:flex;gap:8px"><input class="input" readonly value="${esc(link())}" onfocus="this.select()"><button class="btn soft" data-act="earn-copy">Nusxa</button></div></div>` : '<p class="mute" style="font-size:13px">Taklif havolangiz bir daqiqada tayyor bo\'ladi (sahifani yangilang).</p>'}
      <div class="ai-acts">${pend ? `<span class="chip warn">${fmt(pend.amount)} so'm yechish so'rovi ko'rib chiqilmoqda</span>` : `<button class="btn primary" data-act="earn-out" ${D.balance < D.min ? 'disabled' : ''}>💳 Kartaga yechish</button>`}${link() ? '<button class="btn soft" data-act="earn-share">Ulashish</button>' : ''}</div>
      ${D.balance < D.min && !pend ? `<small class="mute">Yechish uchun yana ${fmt(D.min - D.balance)} so'm kerak.</small>` : ''}
      ${(D.payouts || []).length ? `<div class="h-sec mt" style="font-size:14px">Yechishlar</div><div class="pf-list">${D.payouts.map((y) => `<div class="pf-row"><span>${fmt(y.amount)} so'm · ${esc(y.card)}</span><span class="chip ${PST[y.status][0]}">${PST[y.status][1]}</span></div>`).join('')}</div>` : ''}
      ${(D.log || []).filter((x) => x.kind === 'ref').length ? `<div class="h-sec mt" style="font-size:14px">Tushumlar</div><div class="pf-list">${D.log.filter((x) => x.kind === 'ref').slice(0, 10).map((x) => `<div class="pf-row"><span>${esc(x.note || KIND[x.kind])}</span><b style="color:var(--ok, #3a8a5e)">+${fmt(x.amount)}</b></div>`).join('')}</div>` : ''}`;
  }
  function paint() { const el = document.getElementById('earn-c'); if (el) el.innerHTML = inner(); }
  let synced = false;
  async function load() { try {
      D = await call('/earn/me');
      // taklif kodi serverga hali yozilmagan bo'lsa (yangi ro'yxatdan o'tgan) — ilovadagi kodni bir marta yuborib qayta o'qiymiz
      if (!D.refcode && !synced) { synced = true; let code = ''; try { code = ST.Store._pts().refCode || ''; } catch (e) { } if (code) { await call('/wallet/checkin', { refCode: code }).catch(() => { }); D = await call('/earn/me'); } }
    } catch (e) { D = null; const el = document.getElementById('earn-c'); if (el) el.innerHTML = '<p class="mute">Ma\'lumotni yuklab bo\'lmadi. Internetni tekshiring.</p>'; return; } paint(); }

  V.earnCard = () => {
    if (!tok() || !api()) return '';
    setTimeout(load, 0);
    return `<div class="pf-sec"><h3>💰 Referal daromad</h3><div id="earn-c">${inner()}</div></div>`;
  };

  V.acts = Object.assign(V.acts || {}, {
    'earn-copy'() { if (copy) copy(link()); else { try { navigator.clipboard.writeText(link()); } catch (e) { } } toast('Havola nusxalandi'); },
    'earn-share'() { const t = "Chorraha — prava imtihoniga tayyorlov. Shu havola orqali ro'yxatdan o'ting:"; if (navigator.share) navigator.share({ text: t, url: link() }).catch(() => { }); else { try { navigator.clipboard.writeText(t + ' ' + link()); } catch (e) { } toast('Havola nusxalandi'); } },
    'earn-out'() {
      if (!D) return;
      modal(`<h3>Kartaga yechish</h3><p class="mute" style="font-size:14px">Admin so'rovingizni <b>1 soatdan 3 soatgacha</b> ichida ko'rib chiqib, pulni kartangizga o'tkazadi. Telegramga xabar keladi.</p>
        <div class="field"><label for="eo-a">Summa (so'm)</label><input id="eo-a" class="input" type="number" inputmode="numeric" min="${D.min}" max="${D.balance}" value="${D.balance}"></div>
        <div class="field"><label for="eo-c">Karta raqami (Uzcard / Humo / Visa)</label><input id="eo-c" class="input" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="8600 0000 0000 0000"></div>
        <div class="field"><label for="eo-h">Karta egasi (ism familiya)</label><input id="eo-h" class="input" maxlength="60" autocomplete="cc-name" placeholder="ALI VALIYEV"></div>
        <div class="ai-acts"><button class="btn primary" data-act="earn-send">So'rov yuborish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      const c = document.getElementById('eo-c'); if (c) c.addEventListener('input', () => { const d = c.value.replace(/\D/g, '').slice(0, 16); c.value = d.replace(/(\d{4})(?=\d)/g, '$1 '); });
    },
    async 'earn-send'(el) {
      const amount = +document.getElementById('eo-a').value, card = document.getElementById('eo-c').value.replace(/\D/g, ''), holder = document.getElementById('eo-h').value.trim();
      if (card.length !== 16) { toast("Karta raqami 16 ta raqam bo'lishi kerak"); return; }
      if (amount < D.min) { toast(`Eng kam summa ${fmt(D.min)} so'm`); return; }
      if (amount > D.balance) { toast("Hisobingizda yetarli mablag' yo'q"); return; }
      el.disabled = true;
      try { await call('/earn/payout', { amount, card, holder }); closeModal(); toast("So'rov yuborildi. 1–3 soat ichida o'tkaziladi."); await load(); }
      catch (e) { el.disabled = false; toast(e.message); }
    },
  });
})();
