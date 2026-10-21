/* Premium sahifasi: 3 ta tarif (vizitka-karta ko'rinishida) + tarif olgach "Chorraha haydovchi sertifikati".
   Sertifikat — pravaga o'xshash chiroyli karta: ism-familya, tarif, raqam, muddat. Instagram/Telegram story va postga
   tayyor rasm sifatida yuklab olinadi yoki ulashiladi (tekin reklama). Rasmiy hujjat EMAS — o'quv sertifikati. */
(function () {
  const { ico, esc, toast } = UI; const Store = (window.ST && ST.Store) || window.Store;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, T = V.T;
  if (!T || !V.premium) return;
  const SITE = 'chorrahaa.uz', URL_ = 'https://chorrahaa.uz';
  const NAME = { pro: 'Pro', premium: 'Premium', max: 'Max' };
  const DEF = { pro: 99000, premium: 139000, max: 149000 };
  const price = (t) => (CFG.tierPrices && CFG.tierPrices[t]) || DEF[t];
  const sum = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const PERKS = {
    pro: ['Yozma AI yordamchi + kamera', 'Pro va viloyat reytingi', 'Cobalt · Nexia · Gentra · Malibu · Isuzu', 'Battle: kuniga 10 ta'],
    premium: ['Pro imkoniyatlari + ovozli sharhlar', "Ustozdan so'rash", 'Premium reyting va chat', 'Brabus G · Porsche · Battle 30 ta'],
    max: ['Premium + haftada 1 soat online dars', 'Max chat (ovozli xabar)', 'Avtodrom 3D: hamma mashina, Maserati MC20', 'Battle cheksiz · Max logotipi'],
  };
  const COL = {
    pro: { a: '#1e3a8a', b: '#2563eb', c: '#7dd3fc', ink: '#eaf4ff' },
    premium: { a: '#78350f', b: '#d97706', c: '#fde68a', ink: '#fff8e6' },
    max: { a: '#3b0764', b: '#9333ea', c: '#f0abfc', ink: '#fdf4ff' },
  };

  /* ================= vizitka-karta ko'rinishidagi tariflar ================= */
  function cardsHtml() {
    const cur = T.cur();
    return `<div class="tc-wrap"><div class="tc-head"><h2>Tarifingizni tanlang</h2><p>Olgach — ismingiz yozilgan <b>haydovchi sertifikati</b> beriladi. Uni Instagram va Telegramga qo'yib, do'stlaringizga ko'rsating.</p></div>
      <div class="tc-grid">${['pro', 'premium', 'max'].map((t) => `<div class="tcard tcard-${t}${t === 'premium' ? ' best' : ''}">
        ${t === 'premium' ? '<span class="tc-tag">Mashhur</span>' : t === 'max' ? '<span class="tc-tag">Eng to\'liq</span>' : ''}
        <div class="tc-top">${T.logo(t, 44)}<div><b>${NAME[t]}</b><small>tarif</small></div></div>
        <div class="tc-price"><b>${sum(price(t))}</b><span>so'm / oy</span></div>
        <ul>${PERKS[t].map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        ${cur === t ? '<span class="chip ok tc-own">Sizda faol</span>' : `<button class="btn primary tc-btn" data-act="pay" data-what="${t}">${ico('crown')} ${NAME[t]} olish</button>`}
      </div>`).join('')}</div></div>`;
  }

  /* ================= sertifikat ================= */
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const svgImg = (svg) => new Promise((ok) => { if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'); const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const fmtD = (t) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };
  function info() {
    const s = Store.s, t = T.cur() || 'pro', full = String(s.name || 'FOYDALANUVCHI').trim().replace(/\s+/g, ' '), sp = full.indexOf(' ');
    const first = (sp > 0 ? full.slice(0, sp) : full).toUpperCase(), last = (sp > 0 ? full.slice(sp + 1) : '').toUpperCase();
    const until = (s.sub && s.sub.until > Date.now()) ? s.sub.until : (V.Prem && V.Prem.active && V.Prem.active() ? Date.now() + (V.Prem.daysLeft ? V.Prem.daysLeft() : 30) * 864e5 : Date.now() + 30 * 864e5);
    const start = (s.sub && s.sub.since) || Date.now();
    const id = String(s.uid || s.meId || '0000').replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(-6).padStart(6, '0');
    return { t, first, last, full, no: 'CH ' + id.slice(0, 3) + ' ' + id.slice(3), start: fmtD(start), until: fmtD(until), ini: (first[0] || 'C') + ((last || first)[1] || (last[0]) || '') };
  }
  /** 1011x638 (ID-1 nisbati) sertifikat kartasini chizadi */
  async function drawCert(cv, o) {
    const W = 1011, H = 638, g = cv.getContext('2d'), c = COL[o.t]; cv.width = W; cv.height = H;
    const logo = await svgImg(T.logo(o.t, 120));
    rr(g, 0, 0, W, H, 44); g.save(); g.clip();
    let gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, c.a); gr.addColorStop(.55, c.b); gr.addColorStop(1, c.a); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // guilloche-uslub to'lqinli chiziqlar
    g.lineWidth = 1.2; for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(255,255,255,${.05 + (i % 3) * .018})`; g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = H * .5 + Math.sin(x / 95 + i * .42) * (70 + i * 3.4) * Math.cos(i * .09); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    // yorug' dog'
    const rg = g.createRadialGradient(W * .85, H * .1, 10, W * .85, H * .1, 520); rg.addColorStop(0, 'rgba(255,255,255,.32)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // yuqori lenta
    g.fillStyle = 'rgba(8,10,20,.42)'; g.fillRect(0, 0, W, 104);
    g.fillStyle = c.ink; g.textBaseline = 'middle'; g.font = '800 30px "Segoe UI",Inter,Arial,sans-serif'; g.fillText('CHORRAHA · HAYDOVCHI SERTIFIKATI', 40, 40);
    g.font = '600 20px "Segoe UI",Inter,Arial,sans-serif'; g.globalAlpha = .8; g.fillText('PRAVA IMTIHONIGA TAYYORGARLIK · ' + SITE.toUpperCase(), 40, 76); g.globalAlpha = 1;
    if (logo) g.drawImage(logo, W - 112, 6, 92, 92);
    // surat o'rni (bosh harflar)
    rr(g, 40, 140, 250, 320, 26); g.fillStyle = 'rgba(255,255,255,.16)'; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
    g.textAlign = 'center';
    if (o.photo) { g.save(); rr(g, 40, 140, 250, 320, 26); g.clip(); const im = o.photo, k = Math.max(250 / im.width, 320 / im.height), dw = im.width * k, dh = im.height * k; g.drawImage(im, 40 + (250 - dw) / 2, 140 + (320 - dh) * .35, dw, dh); g.restore();
      rr(g, 40, 140, 250, 320, 26); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
      g.fillStyle = 'rgba(8,10,20,.55)'; g.save(); rr(g, 40, 140, 250, 320, 26); g.clip(); g.fillRect(40, 416, 250, 44); g.restore();
      g.fillStyle = c.ink; g.font = '800 22px "Segoe UI",Inter,Arial,sans-serif'; g.fillText('HAYDOVCHI · ' + NAME[o.t].toUpperCase(), 165, 440);
    } else {
      g.fillStyle = c.ink; g.font = '800 120px "Segoe UI",Inter,Arial,sans-serif'; g.fillText(o.ini, 165, 285);
      g.font = '700 22px "Segoe UI",Inter,Arial,sans-serif'; g.globalAlpha = .85; g.fillText('HAYDOVCHI', 165, 400); g.fillText(NAME[o.t].toUpperCase(), 165, 430); g.globalAlpha = 1;
    }
    g.textAlign = 'left';
    // maydonlar
    const lab = (t, x, y) => { g.font = '600 19px "Segoe UI",Inter,Arial,sans-serif'; g.fillStyle = c.ink; g.globalAlpha = .72; g.fillText(t, x, y); g.globalAlpha = 1; };
    const val = (t, x, y, sz, mw) => { g.fillStyle = '#fff'; let f = sz; do { g.font = `800 ${f}px "Segoe UI",Inter,Arial,sans-serif`; f -= 2; } while (g.measureText(t).width > mw && f > 16); g.fillText(t, x, y); };
    lab('1. FAMILIYA', 330, 150); val(o.last || o.first, 330, 192, 46, 640);
    lab('2. ISM', 330, 252); val(o.last ? o.first : '—', 330, 294, 46, 640);
    lab('3. BERILGAN', 330, 354); val(o.start, 330, 390, 30, 300); lab('4. AMAL QILADI', 640, 354); val(o.until, 640, 390, 30, 300);
    lab('5. SERTIFIKAT №', 330, 440); val(o.no, 330, 476, 32, 300);
    // kategoriya
    rr(g, 640, 424, 150, 64, 18); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill(); g.fillStyle = c.a; g.font = '900 40px "Segoe UI",Inter,Arial,sans-serif'; g.textAlign = 'center'; g.fillText('B', 715, 458);
    rr(g, 806, 424, 165, 64, 18); g.fillStyle = 'rgba(8,10,20,.4)'; g.fill(); g.fillStyle = c.ink; g.font = '800 26px "Segoe UI",Inter,Arial,sans-serif'; g.fillText(NAME[o.t].toUpperCase(), 888, 458); g.textAlign = 'left';
    // голограмма-lenta
    const hg = g.createLinearGradient(0, 0, W, 0); ['#ff5f6d', '#ffc371', '#fdfd96', '#7be495', '#5ec8ff', '#b388ff', '#ff5f6d'].forEach((col, i, a) => hg.addColorStop(i / (a.length - 1), col));
    g.globalAlpha = .85; g.fillStyle = hg; g.fillRect(0, 532, W, 10); g.globalAlpha = 1;
    g.fillStyle = 'rgba(8,10,20,.5)'; g.fillRect(0, 542, W, 96);
    g.fillStyle = c.ink; g.font = '600 18px "Segoe UI",Inter,Arial,sans-serif'; g.globalAlpha = .85;
    g.fillText("Chorraha.uz o'quv sertifikati — rasmiy haydovchilik guvohnomasi emas.", 40, 580); g.fillText('Tekshirish va tayyorgarlik: ' + URL_, 40, 610); g.globalAlpha = 1;
    g.font = '800 26px "Segoe UI",Inter,Arial,sans-serif'; g.textAlign = 'right'; g.fillText(SITE, W - 40, 596); g.textAlign = 'left';
    g.restore(); rr(g, 2, 2, W - 4, H - 4, 43); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke();
  }
  /** 1080x1920 story rasmi */
  async function drawStory(cv, o) {
    const W = 1080, H = 1920, g = cv.getContext('2d'), c = COL[o.t]; cv.width = W; cv.height = H;
    let gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#070b16'); gr.addColorStop(.5, c.a); gr.addColorStop(1, '#070b16'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W / 2, 760, 20, W / 2, 760, 760); rg.addColorStop(0, c.b + 'aa'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '900 64px "Segoe UI",Inter,Arial,sans-serif'; g.fillText("Men Chorraha'da", W / 2, 250);
    g.fillStyle = c.c; { let f = 110; const tx = NAME[o.t].toUpperCase() + ' HAYDOVCHI'; do { g.font = `900 ${f}px "Segoe UI",Inter,Arial,sans-serif`; f -= 4; } while (g.measureText(tx).width > W - 100 && f > 40); g.fillText(tx, W / 2, 372); }
    g.fillStyle = '#fff'; g.font = '800 64px "Segoe UI",Inter,Arial,sans-serif'; g.fillText('bo\'ldim 🚗', W / 2, 468);
    const cc = document.createElement('canvas'); await drawCert(cc, o);
    g.save(); g.translate(W / 2, 900); g.rotate(-.045); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 60; g.shadowOffsetY = 30; const cw = 940, ch = cw * 638 / 1011; g.drawImage(cc, -cw / 2, -ch / 2, cw, ch); g.restore();
    g.fillStyle = '#fff'; g.font = '800 58px "Segoe UI",Inter,Arial,sans-serif'; g.fillText('Prava imtihoniga tayyorlaning', W / 2, 1360);
    g.font = '600 42px "Segoe UI",Inter,Arial,sans-serif'; g.globalAlpha = .85; g.fillText('Testlar · AI yordamchi · 3D simulyator · avtodrom', W / 2, 1430); g.globalAlpha = 1;
    rr(g, W / 2 - 330, 1520, 660, 120, 60); g.fillStyle = '#b8f53b'; g.fill(); g.fillStyle = '#0b1220'; g.font = '900 54px "Segoe UI",Inter,Arial,sans-serif'; g.fillText(SITE, W / 2, 1582);
    g.fillStyle = '#fff'; g.globalAlpha = .6; g.font = '600 34px "Segoe UI",Inter,Arial,sans-serif'; g.fillText('Havolani story stikeri qilib qo\'ying 👆', W / 2, 1730); g.globalAlpha = 1;
  }
  /* ixtiyoriy surat: faqat shu qurilmada (localStorage) saqlanadi, serverga yuborilmaydi */
  const PK = 'chorraha_cert_photo';
  const getPhoto = () => new Promise((ok) => { let d = null; try { d = localStorage.getItem(PK); } catch (e) { } if (!d) return ok(null); const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = d; });
  const fileToPhoto = (f) => new Promise((ok, no) => {
    const fr = new FileReader(); fr.onerror = () => no(new Error("Rasmni o'qib bo'lmadi"));
    fr.onload = () => { const im = new Image(); im.onerror = () => no(new Error("Rasm formati qo'llab-quvvatlanmaydi")); im.onload = () => {
      const w = 500, h = 640, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), k = Math.max(w / im.width, h / im.height), dw = im.width * k, dh = im.height * k;
      g.drawImage(im, (w - dw) / 2, (h - dh) * .35, dw, dh); ok(cv.toDataURL('image/jpeg', .86)); }; im.src = fr.result; };
    fr.readAsDataURL(f);
  });
  const blob = (cv) => new Promise((ok) => cv.toBlob(ok, 'image/png'));
  const save = (b, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
  const caption = (o) => `Men Chorraha'da ${NAME[o.t]} haydovchi sertifikatini oldim! 🚗🏆\nPrava imtihoniga tayyorlanish: testlar, AI yordamchi, 3D simulyator.\n👉 ${URL_}\n#chorraha #prava #haydovchilik #uzbekistan #avtomaktab`;
  async function make(kind) {
    const o = info(); o.photo = await getPhoto(); const cv = document.createElement('canvas'); await (kind === 'story' ? drawStory : drawCert)(cv, o);
    return { b: await blob(cv), o, name: `chorraha-${kind === 'story' ? 'story' : 'sertifikat'}-${o.t}.png` };
  }
  function certHtml() {
    const o = info(), t = o.t;
    return `<div class="card mt cert-card cert-${t}"><div class="h-sec">${T.logo(t, 22)} Sizning sertifikatingiz</div>
      <p class="mute" style="margin:2px 0 12px">Ism-familyangiz bilan yozilgan. Instagram yoki Telegram story/postga qo'ying — do'stlaringiz ham tayyorlanishni boshlasin.</p>
      <div class="cert-cv"><canvas id="cert-cv"></canvas></div>
      <div class="cert-photo"><label class="btn soft" for="cert-file">📷 Rasm yuklash (ixtiyoriy)</label><input id="cert-file" type="file" accept="image/*" hidden><button class="btn soft" id="cert-rm" data-act="cert-rm" hidden>✕ Rasmni olib tashlash</button><small class="mute">Rasm faqat shu qurilmada qoladi, serverga yuborilmaydi. Rasmsiz ham bo'ladi.</small></div>
      <div class="cert-acts"><button class="btn primary" data-act="cert-share">${ico('send') || ''} Ulashish</button>
        <button class="btn soft" data-act="cert-story">📱 Story uchun rasm</button><button class="btn soft" data-act="cert-dl">⬇ Karta rasmi</button>
        <a class="btn soft" id="cert-tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(URL_)}&text=${encodeURIComponent(caption(o))}">Telegram</a>
        <button class="btn soft" data-act="cert-copy">📋 Matnni nusxalash</button></div>
      <small class="mute">Instagramga to'g'ridan-to'g'ri yuborib bo'lmaydi: «Story uchun rasm» ni yuklab oling va Instagramda story/post sifatida tanlang.</small></div>`;
  }

  async function redraw() { const cv = document.getElementById('cert-cv'); if (!cv) return; const o = info(); o.photo = await getPhoto(); drawCert(cv, o).catch(() => { }); const rm = document.getElementById('cert-rm'); if (rm) rm.hidden = !o.photo; }
  /* ================= Premium sahifasiga ulash ================= */
  const prev = V.premium;
  V.premium = function () {
    const r = prev.apply(this, arguments); if (!r || !r.html) return r;
    const a = r.html.indexOf('<div class="plan-hero">'), b = r.html.indexOf('<div class="card mt"><div class="h-sec">Nimalar ochiladi');
    const has = !!T.cur();
    const block = (has ? certHtml() : '') + cardsHtml();
    r.html = a >= 0 && b > a ? r.html.slice(0, a) + block + r.html.slice(b) : r.html.replace('</main>', block + '</main>');
    const m = r.mount; r.mount = function () { if (m) m.apply(this, arguments); redraw(); };
    return r;
  };
  const op = V.acts.pay;
  V.acts = Object.assign(V.acts, {
    pay(el) { op && op(el); const t = el && el.dataset && el.dataset.what; if (NAME[t] && V.acts['pay-tier']) { try { V.acts['pay-tier']({ dataset: { t } }); } catch (e) { } } },
    async 'cert-dl'() { try { const x = await make('card'); save(x.b, x.name); toast('Sertifikat yuklab olindi'); } catch (e) { toast('Xato: ' + e.message); } },
    async 'cert-story'() { try { const x = await make('story'); save(x.b, x.name); toast('Story rasmi yuklab olindi — Instagramda tanlang'); } catch (e) { toast('Xato: ' + e.message); } },
    async 'cert-share'() {
      try {
        const x = await make('story'), f = new File([x.b], x.name, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: caption(x.o), title: 'Chorraha sertifikati' }); return; }
        save(x.b, x.name); toast('Rasm yuklab olindi — endi Instagram/Telegramda ulashing');
      } catch (e) { if (e && e.name !== 'AbortError') toast('Xato: ' + e.message); }
    },
    'cert-rm'() { try { localStorage.removeItem(PK); } catch (e) { } redraw(); toast("Rasm olib tashlandi"); },
    'cert-copy'() { const t = caption(info()); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Matn nusxalandi'), () => toast('Nusxalab bo\'lmadi')); },
  });
  document.addEventListener('change', async (e) => {
    const el = e.target; if (!el || el.id !== 'cert-file' || !el.files || !el.files[0]) return;
    try { const d = await fileToPhoto(el.files[0]); try { localStorage.setItem(PK, d); } catch (x) { toast("Rasm saqlanmadi (xotira to'lgan)"); return; } await redraw(); toast("Rasm qo'yildi"); }
    catch (err) { toast(err.message || 'Xato'); } el.value = '';
  });
})();
