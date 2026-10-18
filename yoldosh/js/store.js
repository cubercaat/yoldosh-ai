/* Holat, statistika va demo talabalar. Ma'lumotlar brauzerda (localStorage) saqlanadi. */
(function () {
  const LS = 'yoldosh_v1';
  const TOPICS = BANK.TOPICS;
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysAgoKey = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
  const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
  const dayDiff = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
  const penaltyFor = (k) => k <= 2 ? 10 : 20;                        // 1–2-kun: -10, 3-kundan: -20 (yengil jarima)

  const UL = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const genUid = (seed) => { const r = BANK.rng(BANK.hash('uid' + seed)); return UL[Math.floor(r() * UL.length)] + UL[Math.floor(r() * UL.length)] + String(1000 + Math.floor(r() * 9000)); };

  const Store = {
    s: null,
    myUid() { const s = this.s; if (!s.uid) { let n = Date.now() + Math.random(), u; do { u = genUid(n++); } while (u === 'AA77'); s.uid = u; this.save(); } return s.uid; },
    load() {
      try { this.s = JSON.parse(localStorage.getItem(LS)); } catch (e) { this.s = null; }
      if (!this.s) this.s = { role: null, name: '', history: [], exams: [], days: {}, messages: [], consent: false };
    },
    save() { try { localStorage.setItem(LS, JSON.stringify(this.s)); } catch (e) { } },
    reset() { try { localStorage.removeItem(LS); } catch (e) { } this.load(); },
    login(role, name) { this.s.role = role; if (name) this.s.name = name; this.save(); },
    logout() { this.s.role = null; this.save(); },

    /* faollik vaqti (soniya) */
    tick(sec) { const k = dayKey(); this.s.days[k] = (this.s.days[k] || 0) + sec; this.save(); },
    todaySec() { return this.s.days[dayKey()] || 0; },
    last7Min() { return Array.from({ length: 7 }, (_, i) => Math.round((this.s.days[daysAgoKey(6 - i)] || 0) / 60)); },

    /* javoblar */
    record(q, chosen, mode) {
      const ok = chosen === q.answer;
      this.s.history.push({ q: q.id, t: q.topic, ok, c: chosen, ts: Date.now(), m: mode });
      this.applyPenalties(); const firstToday = this.s.lastDay !== dayKey(); this.s.lastDay = dayKey(); if (ok) this.addPoints(1, `To'g'ri javob`);
      if (firstToday && this.s.role === 'student') { this.addPoints(5, `Kunlik bonus`); this.notify(`Bugungi birinchi javob uchun +5 ball (kunlik bonus).`, 'bonus'); }
      this.nbUpdate(q, ok);
      if (this.s.history.length > 1500) this.s.history.splice(0, this.s.history.length - 1500);
      this.save(); return ok;
    },
    addExam(score, total, sec, byTopic) { this.s.exams.push({ ts: Date.now(), score, total, sec, byTopic }); this.save(); },
    topicStats() {
      const st = {}; TOPICS.forEach(t => st[t.id] = { n: 0, ok: 0 });
      this.s.history.slice(-400).forEach(h => { if (st[h.t]) { st[h.t].n++; if (h.ok) st[h.t].ok++; } });
      return st;
    },
    /* so'nggi urinishida xato qilingan savollar */
    wrongIds() {
      const last = {}; this.s.history.forEach(h => last[h.q] = h);
      return Object.values(last).filter(h => !h.ok).map(h => h.q).filter(id => BANK.byId[id]);
    },
    seenCount() { return new Set(this.s.history.map(h => h.q)).size; },
    streakDays() {
      let n = 0, i = (this.s.days[daysAgoKey(0)] || 0) >= 60 ? 0 : 1;
      for (; i < 60; i++) { if ((this.s.days[daysAgoKey(i)] || 0) >= 60) n++; else break; }
      return n;
    },
    /* ---- guruhlar va ro'yxatdan o'tish (demo: brauzerda; haqiqiysi backend: /teacher/groups, /auth/telegram) ---- */
    groups() {
      if (!this.s.groups) { this.s.groups = [{ id: 'A', name: `A guruh`, code: 'DEMOA', demo: true }, { id: 'B', name: `B guruh`, code: 'DEMOB', demo: true }]; this.save(); }
      return this.s.groups;
    },
    groupById(id) { return this.groups().find(g => g.id === id) || null; },
    groupByCode(code) { code = String(code || '').trim().toUpperCase(); return this.groups().find(g => g.code === code) || null; },
    addGroup(name) {
      const g = { id: 'g' + Date.now().toString(36), name, code: 'G-' + Math.random().toString(36).slice(2, 8).toUpperCase(), created: Date.now() };
      this.groups().push(g); this.save(); return g;
    },
    removeGroup(id) { this.s.groups = this.groups().filter(g => g.id !== id); (this.s.roster || []).forEach(r => { if (r.groupId === id) r.groupId = null; }); if (this.s.groupId === id) this.s.groupId = null; this.save(); },
    /* ro'yxatdan o'tgandan keyin guruh kodini kiritish */
    joinGroupLate(code, groupName) {
      const s = this.s; let g = this.groupByCode(code);
      if (!g) { g = { id: 'x' + String(code).replace(/\W/g, ''), name: groupName || 'Guruh ' + code, code: String(code).toUpperCase(), remote: true }; this.groups().push(g); }
      s.groupId = g.id; const me = (s.roster || []).find(r => r.id === s.meId); if (me) me.groupId = g.id; this.save(); return g;
    },
    /* yangi talaba: oldingi talabaning natijalari ro'yxatda "arxiv"ga o'tadi, yangisi toza boshlaydi */
    registerStudent({ first, last, tg, code, groupName, region, ref }) {
      const s = this.s, groups = this.groups();
      let g = code ? this.groupByCode(code) : null;
      if (!g && code && groupName) { g = { id: 'x' + code.replace(/\W/g, ''), name: groupName, code: String(code).toUpperCase(), remote: true }; groups.push(g); }
      s.roster = s.roster || [];
      if (s.meId && s.name && (s.history.length || s.exams.length)) { const old = s.roster.find(r => r.id === s.meId); if (old) old.archived = true; }
      Object.assign(s, { history: [], exams: [], days: {}, messages: [], sets: {}, lessons: {}, points: undefined, pts: [], notes: [], pro: undefined, honor: undefined, lastDay: null, penDone: null, nb: {}, sp: {}, seasons: {}, plan: undefined, refCode: undefined, refCount: 0, refPaid: 0, refRewarded: undefined, runs: undefined, sub: undefined, uid: undefined, uidBought: undefined, payments: [], marathon: undefined, trialUntil: undefined, usedRef: undefined });
      const id = 'r' + Date.now().toString(36);
      s.first = first; s.last = last; s.name = `${first} ${last}`; s.tg = tg || ''; s.groupId = g ? g.id : null; s.meId = id; s.role = 'student'; s.region = region || ''; this._pts(); this.notify(`Xush kelibsiz! Ro'yxatdan o'tgani uchun +100 ball oldingiz.`, 'bonus');
      if (ref && ref !== s.refCode && /^R-[A-Z0-9]{6}$/.test(ref)) { s.usedRef = ref; this.addPoints(50, `Do'st taklifi bilan keldi`); this.notify(`Do'st taklifi uchun +50 ball.`, 'bonus'); this.creditRef(ref); }
      s.roster.push({ id, uid: this.myUid(), name: s.name, first, last, tg: s.tg, groupId: s.groupId, region: s.region, joined: Date.now() });
      this.save(); return g;
    },
    /* ---- Xato daftari (intervalli takrorlash: 1, 3, 7, 14 kun) ---- */
    nbUpdate(q, ok) {
      const nb = this.s.nb = this.s.nb || {}, now = Date.now(), DAY = 864e5, STEPS = [1, 3, 7, 14]; let e = nb[q.id];
      if (!ok) nb[q.id] = { q: q.id, t: q.topic, count: (e ? e.count : 0) + 1, ok: 0, box: 0, next: now + DAY, last: now, first: e ? e.first : now, done: false };
      else if (e && !e.done) { e.box++; e.ok = (e.ok || 0) + 1; e.last = now; if (e.box >= STEPS.length) { e.done = true; e.next = 0; } else e.next = now + STEPS[e.box] * DAY; }
    },
    nbAll() { return Object.values(this.s.nb || {}).filter(e => BANK.byId[e.q]); },
    nbActive() { return this.nbAll().filter(e => !e.done); },
    nbDue() { const now = Date.now(); return this.nbActive().filter(e => e.next <= now); },
    /* ---- mavsum (oylik liga) va referal ---- */
    seasonKey(d) { return dayKey(d || new Date()).slice(0, 7); },
    seasonPts(k) { return ((this.s.sp || {})[k || this.seasonKey()]) || 0; },
    claimRefs() {
      const s = this._pts(), code = s.refCode, pend = (window.__refPending = window.__refPending || null);
      let map; try { map = JSON.parse(localStorage.getItem('yoldosh_ref') || '{}'); } catch (e) { map = {}; }
      const n = map[code] || 0, np = map[code + ':paid'] || 0;
      if (n || np) { delete map[code]; delete map[code + ':paid']; try { localStorage.setItem('yoldosh_ref', JSON.stringify(map)); } catch (e) { } }
      if (n) { s.refCount = (s.refCount || 0) + n; this.addPoints(50 * n, `Do'st taklifi`); this.notify(`Do'stingiz ro'yxatdan o'tdi! Taklif uchun +${50 * n} ball.`, 'bonus'); }
      if (np) { s.refPaid = (s.refPaid || 0) + np; this.notify(`Taklif qilgan do'stingiz Premium oldi!`, 'bonus'); }
      this.refReward();
    },
    /* 15 ta do'st taklif qilib, ulardan 2 tasi Premium olsa — Premium sovg'a (bir marta) */
    refReward() {
      const s = this.s, C = window.YOLDOSH || {}; if (s.refRewarded || (s.refCount || 0) < (C.refNeed || 15) || (s.refPaid || 0) < (C.refNeedPaid || 2)) return;
      s.refRewarded = true; const base = s.sub && s.sub.until > Date.now() ? s.sub.until : Date.now(); s.sub = { until: base + (C.refRewardDays || 30) * 864e5, gift: true };
      this.notify(`Tabriklaymiz! ${C.refNeed || 15} ta do'st va ${C.refNeedPaid || 2} ta Premium uchun sizga ${C.refRewardDays || 30} kun Premium sovg'a qilindi.`, 'bonus'); this.save();
    },
    creditRefPaid(code) { let map; try { map = JSON.parse(localStorage.getItem('yoldosh_ref') || '{}'); } catch (e) { map = {}; } map[code + ':paid'] = (map[code + ':paid'] || 0) + 1; try { localStorage.setItem('yoldosh_ref', JSON.stringify(map)); } catch (e) { } },    creditRef(code) { let map; try { map = JSON.parse(localStorage.getItem('yoldosh_ref') || '{}'); } catch (e) { map = {}; } map[code] = (map[code] || 0) + 1; try { localStorage.setItem('yoldosh_ref', JSON.stringify(map)); } catch (e) { } },
    /* ---- ball, jarima, bildirishnoma, Test Pro, faxriylar ---- */
    _pts() { const s = this.s; if (s.points === undefined) { s.points = 100; s.pts = [{ ts: Date.now(), d: 100, r: `Ro'yxatdan o'tgani uchun` }]; s.joinDay = dayKey(); s.notes = s.notes || []; s.sp = { [this.seasonKey()]: 100 }; s.trialUntil = Date.now() + ((window.YOLDOSH && YOLDOSH.trialDays) || 7) * 864e5; } if (!s.refCode) s.refCode = 'R-' + Math.random().toString(36).slice(2, 8).toUpperCase(); return s; },
    addPoints(d, reason) {
      const s = this._pts(); const nd = d < 0 ? -Math.min(-d, s.points) : d; if (!nd) return 0;
      s.points += nd; s.sp = s.sp || {}; { const k = this.seasonKey(); s.sp[k] = Math.max(0, (s.sp[k] || 0) + nd); } s.pts.push({ ts: Date.now(), d: nd, r: reason }); if (s.pts.length > 150) s.pts.splice(0, s.pts.length - 150); this.save(); return nd;
    },
    notify(text, kind) { const s = this.s; s.notes = s.notes || []; s.notes.unshift({ id: Date.now() + Math.random(), ts: Date.now(), text, kind: kind || 'info', read: false }); if (s.notes.length > 40) s.notes.length = 40; this.save(); },
    unread() { return (this.s.notes || []).filter(n => !n.read).length; },
    /* To'liq o'tkazib yuborilgan kunlar uchun jarima: 1–2-kun −10, 3-kundan har kuni −20 (ball tugamaguncha) */
    applyPenalties() {
      const s = this._pts(); if (s.role !== 'student') return []; const today = dayKey(), base = s.lastDay || s.joinDay; if (!base) return [];
      let d = addDays(s.penDone && s.penDone > base ? s.penDone : base, 1); const out = []; let guard = 0;
      while (d < today && guard++ < 500) {
        const k = dayDiff(base, d), amt = penaltyFor(k), got = -this.addPoints(-amt, `${k}-kun test yechmadingiz`);
        if (got > 0) out.push({ day: d, k, amt: got }); s.penDone = d; d = addDays(d, 1);
      }
      if (out.length) { const sum = out.reduce((a, x) => a + x.amt, 0); this.notify(`Test yechmagan kunlar uchun −${sum} ball. Qaytarish uchun bugun test yeching!`, 'penalty'); }
      this.save(); return out;
    },
    /* Bugun test yechmagan bo'lsa: ertaga qancha ball yo'qotishi mumkin */
    risk() {
      const s = this._pts(); if (s.lastDay === dayKey()) return null; const base = s.lastDay || s.joinDay; if (!base) return null;
      const k = dayDiff(base, dayKey()); if (k < 1) return null; return { amt: Math.min(penaltyFor(k), s.points), k, zero: s.points <= 0 };
    },
    reminder() {
      const s = this._pts(); if (s.role !== 'student') return; const r = this.risk(), today = dayKey(); if (!r || s.remDay === today || r.zero) return;
      s.remDay = today; const txt = `Bugun hali test yechmadingiz. Kamida bitta test yeching, aks holda ertaga −${r.amt} ball yo'qotasiz.`; this.notify(txt, 'reminder');
      try { if (window.Notification && Notification.permission === 'granted') new Notification(`Chorraha`, { body: txt }); } catch (e) { }
    },
    proStat() { const s = this.s; s.pro = s.pro || { attempts: 0, passes: 0, streak: 0, badge: false, master: false }; return s.pro; },
    recordPro(pass) {
      const p = this.proStat(); p.attempts++; p.last = Date.now();
      if (pass) {
        p.passes++; p.streak++;
        if (!p.badge) { p.badge = true; this.addPoints(200, `Test Pro: galichka`); this.notify(`Tabriklaymiz! Test Pro dan o'tdingiz va galichka (✓) oldingiz. +200 ball.`, 'bonus'); }
        else this.addPoints(100, `Test Pro: yana o'tdingiz`);
        if (p.streak >= 3 && !p.master) { p.master = true; this.addPoints(500, `Master galichka`); this.notify(`Master! Test Pro dan 3 marta ketma-ket xatosiz o'tdingiz. Master galichkasi va +500 ball.`, 'bonus'); }
      } else p.streak = 0;
      this.save(); return p;
    },
    me() {
      const topics = this.topicStats(); const exams = this.s.exams.map(e => Math.round(e.score / e.total * 100));
      const la = this.s.history.length ? Math.max(...this.s.history.map(h => h.ts)) : 0;
      return { id: 'me', uid: this.myUid(), name: this.s.name || 'Siz (demo)', region: this.s.region || '', points: this.s.points, group: this.s.groupId || null, tg: this.s.tg || '', me: true, topics, days: this.last7Min(), lastActive: la ? Math.floor((Date.now() - la) / 864e5) : 99, exams, seen: this.seenCount() };
    },
  };

  /* ---------- tayyorlik ko'rsatkichlari ---------- */
  const total = BANK.Q.length;
  function overall(st) {
    let n = 0, ok = 0; Object.values(st.topics).forEach(t => { n += t.n; ok += t.ok; });
    return { n, ok, acc: n ? ok / n * 100 : 0 };
  }
  function readiness(st) {
    const o = overall(st); if (!o.n) return 0;
    const exam = st.exams.length ? st.exams.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, st.exams.length) : o.acc * .9;
    const cov = Math.min(1, st.seen / total) * 100;
    const conf = Math.min(1, o.n / 60);
    return Math.max(0, Math.min(99, Math.round((0.65 * o.acc + 0.15 * exam + 0.2 * cov) * (0.4 + 0.6 * conf))));
  }
  const status = (r) => r >= 85 ? { key: 'ok', label: `Tayyor`, cls: 'ok' } : r >= 70 ? { key: 'near', label: `Yaqin`, cls: 'warn' } : { key: 'no', label: `Tayyor emas`, cls: 'bad' };
  const topicAcc = (st, id) => st.topics[id].n ? Math.round(st.topics[id].ok / st.topics[id].n * 100) : null;
  function weakTopics(st, thr = 70) {
    return TOPICS.map(t => ({ t, acc: topicAcc(st, t.id), n: st.topics[t.id].n })).filter(x => x.n >= 3 && x.acc < thr).sort((a, b) => a.acc - b.acc);
  }

  /* ---------- demo talabalar (deterministik) ---------- */
  const NAMES = [`Azizbek Karimov`, `Madina Yusupova`, `Jasur Rahmonov`, `Sevara Ismoilova`, `Bobur Tursunov`, `Nilufar Abdullayeva`, `Sardor Ergashev`, `Dilnoza Qodirova`, `Otabek Nazarov`, `Malika Hasanova`, `Javohir Saidov`, `Zarina Aliyeva`, `Sherzod Mirzayev`, `Kamola Boboeva`];
  // [aniqlik, kunlik daqiqa, oxirgi faollik (kun oldin), zaif mavzu indeksi yoki -1, ko'rilgan savollar ulushi, imtihon natijalari]
  const P = [
    [.95, 55, 0, -1, .95, [95, 90, 95]], [.9, 48, 0, -1, .9, [90, 85]], [.74, 35, 0, 2, .7, [75, 70]], [.88, 40, 1, -1, .85, [85, 90]],
    [.62, 20, 0, 4, .5, [60]], [.93, 60, 0, -1, .92, [95, 95]], [.55, 12, 3, 1, .35, [55]], [.81, 30, 1, 6, .75, [80, 75]],
    [.7, 25, 0, 2, .6, [70, 65]], [.9, 50, 0, -1, .9, [90, 95]], [.45, 5, 6, 2, .25, []], [.78, 32, 2, 3, .7, [75]],
    [.66, 18, 1, 2, .5, [65, 70]], [.35, 0, 9, 0, .15, []],
  ];
  function makeDemo() {
    return P.map((p, i) => {
      const r = BANK.rng(1000 + i * 77);
      const topics = {}; let act = Math.max(.3, p[1] / 50);
      TOPICS.forEach((t, k) => {
        const base = p[3] === k ? p[0] - .28 : p[0] + (r() - .5) * .12;
        const n = Math.round((20 + r() * 25) * act);
        topics[t.id] = { n, ok: Math.round(n * Math.max(.15, Math.min(.99, base))) };
      });
      const days = Array.from({ length: 7 }, (_, d) => (p[2] > 6 - d || p[1] === 0) ? 0 : Math.max(0, Math.round(p[1] * (.6 + r() * .8))));
      return { id: 'd' + i, uid: genUid('d' + i), name: NAMES[i], group: i % 2 ? 'B' : 'A', topics, days, lastActive: p[2], exams: p[5], seen: Math.round(p[4] * total) };
    });
  }
  const DEMO = makeDemo();
  const DEMO_MSGS = [
    { id: 'm1', from: `Jasur Rahmonov`, topic: `Taqiqlovchi belgilar`, text: `Ustoz, «Turish taqiqlanadi» va «To'xtash taqiqlanadi» belgilarini doim adashtiryapman. Qisqacha tushuntirib bera olasizmi?`, ago: 35, status: 'new' },
    { id: 'm2', from: `Bobur Tursunov`, topic: `Axborot-ishora belgilari`, text: `Aylanma yo'lda kim ustun ekanini tushunmayapman.`, ago: 190, status: 'new' },
    { id: 'm3', from: `Sherzod Mirzayev`, topic: `Umumiy qoidalar`, text: `Imtihondan oldin qaysi mavzularni takrorlasam bo'ladi?`, ago: 1500, status: 'done' },
  ];

  /* ---------- ustoz paneli uchun jamlanma ---------- */
  function students() {
    const arr = DEMO.slice(); if (Store.s.name || Store.s.history.length) arr.unshift(Store.me());
    (Store.s.roster || []).filter(r => r.id !== Store.s.meId).forEach(r => arr.push({ id: r.id, uid: r.uid || genUid(r.id), name: r.name, group: r.groupId, tg: r.tg, topics: Object.fromEntries(TOPICS.map(t => [t.id, { n: 0, ok: 0 }])), days: [0, 0, 0, 0, 0, 0, 0], lastActive: 99, exams: [], seen: 0, fresh: true }));
    return arr;
  }
  const groupName = (id) => { if (!id) return `Guruhsiz`; const g = Store.groupById(id); return g ? g.name : (id === 'A' ? 'A guruh' : id === 'B' ? 'B guruh' : id); };
  function summary(list) {
    const N = list.length || 1;
    const withR = list.map(s => ({ s, r: readiness(s), o: overall(s) }));
    const activeToday = list.filter(s => s.days[6] > 0).length;
    const activeWeek = list.filter(s => s.days.some(d => d > 0)).length;
    const avgMin = Math.round(list.reduce((a, s) => a + s.days[6], 0) / Math.max(1, activeToday));
    const avgWeekMin = Math.round(list.reduce((a, s) => a + s.days.reduce((x, y) => x + y, 0) / 7, 0) / N);
    const ready = withR.filter(x => x.r >= 85).length;
    const mastery = Math.round(withR.reduce((a, x) => a + x.o.acc, 0) / N);
    const topics = TOPICS.map(t => {
      const act = list.filter(s => s.topics[t.id].n >= 3);
      const weak = act.filter(s => topicAcc(s, t.id) < 70).length;
      const avg = act.length ? Math.round(act.reduce((a, s) => a + topicAcc(s, t.id), 0) / act.length) : 0;
      return { t, weak, act: act.length, pct: act.length ? Math.round(weak / act.length * 100) : 0, avg };
    });
    return { N, activeToday, activeWeek, avgMin, avgWeekMin, ready, mastery, topics, withR, inactive: list.filter(s => s.lastActive >= 3) };
  }
  const fmtMin = (m) => m >= 60 ? `${Math.floor(m / 60)} soat ${m % 60 ? (m % 60) + ' daq' : ''}`.trim() : `${m} daq`;
  const fmtAgo = (min) => min < 60 ? `${min} daqiqa oldin` : min < 1440 ? `${Math.round(min / 60)} soat oldin` : `${Math.round(min / 1440)} kun oldin`;

  window.ST = { genUid, groupName, Store, TOPICS, overall, readiness, status, topicAcc, weakTopics, students, summary, DEMO, DEMO_MSGS, fmtMin, fmtAgo, dayKey, total };
})();



