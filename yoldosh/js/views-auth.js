/* Kirish va ro'yxatdan o'tish: ism-familya + Telegram + ustoz guruhi havolasi.
   Demo rejim (config.js da telegramBot/apiBase yo'q): Telegram username qo'lda kiritiladi (tasdiqlanmaydi).
   Haqiqiy rejim: Telegram Login Widget -> backend POST /auth/telegram (HMAC bilan tekshiriladi). */
(function () {
  const { ico, esc, brand, toast, modal, closeModal } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const live = () => !!(CFG.telegramBot && CFG.apiBase);
  const $ = (id) => document.getElementById(id);

  function regView(code, groupName, ref) {
    const g = code ? (Store.groupByCode(code) || (groupName ? { name: groupName } : null)) : null, cur = Store.s.role === 'student' && Store.s.name;
    return `<div class="login"><div class="card login-card">
      ${brand()}
      ${g ? `<div class="grp-banner">${ico('users')}<div><small>Ustoz sizni guruhga taklif qildi</small><b>${esc(g.name)}</b></div></div>` : ''}
      <h2>Ro'yxatdan o'tish</h2><p class="mute">Ism-familyangizni yozing va Telegram orqali tasdiqlang. Ustoz sizni guruhida ko'radi.</p>
      <div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="rf">Ism</label><input id="rf" class="input" maxlength="30" autocomplete="given-name" placeholder="Aziz"></div><div class="field"><label for="rl">Familya</label><input id="rl" class="input" maxlength="30" autocomplete="family-name" placeholder="Karimov"></div></div>
      <div class="field"><label for="rg">Viloyat <span class="mute" style="font-weight:500">(reyting uchun)</span></label><select id="rg" class="select"><option value="">Tanlang…</option>${(CFG.regions || []).map(r => `<option>${esc(r)}</option>`).join('')}</select></div>
      ${g ? `<input id="rc" type="hidden" value="${esc(code || '')}">` : `<div class="field"><label for="rc">Ustozingiz yuborgan guruh havolasi <span class="mute" style="font-weight:500">(bo'lsa)</span></label><input id="rc" class="input" maxlength="300" placeholder="Havolani shu yerga qo'ying" autocomplete="off"></div>`}
      <div class="field"><label for="rr">Taklif kodi <span class="mute" style="font-weight:500">(bo'lsa, ikkalangizga +50 ball)</span></label><input id="rr" class="input" maxlength="12" placeholder="R-XXXXXX" value="${esc(ref || '')}" autocomplete="off"></div>
      <button class="tg-btn" data-act="reg-tg">${ico('send')} Telegram orqali davom etish</button>
      ${live() ? '' : `<p class="mute" style="font-size:13px;margin-top:12px">Demo rejim: Telegram haqiqiy tekshiruvi bot ulangach ishlaydi, hozircha username kiritiladi.</p>`}
      ${cur ? `<div class="banner" style="margin-top:16px">${ico('alert')}<span>Siz hozir <b>${esc(Store.s.name)}</b> sifatida kirgansiz. Yangi talaba sifatida o'tsangiz, bu qurilmadagi natijalar arxivlanadi.</span></div>` : ''}
      <p style="margin-top:20px;text-align:center"><a class="mute" href="#/login">← Orqaga</a></p>
    </div></div>`;
  }
  V.register = (ref) => regView(null, null, ref);
  V.join = (code, name, ref) => regView(code, name, ref);

  V.login = () => {
    const me = Store.s.meId && Store.s.name;
    return `<div class="login"><div class="card login-card">${brand()}
      <h2>Xush kelibsiz</h2><p class="mute">Rolingizni tanlang.</p>
      ${me ? `<button class="role" data-act="continue-student"><span class="ic">${ico('check')}</span><span><b>Davom etish</b><span>${esc(Store.s.name)} · ${esc(ST.groupName(Store.s.groupId))}</span></span></button>` : ''}
      <button class="role" data-go="#/register"><span class="ic">${ico('book')}</span><span><b>Talaba — ro'yxatdan o'tish</b><span>Ism-familya va Telegram orqali</span></span></button>
      <button class="role" data-act="login-teacher"><span class="ic">${ico('chart')}</span><span><b>Ustoz / Rahbar</b><span>Guruhlar va talabalar natijasi (demo)</span></span></button>
      <button class="role" data-act="login-admin"><span class="ic">${ico('crown')}</span><span><b>Bosh admin</b><span>Narxlar va avtomaktablar (faqat egasi)</span></span></button>
      <p style="margin-top:22px;text-align:center"><a class="mute" href="#/">← Bosh sahifa</a></p>
    </div></div>`;
  };

  /* havola yoki kod ichidan guruh kodini va nomini ajratib olish */
  function parseInvite(text) {
    const t = String(text || '').trim(); if (!t) return { code: null, name: null };
    const m = /\/join\/([A-Za-z0-9-]{4,12})(?:\/([^?#\s]+))?/.exec(t);
    if (m) { let n = null; try { n = m[2] ? decodeURIComponent(m[2]) : null; } catch (e) { } return { code: m[1].toUpperCase(), name: n }; }
    return /^[A-Za-z0-9-]{4,12}$/.test(t) ? { code: t.toUpperCase(), name: null } : { code: null, name: null, bad: true };
  }

  function finish(tg) {
    const first = $('rf').value.trim(), last = $('rl').value.trim(), pasted = parseInvite($('rc').value);
    const code = pasted.code, gname = (window.__inviteName) || null;
    Store.registerStudent({ first, last, tg, code: code || null, groupName: gname, region: $('rg').value, ref: ($('rr').value || '').trim().toUpperCase() });
    closeModal(); toast(`Xush kelibsiz, ${first}!`); location.hash = '#/app';
  }

  V.acts = Object.assign(V.acts || {}, {
    'continue-student'() { Store.login('student'); location.hash = '#/app'; },
    'reg-tg'() {
      const first = $('rf').value.trim(), last = $('rl').value.trim(), inv = parseInvite($('rc').value), code = inv.code;
      if (first.length < 2 || last.length < 2) { toast(`Ism va familyangizni to'liq yozing`); return; }
      if (!$('rg').value) { toast(`Viloyatingizni tanlang`); return; }
      if (inv.bad) { toast(`Guruh havolasi noto'g'ri. Ustoz yuborgan havolani to'liq nusxalab qo'ying`); return; }
      if (live()) {
        modal(`<h3>Telegram orqali tasdiqlang</h3><p class="mute">Quyidagi tugma Telegram oynasini ochadi.</p><div id="twrap" style="min-height:60px;display:grid;place-items:center;margin-top:14px"></div>`);
        window.onTelegramAuth = async (u) => {
          try {
            const r = await fetch(CFG.apiBase.replace(/\/$/, '') + '/auth/telegram', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...u, firstNameInput: first, lastNameInput: last, inviteCode: code || undefined }) });
            if (!r.ok) throw new Error('rad etildi'); const j = await r.json();
            try { localStorage.setItem('yoldosh_tokens', JSON.stringify({ a: j.accessToken, r: j.refreshToken })); } catch (e) { }
            finish(u.username || String(u.id));
          } catch (e) { toast(`Telegram tasdiqlanmadi. Qayta urinib ko'ring`); }
        };
        const s = document.createElement('script'); s.async = true; s.src = 'https://telegram.org/js/telegram-widget.js?22';
        s.setAttribute('data-telegram-login', CFG.telegramBot); s.setAttribute('data-size', 'large'); s.setAttribute('data-onauth', 'onTelegramAuth(user)'); s.setAttribute('data-request-access', 'write');
        $('twrap').appendChild(s); return;
      }
      modal(`<h3>Telegram username</h3><p class="mute">Demo rejim: haqiqiy tasdiqlash uchun Telegram bot ulanishi kerak. Hozircha username yozing.</p>
        <div class="field"><label for="tgu">Telegram username</label><input id="tgu" class="input" maxlength="33" placeholder="@aziz_karimov"></div>
        <div class="ai-acts"><button class="btn primary" id="tgok">${ico('send')} Davom etish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      $('tgok').addEventListener('click', () => { const u = $('tgu').value.trim().replace(/^@/, ''); if (!/^[A-Za-z0-9_]{5,32}$/.test(u)) { toast(`Username 5–32 belgi: harf, raqam, _`); return; } finish(u); });
    },
  });

  /* havola orqali kelganda guruh nomini eslab qolamiz (boshqa qurilmada ustoz guruhi bazasi yo'q) */
  const _join = V.join; V.join = (code, name) => { window.__inviteName = name || null; return _join(code, name); };
})();


