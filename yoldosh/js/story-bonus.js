/* Story bonusi: foydalanuvchi o'z kartasini Instagram/Telegram story'ga qo'yadi, skrinshotni yuboradi,
   admin (Telegram botda bir tugma bilan) tekshiradi → +N kun Pro. Kartada foydalanuvchiga xos kod bor (soxtalikdan himoya). */
(function () {
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, { esc, toast, modal, closeModal } = UI, DONE = 'chorraha_sb_done';
  const api = () => (CFG.apiBase || '').replace(/\/$/, ''), tok = () => (window.Cloud && Cloud.token()) || '';
  const live = () => !!(window.Cloud && Cloud.live() && tok());
  const done = () => { try { return localStorage.getItem(DONE) === '1'; } catch (e) { return false; } };
  const get = async (p) => { const r = await fetch(api() + p, { headers: { authorization: 'Bearer ' + tok() } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Xato'); return j; };
  const post = async (p, b) => { const r = await fetch(api() + p, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok() }, body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Xato'); return j; };
  let S = null, shot = null;

  V.storyCard = () => {
    if (done() || !(window.Cloud && Cloud.live())) return '';
    return `<div class="card mt sb-card"><div class="sb-ic">📸</div><div class="sb-t"><b>Story qiling — +15 kun Pro bepul</b><small>Kartangizni Instagram yoki Telegram story'ga qo'ying, skrinshotni yuboring.</small></div><button class="btn primary sm" data-act="sb-open">Boshlash</button></div>`;
  };
  const hr = V.homeRank; V.homeRank = () => V.storyCard() + (hr ? hr() : '');

  async function cardBlob() {
    const C = V.Cert, o = C.info(); o.photo = await C.getPhoto(); o.code = S && S.code; const cv = document.createElement('canvas'); await C.drawStory(cv, o);
    return { cv, o, b: await new Promise((ok) => cv.toBlob(ok, 'image/png')) };
  }
  function shrink(file) {
    return new Promise((ok, no) => { const fr = new FileReader(); fr.onerror = () => no(new Error("Rasmni o'qib bo'lmadi")); fr.onload = () => { const im = new Image(); im.onerror = () => no(new Error('Rasm formati mos emas')); im.onload = () => {
      const k = Math.min(1, 1100 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      let q = .8, d = cv.toDataURL('image/jpeg', q); while (d.length > 800000 && q > .3) { q -= .1; d = cv.toDataURL('image/jpeg', q); } ok(d); }; im.src = fr.result; }; fr.readAsDataURL(file); });
  }
  function view() {
    if (S.approved) return `<h3>Bonus olingan ✅</h3><p class="mute">Story uchun Pro muddati hisobingizga qo'shilgan. Rahmat!</p>`;
    if (S.pending) return `<h3>Tekshirilmoqda ⏳</h3><p class="mute">Story skrinshotingiz ko'rib chiqilmoqda (odatda bir necha soat). Natija Telegram botga keladi.</p>`;
    if (!S.can) return `<h3>Urinishlar tugagan</h3><p class="mute">Qo'llab-quvvatlashga yozing.</p>`;
    return `<h3>📸 Story qiling — +${S.days} kun Pro bepul</h3>
      <ol class="sb-steps"><li>Pastdagi kartani <b>Ulashish</b> yoki <b>Yuklab olish</b> orqali story'ga qo'ying (kodni yopmang).</li><li>Story chiqqach, <b>skrinshot</b> oling.</li><li>Quyida nomingiz va skrinshotni yuboring — tekshirilgach Pro qo'shiladi.</li></ol>
      ${S.rejected ? `<p class="sb-warn">Oldingi so'rov rad etilgan. Kod va chorrahaa.uz aniq ko'rinishi kerak.</p>` : ''}
      <div class="sb-cv"><canvas id="sb-cv"></canvas></div>
      <div class="ai-acts"><button class="btn primary" data-act="sb-share">Ulashish</button><button class="btn soft" data-act="sb-dl">Yuklab olish</button></div>
      <hr class="sb-hr"><div class="field"><label for="sb-pl">Qaerga qo'ydingiz?</label><select id="sb-pl" class="input"><option value="instagram">Instagram</option><option value="telegram">Telegram</option></select></div>
      <div class="field"><label for="sb-h">Akkaunt nomingiz (@...)</label><input id="sb-h" class="input" maxlength="40" placeholder="@username" autocomplete="off"></div>
      <div class="field"><label>Story skrinshoti</label><label class="btn soft" for="sb-f">${shot ? '✅ Skrinshot tanlandi' : '🖼 Skrinshot tanlash'}</label><input id="sb-f" type="file" accept="image/*" hidden></div>
      <button class="btn primary lg" data-act="sb-send" style="width:100%">Tekshiruvga yuborish</button>`;
  }
  async function draw() { const cv = document.getElementById('sb-cv'); if (!cv) return; const c = await cardBlob(); cv.width = 270; cv.height = 480; cv.getContext('2d').drawImage(c.cv, 0, 0, 270, 480); }
  async function open() {
    if (!live()) { toast("Avval ro'yxatdan o'tib kiring"); location.hash = '#/register'; return; }
    try { S = await get('/story/me'); } catch (e) { toast(e.message); return; }
    if (S.approved) { try { localStorage.setItem(DONE, '1'); } catch (e) { } }
    shot = null; modal(`<div class="sb-m" id="sb-m">${view()}</div>`); draw(); try { V.track && V.track('story_open'); } catch (e) { }
  }
  V.acts = Object.assign(V.acts || {}, {
    'sb-open': open,
    async 'sb-share'() { try { const c = await cardBlob(), f = new File([c.b], 'chorraha-story.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: V.Cert.caption(c.o), title: 'Chorraha' }); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(c.b); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast('Rasm yuklab olindi — story sifatida tanlang'); } catch (e) { if (e && e.name !== 'AbortError') toast('Xato: ' + e.message); } },
    async 'sb-dl'() { const c = await cardBlob(), a = document.createElement('a'); a.href = URL.createObjectURL(c.b); a.download = 'chorraha-story.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast('Rasm yuklab olindi'); },
    async 'sb-send'() {
      const h = (document.getElementById('sb-h').value || '').trim(); if (h.length < 2) { toast('Akkaunt nomingizni yozing'); return; } if (!shot) { toast('Story skrinshotini tanlang'); return; }
      const btn = document.querySelector('[data-act="sb-send"]'); if (btn) { btn.disabled = true; btn.textContent = 'Yuborilmoqda…'; }
      try { await post('/story/claim', { img: shot, handle: h, platform: document.getElementById('sb-pl').value }); S.pending = true; S.can = false; document.getElementById('sb-m').innerHTML = view(); try { V.track && V.track('story_sent'); } catch (e) { } }
      catch (e) { toast(e.message); if (btn) { btn.disabled = false; btn.textContent = 'Tekshiruvga yuborish'; } }
    },
  });
  document.addEventListener('change', async (e) => { const el = e.target; if (!el || el.id !== 'sb-f' || !el.files || !el.files[0]) return;
    try { shot = await shrink(el.files[0]); const l = el.previousElementSibling; if (l) l.textContent = '✅ Skrinshot tanlandi'; } catch (err) { toast(err.message); } });
})();
