/* Qisqa tushuntirish kartasi + ovozli (Telegram "golos" uslubidagi) o'qish. Ovoz: oldindan tayyorlangan audio (audio/<n>.mp3, o'zbekcha ayol ovozi); topilmasa brauzer ovozi. */
(function () {
  const { esc } = UI;
  const V = (window.V = window.V || {});
  const txt = (q) => (window.EXPL && window.EXPL[q.n]) || '';
  const BARS = 30, pat = Array.from({ length: BARS }, (_, i) => 28 + Math.round(Math.abs(Math.sin(i * 1.7) * 0.6 + Math.sin(i * 0.5) * 0.4) * 62));
  const Voice = (window.Voice = { rate: 1, id: null, timer: null });
  const speakText = (q, ok) => txt(q);
  const est = (q, ok) => Math.max(3, Math.round(speakText(q, ok).split(/\s+/).length * 0.42 / Voice.rate));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const RU = () => window.I18N && I18N.lang === 'ru';
  const pickVoice = () => {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    if (RU()) return vs.find(v => /^ru/i.test(v.lang) && /female|milena|irina|svetlana|katya|google/i.test(v.name)) || vs.find(v => /^ru/i.test(v.lang)) || null;
    const fem = /female|ayol|aleksandra|svetlana|irina|milena|katya|zira|aria|jenny|samantha|google/i;
    return vs.find(v => /^uz/i.test(v.lang) && fem.test(v.name)) || vs.find(v => /^uz/i.test(v.lang)) || vs.find(v => /^(ru|tr|kk)/i.test(v.lang) && fem.test(v.name)) || vs.find(v => /^(ru|tr|kk)/i.test(v.lang)) || null;
  };
  Voice.audio = null;
  Voice.stop = () => { try { speechSynthesis.cancel(); } catch (e) { } if (Voice.audio) { Voice.audio.pause(); Voice.audio = null; } clearInterval(Voice.timer); Voice.id = null; document.querySelectorAll('.vm.on').forEach(el => { el.classList.remove('on'); el.querySelectorAll('i').forEach(b => b.classList.remove('f')); }); };
  const tick = (el, id, dur, t0, au) => { const bars = [...el.querySelectorAll('.vm-w i')], clock = el.querySelector('.vm-t'); clearInterval(Voice.timer);
    Voice.timer = setInterval(() => { if (!document.body.contains(el)) { Voice.stop(); return; } const cur = au ? au.currentTime : (Date.now() - t0) / 1000, d = au && au.duration ? au.duration : dur, p = Math.min(1, cur / d);
      bars.forEach((b, i) => b.classList.toggle('f', i / BARS < p)); clock.textContent = fmt(Math.min(Math.round(d), Math.round(cur))); }, 120); };
  const synth = (el, q, ok, id) => {
    if (!('speechSynthesis' in window)) { UI.toast('Bu qurilmada ovoz mavjud emas'); Voice.stop(); return; }
    const u = new SpeechSynthesisUtterance(speakText(q, ok)); const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = RU() ? 'ru-RU' : 'uz-UZ';
    u.rate = 0.92 * Voice.rate; u.pitch = 1.1; u.onend = u.onerror = () => { if (Voice.id === id) Voice.stop(); };
    tick(el, id, est(q, ok), Date.now(), null); speechSynthesis.speak(u);
  };
  Voice.play = (el) => {
    const id = el.dataset.id; if (Voice.id === id) { Voice.stop(); return; }
    Voice.stop(); const q = BANK.byId[id]; if (!q) return; const ok = el.dataset.ok === '1';
    Voice.id = id; el.classList.add('on');
    if (RU()) { synth(el, q, ok, id); return; }
    const au = new Audio('audio/' + q.n + '.mp3'); au.playbackRate = Voice.rate; Voice.audio = au;
    au.onended = () => { if (Voice.id === id) Voice.stop(); };
    au.onerror = () => { if (Voice.id === id) { Voice.audio = null; synth(el, q, ok, id); } };
    au.onloadedmetadata = () => { const c = el.querySelector('.vm-t'); if (c && au.duration) c.textContent = fmt(Math.round(au.duration / Voice.rate)); };
    au.play().then(() => tick(el, id, 8, 0, au)).catch(() => { if (Voice.id === id) { Voice.audio = null; synth(el, q, ok, id); } });
  };
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  const player = (q, ok) => `<div class="vm" data-id="${q.id}" data-ok="${ok ? 1 : 0}"><button class="vm-p" data-act="vm-play" data-id="${q.id}" data-ok="${ok ? 1 : 0}" aria-label="Ovozli tushuntirish"><svg viewBox="0 0 24 24"><path class="pl" d="M8 5v14l11-7z"/><path class="ps" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg></button>
    <div class="vm-w">${pat.map(h => `<i style="height:${h}%"></i>`).join('')}</div><span class="vm-t">${fmt(est(q, ok))}</span><button class="vm-s" data-act="vm-speed">${Voice.rate}×</button></div>`;
  /* ok=false: xato javob kartasi; ok=true: qisqa "to'g'ri" kartasi */
  V.explain = (q, pick, ok) => {
    const t = txt(q), right = q.options[q.answer].label, mine = !ok && q.options[pick] ? q.options[pick].label : '';
    return `<div class="xp ${ok ? 'ok' : 'no'}"><div class="xp-h">${ok ? "✓ To'g'ri!" : 'Nega xato?'}</div>
      ${ok ? '' : `<div class="xp-row bad"><small>Siz tanladingiz</small><span>${esc(mine)}</span></div>`}
      <div class="xp-row good"><small>To'g'ri javob</small><span>${esc(right)}</span></div>
      ${t ? `<p class="xp-t">${esc(t)}</p>` : ''}${player(q, ok)}</div>`;
  };
  V.acts = Object.assign(V.acts || {}, {
    'vm-play'(el) { Voice.play(el.closest('.vm') || el); },
    'vm-speed'(el) { const r = [1, 1.25, 0.8]; Voice.rate = r[(r.indexOf(Voice.rate) + 1) % 3]; document.querySelectorAll('.vm-s').forEach(b => b.textContent = Voice.rate + '×'); if (Voice.audio) Voice.audio.playbackRate = Voice.rate; else if (Voice.id) { const id = Voice.id, p = document.querySelector(`.vm[data-id="${id}"]`); Voice.stop(); if (p) Voice.play(p); } },
  });
})();
