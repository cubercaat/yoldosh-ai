/* Profil: Telegram rasmi, tarif belgisi va imkoniyatlari, hisob sozlamalari */
(function () {
  const { ico, esc, toast } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const shell = (a, h) => V.shellStudent(a, h);
  const KEY = 'chq_ava_v1';
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const live = () => !!(window.Cloud && Cloud.live() && Cloud.token());
  const NAME = { pro: 'Pro', premium: 'Premium', max: 'Max' };
  const PERKS = {
    '': ['Kuniga ' + (CFG.freeRunsPerDay || 3) + ' ta ' + (CFG.freeTestSize || 20) + ' talik test', 'Darslik va belgilar', 'Simulyator (cheksiz, bepul)'],
    pro: ['Yozma AI yordamchi + kamera', 'Pro va viloyat reytingi', 'Cobalt · Nexia · Gentra · Malibu · Isuzu', 'Batl: kuniga 10 ta'],
    premium: ['Pro imkoniyatlari + ovozli sharhlar', "Ustozdan so'rash", 'Premium reyting va chat', 'Brabus G · Porsche · Batl 30 ta'],
    max: ['Premium + haftada 1 soat online dars', 'Max chat (ovozli xabar)', 'Avtodrom 3D: hamma mashina', 'Batl cheksiz · Max logotipi'],
  };
  const tier = () => (V.T && V.T.cur && V.T.cur()) || '';
  const get = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* xotira yo'q */ } };

  /* Telegram rasmi: server /avatar dan olinadi, kichraytirilib qurilmada saqlanadi */
  let loading = false;
  function paintAll() { const src = get(); document.querySelectorAll('.js-ava').forEach((el) => { if (src) el.innerHTML = `<img src="${src}" alt="" decoding="async">`; }); }
  async function ensure() {
    if (get() || loading || !live() || !api()) { paintAll(); return; }
    loading = true;
    try {
      const r = await fetch(api() + '/avatar', { headers: { authorization: 'Bearer ' + Cloud.token() } });
      if (!r.ok) return;
      const blob = await r.blob(), url = URL.createObjectURL(blob);
      const img = new Image(); img.src = url; await img.decode();
      const c = document.createElement('canvas'), n = 128; c.width = c.height = n;
      const m = Math.min(img.width, img.height), cx = c.getContext('2d');
      cx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, n, n);
      set(c.toDataURL('image/jpeg', 0.82)); URL.revokeObjectURL(url); paintAll();
    } catch (e) { /* rasm bo'lmasa bosh harf ko'rinadi */ } finally { loading = false; }
  }
  V.avaHtml = (cls) => {
    const src = get(), init = esc((Store.s.name || 'T')[0].toUpperCase());
    setTimeout(ensure, 50);
    return `<span class="${cls} js-ava">${src ? `<img src="${src}" alt="" decoding="async">` : init}</span>`;
  };
  V.tierBadge = (px) => { const t = tier(); return t && V.T ? V.T.chip(t, px || 15) : `<span class="tchip tchip-free"><b>Bepul</b></span>`; };

  V.profile = () => {
    const t = tier(), nm = Store.s.name || 'Talaba', sub = Store.s.sub && Store.s.sub.until > Date.now() ? Store.s.sub.until : 0;
    const left = sub ? Math.max(0, Math.ceil((sub - Date.now()) / 864e5)) : 0;
    const order = ['', 'pro', 'premium', 'max'], next = order[order.indexOf(t) + 1];
    const body = `<div class="pf">
      <div class="pf-top"><a class="pf-back" href="#/app" aria-label="Orqaga">${ico('arrow')}</a><h1>Profil</h1></div>
      <div class="pf-card pf-${t || 'free'}">
        ${V.avaHtml('pf-av')}
        <div class="pf-id"><b>${esc(nm)}</b><small>ID: <span class="mono">${esc(Store.myUid ? Store.myUid() : '')}</span></small>${V.tierBadge(17)}</div>
      </div>
      <div class="pf-sec"><h3>Sizning tarifingiz${t ? ' — ' + NAME[t] : ' — Bepul'}</h3>
        ${left ? `<p class="mute">Amal qiladi: yana <b>${left}</b> kun</p>` : ''}
        <ul class="pf-perks">${PERKS[t].map((p) => `<li>${ico('check')}<span>${esc(p)}</span></li>`).join('')}</ul>
        ${next ? `<a class="btn primary pf-up" href="#/app/premium">${ico('crown')} ${NAME[next]} tarifiga o'tish</a>` : `<p class="mute">Siz eng yuqori tarifdasiz. Rahmat!</p>`}
      </div>
      <div class="pf-sec"><h3>Hisob</h3><div class="pf-list">
        <a href="#/app/id">${ico('star')}<span>Mening ID va sertifikat</span>${ico('arrow')}</a>
        <a href="#/app/premium">${ico('crown')}<span>Tariflar va to'lov</span>${ico('arrow')}</a>
        <a href="#/app/bot">${ico('send')}<span>Telegram bot</span>${ico('arrow')}</a>
        <a href="#/app/mistakes">${ico('redo')}<span>Xato daftari</span>${ico('arrow')}</a>
        <a href="#/app/teacher">${ico('users')}<span>Ustoz bilan aloqa</span>${ico('arrow')}</a>
      </div></div>
      <div class="pf-sec"><h3>Til / Язык</h3><div class="pf-lang notranslate"><button data-act="pf-lang" data-l="uz" class="${(document.documentElement.lang || 'uz').startsWith('ru') ? '' : 'on'}">O'zbekcha</button><button data-act="pf-lang" data-l="ru" class="${(document.documentElement.lang || 'uz').startsWith('ru') ? 'on' : ''}">Русский</button></div></div>
      <button class="btn soft pf-out" data-act="logout">${ico('logout')} Hisobdan chiqish</button>
    </div>`;
    return { html: shell('home', body) };
  };
  V.acts = Object.assign(V.acts || {}, { 'pf-lang'(el) { const b = document.querySelector('#i18n-sw [data-l="' + el.dataset.l + '"]'); if (b) b.click(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ensure(); });
})();
