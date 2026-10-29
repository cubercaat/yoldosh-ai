/* Hamyon (o'yin ichidagi so'm, real pul emas): to'g'ri javob mukofoti, Test Pro vaucheri, kunlik kirish, shahar simulyatori vaqti.
   Hisob-kitob serverda (server/wallet.js). Bu fayl faqat so'rov yuboradi va ko'rsatadi. */
(function () {
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, { toast, modal, esc } = UI, KS = 'chorraha_wallet';
  const api = () => (CFG.apiBase || '').replace(/\/$/, ''), tok = () => (window.Cloud && Cloud.live() && Cloud.token()) || '';
  const fmt = (n) => String(Math.max(0, Math.round(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let W = null; try { W = JSON.parse(localStorage.getItem(KS)); } catch (e) { }
  try { if (api()) localStorage.setItem('chorraha_api', api()); } catch (e) { }
  const paint = () => {
    try { localStorage.setItem(KS, JSON.stringify(W)); } catch (e) { }
    const c = document.getElementById('wal-card'); if (c && W) c.outerHTML = card();
  };
  async function call(path, body) {
    const t = tok(); if (!t) return null;
    try {
      const r = await fetch(api() + path, { method: body ? 'POST' : 'GET', headers: Object.assign({ authorization: 'Bearer ' + t }, body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
      if (!r.ok) return null; const j = await r.json(); if (j && j.balance !== undefined) { W = j; paint(); } return j;
    } catch (e) { return null; }
  }
  const rate = { '': 30000, pro: 80000, premium: 120000, max: 200000 };
  function card() {
    if (!tok() || !W) return '<span id="wal-card"></span>';
    const time = W.unlimited_time ? '∞' : mmss(W.play_sec || 0);
    return `<button class="card mt wal-card" id="wal-card" data-act="wal-open"><span class="ad-ic">💰</span><span class="ad-t"><b><span class="notranslate">${fmt(W.balance)}</span> so'm</b><small>Shahar simulyatori: <span class="notranslate">${time}</span> · har to'g'ri javob +<span class="notranslate">${fmt(W.reward || rate[W.tier || ''])}</span> so'm</small></span><span class="chip ${W.can_drive ? 'ok' : 'bad'}">${W.can_drive ? 'Haydash mumkin' : 'Balans yoki vaqt tugadi'}</span></button>`;
  }
  V.walletCard = () => card();
  const hr = V.homeRank; V.homeRank = () => card() + (hr ? hr() : '');

  async function answer(n, k) {
    const j = await call('/wallet/answer', { n, pick: k });
    if (j && j.paid) toast(`+${fmt(j.reward)} so'm${j.sec ? ` · +${j.sec} soniya haydash` : ''}`);
  }
  const rec = ST.Store.record;
  ST.Store.record = function (q, chosen, mode) {
    const ok = rec.apply(this, arguments);
    try { if (ok && tok() && q && q.n && chosen >= 0) answer(q.n, chosen); } catch (e) { }
    return ok;
  };
  const pf = V.onFinish;
  V.onFinish = function (z, R) {
    if (pf) pf.apply(this, arguments);
    try {
      if (z && z.mode === 'pro' && tok() && Array.isArray(z.list)) {
        const answers = z.list.map((q, i) => ({ n: q.n, pick: z.picks[i] == null ? -1 : z.picks[i] })), sec = Math.round((Date.now() - (z.start || Date.now()) - (z.hid || 0)) / 1000);
        call('/wallet/pro', { answers, sec }).then((j) => { if (j && j.voucher) { toast(`🎁 Vaucher: +${fmt(j.voucher)} so'm`); ST.Store.notify(`Test Pro vaucheri: +${fmt(j.voucher)} so'm hamyoningizga tushdi.`, 'bonus'); } });
      }
    } catch (e) { }
  };
  const KIND = { start: "Boshlang'ich balans", answer: "To'g'ri javob", ref: "Do'st taklifi", ref_day: "Do'st har kun kirdi", voucher: 'Vaucher', fine: 'Radar jarimasi' };
  V.acts = Object.assign(V.acts || {}, {
    async 'wal-open'() {
      const j = await call('/wallet/log'), rows = (j && j.log) || [];
      modal(`<h3>💰 Hamyon</h3><p class="mute" style="font-size:13.5px">Bu o'yin ichidagi so'm: shahar simulyatorida jarima to'lash uchun. Haqiqiy pulga almashtirib bo'lmaydi.</p>
        <div class="card" style="padding:12px"><b style="font-size:22px"><span class="notranslate">${fmt(W && W.balance)}</span> so'm</b><div class="mute" style="font-size:13px">Shahar vaqti: <span class="notranslate">${W && W.unlimited_time ? '∞' : mmss((W && W.play_sec) || 0)}</span></div></div>
        <div style="max-height:40vh;overflow:auto;margin-top:10px">${rows.length ? rows.map((r) => `<div class="wal-r"><span>${esc(KIND[r.kind] || r.kind)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span><b class="notranslate ${r.amount < 0 ? 'neg' : 'pos'}">${r.amount ? (r.amount > 0 ? '+' : '−') + fmt(Math.abs(r.amount)) : ''}${r.sec ? ` +${r.sec} s` : ''}</b></div>`).join('') : '<p class="mute">Hozircha yozuv yo\'q. Test yeching — har to\'g\'ri javobga so\'m tushadi.</p>'}</div>
        <a class="btn primary lg" style="width:100%;margin-top:12px" href="sim/index.html">🏙 Shaharda haydash</a>`);
    },
  });
  if (tok()) {
    let code = ''; try { code = ST.Store._pts().refCode || ''; } catch (e) { }
    call('/wallet/checkin', { refCode: code }).then((j) => { if (j && j.streak > 1) { try { ST.Store.notify(`Ketma-ket ${j.streak}-kun kirdingiz!`, 'bonus'); } catch (e) { } } });
  }
})();
