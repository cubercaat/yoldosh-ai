/* Tarif imkoniyatlari: AI (Pro+), ovozli sharh va ustozdan so'rash (Premium+), online dars va Max chat (Max).
   Logotiplar, qulf kartalari, Premium/Max chat (ovozli xabar), Max online dars bronlash. Server ham tekshiradi (worker.js). */
(function () {
  const { ico, esc, ava, toast, modal, closeModal } = UI;
  const { Store } = ST;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH, S = V.S, shell = (a, h) => V.shellStudent(a, h);
  const R = { '': 0, pro: 1, premium: 2, max: 3 }, NAME = { pro: 'Pro', premium: 'Premium', max: 'Max' };
  const api = () => (CFG.apiBase || '').replace(/\/$/, '');
  const live = () => !!(window.Cloud && Cloud.live() && Cloud.token());
  const auth = () => ({ 'content-type': 'application/json', authorization: 'Bearer ' + (window.Cloud ? Cloud.token() : '') });
  const $ = (id) => document.getElementById(id);

  /* ---------- tarif holati ---------- */
  const T = (V.T = {
    cur() { if (window.Cloud && Cloud.isAdmin) return 'max'; return (V.Prem && V.Prem.tier()) || ''; },
    has(min) { return R[T.cur()] >= R[min]; },
    name: (t) => NAME[t] || '',
    /* ---------- logotiplar ---------- */
    logo(t, px = 22) {
      if (t === 'pro') return `<svg class="tl tl-pro" width="${px}" height="${px}" viewBox="0 0 32 32" aria-label="Pro"><defs><linearGradient id="tgp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7DD3FC"/><stop offset="1" stop-color="#2563EB"/></linearGradient></defs><path d="M16 2.5l11.5 4v8.6c0 7.2-4.7 12.2-11.5 14.4C9.2 27.3 4.5 22.3 4.5 15.1V6.5z" fill="url(#tgp)"/><path d="M16 2.5l11.5 4v8.6c0 7.2-4.7 12.2-11.5 14.4z" fill="#fff" opacity=".12"/><path d="M10.5 16.5l5.5-5 5.5 5M10.5 21l5.5-5 5.5 5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      if (t === 'premium') return `<svg class="tl tl-prem" width="${px}" height="${px}" viewBox="0 0 32 32" aria-label="Premium"><defs><linearGradient id="tgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FEF3C7"/><stop offset=".45" stop-color="#FBBF24"/><stop offset="1" stop-color="#B45309"/></linearGradient></defs><path d="M16 2l12.5 9L16 30 3.5 11z" fill="url(#tgg)"/><path d="M3.5 11h25M10 11l6 19 6-19M10 11l2.5-9M22 11l-2.5-9" fill="none" stroke="#7C2D12" stroke-opacity=".45" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 10.5L16 4l-3 7z" fill="#fff" opacity=".55"/></svg>`;
      if (t === 'max') return `<svg class="tl tl-max" width="${px}" height="${px}" viewBox="0 0 32 32" aria-label="Max"><defs><linearGradient id="tgm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0ABFC"/><stop offset=".5" stop-color="#8B5CF6"/><stop offset="1" stop-color="#312E81"/></linearGradient><linearGradient id="tgm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7C2"/><stop offset=".5" stop-color="#FACC15"/><stop offset="1" stop-color="#F97316"/></linearGradient></defs><path d="M16 1.5l12.5 7.2v14.6L16 30.5 3.5 23.3V8.7z" fill="url(#tgm)"/><path d="M16 1.5l12.5 7.2v14.6L16 30.5" fill="#fff" opacity=".1"/><path d="M16 1.5l12.5 7.2v14.6L16 30.5 3.5 23.3V8.7z" fill="none" stroke="url(#tgm2)" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 21.5l-1.2-9 4.4 3.6L16 9l4.3 7.1 4.4-3.6-1.2 9z" fill="url(#tgm2)"/><rect x="8.5" y="22.5" width="15" height="2.2" rx="1.1" fill="url(#tgm2)"/><circle cx="16" cy="8.2" r="1.5" fill="#fff"/><circle cx="7.3" cy="11.8" r="1.1" fill="#fff"/><circle cx="24.7" cy="11.8" r="1.1" fill="#fff"/><path class="tl-sh" d="M25 3l.9 2.1L28 6l-2.1.9L25 9l-.9-2.1L22 6l2.1-.9z" fill="#fff"/></svg>`;
      return '';
    },
    chip(t, px = 16) { return t ? `<span class="tchip tchip-${t}">${T.logo(t, px)}<b>${NAME[t]}</b></span>` : ''; },
    /* qulf kartasi */
    lock(min, title, text, extra = '') {
      return `<div class="tlock tlock-${min}"><div class="tlock-i">${T.logo(min, 56)}</div><h2>${esc(title)}</h2><p class="mute">${esc(text)}</p>${extra}
        <div class="ai-acts" style="justify-content:center"><button class="btn primary lg" data-act="pay" data-what="${min}">${ico('crown')} ${NAME[min]} tarifini tanlash</button><a class="btn soft" href="#/app/premium">Tariflarni solishtirish</a></div></div>`;
    },
    page(active, h1, min, title, text) { return { html: shell(active, `<div class="page-h"><div><h1>${esc(h1)}</h1></div><span style="margin-right:56px">${T.chip(min, 18)}</span></div>${T.lock(min, title, text)}`) }; },
    need(min, what) { toast(`${what} — ${NAME[min]} tarifidan boshlab`); },
  });

  /* ---------- sahifalarni tarifga bog'lash ---------- */
  (() => {
    const gate = (name, active, h1, min, title, text) => { const o = V[name]; if (!o) return; V[name] = () => T.has(min) ? o() : T.page(active, h1, min, title, text); };
    gate('ai', 'ai', 'AI yordamchi', 'pro', 'AI yordamchi Pro tarifidan boshlab', `Savolingizni yozing — AI oddiy tilda tushuntiradi. Bepul tarifda AI yo'q.`);
    gate('scan', 'scan', 'Belgini aniqlash', 'pro', 'Kamera bilan aniqlash Pro tarifidan boshlab', `Belgini suratga oling — AI nomini va ma'nosini aytadi.`);
    /* Ustoz: Premium+; Max uchun online dars bronlash */
    const ot = V.teacher;
    if (ot) V.teacher = () => {
      if (!T.has('premium')) return T.page('teacher', 'Ustoz bilan aloqa', 'premium', `Ustozdan so'rash Premium tarifidan boshlab`, `Tushunmagan joyingizni ustozga yuboring — shaxsiy javob oling. Max tarifda esa haftada 1 soat online dars ham bor.`);
      const r = ot(); const box = `<div id="les-box" class="mt">${lessonHtml()}</div>`;
      r.html = r.html.replace('</main>', box + '</main>');
      const om = r.mount; r.mount = () => { if (om) om(); lessonLoad(); };
      return r;
    };
    /* ovozli sharh: faqat Premium+ */
    const ox = V.explain;
    if (ox) V.explain = (q, pick, ok) => { const h = ox(q, pick, ok); return T.has('premium') ? h : h.replace(/<div class="vm"[\s\S]*<\/div><\/div>$/, `<div class="vm-lock" data-act="pay" data-what="premium">${T.logo('premium', 18)}<span>Ovozli sharh — <b>Premium</b> tarifidan boshlab</span></div></div>`); };
  })();
  /* ustozga yuborish tugmasi (viktorinadan) */
  (() => {
    const o = V.acts['to-teacher']; if (o) V.acts['to-teacher'] = (el) => { if (!T.has('premium')) { T.need('premium', `Ustozdan so'rash`); location.hash = '#/app/teacher'; return; } o(el); };
  })();


  /* ---------- Tariflar jadvali (Premium sahifasida) ---------- */
  const MATRIX = [['AI yordamchi (yozma) + kamera', 0, 1, 1, 1], ['Viloyat va Pro reytingi', 0, 1, 1, 1], ['Ovozli sharhlar', 0, 0, 1, 1], ["Ustozdan so'rash", 0, 0, 1, 1], ['Premium reyting va chat', 0, 0, 1, 1], ['Max reyting va Max chat (ovozli xabar)', 0, 0, 0, 1], ['Haftada 1 soat online dars (video-chat)', 0, 0, 0, 1], ['Avtodrom 3D: hamma mashina, cheksiz', 0, 0, 0, 1]];
  function matrixHtml() {
    const cur = T.cur(), th = ['', 'pro', 'premium', 'max'];
    return `<div class="card mt"><div class="h-sec">Tariflar solishtiruvi</div><div style="overflow:auto"><table class="cmp"><tr><th></th><th>Bepul</th>${th.slice(1).map(t => `<th>${T.chip(t, 15)}</th>`).join('')}</tr>
      ${MATRIX.map(r => `<tr><td>${esc(r[0])}</td>${r.slice(1).map(v => `<td>${v ? '✓' : '—'}</td>`).join('')}</tr>`).join('')}
      <tr><td></td><td></td>${th.slice(1).map(t => `<td>${cur === t ? '<span class="chip ok">Sizda</span>' : `<button class="btn sm ${t === 'max' ? 'primary' : 'soft'}" data-act="pay" data-what="${t}">Tanlash</button>`}</td>`).join('')}</tr></table></div></div>`;
  }
  { const o = V.premium; if (o) V.premium = () => { const r = o(); r.html = r.html.replace('</main>', matrixHtml() + '</main>'); return r; }; }

  /* ---------- Max: online dars ---------- */
  const LS = { list: null, err: '' };
  const fmtWhen = (ms) => { const d = new Date(ms + 5 * 36e5); const p = (n) => String(n).padStart(2, '0'); return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; };
  const STL = { pending: ['Kutilmoqda', 'warn'], confirmed: ['Tasdiqlandi', 'ok'], cancelled: ['Bekor qilingan', 'bad'], done: ['O\'tdi', ''] };
  function dayOpts() { const o = []; const now = Date.now() + 24 * 36e5; for (let i = 0; i < 21; i++) { const d = new Date(now + i * 864e5), t = new Date(d.getTime() + 5 * 36e5); const v = `${t.getUTCFullYear()}-${t.getUTCMonth() + 1}-${t.getUTCDate()}`; o.push(`<option value="${v}">${['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'][t.getUTCDay()]} · ${String(t.getUTCDate()).padStart(2, '0')}.${String(t.getUTCMonth() + 1).padStart(2, '0')}</option>`); } return o.join(''); }
  const timeOpts = () => { const o = []; for (let h = 9; h <= 21; h++) for (const m of [0, 30]) { if (h === 21 && m) continue; o.push(`<option value="${h}:${m}">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</option>`); } return o.join(''); };
  function lessonHtml() {
    if (!T.has('max')) return `<div class="card tlock tlock-max" style="text-align:center"><div class="tlock-i">${T.logo('max', 48)}</div><h3 style="margin:8px 0 4px">Ustoz bilan online dars — Max</h3><p class="mute">Haftada 1 marta, 1 soat, ustoz bilan Telegram video-chat orqali shaxsiy dars. Kamida 1 kun oldin rejalashtiriladi.</p><button class="btn primary" data-act="pay" data-what="max">${ico('crown')} Max tarifini tanlash</button></div>`;
    const l = LS.list;
    return `<div class="card tlock-max-c"><div class="ai-h">${T.logo('max', 22)} Online dars (Telegram video-chat)</div>
      <p class="mute" style="font-size:14px;margin:6px 0 12px">Haftada 1 marta · 1 soat · kamida 1 kun oldin rejalashtiriladi. Ustoz tasdiqlagach Telegramga xabar keladi.</p>
      <div class="grid g2"><div class="field" style="margin:0"><label for="ls-d">Kun</label><select id="ls-d" class="select">${dayOpts()}</select></div><div class="field" style="margin:0"><label for="ls-t">Vaqt (Toshkent)</label><select id="ls-t" class="select">${timeOpts()}</select></div></div>
      <div class="field"><label for="ls-n">Qaysi mavzuda dars kerak? (ixtiyoriy)</label><input id="ls-n" class="input" maxlength="200" placeholder="Masalan: kesishmalar va ustunlik"></div>
      <button class="btn primary" data-act="les-book">${ico('calendar')} Darsni rejalashtirish</button>
      <div class="h-sec" style="margin-top:18px">Darslarim</div>${l == null ? '<p class="mute">Yuklanmoqda…</p>' : l.length ? l.map(x => { const st = STL[x.status] || ['', '']; return `<div class="trow" style="grid-template-columns:1fr auto auto;gap:10px;align-items:center"><span><b>${fmtWhen(x.start)}</b>${x.note ? `<small class="mute"> · ${esc(x.note)}</small>` : ''}${x.link ? `<br><a href="${esc(x.link)}" target="_blank" rel="noopener">Havola</a>` : ''}</span><span class="chip ${st[1]}">${st[0]}</span>${['pending', 'confirmed'].includes(x.status) && x.start > Date.now() ? `<button class="btn sm soft" data-act="les-cancel" data-id="${x.id}">Bekor</button>` : '<span></span>'}</div>`; }).join('') : '<p class="mute">Hali dars rejalashtirmagansiz.</p>'}</div>`;
  }
  async function lessonLoad() {
    if (!T.has('max') || !live()) { LS.list = []; const b0 = $('les-box'); if (b0) b0.innerHTML = lessonHtml(); return; }
    try { const r = await fetch(api() + '/lesson/mine', { headers: auth() }); const j = await r.json(); LS.list = j.lessons || []; } catch (e) { LS.list = []; }
    const b = $('les-box'); if (b) { const keep = ['ls-d', 'ls-t', 'ls-n'].map(i => $(i) && $(i).value); b.innerHTML = lessonHtml(); ['ls-d', 'ls-t', 'ls-n'].forEach((i, k) => { if ($(i) && keep[k] != null) $(i).value = keep[k]; }); }
  }
  V.acts = Object.assign(V.acts || {}, {
    async 'les-book'() {
      if (!live()) { toast(`Avval tizimga kiring`); return; }
      const [y, m, d] = $('ls-d').value.split('-').map(Number), [h, mi] = $('ls-t').value.split(':').map(Number);
      const start = Date.UTC(y, m - 1, d, h, mi) - 5 * 36e5;
      try { const r = await fetch(api() + '/lesson/book', { method: 'POST', headers: auth(), body: JSON.stringify({ start, note: $('ls-n').value }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'xato'); toast('Dars so\'rovi ustozga yuborildi'); lessonLoad(); } catch (e) { toast(e.message); }
    },
    async 'les-cancel'(el) { try { const r = await fetch(api() + '/lesson/cancel', { method: 'POST', headers: auth(), body: JSON.stringify({ id: +el.dataset.id }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'xato'); toast('Dars bekor qilindi'); lessonLoad(); } catch (e) { toast(e.message); } },
  });

  /* ---------- Chat: Premium va Max xonalari ---------- */
  const CH = { room: 'premium', msgs: [], last: 0, timer: null, me: 0, err: '', rec: null, recT: 0, recTimer: null, aud: null, blobs: {} };
  const rooms = () => [T.has('premium') ? 'premium' : null, T.has('max') ? 'max' : null].filter(Boolean);
  const hhmm = (ms) => { const d = new Date(ms + 5 * 36e5); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
  function msgHtml(m) {
    const mine = m.uid === CH.me;
    const body = m.kind === 'voice' ? `<button class="cv" data-act="ch-play" data-id="${m.voice}"><span class="cv-p">${ico('play') || '▶'}</span><span class="cv-w">${Array.from({ length: 22 }, (_, i) => `<i style="height:${30 + Math.round(Math.abs(Math.sin(i * 1.9 + m.id)) * 70)}%"></i>`).join('')}</span><span class="cv-t">ovozli</span></button>` : esc(m.text);
    return `<div class="cm ${mine ? 'mine' : ''} cm-${m.tier || 'x'}"><div class="cm-h">${T.logo(m.tier, 16)}<b>${esc(m.name)}</b><small>${hhmm(m.ts)}</small></div><div class="cm-b">${body}</div></div>`;
  }
  function chPaint(scroll) {
    const el = $('ch-list'); if (!el) return; const nearEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    el.innerHTML = CH.msgs.length ? CH.msgs.map(msgHtml).join('') : `<p class="mute" style="text-align:center;padding:30px">Hali xabar yo'q. Birinchi bo'lib yozing 👋</p>`;
    if (scroll || nearEnd) el.scrollTop = el.scrollHeight;
  }
  async function chPoll(full) {
    if (!live() || !rooms().includes(CH.room)) return;
    try {
      const r = await fetch(`${api()}/chat/list?room=${CH.room}${full ? '' : '&after=' + CH.last}`, { headers: auth() }); const j = await r.json(); if (!r.ok) { CH.err = j.error || ''; return; }
      CH.me = j.me; if (full) CH.msgs = j.msgs; else if (j.msgs.length) CH.msgs = CH.msgs.concat(j.msgs).slice(-150);
      CH.last = CH.msgs.length ? CH.msgs[CH.msgs.length - 1].id : 0; if (full || j.msgs.length) chPaint(full);
    } catch (e) { }
  }
  function chStop() { clearInterval(CH.timer); CH.timer = null; chRecCancel(); if (CH.aud) { CH.aud.pause(); CH.aud = null; } }
  V.community = () => {
    const rs = rooms();
    if (!rs.length) return T.page('chat', 'Hamjamiyat', 'premium', `Chat Premium tarifidan boshlab`, `Premium egalari o'zaro chatda muloqot qiladi. Max egalari esa alohida Max chatida ovozli xabar ham yuboradi.`);
    if (!rs.includes(CH.room)) CH.room = rs[0];
    const mx = CH.room === 'max';
    return {
      html: shell('chat', `<div class="page-h"><div><h1>Hamjamiyat</h1><p>${mx ? `Max egalari uchun yopiq chat — matn va ovozli xabarlar.` : `Premium va Max egalari uchun umumiy chat.`}</p></div><span style="margin-right:56px">${T.chip(T.cur(), 18)}</span></div>
        <div class="filters">${rs.map(r => `<button class="pill ${r === CH.room ? 'on' : ''}" data-act="ch-room" data-r="${r}">${T.logo(r, 16)} ${NAME[r]} chat</button>`).join('')}${rs.length === 1 && rs[0] === 'premium' ? `<button class="pill" data-act="pay" data-what="max">${T.logo('max', 16)} Max chat — qulflangan</button>` : ''}</div>
        <div class="card chat-room ${mx ? 'chat-max' : ''}"><div id="ch-list" class="ch-list"><p class="mute" style="text-align:center;padding:30px">Yuklanmoqda…</p></div>
          ${live() ? `<form class="ch-in" data-form="ch-send"><input id="ch-i" class="input" maxlength="500" placeholder="Xabar yozing…" autocomplete="off">${mx ? `<button type="button" id="ch-mic" class="btn soft ch-mic" data-act="ch-mic" aria-label="Ovozli xabar">${ico('mic') || '🎙'}</button>` : ''}<button class="btn primary" type="submit" aria-label="Yuborish">${ico('send')}</button></form><div id="ch-rec" class="ch-rec" hidden></div>` : `<p class="mute" style="padding:16px">Chat uchun tizimga kiring.</p>`}</div>`),
      mount() { chStop(); CH.msgs = []; CH.last = 0; if (!live()) { chPaint(); return; } chPoll(true); CH.timer = setInterval(() => chPoll(false), 4000); },
      unmount() { chStop(); },
    };
  };
  async function chSend(body) {
    const r = await fetch(api() + '/chat/send', { method: 'POST', headers: auth(), body: JSON.stringify({ room: CH.room, ...body }) }); const j = await r.json().catch(() => ({}));
    if (!r.ok) { toast(j.error || 'Yuborilmadi'); return false; } await chPoll(false); const l = $('ch-list'); if (l) l.scrollTop = l.scrollHeight; return true;
  }
  function chRecCancel() { try { if (CH.rec && CH.rec.state !== 'inactive') { CH.rec._cancel = true; CH.rec.stop(); } } catch (e) { } clearInterval(CH.recTimer); CH.rec = null; const b = $('ch-rec'); if (b) b.hidden = true; const m = $('ch-mic'); if (m) m.classList.remove('rec'); }
  V.acts = Object.assign(V.acts || {}, {
    'ch-room'(el) { CH.room = el.dataset.r; V.rerender(); },
    async 'ch-mic'() {
      if (CH.rec) { CH.rec.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) { toast(`Bu brauzerda ovoz yozish yo'q`); return; }
      let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Mikrofonga ruxsat bering'); return; }
      const chunks = []; const rec = new MediaRecorder(st); CH.rec = rec; CH.recT = Date.now();
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        st.getTracks().forEach(t => t.stop()); clearInterval(CH.recTimer); const cancel = rec._cancel, dur = Date.now() - CH.recT; CH.rec = null;
        const b = $('ch-rec'); if (b) b.hidden = true; const m = $('ch-mic'); if (m) m.classList.remove('rec');
        if (cancel || dur < 700) return;
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); if (blob.size > 420000) { toast(`Ovozli xabar juda uzun`); return; }
        const rd = new FileReader(); rd.onload = () => chSend({ voice: rd.result }); rd.readAsDataURL(blob);
      };
      rec.start(); const b = $('ch-rec'), m = $('ch-mic'); if (m) m.classList.add('rec'); if (b) { b.hidden = false; }
      const tick = () => { const s = Math.floor((Date.now() - CH.recT) / 1000); const bb = $('ch-rec'); if (bb) bb.innerHTML = `<span class="rd"></span> Yozilmoqda… ${s}s <small>(bosing: yuborish)</small> <button type="button" class="btn sm soft" data-act="ch-cancel">Bekor</button>`; if (s >= 30 && CH.rec) CH.rec.stop(); };
      tick(); CH.recTimer = setInterval(tick, 500);
    },
    'ch-cancel'() { chRecCancel(); },
    async 'ch-play'(el) {
      const id = el.dataset.id; if (CH.aud) { CH.aud.pause(); CH.aud = null; document.querySelectorAll('.cv.on').forEach(x => x.classList.remove('on')); if (el.classList.contains('on')) return; }
      try {
        if (!CH.blobs[id]) { const r = await fetch(api() + '/chat/voice/' + id, { headers: auth() }); if (!r.ok) throw 0; CH.blobs[id] = URL.createObjectURL(await r.blob()); }
        const a = new Audio(CH.blobs[id]); CH.aud = a; el.classList.add('on'); a.onended = () => { el.classList.remove('on'); CH.aud = null; }; a.play();
      } catch (e) { toast(`Ovoz yuklanmadi`); }
    },
  });
  V.forms = Object.assign(V.forms || {}, {
    async 'ch-send'() { const i = $('ch-i'), t = i.value.trim(); if (!t) return; i.value = ''; if (!(await chSend({ text: t }))) i.value = t; },
  });
})();
