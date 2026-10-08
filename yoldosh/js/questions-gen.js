/* Chorrahalardan o'tish: QOIDALAR MEXANIZMI asosida avtomatik savollar.
   To'g'ri javob qo'lda yozilmaydi — dastur o'tish ustunligini hisoblaydi (belgilar, o'ng qo'l qoidasi, chapga burilish).
   Qarama-qarshi (aylanib qoladigan) holatlar chiqarib tashlanadi. Hammasi aniq va takrorlanadigan (seed bo'yicha). */
(function () {
  const { shuffle, hash } = BANK;
  const byId = SIGNS.byId;
  const COLORS = ['#2F6BFF', '#E5384A', '#F2B01E'], LET = ['A', 'B', 'C'], NAMES = ['ko\'k', 'qizil', 'sariq'];
  const MAN = { S: `to'g'riga`, R: `o'ngga`, L: `chapga` };
  /* yo'nalish: 0=N(janubdan shimolga), 1=E, 2=S, 3=W. Har bir yo'nalish va manevr bosib o'tadigan kvadrantlar */
  const PATH = {
    0: { S: ['SE', 'NE'], R: ['SE'], L: ['SE', 'NE', 'NW'] }, 1: { S: ['SW', 'SE'], R: ['SW'], L: ['SW', 'SE', 'NE'] },
    2: { S: ['NW', 'SW'], R: ['NW'], L: ['NW', 'SW', 'SE'] }, 3: { S: ['NE', 'NW'], R: ['NE'], L: ['NE', 'NW', 'SW'] },
  };
  const road = (h) => h % 2 === 0 ? 'NS' : 'EW';
  const conflict = (a, b) => PATH[a.h][a.m].some(c => PATH[b.h][b.m].includes(c));

  /* a ning b ga yo'l berishi kerakmi? sabab qaytaradi yoki null */
  function yields(a, b, sc) {
    if (!conflict(a, b)) return null;
    if (sc.main) {
      const am = road(a.h) === sc.main, bm = road(b.h) === sc.main;
      if (!am && bm) return { why: 'sign', sign: sc.minor };
      if (am && !bm) return null;
    }
    if (Math.abs(a.h - b.h) === 2) {                         // qarama-qarshi
      if (a.m === 'L' && b.m !== 'L') return { why: 'left' };
      return null;
    }
    if (b.h === (a.h + 3) % 4) return { why: 'right' };       // b a ning o'ng tomonidan keladi
    return null;
  }
  function analyze(sc) {
    const n = sc.cars.length, Y = Array.from({ length: n }, () => []), why = {};
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) { const r = yields(sc.cars[i], sc.cars[j], sc); if (r) { Y[i].push(j); why[i + '>' + j] = r; } }
    // aylanib qolish (deadlock) tekshiruvi
    const st = Array(n).fill(0); let cyc = false;
    const dfs = (u) => { st[u] = 1; for (const v of Y[u]) { if (st[v] === 1) cyc = true; else if (st[v] === 0) dfs(v); } st[u] = 2; };
    for (let i = 0; i < n; i++) if (!st[i]) dfs(i);
    // ikki tomonlama ("ikkalasi ham yo'l beradi") holat — noaniq
    for (let i = 0; i < n; i++) for (const j of Y[i]) if (Y[j].includes(i)) cyc = true;
    return { Y, why, cyc };
  }

  /* ---------- SVG: sahna ---------- */
  const rot = (x, y, k) => { let px = x - 100, py = y - 100; for (let i = 0; i < k; i++) [px, py] = [-py, px]; return [100 + px, 100 + py]; };
  const START = [115, 165], HEAD = [0, 90, 180, 270];
  const ARROW = {
    S: `<path d="M115 146 V66" /><polygon points="107,70 115,56 123,70"/>`,
    R: `<path d="M115 146 V128 Q115 115 128 115 H146" /><polygon points="142,107 156,115 142,123"/>`,
    L: `<path d="M115 146 V112 Q115 85 88 85 H62" /><polygon points="66,77 52,85 66,93"/>`,
  };
  function sceneSvg(sc) {
    const cars = sc.cars.map((c, i) => {
      const [x, y] = rot(START[0], START[1], c.h), col = COLORS[i];
      const arrow = `<g transform="rotate(${c.h * 90} 100 100)" stroke="${col}" fill="${col}" stroke-width="3"><g fill="none" stroke-dasharray="6 5" stroke-linecap="round">${ARROW[c.m].split('<polygon')[0]}</g><polygon${ARROW[c.m].split('<polygon')[1]}</g>`;
      const body = `<g transform="translate(${x} ${y}) rotate(${HEAD[c.h]})"><rect x="-8" y="-15" width="16" height="30" rx="5" fill="${col}" stroke="#fff" stroke-width="1.2"/><rect x="-5.5" y="-8" width="11" height="6" rx="1.5" fill="rgba(255,255,255,.55)"/><rect x="-5.5" y="4" width="11" height="5" rx="1.5" fill="rgba(255,255,255,.35)"/></g><text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="11" fill="#fff">${LET[i]}</text>`;
      return arrow + body;
    }).join('');
    const signs = sc.main ? sc.cars.map(c => {
      const id = road(c.h) === sc.main ? 'p_main' : (sc.minor === 'stop' ? 'p_stop' : 'p_yield'), [cx, cy] = rot(144, 134, c.h);
      return `<svg x="${cx - 13}" y="${cy - 13}" width="26" height="26" viewBox="0 0 100 100">${byId[id].svg}</svg>`;
    }).join('') : '';
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chorraha sxemasi"><rect width="200" height="200" fill="#1c2230" rx="10"/>
      <rect x="70" y="0" width="60" height="200" fill="#323a4c"/><rect x="0" y="70" width="200" height="60" fill="#323a4c"/>
      <g stroke="#e7ebf5" stroke-width="1.6" stroke-dasharray="8 7" opacity=".7"><path d="M100 0 V70 M100 130 V200 M0 100 H70 M130 100 H200"/></g>
      <g stroke="#e7ebf5" stroke-width="2.4" opacity=".85"><path d="M101 128 H129 M71 72 H99 M72 101 V129 M128 71 V99"/></g>${cars}${signs}</svg>`;
  }

  /* ---------- sahnalar to'plami ---------- */
  const MANS = ['S', 'R', 'L'], CONFS = [{ main: null }, { main: 'NS', minor: 'yield' }, { main: 'NS', minor: 'stop' }, { main: 'EW', minor: 'yield' }, { main: 'EW', minor: 'stop' }];
  const all = [];
  for (let n = 2; n <= 3; n++) for (let ha = 0; ha < 4; ha++) {
    const others = [0, 1, 2, 3].filter(x => x !== ha), combos = n === 2 ? others.map(o => [o]) : [[others[0], others[1]], [others[0], others[2]], [others[1], others[2]]];
    for (const cb of combos) for (const conf of CONFS) {
      const hs = [ha, ...cb];
      const rec = (i, acc) => { if (i === hs.length) { all.push({ cars: acc.map((m, k) => ({ h: hs[k], m })), ...conf }); return; } MANS.forEach(m => rec(i + 1, [...acc, m])); };
      rec(0, []);
    }
  }
  const valid = [];
  all.forEach(sc => {
    const a = analyze(sc); if (a.cyc) return;
    if (sc.main === null && sc.cars.some(c => c.m === 'L') && sc.cars.filter(c => c.m === 'L').length > 1) { /* ikki chapga burilish — noaniq */ const ls = sc.cars.filter(c => c.m === 'L'); if (ls.some((x, i) => ls.some((y, j) => i < j && Math.abs(x.h - y.h) === 2))) return; }
    sc.an = a; valid.push(sc);
  });

  const sub = (idx) => idx.map(i => LET[i]);
  const ruTxt = (sc, a, i, j, r) => {
    const A = LET[i], B = LET[j];
    if (r.why === 'sign') return `${A} yo'lida ${r.sign === 'stop' ? 'STOP' : '«Yo\'l bering»'} belgisi bor, ${B} esa asosiy yo'lda — ${A} yo'l beradi`;
    if (r.why === 'left') return `${A} chapga burilmoqda, ${B} esa qarshidan ${sc.cars[j].m === 'S' ? 'to\'g\'ri' : 'o\'ngga'} ketmoqda — chapga burilayotgan yo'l beradi`;
    return `${B} ${A} ning o'ng tomonidan kelmoqda va yo'llar teng ahamiyatli — o'ngdan kelgan ustun`;
  };
  const setupTxt = (sc) => sc.cars.map((c, i) => `${LET[i]} (${NAMES[i]}) — ${MAN[c.m]}`).join(', ');
  const signTxt = (sc) => !sc.main ? `Belgilar yo'q (teng ahamiyatli yo'llar).` : `Yo'llardan biri asosiy yo'l belgisi bilan belgilangan, ikkinchisida ${sc.minor === 'stop' ? 'STOP' : '«Yo\'l bering»'} belgisi bor.`;

  const out = [];
  const rng = (s) => BANK.rng(s);
  shuffle(valid, 20260101).forEach((sc, idx) => {
    const { Y, why } = sc.an, n = sc.cars.length;
    const id = (t) => `g_${t}${idx}`;
    const mk = (type, text, opts, ans, explain, level) => out.push({
      id: id(type), topic: 'cross', kind: 'text', level, sceneSvg: sceneSvg(sc), text,
      options: opts.map(l => ({ label: l })), answer: ans, explain, tip: `Avval belgilar, keyin chapga burilish, keyin o'ng qo'l qoidasi.`,
    });
    const reasons = (i) => Y[i].map(j => ruTxt(sc, sc.an, i, j, why[i + '>' + j]));
    if (n === 3 && out.filter(q => q.id.startsWith('g_a')).length < 130) {                       // A kimlarga yo'l beradi?
      const need = Y[0]; const correct = need.length === 0 ? `Hech kimga, men to'xtamasdan o'taman` : need.length === 2 ? `B va C ga ikkalasiga ham` : `Faqat ${LET[need[0]]} ga`;
      let opts = [`Faqat B ga`, `Faqat C ga`, `B va C ga ikkalasiga ham`, `Hech kimga, men to'xtamasdan o'taman`];
      const o = shuffle(opts, hash(id('a')));
      mk('a', `${signTxt(sc)} Siz A (ko'k) avtomobildasiz va ${MAN[sc.cars[0].m]} ketmoqchisiz. Boshqalar: ${sc.cars.slice(1).map((c, k) => `${LET[k + 1]} (${NAMES[k + 1]}) — ${MAN[c.m]}`).join(', ')}. Siz kimga yo'l berasiz?`, o, o.indexOf(correct),
        need.length ? `${reasons(0).join('. ')}.` : `A hech kimga yo'l bermaydi: uning yo'li boshqalar bilan kesishmaydi yoki unda ustunlik bor.`, 3);
    }
    if (n === 3) {                                                                              // birinchi / oxirgi
      const free = [0, 1, 2].filter(i => Y[i].length === 0 && [0, 1, 2].every(j => j === i || conflict(sc.cars[i], sc.cars[j])));
      const last = [0, 1, 2].filter(i => Y[i].length === 2);
      if (free.length === 1 && out.filter(q => q.id.startsWith('g_f')).length < 60) {
        const o = shuffle([`A (ko'k)`, `B (qizil)`, `C (sariq)`, `Uchalasi bir vaqtda o'tadi`], hash(id('f')));
        mk('f', `${signTxt(sc)} ${setupTxt(sc)}. Qaysi avtomobil boshqalarga yo'l bermasdan birinchi bo'lib o'tadi?`, o, o.indexOf([`A (ko'k)`, `B (qizil)`, `C (sariq)`][free[0]]),
          `Birinchi o'tadigan — ${LET[free[0]]}: u hech kimga yo'l bermaydi, boshqalar esa unga yo'l beradi. ${[0, 1, 2].filter(i => i !== free[0]).flatMap(i => reasons(i).filter(t => t.includes(LET[free[0]]))).join('. ')}.`, 3);
      } else if (last.length === 1 && out.filter(q => q.id.startsWith('g_l')).length < 60) {
        const o = shuffle([`A (ko'k)`, `B (qizil)`, `C (sariq)`, `Hech biri: hammasi to'xtamasdan o'tadi`], hash(id('l')));
        mk('l', `${signTxt(sc)} ${setupTxt(sc)}. Qaysi avtomobil ikkalasiga ham yo'l berib, oxirgi bo'lib o'tadi?`, o, o.indexOf([`A (ko'k)`, `B (qizil)`, `C (sariq)`][last[0]]),
          `Oxirgi — ${LET[last[0]]}: ${reasons(last[0]).join('. ')}.`, 3);
      }
    }
    if (n === 2 && out.filter(q => q.id.startsWith('g_p')).length < 110) {                       // kim yo'l beradi / kesishmaydi
      const ab = Y[0].includes(1), ba = Y[1].includes(0), none = !ab && !ba;
      const labels = [`A (ko'k) yo'l beradi`, `B (qizil) yo'l beradi`, `Ikkalasi ham to'xtamasdan o'tadi: yo'llari kesishmaydi`, `Kim oldin kesishmaga kirsa, o'sha birinchi o'tadi`];
      const o = shuffle(labels, hash(id('p')));
      mk('p', `${signTxt(sc)} ${setupTxt(sc)}. Kim yo'l beradi?`, o, o.indexOf(none ? labels[2] : ab ? labels[0] : labels[1]),
        none ? `A va B ning harakat yo'llari kesishmaydi (yo'nalishlari va burilishlari tufayli), shuning uchun ikkalasi ham to'xtamasdan o'tadi.` : `${ab ? ruTxt(sc, sc.an, 0, 1, why['0>1']) : ruTxt(sc, sc.an, 1, 0, why['1>0'])}.`, none || sc.main === null ? 3 : 3);
    }
  });
  out.forEach(q => { q.topicName = BANK.topicById[q.topic].name; BANK.Q.push(q); BANK.byId[q.id] = q; });
  window.BANK.GEN_COUNT = out.length;
})();
