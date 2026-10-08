/* Yo'ldosh AI — demo rejimdagi "miya". Backend ulanganda (config.js → apiBase) haqiqiy AI ishlaydi,
   ulanmagan bo'lsa shu fayldagi ichki bilim bazasi javob beradi. */
(function () {
  const norm = (s) => (s || '').toLowerCase().replace(/[ʻʼ`‘’´]/g, "'");
  const STOP = new Set(['belgi', 'belgisi', 'belgini', 'nima', 'nimani', 'anglatadi', 'qanday', 'haqida', 'tushuntir', 'tushuntiring', 'menga', 'bering', 'qanaqa', 'degani', 'nimaga', 'uchun', 'bilan', 'qaysi', 'bormi', 'kerak']);

  const CATEGORY = {
    warning: `Qizil hoshiyali uchburchak: «Ehtiyot bo'l!» — oldinda xavf bor. Hech narsani taqiqlamaydi, faqat ogohlantiradi.`,
    priority: `Kim birinchi o'tishini aytadi. Sariq romb — ustunlik sizda, teskari uchburchak va STOP — yo'l berasiz.`,
    prohibitory: `Qizil halqa = «mumkin emas». Ichidagi rasm nima taqiqlanganini ko'rsatadi.`,
    mandatory: `Ko'k doira = «majburiy». Strelka yoki raqam nimani bajarishingizni aytadi.`,
    info: `Ko'k kvadrat = «ma'lumot». Hech narsani taqiqlamaydi va buyurmaydi, faqat joyni ko'rsatadi.`,
    signals: `Svetofor va tartibga soluvchi: qizil — to'xta, sariq — tayyor bo'l, yashil — yur (lekin piyodaga yo'l ber).`,
    rules: `Asosiy g'oya: xavfsizlik birinchi. Shubha bo'lsa — tezlikni kamaytiring va yo'l bering.`,
    cross: `Kesishmada tartib: avval svetofor/tartibga soluvchi, keyin belgilar (asosiy yo'l, «Yo'l bering», STOP), belgi bo'lmasa — o'ng qo'l qoidasi. Chapga burilgan esa qarshidan to'g'ri ketayotganga yo'l beradi.`,
    marks: `Chiziq qoidasi: sizga yaqin chiziq uzuq bo'lsa — kesib o'tish mumkin (xavfsiz bo'lsa), uzluksiz bo'lsa — mumkin emas. Zebra — piyoda, ko'ndalang qalin chiziq — to'xtash joyi.`,
  };

  const FAQ = [
    { k: [/stop.*(yo'?l ber|farq)|yo'?l ber.*stop|farq.*stop/], a: `STOP bilan «Yo'l bering» farqi:\n• STOP — to'liq to'xtash SHART, hatto yo'l bo'sh bo'lsa ham.\n• «Yo'l bering» — asosiy yo'ldagilarga yo'l berasiz; yo'l bo'sh bo'lsa, to'xtamay o'tib ketish mumkin.\nEslab qolish: STOP sakkiz burchakli — «oyoq tirab to'xta».`, sign: 'p_stop' },
    { k: [/to'?xtash.*tur(ish|ib)|tur(ish|ib).*to'?xtash|to'?xtash.*farq/], a: `«To'xtash» va «turish» farqi:\n• To'xtash — qisqa muddatli to'xtab turish (masalan yo'lovchini tushirish; odatda 5 daqiqagacha).\n• Turish — uzoqroq to'xtab qolish.\nBelgilar: «To'xtash taqiqlanadi» — ikkita qizil chiziq (X), «Turish taqiqlanadi» — bitta qizil chiziq.\nBitta chiziq — to'xtash mumkin, turish mumkin emas.`, sign: 'b_nopark' },
    { k: [/aylanma|doira.*harakat|rotor/], a: `Aylanma harakat belgisi (ko'k doirada uchta strelka) bo'lsa, aylanada soat miliga TESKARI yo'nalishda yurasiz.\nUstunlik masalasi: aylanaga kirish oldida «Yo'l bering» belgisi turgan bo'lsa, aylanadagilarga yo'l berasiz. Belgi bo'lmasa, kesishma qoidalari amal qiladi — aniq holat uchun ustozingizdan so'rang.`, sign: 'm_round' },
    { k: [/o'?ng.*qo'?l|teng.*kesishma|teng ahamiyatli|kim birinchi/], a: `O'ng qo'l qoidasi: teng ahamiyatli kesishmada O'NGDAN kelayotgan transportga yo'l berasiz.\nTrick: kesishmaga yaqinlashganda o'ng tomoningizga qarang — kimdir kelayotgan bo'lsa, u ustun.\nChapga burilayotgan bo'lsangiz, qarshidan to'g'ri ketayotganga ham yo'l berasiz.` },
    { k: [/svetofor|qizil.*sariq|yashil/], a: `Svetofor:\n• Qizil — to'xtang.\n• Sariq — tayyor bo'ling, signal almashadi.\n• Yashil — yurish mumkin, lekin burilishda piyodaga yo'l bering.\n• Miltillovchi yashil — tez orada tugaydi.\nSvetofor ishlamasa, belgilar va o'ng qo'l qoidasi bo'yicha harakatlaning.` },
    { k: [/kamar/], a: `Xavfsizlik kamari — haydovchi va kamar bilan jihozlangan o'rindiqlardagi barcha yo'lovchilar uchun majburiy. Mashinani yurgizishdan oldin taqing, bu odat bo'lib qolsin.` },
    { k: [/tezlik|km\/soat|cheklov/], a: `Tezlik cheklovi belgisi (qizil halqada raqam) — shu raqamdan oshib ketmaslik kerak. Cheklov belgidan keyingi kesishmagacha amal qiladi.\nAholi punkti va undan tashqarida ruxsat etilgan tezlik qoidalarda belgilangan — aniq raqamlarni ustozingiz bilan tasdiqlang.` },
    { k: [/rang|shakl|farqlash|qanday eslab|yodlash/], a: `Belgilarni shakl va rang bo'yicha eslab qoling:\n• Qizil uchburchak — ogohlantirish\n• Qizil halqa — taqiq\n• Ko'k doira — buyruq\n• Ko'k kvadrat — ma'lumot\n• Sariq romb, teskari uchburchak, STOP — kim birinchi o'tishi (imtiyoz)\nBu 5 qoidani bilsangiz, belgining ma'nosini yarmini ko'rishning o'ziyoq taxmin qila olasiz.` },
    { k: [/qanday tayyorlan|reja|nimadan boshla|maslahat/], a: `Tayyorlanish rejasi:\n1) Avval belgilar katalogini ko'rib chiqing (Belgilar bo'limi).\n2) Har kuni 20–30 daqiqa mavzuli test yeching.\n3) «Xatolar» bo'limida xato savollarni takrorlang.\n4) Imtihondan oldin kamida 3 ta sinov imtihonini yeching.\nKichik, lekin har kuni — eng yaxshi usul.` },
    { k: [/^(salom|assalom|hayrli|hi|hello)/], a: `Salom! Men Yo'ldosh AI — yo'l belgilari va qoidalar bo'yicha yordamchingizman. Belgi nomini yozing, mavzuni so'rang yoki «Qaysi mavzuda zaifman?» deb so'rang.` },
    { k: [/rahmat|raxmat|tashakkur/], a: `Marhamat! Yana savol bo'lsa, so'rayvering. Yo'lingiz ochiq bo'lsin.` },
  ];

  function findSign(q) {
    const toks = norm(q).split(/[^a-z0-9']+/).filter(t => t.length >= 3 && !STOP.has(t));
    if (!toks.length) return null;
    let best = null, bs = 0;
    SIGNS.list.forEach(s => {
      const nm = norm(s.name), ds = norm(s.desc + ' ' + s.tip);
      let sc = 0;
      toks.forEach(t => { const st = t.slice(0, Math.max(3, t.length - 2)); if (nm.includes(st)) sc += 3; else if (ds.includes(st)) sc += 1; });
      if (/\b(40|60|90|30)\b/.test(q) && /\b(40|60|90|30)\b/.test(s.name)) { const n = q.match(/\b(40|60|90|30)\b/)[1]; if (s.name.includes(n)) sc += 4; else sc -= 3; }
      if (sc > bs) { bs = sc; best = s; }
    });
    return bs >= 3 ? best : null;
  }

  function ctxSummary() {
    const st = ST.Store.me(); const weak = ST.weakTopics(st); const r = ST.readiness(st);
    return { st, weak, r, o: ST.overall(st) };
  }

  const AI = {
    /* Xato javobni tushuntirish */
    explainWrong(q, chosen) {
      const opt = q.options[chosen]; let compare = '';
      if (opt && opt.ref && SIGNS.byId[opt.ref]) {
        const c = SIGNS.byId[opt.ref];
        compare = q.id.startsWith('a_') ? `Siz tanlagan javob boshqa belgiga — «${c.name}» ga to'g'ri keladi: ${c.desc}` : `Siz tanlagan «${c.name}» belgisi boshqa narsani bildiradi: ${c.desc}`;
      } else if (opt) compare = `Siz tanlagan «${opt.label}» varianti bu holatda to'g'ri emas.`;
      return { title: `To'g'ri javob: ${q.options[q.answer].label}`, body: q.explain, compare, tip: q.tip };
    },
    /* "Tushunmadim" — soddaroq tushuntirish */
    simplify(q) {
      const cat = CATEGORY[q.topic];
      let s = `Keling, oddiyroq qilib tushuntiraman.\n\n`;
      s += `Asosiy g'oya: ${cat}\n\n`;
      if (q.tip) s += `Eslab qolish usuli: ${q.tip}\n\n`;
      s += `Bu savolda esa: ${q.explain}`;
      return s;
    },
    /* Chat */
    local(msg) {
      const m = norm(msg).trim();
      const ctx = ctxSummary();
      if (/zaif|qiynal|qaysi mavzu|xato(lar)?im|nimani takrorla/.test(m)) {
        if (!ctx.o.n) return { text: `Hali test yechmagansiz, shuning uchun zaif mavzularni aniqlay olmayman. «Testlar» bo'limidan istalgan mavzuni boshlang — keyin aniq tahlil beraman.` };
        const rows = ST.TOPICS.map(t => ({ t, a: ST.topicAcc(ctx.st, t.id), n: ctx.st.topics[t.id].n })).filter(x => x.n >= 1).sort((a, b) => a.a - b.a);
        const worst = rows.slice(0, 3).map(x => `• ${x.t.name}: ${x.a}% (${x.n} ta javob)`).join('\n');
        return { text: `Hozirgi natijalaringiz bo'yicha eng zaif mavzular:\n${worst}\n\nTavsiyam: shu mavzularning har birini 10 tadan savol bilan takrorlang, keyin «Xatolar» bo'limini oching.`, action: { label: `Zaif mavzuni mashq qilish`, go: `#/app/quiz/${rows[0].t.id}` } };
      }
      if (/tayyor|imtihon(ga)?.*(tayyor|bora)|o'?taman/.test(m) && !/qanday tayyorlan/.test(m)) {
        const r = ctx.r;
        const text = !ctx.o.n ? `Hali ma'lumot yo'q. Bir nechta test yeching, keyin tayyorlik darajangizni hisoblayman.` :
          r >= 85 ? `Tayyorlik darajangiz ${r}% — imtihonga tayyor ko'rinasiz! Baribir sinov imtihonini yechib, natijani tasdiqlang.` :
            r >= 70 ? `Tayyorlik darajangiz ${r}% — yaqinlashdingiz. Zaif mavzularni takrorlab, 2–3 ta sinov imtihonini yeching.` :
              `Tayyorlik darajangiz ${r}% — hali tayyor emassiz, lekin bu normal. Har kuni 20–30 daqiqa mashq qiling, birinchi navbatda zaif mavzulardan boshlang.`;
        return { text, action: { label: `Sinov imtihonini boshlash`, go: `#/app/exam` } };
      }
      for (const f of FAQ) if (f.k.some(re => re.test(m))) return { text: f.a, sign: f.sign };
      const s = findSign(m);
      if (s) return { text: `${s.name}\n\n${s.desc}\n\nEslab qolish: ${s.tip}`, sign: s.id, followup: true };
      return { text: `Savolingizni to'liq tushunmadim. Quyidagilarni sinab ko'ring:\n• Belgi nomini yozing (masalan: «Yo'l bering»)\n• «STOP bilan Yo'l bering farqi nima?»\n• «Qaysi mavzuda zaifman?»\n\nYoki ustozga yuboring — u aniq javob beradi.`, askTeacher: true };
    },
    async ask(msg) {
      const base = (window.YOLDOSH.apiBase || '').replace(/\/$/, '');
      if (base) {
        try {
          const ctx = ctxSummary();
          const r = await fetch(base + '/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: msg, context: { name: ST.Store.s.name, readiness: ctx.r, weak: ctx.weak.map(w => `${w.t.name} ${w.acc}%`) } }) });
          if (r.ok) { const j = await r.json(); if (j.text) return { text: j.text }; }
        } catch (e) { /* demo rejimga qaytamiz */ }
      }
      await new Promise(r => setTimeout(r, 450 + Math.random() * 450));
      return this.local(msg);
    },

    /* Ustoz uchun tahlil */
    insights(sm) {
      const out = [];
      if (sm.inactive.length) out.push({ tone: 'bad', title: `${sm.inactive.length} talaba 3 kundan beri kirmayapti`, text: `${sm.inactive.slice(0, 4).map(s => s.name.split(' ')[0]).join(', ')}${sm.inactive.length > 4 ? ' va boshqalar' : ''}. Imtihon sanasi yaqinlashmoqda — shaxsiy eslatma yuborish tavsiya etiladi.`, act: `Eslatma yuborish` });
      const worst = sm.topics.filter(x => x.act >= 4).sort((a, b) => b.pct - a.pct)[0];
      if (worst && worst.pct >= 20) out.push({ tone: 'warn', title: `«${worst.t.name}» — eng muammoli mavzu`, text: `Talabalarning ${worst.pct}% i (${worst.weak} nafar) bu mavzuda 70% dan past natija ko'rsatmoqda. Keyingi darsda shu mavzuni qayta tushuntirish foyda beradi.`, act: `Mavzuni ko'rish` });
      const near = sm.withR.filter(x => x.r >= 70 && x.r < 85);
      if (near.length) out.push({ tone: 'info', title: `${near.length} talaba imtihonga juda yaqin`, text: `Ular tayyorlik chegarasiga yaqin (70–84%). 2–3 ta sinov imtihoni va zaif mavzularni takrorlash ularni «Tayyor» bosqichiga chiqaradi.`, act: `Ro'yxatni ko'rish` });
      const low = sm.withR.filter(x => x.s.days.slice(-3).reduce((a, b) => a + b, 0) < 30 && x.s.lastActive < 3);
      if (low.length) out.push({ tone: 'warn', title: `${low.length} talaba kam shug'ullanmoqda`, text: `So'nggi 3 kunda jami 30 daqiqadan kam vaqt sarflashgan. Kunlik 20–30 daqiqa maqsad qo'yish samarali.`, act: `Ro'yxatni ko'rish` });
      out.push({ tone: 'ok', title: `${sm.ready} talaba imtihonga tayyor`, text: `Umumiy o'zlashtirish ${sm.mastery}%. Tayyor talabalarni imtihonga yozish mumkin.`, act: null });
      return out;
    },
  };
  window.AI = AI;
})();
