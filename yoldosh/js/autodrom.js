/* Avtodrom bron qilish — «Tez kunda» sahifasi: kutish ro'yxati + avtodromlar uchun hamkorlik arizasi.
   Komissiya admin paneldan o'zgaradi (CFG.autodromCommission, standart 20%). Marshrut: #/autodrom */
(function () {
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, { esc, toast, modal, closeModal } = UI;
  const api = () => (CFG.apiBase || '').replace(/\/$/, ''), tok = () => (window.Cloud && Cloud.token()) || '';
  const com = () => { const c = CFG.autodromCommission; return typeof c === 'number' ? c : 20; };
  const post = async (b) => { const r = await fetch(api() + '/autodrom/lead', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, tok() ? { authorization: 'Bearer ' + tok() } : {}), body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Xato'); return j; };
  const KW = 'chorraha_ad_wait';
  const joined = () => { try { return localStorage.getItem(KW) === '1'; } catch (e) { return false; } };

  V.autodromCard = () => `<a class="card mt ad-card" href="#/autodrom"><span class="ad-ic">🏁</span><span class="ad-t"><b>Avtodromga onlayn yoziling</b><small>Vaqtni tanlang, to'lang, kelib mashq qiling — tez kunda</small></span><span class="chip acc">Tez kunda</span></a>`;
  const hr = V.homeRank; V.homeRank = () => V.autodromCard() + (hr ? hr() : '');

  const steps = [['🗓', 'Vaqtni tanlang', "Yaqin avtodromni va bo'sh vaqtni ko'rasiz"], ['💳', "Onlayn to'lang", 'Payme yoki Click orqali, qulay va xavfsiz'], ['📲', 'QR bilan keling', "Telegramga tasdiq va QR keladi, avtodromda skanerlanadi"], ['🚗', 'Mashq qiling', "Haqiqiy mashinada, imtihon sharoitida"]];
  V.autodrom = () => ({
    html: `<div class="gst"><header class="gst-top"><a class="gst-logo" href="#/">Chorraha</a><span style="flex:1"></span><a class="lb gls sm" href="${tok() ? '#/app' : '#/login'}">${tok() ? 'Ilovaga' : 'Kirish'}</a></header>
    <main class="gst-main ad-main"><span class="chip acc">Tez kunda</span><h1 class="ad-h">Avtodromga onlayn yoziling</h1>
      <p class="ad-lead">Avtomaktabga telefon qilib navbat so'ramang: o'zingizga qulay vaqtni tanlang, to'lang va aytilgan vaqtga borib mashq qiling.</p>
      <div class="ad-steps">${steps.map((s, i) => `<div class="card ad-step"><span>${s[0]}</span><b>${i + 1}. ${s[1]}</b><small>${s[2]}</small></div>`).join('')}</div>
      <div class="card ad-cta"><h3>Birinchilardan bo'ling</h3><p class="mute">Xizmat ishga tushganda Telegramga xabar yuboramiz.</p>
        <button class="btn primary lg" data-act="ad-wait" ${joined() ? 'disabled' : ''}>${joined() ? "✅ Ro'yxatdasiz" : "Ro'yxatga yozilish"}</button></div>
      <div class="card ad-cta"><h3>Avtodromingiz bormi?</h3><p class="mute">Bo'sh vaqtlaringizni to'ldiring: platforma mijoz keltiradi va to'lovni qabul qiladi. Siz faqat bron bo'lgandagina <b>${com()}%</b> komissiya to'laysiz — oldindan to'lov yo'q.</p>
        <button class="btn soft lg" data-act="ad-partner">Hamkor bo'lish</button></div>
    </main></div>`,
    mount() { try { V.track && V.track('view_autodrom'); } catch (e) { } },
  });
  V.acts = Object.assign(V.acts || {}, {
    async 'ad-wait'(el) {
      if (!tok()) { toast("Avval ro'yxatdan o'ting"); location.hash = '#/register'; return; }
      try { await post({ kind: 'wait' }); try { localStorage.setItem(KW, '1'); } catch (e) { } if (el) { el.disabled = true; el.textContent = "✅ Ro'yxatdasiz"; } toast("Yozildingiz! Xizmat ochilganda xabar beramiz"); } catch (e) { toast(e.message); }
    },
    'ad-partner'() {
      modal(`<h3>🏁 Hamkorlik arizasi</h3><p class="mute" style="font-size:13.5px">Komissiya: ${com()}% (faqat bron bo'lganda). Biz siz bilan bog'lanamiz.</p>
        <div class="field"><label for="adp-n">Avtodrom nomi</label><input id="adp-n" class="input" maxlength="60"></div>
        <div class="field"><label for="adp-p">Telefon</label><input id="adp-p" class="input" type="tel" maxlength="24" placeholder="+998 90 123 45 67"></div>
        <div class="field"><label for="adp-c">Shahar / manzil</label><input id="adp-c" class="input" maxlength="40"></div>
        <div class="field"><label for="adp-m">Izoh (ixtiyoriy)</label><textarea id="adp-m" class="input" rows="2" maxlength="300"></textarea></div>
        <button class="btn primary lg" data-act="ad-send" style="width:100%">Yuborish</button>`);
    },
    async 'ad-send'(el) {
      const g = (i) => (document.getElementById(i).value || '').trim();
      el.disabled = true;
      try { await post({ kind: 'partner', name: g('adp-n'), phone: g('adp-p'), city: g('adp-c'), note: g('adp-m') }); closeModal(); toast("Ariza yuborildi. Tez orada bog'lanamiz!"); try { V.track && V.track('autodrom_partner_sent'); } catch (e) { } }
      catch (e) { toast(e.message); el.disabled = false; }
    },
  });
})();
