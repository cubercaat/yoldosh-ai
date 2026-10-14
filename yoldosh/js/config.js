/* Chorraha — sozlamalar. Backend ulanganda faqat shu faylni o'zgartirasiz. */
window.YOLDOSH = {
  brand: `Chorraha`,
  school: `Namuna avtomaktab`,
  teacher: { name: `Chorraha`, telegram: `chorahabot` },
  allFree: true,         // hozircha hamma funksiya bepul (Premium cheklovlari o'chiq)
  legal: { operator: ``, contact: ``, updated: `14.10.2026` },   // operator nomi va aloqa (bo'sh bo'lsa: Chorraha jamoasi / Telegram bot)
  passPercent: 90,       // imtihondan o'tish chegarasi (%)
  examQuestions: 20,     // imtihon savollari soni
  examMinutes: 25,       // imtihon vaqti (daqiqa)
  /* Backend manzili (server/worker.js ni joylagach shu yerga yozing).
     Bo'sh bo'lsa: ilova "demo rejim"da ishlaydi — AI javoblari ichki bilim bazasidan,
     ustozga xabar esa brauzer va Telegram havolasi orqali ketadi. */
  apiBase: `https://chorraha-api.chorraha.workers.dev`,
  /* Test Pro: eng qiyin savollar, bitta xato = yutqazish, vaqt qisqa (AI dan foydalanishga ulgurmaslik uchun) */
  /* Narxlar (so'm). DIQQAT: avtomaktab tariflari va marafon narxi — TAKLIF (kelishuv bilan o'zgaradi). */
  premiumPrice: 99000,        // talaba premium, oyiga
  trialDays: 7,               // yangi talabaga bepul sinov
  freeRunsPerDay: 3,          // bepul rejim: kuniga nechta test (har biri freeTestSize ta savol)
  freeTestSize: 20,           // bepul rejimdagi test hajmi
  refNeed: 15,                // Premium sovg'a uchun taklif qilinishi kerak do'stlar soni
  refNeedPaid: 2,             // ulardan nechtasi Premium sotib olishi kerak
  refRewardDays: 30,          // sovg'a Premium muddati
  botPlans: [{ upTo: 50, price: 99000 }, { upTo: 150, price: 299000 }, { upTo: 400, price: 499000 }, { upTo: 0, price: 899000 }],   // Telegram bot: talabalar soniga qarab oylik (0 = 400+)
  platformBot: 'yoldosh_bot', // umumiy bot username (demo)
  marathonPrice: 149000,      // "Imtihon oldi marafoni" (7 kun) — taklif
  plans: [
    { id: 'start', name: `Start`, upTo: 50, price: 490000, note: `Kichik avtomaktab` },
    { id: 'standard', name: `Standart`, upTo: 150, price: 1190000, note: `Eng ko'p tanlanadi`, hot: true },
    { id: 'business', name: `Biznes`, upTo: 400, price: 2490000, note: `Katta avtomaktab` },
    { id: 'network', name: `Tarmoq`, upTo: 0, price: 0, note: `Bir nechta filial — kelishuv asosida` },
  ],
  idTiers: [                  // pullik ID lar (taklif narxlar); bepul avtomatik ID: 2 harf + 4 raqam
    { re: '^[A-Z]{2}\\d{2}$', price: 50000, label: '2 harf + 2 raqam', ex: 'AB12' },
    { re: '^[A-Z]\\d{2}$', price: 80000, label: '1 harf + 2 raqam', ex: 'A12' },
    { re: '^[A-Z]\\d$', price: 100000, label: '1 harf + 1 raqam', ex: 'A1' },
    { re: '^\\d$', price: 200000, label: '1 ta raqam', ex: '7' },
    { re: '^[A-Z]$', price: 300000, label: '1 ta harf', ex: 'Q' },
  ],
  reservedIds: ['AA77'],      // band ID lar
  adminPin: '2026',           // DEMO PIN: ishga tushirishda o'zgartiring (haqiqiy rejimda admin roli serverda)
  proQuestions: 20,
  proSecPerQ: 18,          // savol uchun soniya (20 savol = 6 daqiqa)
  masterStreak: 3,         // ketma-ket nechta xatosiz o'tganda Master galichka
  regions: [`Toshkent shahri`, `Toshkent viloyati`, `Andijon`, `Buxoro`, `Farg'ona`, `Jizzax`, `Namangan`, `Navoiy`, `Qashqadaryo`, `Qoraqalpog'iston`, `Samarqand`, `Sirdaryo`, `Surxondaryo`, `Xorazm`],
  /* Talaba ilovasi manzili: guruh havolalari shundan quriladi (ustoz panelida o'zgartirish mumkin). */
  siteUrl: `https://claude.ai/artifact/NdkMu6GA7zNETWjDethFZ7`,
  telegramBot: `chorahabot`,    // Telegram bot username: haqiqiy Telegram tasdiqlash uchun (apiBase bilan birga)
};




