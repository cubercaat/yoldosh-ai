/* Yakuniy tozalash: oson savollar olib tashlanadi (faqat o'rta va qiyin), noaniq savollar chiqariladi,
   javob variantlari takrorlanmasligi va aynan bitta to'g'ri javob borligi tekshiriladi. */
(function () {
  const DROP = new Set(['h_c3', 'h_c6', 'h_s4', 'h_x2', 'h_p5', 'h_r12', 'h_p2', 'h_r2']);
  const keep = BANK.Q.filter(q => q.level >= 2 && !DROP.has(q.id) && q.options.length === 4 && q.answer >= 0 && new Set(q.options.map(o => o.label)).size === 4);
  BANK.Q.length = 0; keep.forEach(q => BANK.Q.push(q));

  /* Javob uzunligi ishorasini yo'qotish: qo'lda yozilgan savollarda to'g'ri javob eng uzun bo'lib qolsa,
     noto'g'ri variantlarga ishonarli (lekin xato) asos qo'shiladi. */
  const TAILS = [`, chunki bu holatda qo'shimcha talab yo'q`, `, shuning uchun xavf tug'ilmaydi`, `, va bu qoidaga zid emas`, `, chunki vaziyat aynan shuni taqozo qiladi`, `, hech qanday cheklov bo'lmagani uchun`, `, chunki odatda shunday qilinadi`, `, bu holatda ustunlik shunday beriladi`, ` — bu eng qulay yechim`];
  BANK.Q.forEach(q => {
    if (/^(g_|q_|r_|a_|p\d)/.test(q.id)) return;
    const L = q.options.map(o => o.label.length), mx = Math.max(...L);
    if (L[q.answer] !== mx || L.filter(x => x === mx).length > 1) return;
    q.options.forEach((o, i) => {
      if (i === q.answer) return; const gap = L[q.answer] - o.label.length; if (gap < 8) return;
      const best = TAILS.map((t, k) => ({ t, k, d: Math.abs(gap - t.length - (BANK.hash(q.id + i) % 7)) })).sort((a, b) => a.d - b.d)[0];
      if (best.t.length <= gap + 6) o.label = o.label.replace(/[.]$/, '') + best.t;
    });
  });
  Object.keys(BANK.byId).forEach(k => delete BANK.byId[k]); BANK.Q.forEach(q => { BANK.byId[q.id] = q; });
})();
