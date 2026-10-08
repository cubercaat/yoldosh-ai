/* Kirish sahifasi (bosh sahifa — views-landing.js da) */
(function () {
  const { ico, brand } = UI;
  const V = (window.V = window.V || {});

  V.login = () => `
    <div class="login"><div class="card login-card">
      ${brand()}
      <h2>Xush kelibsiz</h2><p class="mute">Rolingizni tanlang. Bu demo versiya: parol shart emas.</p>
      <div class="field"><label for="nm">Ismingiz (talaba uchun)</label><input id="nm" class="input" placeholder="Masalan: Aziz Karimov" value="${UI.esc(ST.Store.s.name)}" maxlength="40" autocomplete="name"></div>
      <button class="role" data-act="login-student"><span class="ic">${ico('book')}</span><span><b>Talaba</b><span>Test yechish, AI yordamchi, kamera</span></span></button>
      <button class="role" data-act="login-teacher"><span class="ic">${ico('chart')}</span><span><b>Ustoz / Rahbar</b><span>Talabalar natijasi va tahlil paneli</span></span></button>
      <p style="margin-top:22px;text-align:center"><a class="mute" href="#/">← Bosh sahifa</a></p>
    </div></div>`;
})();
