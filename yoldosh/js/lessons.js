/* Darslik: mavzular bo'yicha qisqa, tushunarli darslar.
   DIQQAT: matnlar o'quv maqsadida soddalashtirilgan. Rasmiy matn — amaldagi Yo'l harakati qoidalari (lex.uz).
   Ustoz amaldagi qoidalar bilan solishtirib chiqishi kerak. Aniq raqam va jarimalar ataylab kiritilmagan. */
window.LESSONS = (function () {
  const OFFICIAL = { name: `Yo'l harakati qoidalari (rasmiy matn, lex.uz)`, url: `https://lex.uz/acts/-2850459` };

  const L = [
    { id: 'warning', min: 6, intro: `Ogohlantiruvchi belgilar haydovchini oldinda xavf borligidan oldindan xabardor qiladi. Ular hech narsani taqiqlamaydi va buyurmaydi — faqat «ehtiyot bo'l, tezlikni kamaytir» deydi.`,
      sections: [
        { h: `Qanday taniladi`, items: [`Shakli — uchburchak, uchi tepada.`, `Qizil hoshiya, oq fon, ichida qora rasm.`, `Rasm xavf turini ko'rsatadi: kesishma, sirpanchiq yo'l, bolalar, yo'l ishlari, temir yo'l va hokazo.`] },
        { h: `Haydovchi nima qiladi`, items: [`Tezlikni oldindan kamaytiradi — xavf zonasiga kirgach emas.`, `Xavf manbaini kuzatadi: piyoda, qarshidan keluvchi transport, notekis qoplama.`, `Belgi odatda xavfli joydan oldin turadi; xavf tugagach alohida belgi shart emas.`] },
        { h: `Tez-tez adashtiriladiganlar`, items: [`«Kesishgan yo'llar» (plyus) bilan «Aylanma harakatli kesishma» (uchta strelka) — ikkalasi ham kesishmadan ogohlantiradi, lekin boshqa-boshqa.`, `Shlagbaumsiz temir yo'l kesishmasi (X) bilan shlagbaumli kesishma (to'siq rasmi).`, `Xavfli burilish o'ngga yoki chapga: strelka qayoqqa egilsa, yo'l o'sha tomonga buriladi.`] },
      ],
      tips: [`Qizil uchburchak = «ehtiyot bo'l».`, `Belgidan keyin tezlikni emas, diqqatni oshiring.`] },

    { id: 'priority', min: 5, intro: `Imtiyozli belgilar kesishmada kim birinchi o'tishini aytadi. Ularni bilmasdan chorrahalardan to'g'ri o'tib bo'lmaydi.`,
      sections: [
        { h: `To'rtta asosiy belgi`, items: [`Asosiy yo'l (sariq romb) — kesishmada ustunlik sizda.`, `Asosiy yo'lning oxiri (romb ustida chiziqlar) — ustunlik tugaydi, teng yo'llar qoidasi boshlanadi.`, `Yo'l bering (teskari uchburchak) — asosiy yo'ldagilarga yo'l berasiz, kerak bo'lsa to'xtaysiz.`, `STOP (sakkiz burchak) — albatta to'liq to'xtaysiz, keyin yo'l berasiz.`] },
        { h: `Muhim farq`, items: [`«Yo'l bering»da yo'l bo'sh bo'lsa, to'xtamasdan o'tish mumkin; STOPda esa har doim to'xtash shart.`, `STOP oldida to'xtash ustunlik bermaydi: asosiy yo'ldagilar o'tgach, ikki tomon bo'sh bo'lsagina yurasiz.`] },
        { h: `Imtiyoz tartibi`, items: [`1) Tartibga soluvchi, 2) svetofor, 3) belgilar, 4) belgi bo'lmasa — o'ng qo'l qoidasi.`, `Belgi o'ng qo'l qoidasidan kuchli: asosiy yo'ldagi haydovchi o'ngdan kelgan ikkinchi darajali yo'ldagiga yo'l bermaydi.`] },
      ],
      tips: [`Sariq romb — ustun, teskari uchburchak va STOP — kutadi.`, `Belgi bor — o'ng qo'l qoidasi ishlamaydi.`] },

    { id: 'prohibitory', min: 8, intro: `Taqiqlovchi belgilar nima mumkin emasligini aytadi. Qizil halqa — asosiy alomat. Belgi turgan joydan boshlab, odatda keyingi chorrahagacha amal qiladi.`,
      sections: [
        { h: `Qanday taniladi`, items: [`Doira shakli, qizil halqa, ichida qora rasm.`, `Ko'k fonli «To'xtash taqiqlanadi» va «Turish taqiqlanadi» belgilari ham taqiqlovchilarga kiradi.`, `Qizil to'ldirilgan doira ichida oq chiziq — «Kirish taqiqlanadi».`] },
        { h: `To'xtash va turish farqi`, items: [`Ko'k fonda ikkita qizil chiziq (X) — to'xtash ham, turish ham taqiqlanadi.`, `Ko'k fonda bitta qizil chiziq — turish taqiqlanadi, lekin yo'lovchini tushirish uchun qisqa to'xtash mumkin.`] },
        { h: `Tezlik va burilish`, items: [`Tezlik cheklovi — raqam shu tezlikdan oshirmaslikni bildiradi.`, `Burilish taqiqlari: chapga, o'ngga, teskari (U) burilish — strelka ustidan qizil chiziq.`, `«Barcha cheklovlar zonasining oxiri» (chiziqlar tushgan oq doira) oldingi taqiqlar tugaganini bildiradi.`] },
        { h: `Amal qilish joyi`, items: [`Belgi odatda keyingi chorrahagacha amal qiladi.`, `Chorrahadan keyin yangi belgi bo'lmasa, cheklov tugagan hisoblanadi.`] },
      ],
      tips: [`Qizil halqa = «mumkin emas».`, `Bitta chiziq — turma, ikkita chiziq — to'xtama.`] },

    { id: 'mandatory', min: 4, intro: `Buyuruvchi belgilar nima qilish majburligini ko'rsatadi. Ko'k doira — «shunday qil».`,
      sections: [
        { h: `Qanday taniladi`, items: [`Ko'k doira, ichida oq rasm.`, `Strelka yo'nalishi — qayoqqa yurish mumkinligini ko'rsatadi.`] },
        { h: `Asosiy belgilar`, items: [`To'g'riga, o'ngga, chapga yurish; to'g'riga yoki o'ngga; to'g'riga yoki chapga.`, `Aylanma harakat: aylanada strelkalar bo'yicha, soat miliga teskari yuriladi.`, `Minimal tezlik: ko'k doiradagi raqam — kamida shu tezlik.`, `Piyodalar va velosipedchilar yo'laklari: transport kira olmaydi.`] },
        { h: `Taqiqdan farqi`, items: [`Qizil halqadagi raqam — eng ko'p tezlik; ko'k doiradagi raqam — eng kam tezlik.`, `Aylanma harakat belgisi (ko'k) majburiylikni bildiradi, uchburchakdagi aylana esa faqat ogohlantiradi.`] },
      ],
      tips: [`Ko'k doira — buyruq.`, `Qizil raqam — ko'pi bilan, ko'k raqam — kamida.`] },

    { id: 'info', min: 5, intro: `Axborot-ishora belgilari joy haqida ma'lumot beradi. Ular taqiqlamaydi va buyurmaydi, lekin ularni bilish qoidalarni to'g'ri qo'llashga yordam beradi.`,
      sections: [
        { h: `Qanday taniladi`, items: [`Ko'k to'rtburchak yoki kvadrat, ichida oq rasm.`, `Ba'zi belgilar qizil element bilan (masalan, tibbiy xoch).`] },
        { h: `Asosiy belgilar`, items: [`To'xtash joyi (P), piyodalar o'tish joyi, bir tomonlama yo'l, berk yo'l (tupik).`, `Avtobus bekati, yoqilg'i quyish shoxobchasi, ovqatlanish joyi, texnik xizmat, taksi.`, `Kasalxona (H) va birinchi tibbiy yordam punkti (qizil xoch) — ikkisi boshqa-boshqa.`] },
        { h: `Amaliy maslahat`, items: [`Bir tomonlama yo'lga teskari yo'nalishda kirish taqiqlanadi.`, `Avtobus bekatida to'xtab turish ommaviy transportga xalaqit beradi.`, `Piyodalar o'tish joyi belgisi oldida piyodaga yo'l berishga tayyor bo'ling.`] },
      ],
      tips: [`Ko'k kvadrat — ma'lumot.`, `H — kasalxona, qizil xoch — birinchi yordam.`] },

    { id: 'signals', min: 6, intro: `Svetofor va tartibga soluvchi ishoralari harakatni boshqaradi. Ular belgilardan ham, o'ng qo'l qoidasidan ham ustun.`,
      sections: [
        { h: `Svetofor signallari`, items: [`Qizil — harakat taqiqlanadi, to'xtash chizig'i oldida to'xtang.`, `Sariq — signal almashishidan ogohlantiradi; keskin tormozsiz to'xtay olmasangiz, davom etish mumkin.`, `Yashil — yurish mumkin, lekin burilishda piyodalarga yo'l beriladi.`, `Miltillovchi yashil — tez orada tugaydi: tezlashmang, to'xtashga tayyor bo'ling.`, `Miltillovchi sariq — chorraha nazoratsiz, belgilar va qoidalar bo'yicha yuring.`] },
        { h: `Qo'shimcha seksiya (strelka)`, items: [`Qizil signalda yashil strelka bo'lsa, faqat o'sha yo'nalishga ruxsat; boshqalarga va piyodalarga yo'l berasiz.`] },
        { h: `Tartibga soluvchi`, items: [`Uning ko'rsatmasi svetofor va belgilardan ustun.`, `Qo'li yuqoriga ko'tarilgan bo'lsa — barcha yo'nalishda to'xtash.`, `Yon tomonlari ochiq bo'lsa, yon tomonga qaragan yo'nalishlarga ruxsat; ko'krak va orqa tomonga — to'xtash.`] },
        { h: `Chorrahadan chiqolmasangiz`, items: [`Yashil signalda ham chiqish joyi bo'sh bo'lmasa, chorrahaga kirmang.`] },
      ],
      tips: [`Odam > svetofor > belgi > o'ng qo'l qoidasi.`, `Chiqolmasang — kirma.`] },

    { id: 'rules', min: 10, intro: `Umumiy qoidalar va xavfsizlik — haydovchining har kungi xatti-harakatlari: tezlik, masofa, quvib o'tish, to'xtash, yoritgichlar, hujjatlar va birinchi yordam.`,
      sections: [
        { h: `Tezlik va masofa`, items: [`Tezlik yo'l, ob-havo va ko'rinishga mos tanlanadi; belgilangan tezlik — eng yuqori chegara, maqsad emas.`, `Tezlik 2 marta oshsa, tormoz masofasi taxminan 4 marta ortadi.`, `Nam yo'l va muzda masofani kattaroq saqlang, tormozni yengil bosing.`] },
        { h: `Quvib o'tish`, items: [`Boshlashdan oldin qarshi yo'lak bo'shligiga va orqadan quvib o'tayotgan yo'qligiga ishonch hosil qiling.`, `Taqiqlanadi: temir yo'l kesishmasi, ko'prik, tunnel, piyodalar o'tish joyi va chorraha.`, `Chapga ishora bergan mashinani quvib o'tmang.`, `Sizni quvib o'tishayotgan bo'lsa, tezlikni oshirmang.`] },
        { h: `To'xtash va turish`, items: [`Piyodalar o'tish joyida, chorrahada va temir yo'l kesishmasida to'xtash taqiqlanadi.`, `Mashinani tark etishdan oldin dvigatelni o'chiring, qo'l tormozini torting, eshiklarni qulflang.`] },
        { h: `Xavfsizlik`, items: [`Kamar haydovchi va kamarli o'rindiqdagi barcha uchun majburiy; bolalar — mos bola kreslosida.`, `Mast holatda, uyquchan yoki charchagan holatda, telefon bilan chalg'iganda haydamang.`, `Qarshi yorug'lik ko'zni qamashtirsa: avariya chirog'i, sekinlashish, to'xtash.`, `Hodisada: to'xtash, avariya chirog'i, uchburchak, tez yordam (103) va jabrlanuvchiga yordam.`] },
        { h: `Hujjatlar`, items: [`Haydovchilik guvohnomasi, transport vositasi hujjati va majburiy sug'urta polisi doim yoningizda.`] },
      ],
      tips: [`Shubha bo'lsa — tezlikni kamaytiring va yo'l bering.`, `Quvib o'tishdan oldin ko'zgu, keyin manevr.`] },

    { id: 'cross', min: 12, intro: `Chorrahalar — eng ko'p xatolar shu yerda. Tartib doim bir xil: avval tartibga soluvchi va svetofor, keyin belgilar, belgi bo'lmasa o'ng qo'l qoidasi, chapga burilish alohida qoida.`,
      sections: [
        { h: `Teng ahamiyatli chorraha`, items: [`Belgi yo'q bo'lsa, o'ngdan kelgan transportga yo'l berasiz.`, `Svetofor ishlamasa va belgi bo'lmasa ham shu qoida amal qiladi.`, `Belgi bo'lmasa, qoplamali (asfalt) yo'l qoplamasiz yo'ldan (tuproq) ustun.`] },
        { h: `Belgi bor chorraha`, items: [`Asosiy yo'ldagi haydovchi ikkinchi darajali yo'ldan kelganlarga yo'l bermaydi, hatto ular o'ngdan kelsa ham.`, `«Yo'l bering» yoki STOP belgisi bor yo'ldan kelayotgan asosiy yo'ldagilarga yo'l beradi.`, `«Asosiy yo'lning oxiri»dan keyin yo'llar teng bo'lib qoladi.`] },
        { h: `Chapga burilish va to'g'riga`, items: [`Chapga burilayotgan haydovchi qarshidan to'g'ri yoki o'ngga ketayotganga yo'l beradi.`, `Burilayotganda yo'lni kesib o'tayotgan piyodalarga yo'l beriladi.`] },
        { h: `Aylanma harakat`, items: [`Aylanada strelkalar bo'yicha (soat miliga teskari) yuriladi.`, `Kirish oldida «Yo'l bering» bo'lsa, aylanadagilarga yo'l beriladi.`] },
        { h: `Murakkab holatlarni tahlil qilish`, items: [`Har bir juft mashina uchun alohida so'rang: yo'llari kesishadimi? Kesishsa — kim kimga yo'l beradi?`, `Yo'llari kesishmasa, ikkalasi to'xtamasdan o'tadi.`, `Uchta mashinada javobni zanjir qilib toping: kim kimga yo'l beradi.`] },
      ],
      tips: [`Tartib: odam → svetofor → belgi → o'ng qo'l.`, `Chapga burilgan — to'g'ridan kelganni kutadi.`] },

    { id: 'marks', min: 5, intro: `Yo'l chiziqlari yo'lakka bo'linishni va harakat qoidalarini ko'rsatadi. Belgi va chiziq bir-biriga zid bo'lsa, vaqtinchalik belgi (masalan, yo'l ishlarida) ustun bo'ladi.`,
      sections: [
        { h: `Bo'ylama chiziqlar`, items: [`Uzuq chiziq — xavfsiz bo'lsa kesib o'tish mumkin.`, `Uzluksiz chiziq — kesib o'tish taqiqlanadi.`, `Ikkita uzluksiz chiziq — qat'iy taqiq, qarama-qarshi oqimlar ajratilgan.`, `Ikki chiziq (biri uzuq, biri uzluksiz): sizga yaqin chiziq hal qiladi — uzuq bo'lsa kesish mumkin, uzluksiz bo'lsa mumkin emas.`] },
        { h: `Ko'ndalang chiziqlar`, items: [`Zebra (ko'ndalang yo'lakchalar) — piyodalar o'tish joyi.`, `Qalin ko'ndalang chiziq — to'xtash chizig'i: qizil signal yoki STOP oldida shu chiziq oldida to'xtaysiz.`, `To'xtash chizig'i bo'lmasa — zebra oldida, u ham bo'lmasa svetofor oldida.`] },
        { h: `Yo'l chekkasi`, items: [`Chetdagi uzluksiz chiziq qatnov qismining chegarasi; yo'l chekkasidan (obochina) harakatlanish uchun foydalanilmaydi.`] },
      ],
      tips: [`Senga yaqin chiziq hal qiladi.`, `Zebra — piyoda; qalin chiziq — to'xtash.`] },
  ];

  const byId = Object.fromEntries(L.map(l => [l.id, l]));
  return { list: L, byId, OFFICIAL };
})();
