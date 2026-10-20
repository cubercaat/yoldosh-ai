/* Umumiy interfeys yordamchilari */
(function () {
  const P = {
    home: `<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>`,
    book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>`,
    grid: `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,
    camera: `<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>`,
    sparkles: `<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>`,
    send: `<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>`,
    users: `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>`,
    chart: `<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`,
    clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    check: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
    x: `<path d="M6 6l12 12M18 6L6 18"/>`,
    target: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>`,
    alert: `<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/>`,
    arrow: `<path d="M5 12h14M13 6l6 6-6 6"/>`,
    search: `<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>`,
    bolt: `<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>`,
    flame: `<path d="M12 22c4 0 7-2.8 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 .5 4-4 6-4 12 0 4.2 3 7 7 7z"/>`,
    logout: `<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>`,
    shield: `<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>`,
    msg: `<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/>`,
    flag: `<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>`,
    redo: `<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>`,
    list: `<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
    copy: `<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>`,
    upload: `<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>`,
    play: `<path d="M7 4l13 8-13 8z"/>`,    mic: `<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>`,
    bell: `<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>`,
    trend: `<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>`,
    star: `<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.7-2.2 3-2.2s2.4.6 3 2.2M15 10h3M15 14h3"/>`,
    gear: `<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>`,
    trophy: `<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>`,
    bookmark: `<path d="M7 4h10v16l-5-3.5L7 20z"/>`,
    ticket: `<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v12"/>`,
    cone: `<path d="M12 3l5 15H7z"/><path d="M4 21h16M9 11h6"/>`,
    car: `<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><circle cx="7" cy="18" r=".8"/><circle cx="17" cy="18" r=".8"/>`,
    hash: `<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/>`,
    note: `<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/>`,
    swords: `<path d="M5 19l9-9M14 6l4-2 2 2-2 4zM19 19l-9-9M10 6L6 4 4 6l2 4z"/>`,    crown: `<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>`,
    calendar: `<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
    print: `<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>`,
    gift: `<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v8h14v-8M12 9v12M12 9c-3 0-4-4-1.5-4S12 9 12 9zm0 0c3 0 4-4 1.5-4S12 9 12 9z"/>`,
    image: `<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/>`,
    brush: `<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-4 2-4 4 0 2-1 3-2 4 3 1 8 0 8-4"/>`,
    mail: `<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 7l9 6 9-6"/>`,
  };
  const ico = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const logo = () => `<svg class="logo" viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" rx="230" fill="#18294f"/><rect x="14" y="14" width="996" height="996" rx="218" fill="none" stroke="#b8f53b" stroke-opacity=".35" stroke-width="22"/><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="68"><path d="M512 862V640" stroke="#dfe6f7"/><path d="M512 640Q512 478 372 478H318" stroke="#dfe6f7"/><path d="M512 640V330" stroke="#dfe6f7"/><path d="M512 640Q512 478 652 478H706" stroke="#b8f53b"/></g><g stroke-linejoin="round" stroke-width="22"><path d="M322 396L190 478L322 560Z" fill="#dfe6f7" stroke="#dfe6f7"/><path d="M430 340L512 196L594 340Z" fill="#dfe6f7" stroke="#dfe6f7"/><path d="M702 396L834 478L702 560Z" fill="#b8f53b" stroke="#b8f53b"/></g></svg>`;
  /* Avtomaktab brendi: nom, logo, rang. Ilova ichida (sidebar/kirish) ko'rinadi; "Chorraha" kichik yozuv bo'lib qoladi. */
  const schoolBrand = () => { try { return (window.ST && ST.Store.s && ST.Store.s.brand) || null; } catch (e) { return null; } };
  const brand = () => {
    const b = schoolBrand();
    if (b && b.name) return `<a class="brand school" href="#/">${b.logo ? `<img class="logo" src="${b.logo}" alt="">` : logo()}<span class="bn"><b>${esc(b.name)}</b><small>Chorraha</small></span></a>`;
    return `<a class="brand" href="#/">${logo()}<span>Chorraha</span></a>`;
  };
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  function applyBrand() {
    const b = schoolBrand(), root = document.documentElement.style, col = b && /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#B8F53B';
    root.setProperty('--acc', col); root.setProperty('--acc-ink', lum(col) > .55 ? '#0B1400' : '#FFFFFF');
  }
  const MONS = [`Yanvar`, `Fevral`, `Mart`, `Aprel`, `May`, `Iyun`, `Iyul`, `Avgust`, `Sentyabr`, `Oktyabr`, `Noyabr`, `Dekabr`];
  const dt = (t, time = true) => { const d = new Date(t), p = (n) => String(n).padStart(2, '0'); return `${d.getDate()}-${MONS[d.getMonth()].toLowerCase()}` + (time ? `, ${p(d.getHours())}:${p(d.getMinutes())}` : ''); };
  const tone = (p) => p >= 85 ? '#34D399' : p >= 70 ? '#FBBF24' : '#FF5C70';
  const initials = (n) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = (n) => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const ava = (n, size = 40) => `<span class="ava" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * .3)}px;font-size:${Math.round(size * .36)}px;background:linear-gradient(135deg,hsl(${hue(n)} 70% 55%),hsl(${(hue(n) + 50) % 360} 70% 45%))">${esc(initials(n))}</span>`;

  let gid = 0;
  function gauge(pct, opt = {}) {
    const id = 'gg' + (++gid), r = 54, c = 2 * Math.PI * r, col = opt.color || tone(pct);
    return `<svg viewBox="0 0 120 120"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${opt.color2 || (pct >= 85 ? '#B8F53B' : pct >= 70 ? '#FDE68A' : '#FFA3B0')}"/></linearGradient></defs>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="url(#${id})" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/></svg>`;
  }
  const bar = (p, col) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, p))}%;background:${col || tone(p)}"></i></div>`;

  let toastT;
  function toast(msg) {
    const l = document.getElementById('layer'); l.querySelectorAll('.toast').forEach(e => e.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; l.appendChild(t);
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800);
  }
  function modal(html) {
    closeModal();
    const l = document.getElementById('layer'); const w = document.createElement('div'); w.className = 'modal-bg'; w.id = 'modal';
    w.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="x" data-act="close" aria-label="Yopish">${ico('x')}</button>${html}</div>`;
    w.addEventListener('click', e => { if (e.target === w) closeModal(); }); l.appendChild(w);
  }
  function closeModal() { const m = document.getElementById('modal'); if (m) m.remove(); }
  /* confirm()/prompt() sandbox ichida bloklanadi — ilovaning o'z dialogi */
  function confirmBox(text, yes, cb) {
    modal(`<h3 style="font-size:20px">${esc(text)}</h3><div class="ai-acts" style="margin-top:20px"><button class="btn primary" id="cfy">${esc(yes || 'Ha')}</button><button class="btn soft" data-act="close">Bekor qilish</button></div>`);
    const b = document.getElementById('cfy'); if (b) b.addEventListener('click', () => { closeModal(); cb(); });
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { } ta.remove(); return ok;
    }
  }
  window.UI = { ico, esc, logo, brand, tone, ava, gauge, bar, toast, modal, closeModal, copy, initials, confirmBox, applyBrand, schoolBrand, dt, MONS };
})();


