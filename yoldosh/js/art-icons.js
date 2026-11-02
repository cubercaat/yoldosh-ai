/* Rangli «ilova» ikonkalari: ikki qatlamli (yarim shaffof asos + aniq chiziq) oq belgilar. Gradient qalqon ichiga qo'yiladi. */
(function () {
  const G = {
    list: ['<rect x="4" y="3.5" width="16" height="17" rx="4"/>', '<path d="M8 9h8M8 12.5h8M8 16h5"/>'],
    flag: ['<path d="M5 4h12l-2.5 4.2L17 12H5z"/>', '<path d="M5 3v18"/>'],
    users: ['<circle cx="9" cy="8.5" r="3.6"/><path d="M2.5 20c.3-3.8 3-5.8 6.5-5.8s6.200 2 6.500 5.800z"/>', '<circle cx="17" cy="9" r="2.400"/><path d="M16.500 14.300c2.600.1 4.700 1.700 5 5"/>'],
    redo: ['<circle cx="12" cy="12" r="8.500"/>', '<path d="M20 12a8 8 0 1 1-2.500-5.800M20 4v4.500h-4.500"/>'],
    ticket: ['<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.200a1.800 1.800 0 0 0 0 3.600V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.200a1.800 1.800 0 0 0 0-3.600z"/>', '<path d="M14 7.500v1.600M14 11.200v1.600M14 14.900v1.600"/>'],
    grid: ['<rect x="3.500" y="3.500" width="7.500" height="7.500" rx="2.200"/><rect x="13" y="13" width="7.500" height="7.500" rx="2.200"/>', '<rect x="13" y="3.500" width="7.500" height="7.500" rx="2.200"/><rect x="3.500" y="13" width="7.500" height="7.500" rx="2.200"/>'],
    book: ['<path d="M5 5.500A2.500 2.500 0 0 1 7.500 3H19v15.500H7.500A2.500 2.500 0 0 0 5 21z"/>', '<path d="M5 18.500A2.500 2.500 0 0 1 7.500 16H19M10 7.500h5"/>'],
    alert: ['<path d="M12 3.200 22 20H2z"/>', '<path d="M12 9.500v4.500M12 17.200v.1"/>'],
    cone: ['<circle cx="12" cy="12" r="9.500"/>', '<circle cx="12" cy="12" r="9.500"/><circle cx="12" cy="12" r="2.300"/><path d="M2.600 11h6.500M14.900 11h6.500M12 14.400V21"/>'],
    camera: ['<path d="M3 8.500A2.500 2.500 0 0 1 5.500 6H8l1.500-2h5L16 6h2.500A2.500 2.500 0 0 1 21 8.500v9a2.500 2.500 0 0 1-2.500 2.500h-13A2.500 2.500 0 0 1 3 17.500z"/>', '<circle cx="12" cy="13" r="3.600"/>'],
    target: ['<circle cx="12" cy="12" r="9.500"/>', '<circle cx="12" cy="12" r="5.800"/><circle cx="12" cy="12" r="1.600"/>'],
    hash: ['<rect x="3.500" y="3.500" width="17" height="17" rx="5"/>', '<path d="M9.500 6.500 8.500 17.500M15.500 6.500l-1 11M6.500 10h11M6 14h11"/>'],
    bookmark: ['<path d="M6.500 3h11a1 1 0 0 1 1 1v17l-6.500-4.300L5.500 21V4a1 1 0 0 1 1-1z"/>', '<path d="M9.500 8h5"/>'],
    sparkles: ['<path d="M10 4l1.900 5.100L17 11l-5.100 1.900L10 18l-1.900-5.100L3 11l5.100-1.900z"/>', '<path d="M18 3v4M16 5h4M18.500 15.500v4M16.500 17.500h4"/>'],
    flame: ['<path d="M12 2.500c.5 3.300 4.800 5.200 4.800 10a4.800 4.800 0 0 1-9.600 0c0-2 1-3.300 1.900-4.300.2 1.400 1 2.200 1.900 2.500C11 8.500 11 5 12 2.500z"/>', '<path d="M12 21.300a3 3 0 0 1-3-3c0-1.500 1.300-2.300 2-3.600 1.300 1 4 1.700 4 4.200a3 3 0 0 1-3 2.400z"/>'],
    calendar: ['<rect x="3.500" y="5" width="17" height="15.500" rx="3.500"/>', '<path d="M3.500 10.500h17M8 3v4M16 3v4M8 15h3"/>'],
    bolt: ['<path fill-opacity=".95" d="M13.500 2 4.500 13.500h6.500L10 22l9.500-12H13z"/>', '<path d="M13.500 2 4.500 13.500h6.500L10 22l9.500-12H13z"/>'],
    send: ['<path d="M21.500 3 2.500 10.500l6.800 2.700L12 20z"/>', '<path d="M21.500 3 9.300 13.200M9.300 13.200 12 20l9.500-17"/>'],
    crown: ['<path fill-opacity=".9" d="M3 8l4.500 4L12 5l4.500 7L21 8l-2 11H5z"/>', '<path d="M5.500 19h13"/>'],
    swords: ['<path fill-opacity=".98" d="M4 4l7.500 7.500-2 2L2 6V4zM20 4l-7.500 7.500 2 2L22 6V4z"/>', '<path d="M7.500 15.500l-3 3M16.500 15.500l3 3M6.500 17.500l-2-2M17.500 17.500l2-2"/>'],
    trophy: ['<path d="M7 4h10v5.500a5 5 0 0 1-10 0z"/>', '<path d="M7 6H4v1.500A3.500 3.500 0 0 0 7.500 11M17 6h3v1.500A3.500 3.500 0 0 1 16.500 11M12 14.500V18M8.500 20.500h7M10 18h4"/>'],
    play: ['<circle cx="12" cy="12" r="9.500"/>', '<path d="M10 8.200v7.600l6-3.800z" fill="#fff"/>'],
    star: ['<path fill-opacity=".95" d="M12 3l2.700 5.600 6.100.8-4.500 4.200 1.100 6L12 16.700 6.600 19.600l1.100-6L3.200 9.400l6.100-.8z"/>', '<path d="M12 3l2.700 5.600 6.100.8-4.500 4.200 1.100 6L12 16.700 6.600 19.600l1.100-6L3.200 9.400l6.100-.8z"/>'],
    note: ['<path d="M6 3h9l4 4v14H6z"/>', '<path d="M14.500 3v4.500H19M9 12h7M9 15.500h7"/>'],
    trend: ['<path d="M3 17l6-6 4 4 8-8v10H3z"/>', '<path d="M3 17l6-6 4 4 8-8M16 7h5v5"/>'],
    home: ['<path d="M4 11l8-7 8 7v8.500a1.500 1.500 0 0 1-1.500 1.500h-13A1.500 1.500 0 0 1 4 19.500z"/>', '<path d="M10 21v-6h4v6"/>'],
  };
  /** ai(nom, o'lcham) — oq ikki qatlamli belgi; gradient fon uchun */
  function ai(name, s) {
    const g = G[name]; if (!g) return window.UI ? UI.ico(name) : '';
    s = s || 22;
    return `<svg class="ai" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><g fill="#fff" fill-opacity=".34" stroke="none">${g[0]}</g><g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${g[1]}</g></svg>`;
  }
  /** Robot-bot (emoji o'rniga) */
  let n = 0;
  function bot(s) {
    const a = 'rb' + (++n), b = 'rc' + n; s = s || 24;
    return `<svg class="ai-bot" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${a}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7DF3FF"/><stop offset="1" stop-color="#5B6CFF"/></linearGradient><linearGradient id="${b}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1240"/><stop offset="1" stop-color="#0A0720"/></linearGradient></defs>
      <path d="M24 3v6" stroke="#FF8CC6" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="4" r="3.200" fill="#FF6FB5"/>
      <rect x="3" y="21" width="5" height="11" rx="2.500" fill="#5B6CFF"/><rect x="40" y="21" width="5" height="11" rx="2.500" fill="#5B6CFF"/>
      <rect x="7" y="9" width="34" height="32" rx="12" fill="url(#${a})"/><rect x="11" y="15" width="26" height="18" rx="8" fill="url(#${b})"/>
      <circle cx="19" cy="24" r="3.200" fill="#7DF3FF"/><circle cx="29" cy="24" r="3.200" fill="#7DF3FF"/><path d="M20 29.500q4 2.600 8 0" stroke="#FF6FB5" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M12 12q4-3 9-3" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;
  }
  window.ART = { ai, bot, has: (k) => !!G[k] };
})();
