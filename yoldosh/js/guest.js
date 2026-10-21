/* Mehmon rejimi: ro'yxatdan o'tmasdan 20 ta rasmiy savol. Keyin ro'yxatdan o'tish taklif qilinadi.
   Holat faqat qurilmada (localStorage: chorraha_guest). Marshrut: #/guest */
(function () {
  const V = (window.V = window.V || {}), { esc } = UI, LIM = 20, KEY = 'chorraha_guest', L = ['A', 'B', 'C', 'D', 'E'];
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const save = (g) => { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (e) { } };
  const track = (n) => { try { if (V.track) V.track(n); } catch (e) { } };
  let g = null, shown = false;

  function build() {
    const pool = BANK.Q.filter(q => q.official && q.options.length >= 2), by = {};
    BANK.shuffle(pool.slice()).forEach(q => (by[q.topic] = by[q.topic] || []).push(q));
    const ids = [], keys = Object.keys(by);
    for (let i = 0; ids.length < LIM && keys.length; i++) { const q = by[keys[i % keys.length]].pop(); if (q) ids.push(q.id); if (i > 4000) break; }
    return { ids: BANK.shuffle(ids), picks: {}, t0: Date.now() };
  }
  const cur = () => { const n = Object.keys(g.picks).length; return n >= LIM ? LIM : n; };
  const answered = () => Object.keys(g.picks).length;

  function topbar() {
    const n = answered();
    return `<header class="gst-top"><a class="gst-logo" href="#/">Chorraha</a><div class="gst-prog"><i style="width:${Math.round(n / LIM * 100)}%"></i></div><b class="gst-n">${Math.min(n + (n < LIM ? 1 : 0), LIM)}/${LIM}</b><a class="lb gls sm" href="#/login">Kirish</a></header>`;
  }
  function qView() {
    const n = answered();
    const idx = g.revealed ? n - 1 : n, qq = BANK.byId[g.ids[idx]], p = g.picks[idx], rev = !!g.revealed;
    const opts = qq.options.map((o, k) => {
      let c = 'opt'; if (rev) c += k === qq.answer ? ' good' : k === p ? ' bad' : '';
      return `<button class="${c}" data-act="g-pick" data-i="${k}" ${rev ? 'disabled' : ''}><span class="k">${L[k]}</span><span>${esc(o.label)}</span></button>`;
    }).join('');
    let ex = '';
    if (rev) {
      const ok = p === qq.answer, txt = (window.EXPL && window.EXPL[qq.n]) || '';
      ex = `<div class="gst-ex ${ok ? 'ok' : 'bad'}"><b>${ok ? "To'g'ri!" : "Noto'g'ri. To'g'ri javob: " + L[qq.answer]}</b>${txt ? `<p>${esc(txt)}</p>` : ''}</div>`;
    }
    const left = LIM - answered(), last = answered() >= LIM;
    const nudge = rev && !last && left <= 5 ? `<div class="gst-nudge">Yana ${left} ta savol qoldi. Davom etish va natijani saqlash uchun keyin ro'yxatdan o'tasiz.</div>` : '';
    return `<div class="q-card ${qq.img ? 'has-media' : ''}"><div style="margin-bottom:14px"><span class="chip">${esc(qq.topicName)}</span></div>
      <h2 class="gst-q">${esc(qq.text)}</h2><div class="q-media">${BANK.media(qq)}</div><div class="opts">${opts}</div>${ex}${nudge}
      ${rev ? `<div class="q-foot"><span></span><button class="btn primary" data-act="g-next">${last ? "Natijani ko'rish" : 'Keyingi savol'} →</button></div>` : ''}</div>`;
  }
  function resView() {
    const total = LIM; let ok = 0; g.ids.forEach((id, i) => { if (g.picks[i] === BANK.byId[id].answer) ok++; });
    const pct = Math.round(ok / total * 100), pass = pct >= 90 ? "Ajoyib natija!" : pct >= 70 ? "Yomon emas, lekin yaxshilash mumkin." : "Hali tayyorlanish kerak, lekin bu normal — boshlash oson.";
    return `<div class="card gst-res"><span class="chip ${pct >= 70 ? 'ok' : 'bad'}">Mehmon sinovi tugadi</span><div class="big">${ok}/${total}</div><h2>${pass}</h2>
      <p class="mute">Qolgan 1250+ savol, ovozli tushuntirish, xatolar ustida ishlash, AI yordamchi va 3D simulyator ro'yxatdan o'tgach ochiladi. Bu bepul va 1 daqiqa vaqt oladi.</p>
      <div class="gst-cta"><a class="btn primary lg" href="#/register" data-g="reg">Ro'yxatdan o'tish — bepul</a><a class="btn soft lg" href="#/login">Hisobim bor</a></div>
      <button class="btn ghost sm" data-act="g-again">Yangi 20 ta savol bilan qayta sinash</button></div>`;
  }
  const draw = () => { const r = document.getElementById('gst'); if (!r) return; r.innerHTML = topbar() + `<main class="gst-main">${answered() >= LIM && !g.revealed ? resView() : qView()}</main>`; window.scrollTo(0, 0); };

  V.guest = () => {
    if (ST.Store.s.role === 'student') return { redirect: '#/app' };
    g = load(); if (!g || !g.ids || g.ids.length < LIM || g.ids.some(id => !BANK.byId[id])) { g = build(); save(g); }
    if (!shown) { shown = true; track('guest_open'); }
    return { html: `<div class="gst" id="gst"></div>`, mount() { draw(); } };
  };
  V.acts = Object.assign(V.acts || {}, {
    'g-pick'(el) {
      if (g.revealed) return; const n = answered(), k = +el.dataset.i; g.picks[n] = k; g.revealed = true; save(g);
      if (n === 0) track('guest_start');
      if (window.Voice && Voice.stop) Voice.stop();
      draw();
    },
    'g-next'() { g.revealed = false; save(g); if (answered() >= LIM) track('guest_done'); draw(); },
    'g-again'() { g = build(); save(g); draw(); },
  });
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-g="reg"]'); if (a) track('guest_register_click'); });
})();
