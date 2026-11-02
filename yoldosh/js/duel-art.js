/* DUEL: maxsus SVG belgilar (emoji o'rniga) — gerb, liga qalqonlari, VS belgisi */
(function () {
  let n = 0;
  const id = () => 'da' + (++n);
  const LG = [
    { n: 'Bronza', a: '#F0B27A', b: '#9A4F1C', c: '#5E2C0B' },
    { n: 'Kumush', a: '#F4F7FD', b: '#A5B1C8', c: '#5E6B84' },
    { n: 'Oltin', a: '#FFE59A', b: '#F5B21C', c: '#9A5B00' },
    { n: 'Olmos', a: '#C8FBFF', b: '#5DD6FF', c: '#5B5BFF' },
  ];
  /** liga qalqoni: i = 0..3 — qirrali qalqon, markazda yulduz, pastda darajani ko'rsatuvchi nuqtalar */
  function league(i, s) {
    const L = LG[i || 0], g = id(), h = id(), k = (i || 0) + 1; s = s || 24;
    const dots = Array.from({ length: k }, (_, j) => `<circle cx="${28 + (j - (k - 1) / 2) * 7}" cy="46" r="2.200" fill="#fff" fill-opacity=".95"/>`).join('');
    return `<svg class="da-lg" width="${s}" height="${s * 1.1}" viewBox="0 0 56 62" aria-hidden="true"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.a}"/><stop offset=".5" stop-color="${L.b}"/><stop offset="1" stop-color="${L.c}"/></linearGradient>
      <linearGradient id="${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <path d="M28 1.500l23 7.500v18.500c0 15.500-9.800 26.500-23 33.500C14.800 54 5 43 5 27.500V9z" fill="url(#${g})"/>
      <path d="M28 6l18.500 6v15.500c0 12.500-7.800 21.500-18.500 27.500C17.300 49 9.500 40 9.500 27.500V12z" fill="rgba(8,4,28,.42)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>
      <path d="M28 14.500l3.600 7.400 8.100 1.100-5.900 5.700 1.400 8.100L28 32.800l-7.200 4 1.400-8.100-5.900-5.700 8.100-1.100z" fill="url(#${g})" stroke="rgba(255,255,255,.6)" stroke-width=".8" stroke-linejoin="round"/>
      ${dots}<path d="M5 9l23-7.500V30L5 22z" fill="url(#${h})" opacity=".28"/></svg>`;
  }
  /** Duel gerbi: qalqon + kesishgan qilichlar + chaqmoq */
  function crest(s) {
    const a = id(), b = id(), c = id(); s = s || 72;
    return `<svg class="da-crest" width="${s}" height="${s}" viewBox="0 0 96 96" aria-hidden="true"><defs>
      <linearGradient id="${a}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5C93"/><stop offset=".5" stop-color="#A855F7"/><stop offset="1" stop-color="#4F46E5"/></linearGradient>
      <linearGradient id="${b}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#B7C2DA"/></linearGradient>
      <linearGradient id="${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#FF9F1C"/></linearGradient></defs>
      <path d="M48 5l36 11v25c0 22-14.500 36-36 47C26.500 77 12 63 12 41V16z" fill="url(#${a})"/>
      <path d="M48 11l30 9.500V41c0 18.500-12 30.500-30 40C30 71.500 18 59.500 18 41V20.500z" fill="rgba(10,6,32,.55)"/>
      <g stroke="url(#${b})" stroke-width="5" stroke-linecap="round"><path d="M28 27l40 40"/><path d="M68 27L28 67"/></g>
      <g fill="url(#${b})"><path d="M25 24l7 2-2 7z"/><path d="M71 24l-7 2 2 7z"/></g>
      <g stroke="#FFD166" stroke-width="4.500" stroke-linecap="round"><path d="M22 70l8-8"/><path d="M74 70l-8-8"/></g>
      <path d="M36 12l4 5 8-8 8 8 4-5-2 10H38z" fill="url(#${c})" stroke="#2A1203" stroke-width="1" stroke-linejoin="round" transform="translate(-4 -9)"/><path d="M52 34L41 52h8l-3.500 15 14-21h-8.500z" fill="url(#${c})" stroke="#2A1203" stroke-width="1.200" stroke-linejoin="round"/></svg>`;
  }
  /** VS belgisi */
  function vs() { const a = id(); return `<svg class="da-vs" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${a}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#FF4F8B"/></linearGradient></defs><circle cx="32" cy="32" r="29" fill="rgba(12,8,36,.85)" stroke="url(#${a})" stroke-width="3"/><text x="32" y="40" text-anchor="middle" font-size="23" font-weight="900" fill="url(#${a})" font-family="Manrope,system-ui,sans-serif">VS</text></svg>`; }
  /** do'stlar belgisi (ikki odam + yurak) */
  window.DuelArt = { league, crest, vs, names: LG.map((x) => x.n) };
})();
