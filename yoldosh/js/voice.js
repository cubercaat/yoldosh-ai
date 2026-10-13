/* Qisqa tushuntirish kartasi + ovozli (Telegram "golos" uslubidagi) o'qish. Ovoz: brauzerning ichki nutq sintezi, imkon qadar ayol ovozi. */
(function () {
  const { esc } = UI;
  const V = (window.V = window.V || {});
  const txt = (q) => (window.EXPL && window.EXPL[q.n]) || '';
  const BARS = 30, pat = Array.from({ length: BARS }, (_, i) => 28 + Math.round(Math.abs(Math.sin(i * 1.7) * 0.6 + Math.sin(i * 0.5) * 0.4) * 62));
  const Voice = (window.Voice = { rate: 1, id: null, timer: null });
  const speakText = (q, ok) => { const t = txt(q), has = /^(Rasmdagi|To'g'ri javob)/i.test(t); return `${ok ? "To'g'ri!" : 'Xato.'} ${has ? '' : `To'g'ri javob: ${q.options[q.answer].label}. `}${t}`; };
  const est = (q, ok) => Math.max(3, Math.round(speakText(q, ok).split(/\s+/).length * 0.42 / Voice.rate));
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const pickVoice = () => {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const fem = /female|ayol|aleksandra|svetlana|irina|milena|katya|zira|aria|jenny|samantha|google/i;
    return vs.find(v => /^uz/i.test(v.lang) && fem.test(v.name)) || vs.find(v => /^uz/i.test(v.lang)) || vs.find(v => /^(ru|tr|kk)/i.test(v.lang) && fem.test(v.name)) || vs.find(v => /^(ru|tr|kk)/i.test(v.lang)) || null;
  };
  Voice.stop = () => { try { speechSynthesis.cancel(); } catch (e) { } clearInterval(Voice.timer); Voice.id = null; document.querySelectorAll('.vm.on').forEach(el => { el.classList.remove('on'); el.querySelectorAll('i').forEach(b => b.classList.remove('f')); }); };
  Voice.play = (el) => {
    if (!('speechSynthesis' in window)) { UI.toast('Bu qurilmada ovoz mavjud emas'); return; }
    const id = el.dataset.id; if (Voice.id === id) { Voice.stop(); return; }
    Voice.stop();
    const q = BANK.byId[id]; if (!q) return; const ok = el.dataset.ok === '1', total = est(q, ok);
    const u = new SpeechSynthesisUtterance(speakText(q, ok)); const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'uz-UZ';
    u.rate = 0.92 * Voice.rate; u.pitch = 1.15;
    Voice.id = id; el.classList.add('on'); const bars = [...el.querySelectorAll('.vm-w i')], t0 = Date.now(), clock = el.querySelector('.vm-t');
    u.onend = u.onerror = () => { if (Voice.id === id) Voice.stop(); };
    Voice.timer = setInterval(() => {
      if (!document.body.contains(el)) { Voice.stop(); return; }
      const p = Math.min(1, (Date.now() - t0) / 1000 / total); bars.forEach((b, i) => b.classList.toggle('f', i / BARS < p)); clock.textContent = fmt(Math.min(total, Math.round((Date.now() - t0) / 1000)));
    }, 150);
    speechSynthesis.speak(u);
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
    'vm-speed'(el) { const r = [1, 1.25, 0.8]; Voice.rate = r[(r.indexOf(Voice.rate) + 1) % 3]; document.querySelectorAll('.vm-s').forEach(b => b.textContent = Voice.rate + '×'); if (Voice.id) { const id = Voice.id, p = document.querySelector(`.vm[data-id="${id}"]`); Voice.stop(); if (p) Voice.play(p); } },
  });
})();
