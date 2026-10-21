/* CMS: admin paneldan boshqariladigan kontent. Server /config (sozlamalar) va /content (qo'shimcha savollar + tahrirlar)
   brauzer keshidan darhol qo'llanadi, so'ng yangisi olinadi; o'zgargan bo'lsa sahifa bir marta yangilanadi. */
(function () {
  const CFG = window.YOLDOSH, KEY = 'chorraha_cms_v1';
  if (!(CFG.apiBase && CFG.telegramBot)) return;
  const api = (CFG.apiBase || '').replace(/\/$/, '');
  const NUM = ['premiumPrice', 'marathonPrice', 'trialDays', 'freeRunsPerDay', 'freeTestSize', 'refNeed', 'refNeedPaid', 'refRewardDays', 'passPercent', 'examQuestions', 'examMinutes', 'price3', 'price12'];
  const BOOL = ['allFree'], TXT = ['announcement', 'payCard', 'payName', 'payNote', 'supportTelegram'];
  if (window.V) V.applyPrices = () => { };   // eski demo-narx tizimi o'chiriladi: narxlar endi serverdagi sozlamalardan
  const CMS = (window.CMS = { NUM, BOOL, TXT, settings: {}, content: { questions: [], edits: [] } });
  const base = { allFree: CFG.allFree };   // asl qiymatlar (admin o'chirib qo'ysa qaytarish uchun)
  NUM.forEach(k => { base[k] = CFG[k]; });
  BANK.ALLQ = BANK.Q.slice();             // admin ro'yxati uchun: yashirilganlar ham shu yerda
  BANK.ORIG = {}; BANK.Q.forEach(q => { BANK.ORIG[q.n] = { text: q.text, options: q.options.map(o => ({ label: o.label })), answer: q.answer }; });

  function applySettings(s) {
    CMS.settings = s || {};
    NUM.forEach(k => { if (typeof CMS.settings[k] === 'number') CFG[k] = CMS.settings[k]; else if (base[k] !== undefined) CFG[k] = base[k]; });
    BOOL.forEach(k => { if (typeof CMS.settings[k] === 'boolean') CFG[k] = CMS.settings[k]; else if (base[k] !== undefined) CFG[k] = base[k]; });
    TXT.forEach(k => { CFG[k] = typeof CMS.settings[k] === 'string' ? CMS.settings[k] : ''; });
  }
  function applyContent(c) {
    CMS.content = c || { questions: [], edits: [] };
    const ed = {}; (CMS.content.edits || []).forEach(e => { ed[e.n] = e; });
    const keep = [];
    BANK.ALLQ.forEach(q => {
      const e = ed[q.n]; q.edited = !!e; q.hidden = !!(e && e.hide);
      const o = BANK.ORIG[q.n]; if (o) { q.text = o.text; q.options = o.options.map(x => ({ label: x.label })); q.answer = o.answer; }
      if (e) {
        if (e.text) q.text = e.text;
        if (e.options && e.options.length >= 2) q.options = e.options.map(label => ({ label }));
        if (e.answer !== null && e.answer !== undefined && e.answer < q.options.length) q.answer = e.answer;
        if (e.explain) (window.EXPL = window.EXPL || {})[q.n] = e.explain;
      }
      if (!q.hidden) keep.push(q);
    });
    // admin qo'shgan savollar
    BANK.Q.length = 0; keep.forEach(q => BANK.Q.push(q));
    Object.keys(BANK.byId).forEach(id => { if (/^c\d+$/.test(id)) delete BANK.byId[id]; });
    ALLC.length = 0;
    (CMS.content.questions || []).forEach(r => {
      const tp = BANK.topicById[r.topic] || BANK.topicById.rules || BANK.TOPICS[0], n = 5000 + r.id;
      const q = { id: 'c' + r.id, n, topic: tp.id, level: 2, kind: r.img ? 'photo' : 'text', text: r.text, options: r.options.map(label => ({ label })), answer: r.answer, topicName: tp.name, official: true, custom: true, cid: r.id };
      if (r.img) q.img = /^media:(\d+)$/.test(r.img) ? api + '/media/' + r.img.slice(6) : r.img;
      BANK.Q.push(q); BANK.byId[q.id] = q; ALLC.push(q);
      if (r.explain) (window.EXPL = window.EXPL || {})[n] = r.explain;
    });
    BANK.byId && keep.forEach(q => { BANK.byId[q.id] = q; });
    BANK.ALLQ.filter(q => q.hidden).forEach(q => { delete BANK.byId[q.id]; });
  }
  const ALLC = (CMS.allCustom = []);
  let cached = null; try { cached = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  if (cached) { applySettings(cached.settings); applyContent(cached.content); }

  const sig = (o) => JSON.stringify(o);
  async function refresh() {
    try {
      const [a, b] = await Promise.all([fetch(api + '/config').then(r => r.json()), fetch(api + '/content').then(r => r.json())]);
      const fresh = { settings: a.settings || {}, content: { questions: b.questions || [], edits: b.edits || [] } };
      if (sig(fresh) === sig(cached)) return;
      try { localStorage.setItem(KEY, sig(fresh)); } catch (e) { }
      const first = !cached; cached = fresh;
      applySettings(fresh.settings); applyContent(fresh.content);
      if (!/quiz|run|exam/.test(location.hash) && window.V && V.rerender) V.rerender();
      void first;
    } catch (e) { }
  }
  CMS.refresh = refresh; CMS.applySettings = applySettings; CMS.applyContent = applyContent;
  setTimeout(refresh, 200);
})();
