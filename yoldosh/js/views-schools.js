/* Avtomaktablar (imtihon markazlari): talaba ro'yxatni ko'radi va ariza qoldiradi; admin avtomaktablarni kiritadi va arizalarni ko'radi. Server: /schools, /schools/apply, /admin/*. */
(function () {
  const { ico, esc, toast, modal, closeModal } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, shell = (a, h) => V.shellStudent(a, h);
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const auth = () => ({ 'content-type': 'application/json', authorization: 'Bearer ' + (window.Cloud ? Cloud.token() : '') });
  const aauth = () => (window.AdminAuth && AdminAuth.tok()) ? AdminAuth.H() : auth();
  const live = () => !!(window.Cloud && Cloud.live());
  const SC = { list: null, region: '', admin: null, leads: null, edit: null };

  /* admin ekanligini bir marta bilib olamiz (menyuda "admin" bandi chiqishi uchun) */
  if (live()) {
    const probe = async () => {
      if (!Cloud.token()) return;
      try { const r = await fetch(api() + '/me', { headers: auth() }); if (!r.ok) return; const j = await r.json(); Cloud.isAdmin = !!(j.user && j.user.admin); if (j.user && j.user.prem_until > Date.now()) { ST.Store.s.sub = Object.assign({}, ST.Store.s.sub, { until: j.user.prem_until }); } if (Cloud.isAdmin && V.rerender && /#\/app/.test(location.hash)) V.rerender(); } catch (e) { }
    };
    setTimeout(probe, 600);
  }

  async function loadList() {
    try { const r = await fetch(api() + '/schools' + (SC.region ? '?region=' + encodeURIComponent(SC.region) : '')); SC.list = (await r.json()).schools || []; } catch (e) { SC.list = []; }
  }

  const card = (s) => `<div class="card sch"><div class="sch-h"><div><h3>${esc(s.name)}</h3><small class="mute">${esc([s.region, s.city].filter(Boolean).join(' · '))}</small></div>${s.price ? `<span class="chip acc">${esc(s.price)}</span>` : ''}</div>
    ${s.address ? `<p>${ico('flag')} ${esc(s.address)}</p>` : ''}${s.hours ? `<p>${ico('clock')} ${esc(s.hours)}</p>` : ''}${s.note ? `<p class="mute">${esc(s.note)}</p>` : ''}
    <div class="ai-acts">${s.phone ? `<a class="btn soft sm" href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a>` : ''}${s.telegram ? `<a class="btn soft sm" href="https://t.me/${esc(s.telegram)}" target="_blank" rel="noopener">${ico('send')} Telegram</a>` : ''}<button class="btn primary sm" data-act="sch-apply" data-id="${s.id}" data-name="${esc(s.name)}">Ariza qoldirish</button></div></div>`;

  V.promo = () => ({
    html: shell('promo', '<div class="page-h"><div><h1>Promokod</h1><p>Promokodingiz bo\'lsa, shu yerga kiriting: Premium muddatingiz uzayadi.</p></div></div><div class="card" style="max-width:460px"><div class="field"><label for="pc-c">Promokod</label><input id="pc-c" class="input" maxlength="24" autocapitalize="characters" placeholder="PROMOKOD"></div><div class="ai-acts"><button class="btn primary" data-act="pc-go">Qo\'llash</button></div></div>'),
  });
  V.acts = Object.assign(V.acts || {}, {
    async 'pc-go'() {
      if (!live() || !Cloud.token()) { toast("Avval ro'yxatdan o'ting"); location.hash = '#/register'; return; }
      const code = document.getElementById('pc-c').value.trim(); if (!code) { toast('Kodni kiriting'); return; }
      try { const r = await fetch(api() + '/promo/redeem', { method: 'POST', headers: auth(), body: JSON.stringify({ code }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'xato'); ST.Store.s.sub = Object.assign({}, ST.Store.s.sub, { until: j.prem_until }); ST.Store.save(); toast('+' + j.days + ' kun Premium qo\'shildi!'); document.getElementById('pc-c').value = ''; } catch (e) { toast(e.message); }
    },
  });


  V.schools = () => ({
    html: shell('schools', `<div class="page-h"><div><h1>Avtomaktablar</h1><p>Yaqin avtomaktabni toping va ariza qoldiring. Arizangiz avtomaktabga Telegram orqali yuboriladi.</p></div></div>
      <div class="field" style="max-width:320px"><label for="sc-reg">Viloyat</label><select id="sc-reg" class="select"><option value="">Hammasi</option>${(CFG.regions || []).map(r => `<option ${r === SC.region ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
      <div id="sc-list" class="stack s12"><div class="card"><span class="mute">Yuklanmoqda…</span></div></div>`),
    async mount() {
      const el = document.getElementById('sc-list'), sel = document.getElementById('sc-reg');
      const draw = () => { el.innerHTML = SC.list.length ? SC.list.map(card).join('') : `<div class="card" style="text-align:center;padding:36px"><b>Bu hududda hali avtomaktab ulanmagan</b><p class="mute">Tez orada qo'shiladi. Boshqa viloyatni tanlab ko'ring.</p></div>`; };
      sel.addEventListener('change', async () => { SC.region = sel.value; await loadList(); draw(); });
      if (!live()) { el.innerHTML = '<div class="card">Bu bo\'lim hozir demo rejimda mavjud emas.</div>'; return; }
      await loadList(); draw();
    },
  });

  const FIELDS = [['name', 'Nomi *'], ['city', 'Shahar / tuman'], ['address', 'Manzil'], ['phone', 'Telefon'], ['price', 'Narx (matn, masalan "1 200 000 so\'m")'], ['hours', 'Ish vaqti'], ['telegram', 'Telegram (@username)'], ['tg_chat', 'Telegram chat ID (arizalar shu yerga ham ketadi, ixtiyoriy)'], ['note', 'Izoh']];
  const adminCard = (s) => `<div class="card sch ${s.active ? '' : 'off'}"><div class="sch-h"><div><h3>${esc(s.name)} ${s.active ? '' : '<span class="chip">o\'chirilgan</span>'}</h3><small class="mute">${esc([s.region, s.city].filter(Boolean).join(' · '))}</small></div><span class="chip ok">${s.leads} ta ariza</span></div>
    <p class="mute">Bepul muddat: ${s.free_until ? new Date(s.free_until).toLocaleDateString('uz') + ' gacha' : 'belgilanmagan'} · Talaba uchun: ${s.per_student ? s.per_student.toLocaleString('ru') + " so'm" : '—'}</p>
    <div class="ai-acts"><button class="btn soft sm" data-act="sch-edit" data-id="${s.id}">Tahrirlash</button><button class="btn ghost sm" data-act="sch-leads" data-id="${s.id}">Arizalar</button><button class="btn ghost sm" data-act="sch-del" data-id="${s.id}">O'chirish</button></div></div>`;

  V._sch = { adminCard, setAdmin: (l) => { SC.admin = l; } };
  async function loadAdmin() {
    try { const r = await fetch(api() + '/admin/schools', { headers: aauth() }); if (!r.ok) throw 0; SC.admin = (await r.json()).schools; } catch (e) { SC.admin = null; }
  }

  V.schoolsAdmin = () => ({
    html: shell('schools-admin', `<div class="page-h"><div><h1>Avtomaktablar (admin)</h1><p>Avtomaktablarni qo'shing, tahrirlang va kelgan arizalarni ko'ring.</p></div><button class="btn primary" data-act="sch-edit" data-id="">+ Avtomaktab qo'shish</button></div><div id="sa-list" class="stack s12"><div class="card"><span class="mute">Yuklanmoqda…</span></div></div><div id="sa-leads"></div>`),
    async mount() {
      const el = document.getElementById('sa-list'); await loadAdmin();
      if (!SC.admin) { el.innerHTML = '<div class="card"><b>Ruxsat yo\'q.</b><p class="mute">Bu sahifa faqat admin uchun.</p></div>'; return; }
      el.innerHTML = SC.admin.length ? SC.admin.map(adminCard).join('') : '<div class="card" style="text-align:center;padding:30px">Hali avtomaktab yo\'q. «+ Avtomaktab qo\'shish» ni bosing.</div>';
    },
  });

  const formHtml = (s) => `<h3>${s.id ? 'Tahrirlash' : 'Yangi avtomaktab'}</h3><div style="max-height:62vh;overflow:auto;padding-right:4px">
    <div class="field"><label for="se-region">Viloyat</label><select id="se-region" class="select">${(CFG.regions || []).map(r => `<option ${r === s.region ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
    ${FIELDS.map(([k, l]) => `<div class="field"><label for="se-${k}">${l}</label><input id="se-${k}" class="input" value="${esc(s[k] || '')}"></div>`).join('')}
    <div class="grid g2 keep2" style="gap:12px"><div class="field"><label for="se-free">Bepul muddat tugashi</label><input id="se-free" class="input" type="date" value="${s.free_until ? new Date(s.free_until).toISOString().slice(0, 10) : ''}"></div><div class="field"><label for="se-per">Talaba uchun (so'm)</label><input id="se-per" class="input" type="number" min="0" value="${s.per_student || 0}"></div></div>
    <label class="consent"><input type="checkbox" id="se-active" ${s.active !== false ? 'checked' : ''}> <span>Talabalarga ko'rinsin</span></label></div>
    <div class="ai-acts"><button class="btn primary" data-act="sch-save" data-id="${s.id || ''}">Saqlash</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`;

  V.acts = Object.assign(V.acts || {}, {
    'sch-apply'(el) {
      if (!live() || !Cloud.token()) { toast('Avval ro\'yxatdan o\'ting'); location.hash = '#/register'; return; }
      modal(`<h3>Ariza: ${esc(el.dataset.name)}</h3><p class="mute">Ismingiz va Telegram'ingiz avtomaktabga yuboriladi. Telefon raqamingizni yozsangiz, ular qo'ng'iroq qila oladi (ixtiyoriy).</p>
        <div class="field"><label for="ap-ph">Telefon</label><input id="ap-ph" class="input" type="tel" placeholder="+998 90 123 45 67" autocomplete="tel"></div>
        <div class="ai-acts"><button class="btn primary" id="ap-go">Yuborish</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
      document.getElementById('ap-go').addEventListener('click', async () => {
        const b = document.getElementById('ap-go'); b.disabled = true;
        try { const r = await fetch(api() + '/schools/apply', { method: 'POST', headers: auth(), body: JSON.stringify({ school_id: +el.dataset.id, phone: document.getElementById('ap-ph').value }) }); const j = await r.json(); if (!r.ok) throw 0; closeModal(); toast(j.again ? 'Siz bu avtomaktabga avval ariza qoldirgansiz' : 'Ariza yuborildi! Avtomaktab siz bilan bog\'lanadi'); } catch (e) { b.disabled = false; toast('Yuborib bo\'lmadi. Keyinroq urinib ko\'ring'); }
      });
    },
    'sch-edit'(el) { const s = (SC.admin || []).find(x => String(x.id) === el.dataset.id) || { region: (CFG.regions || [])[0], active: true }; modal(formHtml(s)); },
    async 'sch-save'(el) {
      const g = (k) => document.getElementById('se-' + k).value, free = g('free');
      const body = { id: el.dataset.id ? +el.dataset.id : undefined, region: g('region'), free_until: free ? new Date(free + 'T23:59:59').getTime() : 0, per_student: +g('per') || 0, active: document.getElementById('se-active').checked };
      FIELDS.forEach(([k]) => { body[k] = g(k); });
      try { const r = await fetch(api() + '/admin/school', { method: 'POST', headers: aauth(), body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).error || 'xato'); closeModal(); toast('Saqlandi'); V.rerender(); } catch (e) { toast('Saqlab bo\'lmadi: ' + (e.message || '')); }
    },
    async 'sch-del'(el) {
      if (!confirm('Bu avtomaktab va uning arizalari o\'chiriladi. Davom etasizmi?')) return;
      try { const r = await fetch(api() + '/admin/school', { method: 'POST', headers: aauth(), body: JSON.stringify({ id: +el.dataset.id, delete: true }) }); if (!r.ok) throw 0; toast('O\'chirildi'); V.rerender(); } catch (e) { toast('Xato'); }
    },
    async 'sch-leads'(el) {
      try {
        const r = await fetch(api() + '/admin/leads?school_id=' + el.dataset.id, { headers: aauth() }); const j = await r.json();
        const box = document.getElementById('sa-leads');
        box.innerHTML = `<div class="card mt"><div class="h-sec">Arizalar (${j.leads.length})</div>${j.leads.length ? `<div class="stack s12">${j.leads.map(l => `<div class="trow"><span class="nm"><b>${esc(l.first + ' ' + l.last)}</b> ${l.username ? `<a href="https://t.me/${esc(l.username)}" target="_blank" rel="noopener">@${esc(l.username)}</a>` : ''}</span><span class="mute">${esc(l.region || '')} ${l.phone ? ' · ' + esc(l.phone) : ''} · ${new Date(l.created).toLocaleDateString('uz')}</span></div>`).join('')}</div>` : '<p class="mute">Hozircha ariza yo\'q.</p>'}</div>`;
        box.scrollIntoView({ behavior: 'smooth' });
      } catch (e) { toast('Yuklab bo\'lmadi'); }
    },
  });
})();
