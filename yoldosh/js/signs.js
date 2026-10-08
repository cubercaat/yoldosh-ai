/* Yo'l belgilari, chiziqlar va sahnalar — hammasi vektor (SVG), sifati hech qachon buzilmaydi. */
(function () {
  const RED = '#D6232A', BLUE = '#0B57B7', YEL = '#F7C600', INK = '#141414';
  const svg = (inner, label = '') => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${inner}</svg>`;

  /* ---------- shakllar ---------- */
  const warn = (sym) => `<path d="M50 6 L96 88 L4 88 Z" fill="#fff" stroke="${RED}" stroke-width="9.5" stroke-linejoin="round"/><path d="M50 6 L96 88 L4 88 Z" fill="none" stroke="#7a1015" stroke-width=".8" stroke-linejoin="round" opacity=".5"/>${sym}`;
  const ring = (sym, fill = '#fff') => `<circle cx="50" cy="50" r="45" fill="${fill}" stroke="${RED}" stroke-width="10"/>${sym}`;
  const blueDisc = (sym) => `<circle cx="50" cy="50" r="46" fill="${BLUE}" stroke="#fff" stroke-width="2.5"/><circle cx="50" cy="50" r="47.5" fill="none" stroke="#0a3f86" stroke-width=".8"/>${sym}`;
  const blueSq = (sym) => `<rect x="6" y="6" width="88" height="88" rx="11" fill="${BLUE}" stroke="#fff" stroke-width="2.5"/><rect x="5" y="5" width="90" height="90" rx="12" fill="none" stroke="#0a3f86" stroke-width=".8"/>${sym}`;

  const person = (x, y, s, c, w = 3.8) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="1" cy="-15" r="4.6" fill="${c}" stroke="none"/><path d="M0 -8 L-1 4 M-1 4 L-6 16 M-1 4 L4 10 L3 17 M-0.5 -6 L-7 2 M-0.5 -6 L6 -1"/></g>`;
  /* yon tomondan ko'rinadigan avtomobil (x,y — chap-yuqori burchak, kengligi ~34) */
  const car = (x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M1 18 v-5 q0-2.6 2.6-3.3 l6.4-1.7 l5.2-5.2 q1.3-1.3 3.2-1.3 h7.4 q2 0 3.3 1.4 l3.4 4.3 l3 .8 q2.5.7 2.5 3.3 V18 z" fill="${c}"/><path d="M12.5 9 l3.4-3.6 h5 V9z M23.5 5.4 h2.4 q1 0 1.8 1 l2.3 2.6 h-6.5z" fill="#fff"/><circle cx="9.5" cy="18" r="4.2" fill="${c}" stroke="#fff" stroke-width="1.4"/><circle cx="26.5" cy="18" r="4.2" fill="${c}" stroke="#fff" stroke-width="1.4"/></g>`;
  const truck = (c) => `<g fill="${c}"><rect x="20" y="36" width="34" height="22" rx="2"/><path d="M56 42 h11 q2 0 3 1.4 l5 6.6 q1 1.4 1 3 V58 H56z"/><circle cx="33" cy="60" r="5" stroke="#fff" stroke-width="1.6"/><circle cx="66" cy="60" r="5" stroke="#fff" stroke-width="1.6"/></g><path d="M60 45 h6 l4 5 h-10z" fill="#fff"/>`;
  const bike = (c, w = 3.2) => `<g stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="31" cy="60" r="10"/><circle cx="69" cy="60" r="10"/><path d="M31 60 L43 40 H61 L69 60 M43 40 L52 60 H31 M61 40 L57 33 h8 M43 40 L40 34 h9"/></g>`;
  const arrowUp = `<rect x="44.5" y="40" width="11" height="38" fill="#fff"/><polygon points="50,18 68,44 32,44" fill="#fff"/>`;
  const turnR = `<path d="M37 80 V54 Q37 44 47 44 H56" stroke="#fff" stroke-width="10" fill="none" stroke-linejoin="round"/><polygon points="54,28 77,44 54,60" fill="#fff"/>`;
  const mirror = (inner) => `<g transform="translate(100 0) scale(-1 1)">${inner}</g>`;

  function roundabout(col = '#fff', sw = 7, r = 23, head = 11, wing = 8) {
    let s = '';
    for (let k = 0; k < 3; k++) {
      const a0 = (k * 120 + 20) * Math.PI / 180, a1 = a0 - 85 * Math.PI / 180;
      const p0 = [50 + r * Math.cos(a0), 50 + r * Math.sin(a0)], p1 = [50 + r * Math.cos(a1), 50 + r * Math.sin(a1)];
      s += `<path d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r} ${r} 0 0 0 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" stroke="${col}" stroke-width="${sw}" fill="none"/>`;
      const t = [Math.sin(a1), -Math.cos(a1)], n = [Math.cos(a1), Math.sin(a1)];
      const tip = [p1[0] + t[0] * head, p1[1] + t[1] * head], b1 = [p1[0] + n[0] * wing, p1[1] + n[1] * wing], b2 = [p1[0] - n[0] * wing, p1[1] - n[1] * wing];
      s += `<polygon points="${tip.map(v => v.toFixed(1))} ${b1.map(v => v.toFixed(1))} ${b2.map(v => v.toFixed(1))}" fill="${col}"/>`;
    }
    return s;
  }
  const num = (n, fill = INK, size) => `<text x="50" y="${n.length > 2 ? 62 : 64}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${size || (n.length > 2 ? 30 : 38)}" fill="${fill}">${n}</text>`;
  const slash = `<path d="M27 27 L73 73" stroke="${RED}" stroke-width="7"/>`;
  const wedgeTxt = `font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="12" text-anchor="middle" fill="${INK}"`;

  /* ---------- belgilar katalogi ---------- */
  const T = { warning: `Ogohlantiruvchi`, priority: `Imtiyozli`, prohibitory: `Taqiqlovchi`, mandatory: `Buyuruvchi`, info: `Axborot-ishora` };
  const S = (id, topic, name, desc, tip, act, svgx) => ({ id, topic, name, desc, tip, act, svg: svgx });
  const list = [
    // ---- OGOHLANTIRUVCHI ----
    S('w_cross', 'warning', `Kesishgan yo'llar`, `Teng ahamiyatli yo'llar kesishmasi oldidan ogohlantiradi. Kesishmada o'ngdan kelayotgan transportga yo'l berasiz.`, `Plyus (+) shakli — yo'llar kesishyapti.`, `Tezlikni kamaytirib, kesishmada o'ngdan kelayotganlarga yo'l berishga tayyor bo'laman`, warn(`<rect x="46" y="36" width="8" height="42" fill="${INK}"/><rect x="30" y="52" width="40" height="7" fill="${INK}"/>`)),
    S('w_danger', 'warning', `Boshqa xavflar`, `Oldinda boshqa belgilar bilan ko'rsatilmagan xavf bor. Tezlikni kamaytiring va ehtiyot bo'ling.`, `Undov belgisi — «ehtiyot bo'l!».`, `Tezlikni kamaytirib, xavf manbaini diqqat bilan kuzataman`, warn(`<rect x="46" y="35" width="8" height="25" rx="3" fill="${INK}"/><circle cx="50" cy="70" r="5" fill="${INK}"/>`)),
    S('w_slip', 'warning', `Sirpanchiq yo'l`, `Yo'lning shu qismida g'ildirak yo'lga yomon ilashadi (muz, loy, nam qoplama). Keskin tormozlamang, tezlikni kamaytiring.`, `Mashina ostidagi egri chiziqlar — sirpanish izlari.`, `Silliq harakatlanaman: keskin tormoz bosmayman va rulni birdan burmayman`, warn(`${car(33, 44, INK, 1.05)}<path d="M33 71 q4-5 8 0 t8 0 t8 0 t8 0" stroke="${INK}" fill="none" stroke-width="2.6"/>`)),
    S('w_kids', 'warning', `Bolalar`, `Maktab, bog'cha yoki bolalar maydonchasi yaqinida. Bolalar yo'lga to'satdan chiqib qolishi mumkin — sekin va hushyor harakatlaning.`, `Katta va kichik odam — kattalar bilan bolalar.`, `Tezlikni keskin kamaytirib, yo'lga chiqib qolishi mumkin bo'lgan bolalarni kuzataman`, warn(`${person(41, 57, .82, INK)}${person(60, 63, .56, INK)}`)),
    S('w_works', 'warning', `Yo'l ishlari`, `Yo'lda ta'mirlash ishlari olib borilmoqda. Tezlikni pasaytiring, ishchilar va texnikaga e'tiborli bo'ling.`, `Belkurakli ishchi — yo'lda ish ketyapti.`, `Tezlikni kamaytirib, ishchilar va texnikaga ehtiyot bo'laman`, warn(`${person(41, 58, .8, INK)}<path d="M47 52 L60 70" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="M56 78 L66 64 L78 78 Z" fill="${INK}"/>`)),
    S('w_signal', 'warning', `Svetofor bilan tartibga solish`, `Oldinda svetofor bor. Svetofor uzoqdan ko'rinmasligi mumkin, shuning uchun oldindan tayyor bo'ling.`, `Ichida uch rangli chiroq — svetofor.`, `Svetoforga tayyor bo'lib, tezlikni kamaytiraman`, warn(`<rect x="42" y="33" width="16" height="42" rx="4" fill="${INK}"/><circle cx="50" cy="41" r="4.6" fill="#E53935"/><circle cx="50" cy="54" r="4.6" fill="#FBC02D"/><circle cx="50" cy="67" r="4.6" fill="#43A047"/>`)),
    S('w_turn', 'warning', `Xavfli burilish (o'ngga)`, `Yo'l o'ngga keskin buriladi. Burilishdan oldin tezlikni kamaytiring, qarama-qarshi yo'lakka chiqmang.`, `Egilgan strelka yo'l qayoqqa burilishini ko'rsatadi.`, `Burilishdan oldin tezlikni kamaytirib, o'z yo'lagimda qolaman (yo'l o'ngga buriladi)`, warn(`<path d="M40 79 V58 Q40 46 52 46 H55" stroke="${INK}" stroke-width="6" fill="none"/><polygon points="55,37 71,46 55,55" fill="${INK}"/>`)),
    S('w_turnl', 'warning', `Xavfli burilish (chapga)`, `Yo'l chapga keskin buriladi. Tezlikni oldindan kamaytiring va o'z yo'lagingizda qoling.`, `Strelka chapga egilgan — yo'l chapga buriladi.`, `Burilishdan oldin tezlikni kamaytirib, o'z yo'lagimda qolaman (yo'l chapga buriladi)`, warn(mirror(`<path d="M40 79 V58 Q40 46 52 46 H55" stroke="${INK}" stroke-width="6" fill="none"/><polygon points="55,37 71,46 55,55" fill="${INK}"/>`))),
    S('w_narrow', 'warning', `Yo'lning torayishi`, `Yo'l ikki tomondan torayadi. Qarshidan kelayotgan transport bilan ehtiyot bo'ling, kerak bo'lsa yo'l bering.`, `Ikki chiziq bir-biriga yaqinlashyapti.`, `Tezlikni kamaytirib, torayish joyida qarshidan kelayotganlarga yo'l berishga tayyor bo'laman`, warn(`<path d="M37 79 Q47 57 37 36" stroke="${INK}" stroke-width="6" fill="none"/><path d="M63 79 Q53 57 63 36" stroke="${INK}" stroke-width="6" fill="none"/>`)),
    S('w_rail', 'warning', `Shlagbaumsiz temir yo'l kesishmasi`, `Temir yo'l bilan to'siqsiz kesishma. Poyezd kelmayotganiga to'liq ishonch hosil qilmasdan o'tmang.`, `X shakli (Andrey xochi) — temir yo'l.`, `Tezlikni kamaytirib, ikki tomonni ko'rib, poyezd yo'qligiga ishonch hosil qilgach o'taman`, warn(`<g transform="rotate(45 50 58)"><rect x="26" y="54.5" width="48" height="7" fill="${INK}"/><rect x="46.5" y="34" width="7" height="48" fill="${INK}"/></g>`)),
    S('w_rail_bar', 'warning', `Shlagbaumli temir yo'l kesishmasi`, `Temir yo'l bilan to'siqli kesishma. Shlagbaum yopiq yoki yopilayotgan bo'lsa, to'xtab kutasiz.`, `Shlagbaum (to'siq) rasmi — kesishma to'siqli.`, `Tezlikni kamaytiraman; shlagbaum yopilsa, to'xtab ochilishini kutaman`, warn(`<rect x="32" y="40" width="5" height="38" fill="${INK}"/><rect x="63" y="40" width="5" height="38" fill="${INK}"/><rect x="32" y="50" width="36" height="7" fill="${INK}"/><path d="M40 50 l5 7 M48 50 l5 7 M56 50 l5 7" stroke="#fff" stroke-width="2.2"/>`)),
    S('w_ped', 'warning', `Piyodalar o'tish joyi (ogohlantirish)`, `Oldinda piyodalar o'tish joyi bor. Piyoda bo'lsa, to'xtab yo'l berasiz.`, `Uchburchak ichida yurayotgan odam.`, `Tezlikni kamaytirib, piyodaga yo'l berishga tayyor bo'laman`, warn(`${person(50, 53, .78, INK)}<rect x="32" y="72" width="8" height="6" fill="${INK}"/><rect x="46" y="72" width="8" height="6" fill="${INK}"/><rect x="60" y="72" width="8" height="6" fill="${INK}"/>`)),
    S('w_hill_down', 'warning', `Tik pastlik`, `Oldinda tik pastga tushish bor (10% — yo'lning nishabligi). Past uzatmaga o'ting, dvigatel tormozidan foydalaning.`, `Pastga qiyalik: chiziq o'ngga tushadi.`, `Past uzatmaga o'tib, dvigatel tormozidan foydalanaman`, warn(`<polygon points="32,44 70,62 32,62" fill="${INK}"/><text x="50" y="77" ${wedgeTxt}>10%</text>`)),
    S('w_hill_up', 'warning', `Tik ko'tarilish`, `Oldinda tik ko'tarilish bor. Oldindan mos uzatmani tanlang, ko'tarilishda to'xtab qolmaslikka harakat qiling.`, `Yuqoriga qiyalik: chiziq o'ngga ko'tariladi.`, `Oldindan mos uzatmani tanlab, ko'tarilishda to'xtab qolmaslikka harakat qilaman`, warn(`<polygon points="32,62 70,44 70,62" fill="${INK}"/><text x="50" y="77" ${wedgeTxt}>10%</text>`)),
    S('w_twoway', 'warning', `Ikki tomonlama harakat`, `Bir tomonlama yo'l tugab, qarama-qarshi harakat boshlanadi. O'z yo'lagingizda qoling, qarshidan transport kelishini kuting.`, `Ikkita qarama-qarshi strelka.`, `Qarshidan transport kelishini inobatga olib, o'z yo'lagimda qolaman`, warn(`<path d="M42 41 V70" stroke="${INK}" stroke-width="5"/><polygon points="34,66 42,79 50,66" fill="${INK}"/><path d="M58 76 V47" stroke="${INK}" stroke-width="5"/><polygon points="50,52 58,38 66,52" fill="${INK}"/>`)),
    S('w_round', 'warning', `Aylanma harakatli kesishma`, `Oldinda aylanma harakatli kesishma bor. Tezlikni kamaytiring va aylanma yo'l qoidalariga tayyor bo'ling.`, `Uchburchak ichida uchta strelkadan iborat aylana.`, `Tezlikni kamaytirib, aylanma harakat qoidalariga tayyorlanaman`, warn(`<g transform="translate(50 60) scale(.5) translate(-50 -50)">${roundabout(INK, 9, 24, 14, 11)}</g>`)),
    S('w_bump', 'warning', `Sun'iy notekislik`, `Oldinda tezlikni pasaytiruvchi to'siq («yotgan politsiyachi») bor. Tezlikni keskin kamaytiring.`, `Yo'lda do'ng — sekinlash kerak.`, `Do'ngga yetmasdan tezlikni keskin kamaytiraman`, warn(`<path d="M28 76 Q50 38 72 76 Z" fill="${INK}"/>`)),
    S('w_uneven', 'warning', `Notekis yo'l`, `Yo'lda g'adir-budir, to'lqinsimon joylar bor. Tezlikni kamaytirib, ehtiyotkor o'ting.`, `Ketma-ket do'ngchalar — silkinadigan yo'l.`, `Tezlikni kamaytirib, notekis joydan ehtiyotkor o'taman`, warn(`<path d="M27 76 Q36 54 45 76 Z M45 76 Q54 54 63 76 Z M63 76 Q69 62 75 76 Z" fill="${INK}"/>`)),

    // ---- IMTIYOZLI ----
    S('p_main', 'priority', `Asosiy yo'l`, `Kesishmada siz asosiy yo'ldasiz: ikkinchi darajali yo'ldan kelayotganlar sizga yo'l berishi shart.`, `Sariq romb — «ustunlik sizda».`, `Kesishmada ustunlik menda, lekin atrofni baribir kuzataman`, `<path d="M50 3 L97 50 L50 97 L3 50Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M50 15 L85 50 L50 85 L15 50Z" fill="${YEL}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`),
    S('p_end', 'priority', `Asosiy yo'lning oxiri`, `Asosiy yo'l tugaydi. Keyingi kesishmada boshqa belgilar bo'lmasa, teng ahamiyatli yo'l qoidalari ishlaydi.`, `Romb ustidan chizilgan chiziqlar — ustunlik tugadi.`, `Ustunlik tugaganini bilib, keyingi kesishmada qoidalar bo'yicha yo'l beraman`, `<path d="M50 3 L97 50 L50 97 L3 50Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M50 15 L85 50 L50 85 L15 50Z" fill="${YEL}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><g stroke="#5a5a5a" stroke-width="2.2"><path d="M24 70 L70 24"/><path d="M30 76 L76 30"/><path d="M36 82 L82 36"/></g>`),
    S('p_yield', 'priority', `Yo'l bering`, `Kesishmada asosiy yo'ldan kelayotgan transportga yo'l berishingiz shart. Zarur bo'lsa to'xtang.`, `Teskari uchburchak — «tormozni sekinlat, yo'l ber».`, `Asosiy yo'ldagilarga yo'l beraman, zarur bo'lsa to'xtayman`, `<path d="M8 15 H92 L50 90 Z" fill="#fff" stroke="${RED}" stroke-width="9.5" stroke-linejoin="round"/>`),
    S('p_stop', 'priority', `STOP — to'xtamasdan yurish taqiqlanadi`, `To'liq to'xtang (to'xtash chizig'i oldida), yo'lni tekshiring va asosiy yo'ldagilarga yo'l bering. Yo'l bo'sh ko'rinsa ham to'xtash shart.`, `Sakkiz burchakli yagona belgi.`, `To'liq to'xtab, so'ng asosiy yo'ldagilarga yo'l beraman`, `<polygon points="93.4,68 68,93.4 32,93.4 6.6,68 6.6,32 32,6.6 68,6.6 93.4,32" fill="${RED}" stroke="#fff" stroke-width="3"/><polygon points="89,66 66,89 34,89 11,66 11,34 34,11 66,11 89,34" fill="none" stroke="#fff" stroke-width="1.6"/><text x="50" y="59" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="25" fill="#fff">STOP</text>`),

    // ---- TAQIQLOVCHI ----
    S('b_noentry', 'prohibitory', `Kirish taqiqlanadi`, `Bu yo'nalishda kirish taqiqlangan. Odatda bir tomonlama yo'lning chiqish qismida turadi.`, `Qizil doira ichidagi oq to'g'ri chiziq — «kirma».`, `Bu yo'nalishda yo'lga kirmayman`, `<circle cx="50" cy="50" r="46" fill="${RED}" stroke="#fff" stroke-width="2"/><rect x="21" y="42" width="58" height="16" rx="2" fill="#fff"/>`),
    S('b_none', 'prohibitory', `Harakatlanish taqiqlanadi`, `Hamma turdagi transport vositalarining harakati taqiqlanadi.`, `Ichi bo'sh qizil halqa — hech kim o'tmaydi.`, `Bu yo'ldan transport vositasida umuman o'tmayman`, ring('')),
    S('b_s40', 'prohibitory', `Tezlik cheklovi 40 km/soat`, `Tezligingiz 40 km/soat dan oshmasligi kerak. Cheklov belgidan keyingi kesishmagacha amal qiladi.`, `Raqam — ruxsat etilgan eng yuqori tezlik.`, `Tezligim 40 km/soatdan oshmasligi kerak`, ring(num('40'))),
    S('b_s60', 'prohibitory', `Tezlik cheklovi 60 km/soat`, `Tezligingiz 60 km/soat dan oshmasligi kerak.`, `Qizil halqadagi raqam — eng yuqori tezlik.`, `Tezligim 60 km/soatdan oshmasligi kerak`, ring(num('60'))),
    S('b_s70', 'prohibitory', `Tezlik cheklovi 70 km/soat`, `Tezligingiz 70 km/soat dan oshmasligi kerak.`, `Qizil halqadagi raqam — eng yuqori tezlik.`, `Tezligim 70 km/soatdan oshmasligi kerak`, ring(num('70'))),
    S('b_s90', 'prohibitory', `Tezlik cheklovi 90 km/soat`, `Tezligingiz 90 km/soat dan oshmasligi kerak.`, `Qizil halqadagi raqam — eng yuqori tezlik.`, `Tezligim 90 km/soatdan oshmasligi kerak`, ring(num('90'))),
    S('b_overtake', 'prohibitory', `Quvib o'tish taqiqlanadi`, `Belgi amal qiladigan joyda yonma-yon harakatlanayotgan transportni quvib o'tish taqiqlanadi.`, `Ikki mashina yonma-yon: biri ikkinchisini quvmaydi.`, `Oldimdagi transportni quvib o'tmayman`, ring(`${car(19, 38, RED, .95)}${car(50, 38, INK, .95)}`)),
    S('b_nostop', 'prohibitory', `To'xtash taqiqlanadi`, `Bu hududda to'xtash ham, turish ham taqiqlanadi.`, `Qizil X — to'xtash umuman mumkin emas.`, `Bu yerda to'xtamayman ham, turmayman ham`, `<circle cx="50" cy="50" r="45" fill="${BLUE}" stroke="${RED}" stroke-width="10"/><path d="M30 30 L70 70 M70 30 L30 70" stroke="${RED}" stroke-width="9"/>`),
    S('b_nopark', 'prohibitory', `Turish taqiqlanadi`, `Turish taqiqlanadi, ammo yo'lovchilarni tushirish yoki olish uchun qisqa to'xtash mumkin.`, `Bitta qizil chiziq — to'xtash mumkin, turish mumkin emas.`, `Bu yerda turmayman; yo'lovchini tushirish uchun qisqa to'xtashim mumkin`, `<circle cx="50" cy="50" r="45" fill="${BLUE}" stroke="${RED}" stroke-width="10"/><path d="M27 73 L73 27" stroke="${RED}" stroke-width="9"/>`),
    S('b_noleft', 'prohibitory', `Chapga burilish taqiqlanadi`, `Bu kesishmada chapga burilish taqiqlanadi.`, `Chapga qayrilgan strelka ustidan qizil chiziq.`, `Bu kesishmada chapga burilmayman`, ring(`${mirror(`<path d="M38 77 V54 Q38 45 47 45 H54" stroke="${INK}" stroke-width="9" fill="none"/><polygon points="52,31 73,45 52,59" fill="${INK}"/>`)}${slash}`)),
    S('b_noright', 'prohibitory', `O'ngga burilish taqiqlanadi`, `Bu kesishmada o'ngga burilish taqiqlanadi.`, `O'ngga qayrilgan strelka ustidan qizil chiziq.`, `Bu kesishmada o'ngga burilmayman`, ring(`<path d="M38 77 V54 Q38 45 47 45 H54" stroke="${INK}" stroke-width="9" fill="none"/><polygon points="52,31 73,45 52,59" fill="${INK}"/>${slash}`)),
    S('b_nouturn', 'prohibitory', `Teskari burilish taqiqlanadi`, `Bu yerda U-shaklida burilish (orqaga qaytish) taqiqlanadi.`, `U shaklidagi strelka ustidan qizil chiziq.`, `Bu yerda U-burilish qilmayman`, ring(`<path d="M38 74 V42 Q38 28 50 28 Q62 28 62 42 V50" stroke="${INK}" stroke-width="8" fill="none"/><polygon points="53,50 71,50 62,64" fill="${INK}"/>${slash}`)),
    S('b_notruck', 'prohibitory', `Yuk avtomobillari harakati taqiqlanadi`, `Yuk avtomobillarining (belgida ko'rsatilgan massadan ortiq) harakati taqiqlanadi.`, `Ichida yuk mashinasi — yuk tashiydiganlar o'tmaydi.`, `Yuk avtomobilida bu yo'ldan o'tmayman`, ring(truck(INK))),
    S('b_noped', 'prohibitory', `Piyodalar harakati taqiqlanadi`, `Bu yo'lda piyodalarning yurishi taqiqlanadi.`, `Qizil halqada odam — piyoda yurmaydi.`, `Bu yo'lda piyodalar yurishi taqiqlanganini bilaman`, ring(person(50, 56, 1.15, INK, 4))),
    S('b_nobike', 'prohibitory', `Velosipedda harakatlanish taqiqlanadi`, `Bu yo'lda velosipedlarda harakatlanish taqiqlanadi.`, `Qizil halqada velosiped.`, `Velosipedda bu yo'ldan o'tmayman`, ring(bike(INK))),
    S('b_nohorn', 'prohibitory', `Ovozli signal berish taqiqlanadi`, `Bu hududda ovozli signal berish taqiqlanadi (xavf tug'ilgan holatlar bundan mustasno).`, `Qizil halqada karnay — shovqin qilma.`, `Xavf tug'ilmasa, ovozli signal bermayman`, ring(`<path d="M27 45 h10 l17-11 v32 l-17-11 h-10z" fill="${INK}"/><path d="M62 43 q7 7 0 14 M68 38 q11 12 0 24" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`)),
    S('b_weight', 'prohibitory', `Og'irlik cheklovi 3,5 t`, `Haqiqiy massasi belgida ko'rsatilgandan (3,5 tonna) ortiq transport vositalari o'tishi taqiqlanadi.`, `Raqam va «t» (tonna) — ruxsat etilgan massa.`, `Haqiqiy massam 3,5 tonnadan ortiq bo'lsa, bu yerdan o'tmayman`, ring(`<text x="50" y="56" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="26" fill="${INK}">3,5</text><text x="50" y="76" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="17" fill="${INK}">t</text>`)),
    S('b_end', 'prohibitory', `Barcha cheklovlar zonasining oxiri`, `Oldingi taqiqlovchi belgilar (tezlik, quvib o'tish va boshqalar) bergan cheklovlar tugadi.`, `Chiziqlar kesib o'tgan oq doira — hammasi tugadi.`, `Oldingi belgilardagi cheklovlar tugaganini bilaman`, `<circle cx="50" cy="50" r="45" fill="#fff" stroke="#4a4a4a" stroke-width="3"/><g stroke="#2b2b2b" stroke-width="3.4" stroke-linecap="round"><path d="M26 66 L66 26"/><path d="M33 73 L73 33"/><path d="M40 80 L80 40"/><path d="M19 59 L59 19"/><path d="M47 83 L83 47"/></g>`),

    // ---- BUYURUVCHI ----
    S('m_straight', 'mandatory', `To'g'ri yurish`, `Faqat to'g'riga harakatlanish mumkin.`, `Ko'k doira = buyruq. Strelka — qayoqqa borasiz.`, `Faqat to'g'riga harakatlanaman`, blueDisc(arrowUp)),
    S('m_right', 'mandatory', `O'ngga burilish`, `Faqat o'ngga burilib harakatlanish mumkin.`, `Strelka o'ngga ko'rsatadi.`, `Faqat o'ngga burilaman`, blueDisc(turnR)),
    S('m_left', 'mandatory', `Chapga burilish`, `Faqat chapga burilib harakatlanish mumkin.`, `Strelka chapga ko'rsatadi.`, `Faqat chapga burilaman`, blueDisc(mirror(turnR))),
    S('m_sr', 'mandatory', `To'g'riga yoki o'ngga`, `Faqat to'g'riga yoki o'ngga harakatlanish mumkin.`, `Strelka to'g'riga va o'ngga tarmoqlangan.`, `To'g'riga yoki o'ngga yuraman, chapga burilmayman`, blueDisc(`<polygon points="45,16 61,36 29,36" fill="#fff"/><rect x="40" y="34" width="10" height="46" fill="#fff"/><path d="M50 64 H64 V52" stroke="#fff" stroke-width="9" fill="none" stroke-linejoin="round"/><polygon points="64,34 77,53 51,53" fill="#fff"/>`)),
    S('m_sl', 'mandatory', `To'g'riga yoki chapga`, `Faqat to'g'riga yoki chapga harakatlanish mumkin.`, `Strelka to'g'riga va chapga tarmoqlangan.`, `To'g'riga yoki chapga yuraman, o'ngga burilmayman`, blueDisc(mirror(`<polygon points="45,16 61,36 29,36" fill="#fff"/><rect x="40" y="34" width="10" height="46" fill="#fff"/><path d="M50 64 H64 V52" stroke="#fff" stroke-width="9" fill="none" stroke-linejoin="round"/><polygon points="64,34 77,53 51,53" fill="#fff"/>`))),
    S('m_round', 'mandatory', `Aylanma harakat`, `Aylanma yo'lda strelkalar yo'nalishida, ya'ni soat miliga teskari harakatlanasiz.`, `Uchta strelka — aylana bo'ylab, soat miliga teskari.`, `Aylanada soat miliga teskari yo'nalishda harakatlanaman`, blueDisc(roundabout())),
    S('m_min', 'mandatory', `Minimal tezlik cheklovi 30 km/soat`, `Bu yerda tezligingiz kamida 30 km/soat bo'lishi kerak (yo'l sharoiti imkon bergan taqdirda).`, `Ko'k fonda raqam — kamida shu tezlik.`, `Tezligim kamida 30 km/soat bo'ladi`, blueDisc(num('30', '#fff'))),
    S('m_ped', 'mandatory', `Piyodalar yo'lkasi`, `Faqat piyodalar uchun. Transport vositalari kira olmaydi.`, `Ko'k doirada odam — piyodalar uchun.`, `Bu yo'lakka kirmayman, u faqat piyodalar uchun`, blueDisc(person(50, 56, 1.15, '#fff', 4))),
    S('m_bike', 'mandatory', `Velosiped yo'lagi`, `Faqat velosipedchilar uchun yo'lak. Boshqa transport kira olmaydi.`, `Ko'k doirada velosiped.`, `Bu yo'lakka kirmayman, u faqat velosipedchilar uchun`, blueDisc(bike('#fff', 3.8))),

    // ---- AXBOROT-ISHORA ----
    S('i_park', 'info', `To'xtash joyi (avtoturargoh)`, `Mashinalarni to'xtatib qo'yish uchun ajratilgan joy.`, `P harfi — Parking.`, `Mashinani shu joyda qoldirishim mumkin`, blueSq(`<text x="50" y="72" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="64" fill="#fff">P</text>`)),
    S('i_cross', 'info', `Piyodalar o'tish joyi`, `Piyodalar yo'lni kesib o'tadigan joy. Piyoda bo'lsa, yo'l berasiz.`, `Ko'k kvadrat ichidagi oq uchburchakda odam.`, `Piyodaga yo'l berishga tayyor bo'laman`, blueSq(`<path d="M50 17 L83 79 H17 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>${person(50, 59, .74, INK)}`)),
    S('i_oneway', 'info', `Bir tomonlama yo'l`, `Bu yo'lda faqat strelka ko'rsatgan tomonga harakatlanish mumkin.`, `Katta oq strelka — bitta yo'nalish.`, `Faqat strelka ko'rsatgan yo'nalishda harakatlanaman`, blueSq(`<rect x="44" y="40" width="12" height="42" fill="#fff"/><polygon points="50,15 73,44 27,44" fill="#fff"/>`)),
    S('i_hosp', 'info', `Kasalxona`, `Yaqin atrofda statsionar davolash muassasasi (kasalxona) bor.`, `Katta H harfi — Hospital.`, `Yaqin atrofda kasalxona borligini bilaman`, blueSq(`<path d="M32 26 V74 M68 26 V74 M32 50 H68" stroke="#fff" stroke-width="11" stroke-linecap="butt"/>`)),
    S('i_firstaid', 'info', `Birinchi tibbiy yordam punkti`, `Yaqin atrofda birinchi tibbiy yordam ko'rsatiladigan joy bor.`, `Oq kvadratda qizil xoch.`, `Kerak bo'lsa, birinchi tibbiy yordam punktiga murojaat qilaman`, blueSq(`<rect x="22" y="22" width="56" height="56" rx="6" fill="#fff"/><rect x="44" y="30" width="12" height="40" fill="${RED}"/><rect x="30" y="44" width="40" height="12" fill="${RED}"/>`)),
    S('i_dead', 'info', `Berk yo'l (tupik)`, `Bu yo'lda o'tish yo'li yo'q: yo'l tugaydi.`, `T shakli — yo'l to'siqqa taqalyapti.`, `Bu yo'ldan o'tish yo'li yo'qligini bilib, boshqa yo'lni tanlayman`, blueSq(`<rect x="46" y="28" width="8" height="26" fill="#fff"/><rect x="46" y="54" width="8" height="24" fill="${RED}"/><rect x="26" y="24" width="48" height="9" fill="#fff"/>`)),
    S('i_bus', 'info', `Avtobus bekati`, `Avtobus to'xtaydigan joy. Bu yerda to'xtab turish ommaviy transportga xalaqit beradi.`, `Oq avtobus ko'k fonda.`, `Bekatda ommaviy transportga xalaqit bermayman`, blueSq(`<rect x="22" y="30" width="56" height="36" rx="8" fill="#fff"/><rect x="28" y="36" width="12" height="12" rx="2" fill="${BLUE}"/><rect x="44" y="36" width="12" height="12" rx="2" fill="${BLUE}"/><rect x="60" y="36" width="12" height="12" rx="2" fill="${BLUE}"/><circle cx="34" cy="68" r="6" fill="#fff" stroke="${BLUE}" stroke-width="2"/><circle cx="66" cy="68" r="6" fill="#fff" stroke="${BLUE}" stroke-width="2"/>`)),
    S('i_fuel', 'info', `Yoqilg'i quyish shoxobchasi`, `Oldinda yoqilg'i quyish shoxobchasi bor.`, `Oq quyish ustuni va shlang.`, `Zarur bo'lsa, yoqilg'i quyaman`, blueSq(`<rect x="28" y="24" width="30" height="52" rx="4" fill="#fff"/><rect x="34" y="31" width="18" height="12" rx="2" fill="${BLUE}"/><path d="M58 40 h6 q6 0 6 6 v20 q0 5 5 5" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/><rect x="22" y="76" width="42" height="5" rx="2" fill="#fff"/>`)),
    S('i_cafe', 'info', `Ovqatlanish joyi`, `Oldinda ovqatlanish joyi (kafe, oshxona) bor.`, `Sanchqi va pichoq.`, `Ovqatlanish uchun to'xtashim mumkin`, blueSq(`<path d="M35 24 V42 M42 24 V42 M49 24 V42 M35 42 Q42 52 49 42 M42 50 V78" stroke="#fff" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M64 24 Q76 34 68 56 V78" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)),
    S('i_service', 'info', `Texnik xizmat ko'rsatish punkti`, `Oldinda avtomobilga texnik xizmat ko'rsatadigan joy bor.`, `Kalit — ta'mirlash.`, `Mashinam buzilsa, texnik xizmat punktiga murojaat qilaman`, blueSq(`<path d="M30 74 L55 49" stroke="#fff" stroke-width="10" stroke-linecap="round"/><circle cx="61" cy="39" r="15" fill="#fff"/><path d="M61 39 L75 25" stroke="${BLUE}" stroke-width="9" stroke-linecap="butt"/>`)),
    S('i_taxi', 'info', `Taksi to'xtash joyi`, `Taksilar uchun ajratilgan to'xtash joyi.`, `TAXI yozuvi va katak chiziq.`, `Bu joy taksilar uchun ajratilganini bilaman`, blueSq(`<rect x="24" y="32" width="52" height="14" fill="#fff"/><g fill="${INK}"><rect x="24" y="32" width="7" height="7"/><rect x="38" y="32" width="7" height="7"/><rect x="52" y="32" width="7" height="7"/><rect x="66" y="32" width="7" height="7"/><rect x="31" y="39" width="7" height="7"/><rect x="45" y="39" width="7" height="7"/><rect x="59" y="39" width="7" height="7"/></g><text x="50" y="72" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="22" fill="#fff">TAXI</text>`)),
  ];

  /* ---------- svetofor ---------- */
  function tl(state) {
    const c = (y, on, col) => `<circle cx="50" cy="${y}" r="10" fill="${on ? col : '#2a2f3a'}" ${on ? `filter="url(#g)"` : ''}/>`;
    const blink = state === 'greenblink';
    return svg(`<defs><filter id="g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="31" y="5" width="38" height="90" rx="10" fill="#10131a" stroke="#3a4152" stroke-width="2"/>
      ${c(27, state === 'red', '#FF3B3B')}${c(50, state === 'yellow', '#FFC61A')}${c(73, state === 'green' || blink, '#2EE66B')}
      ${blink ? `<circle cx="50" cy="73" r="10" fill="none" stroke="#2EE66B" stroke-width="1.5" stroke-dasharray="3 3"/>` : ''}`, 'Svetofor');
  }
  function tlArrow() {
    return svg(`<defs><filter id="g2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="16" y="5" width="38" height="90" rx="10" fill="#10131a" stroke="#3a4152" stroke-width="2"/>
      <circle cx="35" cy="27" r="10" fill="#FF3B3B" filter="url(#g2)"/><circle cx="35" cy="50" r="10" fill="#2a2f3a"/><circle cx="35" cy="73" r="10" fill="#2a2f3a"/>
      <rect x="58" y="34" width="30" height="32" rx="8" fill="#10131a" stroke="#3a4152" stroke-width="2"/>
      <g filter="url(#g2)"><path d="M64 50 H77" stroke="#2EE66B" stroke-width="5" stroke-linecap="round"/><polygon points="75,41 88,50 75,59" fill="#2EE66B"/></g>`, 'Svetofor: qizil va yashil strelka');
  }

  /* ---------- sahnalar (kesishma, chiziqlar) ---------- */
  const heading = { N: 0, E: 90, S: 180, W: 270 };
  const sceneCar = (c) => `<g transform="translate(${c.x} ${c.y}) rotate(${heading[c.h]})">
      <rect x="-8" y="-15" width="16" height="30" rx="5" fill="${c.color}" stroke="#fff" stroke-width="1.2"/>
      <rect x="-5.5" y="-8" width="11" height="6" rx="1.5" fill="rgba(255,255,255,.55)"/><rect x="-5.5" y="4" width="11" height="5" rx="1.5" fill="rgba(255,255,255,.35)"/></g>
      ${c.label ? `<text x="${c.x}" y="${c.y + 4}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="11" fill="#fff">${c.label}</text>` : ''}`;
  function scene(opt) {
    const arrow = opt.leftTurn ? `<path d="M110 150 V120 Q110 100 90 100 H70" stroke="#FFC61A" stroke-width="2.5" stroke-dasharray="5 4" fill="none"/><polygon points="72,94 60,100 72,106" fill="#FFC61A"/>` : '';
    const signs = (opt.signs || []).map(s => `<svg x="${s.x}" y="${s.y}" width="${s.s || 24}" height="${s.s || 24}" viewBox="0 0 100 100">${byId[s.id].svg}</svg><rect x="${s.x + (s.s || 24) / 2 - 1}" y="${s.y + (s.s || 24)}" width="2" height="6" fill="#9aa4b8"/>`).join('');
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kesishma sxemasi">
      <rect width="200" height="200" fill="#1c2230" rx="10"/>
      <rect x="70" y="0" width="60" height="200" fill="#323a4c"/><rect x="0" y="70" width="200" height="60" fill="#323a4c"/>
      <g stroke="#e7ebf5" stroke-width="1.6" stroke-dasharray="8 7" opacity=".75"><path d="M100 0 V70 M100 130 V200 M0 100 H70 M130 100 H200"/></g>
      <g stroke="#e7ebf5" stroke-width="2.4" opacity=".9"><path d="M101 128 H129 M71 72 H99 M72 101 V129 M128 71 V99"/></g>
      ${arrow}${(opt.cars || []).map(sceneCar).join('')}${signs}</svg>`;
  }
  /* yo'l chiziqlari: yuqoridan ko'rinish */
  function marks(kind) {
    const road = `<rect width="200" height="200" fill="#1c2230" rx="10"/><rect x="50" y="0" width="100" height="200" fill="#323a4c"/><path d="M54 0 V200 M146 0 V200" stroke="#e7ebf5" stroke-width="2.2"/>`;
    const W = '#f1f4fb', solid = (x) => `<path d="M${x} 0 V200" stroke="${W}" stroke-width="2.8"/>`, dash = (x) => `<path d="M${x} 0 V200" stroke="${W}" stroke-width="2.8" stroke-dasharray="16 12"/>`;
    let body = '', car = '';
    if (kind === 'solid') body = solid(100);
    else if (kind === 'dash') body = dash(100);
    else if (kind === 'double') body = solid(97) + solid(103);
    else if (kind === 'dashnear') { body = solid(96) + dash(104); car = sceneCar({ x: 124, y: 150, h: 'N', color: '#2F6BFF' }); }
    else if (kind === 'solidnear') { body = dash(96) + solid(104); car = sceneCar({ x: 124, y: 150, h: 'N', color: '#2F6BFF' }); }
    else if (kind === 'zebra') { for (let i = 0; i < 9; i++) body += `<rect x="${58 + i * 10.4}" y="72" width="6" height="56" fill="${W}"/>`; body += dash(100).replace('stroke-dasharray="16 12"', 'stroke-dasharray="16 12" opacity=".0"'); car = sceneCar({ x: 124, y: 168, h: 'N', color: '#2F6BFF' }); }
    else if (kind === 'stopline') { body = dash(100) + `<rect x="102" y="96" width="46" height="6" fill="${W}"/>`; car = sceneCar({ x: 124, y: 140, h: 'N', color: '#2F6BFF' }); }
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Yo'l chiziqlari">${road}${body}${car}</svg>`;
  }

  const byId = Object.fromEntries(list.map(s => [s.id, s]));
  const A = (o) => ({ x: 115, y: 160, h: 'N', color: '#2F6BFF', label: 'A', ...o });
  const Bc = (o) => ({ x: 160, y: 85, h: 'W', color: '#E5384A', label: 'B', ...o });
  const Cc = (o) => ({ x: 40, y: 115, h: 'E', color: '#F2B01E', label: 'C', ...o });
  const Dc = (o) => ({ x: 85, y: 40, h: 'S', color: '#2EC4A6', label: 'D', ...o });
  const SCENES = {
    equal: scene({ cars: [A(), Bc()] }),
    left: scene({ leftTurn: true, cars: [A(), Dc({ color: '#E5384A', label: 'B' })] }),
    three: scene({ cars: [A(), Bc(), Cc()] }),
    main: scene({ cars: [A(), Bc()], signs: [{ id: 'p_main', x: 134, y: 140 }] }),
    yield: scene({ cars: [A(), Cc({ label: 'B', color: '#E5384A' })], signs: [{ id: 'p_yield', x: 134, y: 140 }] }),
    stop: scene({ cars: [A(), Bc()], signs: [{ id: 'p_stop', x: 150, y: 44 }] }),
    mainEnd: scene({ cars: [A(), Bc()], signs: [{ id: 'p_end', x: 134, y: 140 }] }),
    yieldB: scene({ cars: [A(), Bc()], signs: [{ id: 'p_yield', x: 150, y: 44 }, { id: 'p_main', x: 134, y: 140 }] }),
    stopA: scene({ cars: [A(), Bc(), Cc()], signs: [{ id: 'p_stop', x: 134, y: 140 }] }),
  };
  const MARKS = Object.fromEntries(['solid', 'dash', 'double', 'dashnear', 'solidnear', 'zebra', 'stopline'].map(k => [k, marks(k)]));
  Object.assign(SCENES, MARKS);

  window.SIGNS = { list, byId, topicNames: T, tl, tlArrow, scene: SCENES, svg: (id, label) => svg(byId[id].svg, label || byId[id].name), person, car };
})();

