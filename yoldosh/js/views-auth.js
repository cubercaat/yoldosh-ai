/* Kirish va ro'yxatdan o'tish: ism-familya + Telegram + ustoz guruhi havolasi.
   Demo rejim (config.js da telegramBot/apiBase yo'q): Telegram username qo'lda kiritiladi (tasdiqlanmaydi).
   Haqiqiy rejim: Telegram Login Widget -> backend POST /auth/telegram (HMAC bilan tekshiriladi). */
(function () {
  const { ico, esc, brand, toast, modal, closeModal } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const live = () => !!(CFG.telegramBot && CFG.apiBase);
  const $ = (id) => document.getElementById(id);

  const API = () => CFG.apiBase.replace(/\/$/, '');
  const ctxKey = 'chorraha_reg_ctx';
  const saveCtx = (o) => { try { sessionStorage.setItem(ctxKey, JSON.stringify(o)); } catch (e) { } };
  const loadCtx = () => { try { return JSON.parse(sessionStorage.getItem(ctxKey)) || {}; } catch (e) { return {}; } };
  let pollT = null;

  /* Telegram orqali: 1) saytda tugma 2) botda Start 3) saytga qaytish 4) ism-familya 5) boshlash */
  function stepOne(code, groupName, ref) {
    const g = code ? (Store.groupByCode(code) || (groupName ? { name: groupName } : null)) : null;
    saveCtx({ code: code || null, groupName: groupName || null, ref: ref || '' });
    return `<div class="login"><div class="card login-card">${brand()}
      ${g ? `<div class="grp-banner">${ico('users')}<div><small>Ustoz sizni guruhga taklif qildi</small><b>${esc(g.name)}</b></div></div>` : ''}
      <h2>Ro'yxatdan o'tish</h2>
      <ol class="tg-steps"><li>Pastdagi tugmani bosing — Telegram ochiladi</li><li>Botimizda <b>Start</b> tugmasini bosing</li><li>Saytga qaytib, ism-familyangizni yozing</li></ol>
      <label class="consent"><input type="checkbox" id="cns"> <span>Men <a href="#/terms" target="_blank">foydalanish shartlari</a> va <a href="#/privacy" target="_blank">maxfiylik siyosati</a> bilan tanishdim va roziman.</span></label>
      <button class="tg-btn" data-act="reg-tg">${ico('send')} Telegram orqali davom etish</button>
      <p style="margin-top:20px;text-align:center"><a class="mute" href="#/login">← Orqaga</a></p>
    </div></div>`;
  }

  /* botdan qaytganda: tasdiqlashni tekshirib, ism-familya shaklini ko'rsatamiz */
  V.tgReturn = (token) => ({
    html: `<div class="login"><div class="card login-card">${brand()}<h2>Tekshirilmoqda…</h2><p class="mute" id="tgmsg">Telegram tasdiqlashi tekshirilmoqda.</p></div></div>`,
    async mount() {
      const box = document.querySelector('.login-card');
      try {
        /* Telegram tasdiqlashi serverga bir necha soniya (ba'zan ~1 daqiqagacha) kech yetib borishi mumkin (Cloudflare KV kechikishi).
           Shuning uchun birinchi "yo'q" javobda to'xtamaymiz: ~80 soniya davomida har 2 soniyada qayta tekshiramiz. */
        const msg = document.getElementById('tgmsg'), t0 = Date.now(); let j = null;
        for (let n = 0; ; n++) {
          try {
            const r = await fetch(API() + '/auth/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
            j = await r.json(); if (j && j.ok) break;
          } catch (e) { j = null; }
          if (Date.now() - t0 > 80000 || !document.body.contains(box)) throw new Error('yoq');
          if (msg && n === 2) msg.textContent = "Telegramda Start tugmasini bosganingizga ishonch hosil qiling. Tasdiqlash kutilmoqda…";
          await new Promise(res => setTimeout(res, 2000));
          if (location.hash !== '#/tg/' + token) return;        // foydalanuvchi boshqa sahifaga o'tib ketdi
        }
        const c = loadCtx(), tg = j.tg, g = c.code ? (Store.groupByCode(c.code) || (c.groupName ? { name: c.groupName } : null)) : null;
        window.__inviteName = c.groupName || null;
        box.innerHTML = `${brand()}${g ? `<div class="grp-banner">${ico('users')}<div><small>Ustoz sizni guruhga taklif qildi</small><b>${esc(g.name)}</b></div></div>` : ''}
          <div class="tg-ok">${ico('check')} Telegram tasdiqlandi${tg.username ? ` · @${esc(tg.username)}` : ''}</div>
          <h2>Ism-familyangiz</h2>
          <div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="rf">Ism</label><input id="rf" class="input" maxlength="30" autocomplete="given-name" value="${esc(tg.first || '')}"></div><div class="field"><label for="rl">Familya</label><input id="rl" class="input" maxlength="30" autocomplete="family-name" value="${esc(tg.last || '')}"></div></div>
          <div class="field"><label for="rg">Viloyat <span class="mute" style="font-weight:500">(reyting uchun)</span></label><select id="rg" class="select"><option value="">Tanlang…</option>${(CFG.regions || []).map(x => `<option>${esc(x)}</option>`).join('')}</select></div>
          ${g ? `<input id="rc" type="hidden" value="${esc(c.code || '')}">` : `<div class="field"><label for="rc">Ustozingiz yuborgan guruh havolasi <span class="mute" style="font-weight:500">(bo'lsa)</span></label><input id="rc" class="input" placeholder="Havolani shu yerga qo'ying"></div>`}
          <div class="field"><label for="rr">Taklif kodi <span class="mute" style="font-weight:500">(bo'lsa)</span></label><input id="rr" class="input" maxlength="12" placeholder="R-XXXXXX" value="${esc(c.ref || '')}" autocomplete="off"></div>
          <button class="tg-btn" data-act="tg-finish" data-token="${esc(token)}" data-tg="${esc(tg.username || String(tg.id))}">${ico('check')} Boshlash</button>`;
      } catch (e) {
        box.innerHTML = `${brand()}<h2>Tasdiqlanmadi</h2><p class="mute">Telegramda <b>Start</b> bosilmagan yoki havola eskirgan (15 daqiqa). Start bosgan bo'lsangiz, pastdagi tugma bilan yana tekshiring.</p><button class="tg-btn" data-act="tg-retry">Qayta tekshirish</button><p style="margin-top:14px;text-align:center"><a class="mute" href="#/register">Qaytadan boshlash</a></p>`;
      }
    },
  });

  function regView(code, groupName, ref) {
    if (live()) return stepOne(code, groupName, ref);
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
      ${(window.Cloud && Cloud.live()) ? '' : `      <button class="role" data-act="login-teacher"><span class="ic">${ico('chart')}</span><span><b>Ustoz / Rahbar</b><span>Guruhlar va talabalar natijasi (demo)</span></span></button>
      <button class="role" data-act="login-admin"><span class="ic">${ico('crown')}</span><span><b>Bosh admin</b><span>Narxlar va avtomaktablar (faqat egasi)</span></span></button>
`}
      <p style="margin-top:22px;text-align:center"><a class="mute" href="#/">← Bosh sahifa</a>${(window.Cloud && Cloud.live()) ? ' · <a class="mute" href="#/admin">Admin</a>' : ''}</p>
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
    async 'tg-finish'(el) {
      const first = $('rf').value.trim(), last = $('rl').value.trim(), inv = parseInvite($('rc').value);
      if (first.length < 2 || last.length < 2) { toast("Ism va familyangizni to'liq yozing"); return; }
      if (!$('rg').value) { toast('Viloyatingizni tanlang'); return; }
      if (inv.bad) { toast("Guruh havolasi noto'g'ri. Ustoz yuborgan havolani to'liq nusxalab qo'ying"); return; }
      let j; try {
        const r = await fetch(API() + '/auth/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: el.dataset.token, first, last, region: $('rg').value, code: inv.code || '', ref: ($('rr').value || '').trim().toUpperCase() }) });
        if (!r.ok) throw new Error((await r.json()).error || 'xato'); j = await r.json();
      } catch (e) { toast("Tasdiqlash eskirgan yoki xato. Qaytadan urinib ko'ring"); location.hash = '#/register'; return; }
      Cloud.setToken(j.session); Cloud.isAdmin = !!(j.user && j.user.admin);
      if (j.existing) { // qayta kirish: serverdagi natijalar tiklanadi
        Object.assign(Store.s, j.state || {}, { role: 'student', name: j.user.first + ' ' + j.user.last, region: j.user.region || Store.s.region }); Store.save(); closeModal(); toast('Xush kelibsiz, ' + j.user.first + '!'); location.hash = '#/app'; return;
      }
      finish(el.dataset.tg);
    },
    'tg-retry'() { location.reload(); },
    'continue-student'() { Store.login('student'); location.hash = '#/app'; },
    async 'reg-tg'() {
      if ($('cns') && !$('cns').checked) { toast('Davom etish uchun shartlar va maxfiylik siyosatiga rozilik bering'); return; }
      if (live()) {
        let j; try { const r = await fetch(API() + '/auth/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); if (!r.ok) throw 0; j = await r.json(); } catch (e) { toast("Server bilan aloqa yo'q. Birozdan so'ng qayta urining"); return; }
        modal(`<h3>Telegramda Start bosing</h3><p class="mute">Telegram ochildi. Botimizda <b>Start</b> tugmasini bosing, keyin saytga qaytasiz. Ochilmagan bo'lsa pastdagi tugmani bosing.</p><div class="ai-acts"><a class="btn primary" href="${esc(j.link)}" target="_blank" rel="noopener">${ico('send')} Telegramni ochish</a><button class="btn soft" data-act="close">Bekor qilish</button></div><p class="mute" style="font-size:13px;margin-top:10px">Tasdiqlash kutilmoqda…</p>`);
        window.open(j.link, '_blank', 'noopener');
        clearInterval(pollT); let n = 0;
        pollT = setInterval(async () => {
          if (++n > 450) { clearInterval(pollT); return; }
          try { const r = await fetch(API() + '/auth/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: j.token }) }); const k = await r.json(); if (k.ok) { clearInterval(pollT); closeModal(); location.hash = '#/tg/' + j.token; } } catch (e) { }
        }, 2000);
        return;
      }
      const first = $('rf').value.trim(), last = $('rl').value.trim(), inv = parseInvite($('rc').value), code = inv.code;
      if (first.length < 2 || last.length < 2) { toast(`Ism va familyangizni to'liq yozing`); return; }
      if (!$('rg').value) { toast(`Viloyatingizni tanlang`); return; }
      if (inv.bad) { toast(`Guruh havolasi noto'g'ri. Ustoz yuborgan havolani to'liq nusxalab qo'ying`); return; }
      modal(`<h3>Telegram username</h3><p class="mute">Demo rejim: haqiqiy tasdiqlash uchun Telegram bot ulanishi kerak. Hozircha username yozing.</p>
        <div class="field"><label for="tgu">Telegram username</label><input id="tgu" class="input" maxlength="33" placeholder="@aziz_karimov"></div>
        <div class="ai-acts"><button class="btn primary" id="tgok">${ico('send')} Davom etish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      $('tgok').addEventListener('click', () => { const u = $('tgu').value.trim().replace(/^@/, ''); if (!/^[A-Za-z0-9_]{5,32}$/.test(u)) { toast(`Username 5–32 belgi: harf, raqam, _`); return; } finish(u); });
    },
  });

  /* havola orqali kelganda guruh nomini eslab qolamiz (boshqa qurilmada ustoz guruhi bazasi yo'q) */
  const _join = V.join; V.join = (code, name) => { window.__inviteName = name || null; return _join(code, name); };
})();


