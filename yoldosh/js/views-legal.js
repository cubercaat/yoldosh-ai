/* Maxfiylik siyosati va foydalanish shartlari. Ommaga e'lon qilishdan oldin operator nomi/aloqa ma'lumotlarini config.js dagi legal bo'limida to'ldiring. */
(function () {
  const { brand } = UI;
  const V = (window.V = window.V || {}), CFG = window.YOLDOSH;
  const L = () => CFG.legal || {};
  const who = () => L().operator || 'Chorraha jamoasi';
  const contact = () => L().contact || ('Telegram: @' + (CFG.telegramBot || CFG.platformBot || 'chorahabot'));
  const upd = () => L().updated || '14.10.2026';

  const page = (title, body) => ({
    html: `<div class="legal"><div class="wrap-l"><a class="legal-brand" href="#/">${brand()}</a><h1>${title}</h1><p class="mute">Oxirgi yangilanish: ${upd()}</p>${body}
      <p class="legal-nav"><a href="#/privacy">Maxfiylik siyosati</a> · <a href="#/terms">Foydalanish shartlari</a> · <a href="#/">← Bosh sahifa</a></p></div></div>`,
  });

  V.privacy = () => {
    const logged = !!(window.Cloud && Cloud.token());
    return page('Maxfiylik siyosati', `
      <h2>1. Biz kimmiz</h2><p>Chorraha ("Xizmat") — haydovchilik guvohnomasi nazariy imtihoniga tayyorlanish uchun o'quv xizmati. Ma'lumotlar operatori: <b>${who()}</b>. Aloqa: ${contact()}.</p>
      <h2>2. Qanday ma'lumotlarni yig'amiz</h2>
      <ul><li><b>Telegram orqali:</b> Telegram ID raqamingiz, Telegram nomingiz (username), ismingiz. Telegram parolingiz yoki telefon raqamingizga kirish huquqimiz yo'q.</li>
      <li><b>Siz kiritgan:</b> ism, familya, viloyat, ixtiyoriy ravishda guruh kodi va taklif kodi.</li>
      <li><b>Foydalanish natijalari:</b> yechilgan testlar, to'plangan ball, xatolar, mashq vaqti, saqlangan savollar.</li>
      <li>Qurilmangizda (brauzerda) sozlamalar va kirish kaliti saqlanadi.</li></ul>
      <h2>3. Nima uchun ishlatamiz</h2>
      <ul><li>Hisobingizni yaratish va boshqa qurilmadan kirishingizni ta'minlash;</li><li>natijalaringizni saqlash va tahlil qilish (zaif mavzular, tavsiyalar);</li><li>reytingni hisoblash (reytingda ismingiz va familyangizning bosh harfi, viloyat va ballingiz ko'rinadi, masalan "Aziz K.");</li><li>xizmatni yaxshilash va xavfsizlikni saqlash.</li></ul>
      <h2>4. Kimlar bilan bo'lishamiz</h2>
      <p>Ma'lumotlaringizni sotmaymiz va reklama uchun uchinchi shaxslarga bermaymiz. Texnik xizmatlar: <b>Cloudflare</b> (server va baza), <b>GitHub Pages</b> (sayt), <b>Telegram</b> (kirish). Ular ma'lumotni faqat xizmat ko'rsatish uchun qayta ishlaydi. Qonun talab qilgan hollarda vakolatli organlarga berilishi mumkin.</p>
      <h2>5. Saqlash muddati va o'chirish</h2>
      <p>Ma'lumotlar hisobingiz faol bo'lguncha saqlanadi. Hisobingizni va unga bog'liq barcha natijalarni istalgan vaqtda o'chirishingiz mumkin${logged ? ':' : ' (kirgan holda shu sahifada tugma paydo bo\'ladi) yoki yuqoridagi aloqa orqali so\'rang.'}</p>
      ${logged ? '<p><button class="btn ghost" data-act="del-account">Hisobimni va ma\'lumotlarimni o\'chirish</button></p>' : ''}
      <h2>6. Huquqlaringiz</h2>
      <p>Siz ma'lumotlaringizga kirish, ularni to'g'rilash, o'chirish va ishlatishga rozilikni qaytarib olish huquqiga egasiz. So'rovlar ${contact()} orqali qabul qilinadi.</p>
      <h2>7. Bolalar</h2><p>Xizmat 14 yoshdan katta shaxslar uchun mo'ljallangan. 18 yoshgacha bo'lsangiz, foydalanishdan oldin ota-onangiz yoki qonuniy vakilingiz bilan maslahatlashing.</p>
      <h2>8. Xavfsizlik</h2><p>Ma'lumotlar shifrlangan (HTTPS) kanal orqali uzatiladi, kirish kalitlari imzolanadi va muddati cheklangan. Hech bir tizim 100% xavfsiz emas; shubhali holat bo'lsa, bizga xabar bering.</p>
      <h2>9. O'zgartirishlar</h2><p>Siyosat yangilanishi mumkin; muhim o'zgarishlar sahifada ko'rsatiladi.</p>`);
  };

  V.terms = () => page('Foydalanish shartlari', `
      <h2>1. Xizmat haqida</h2><p>Chorraha — o'quv va mashq xizmati. U avtomaktab o'qitishini yoki rasmiy imtihonni almashtirmaydi.</p>
      <h2>2. Imtihon natijasi kafolatlanmaydi</h2><p>Savollar, javoblar, tushuntirishlar va simulyator o'rganishga yordam berish uchun tayyorlangan. Ularda xato yoki eskirgan ma'lumot bo'lishi mumkin; yo'l harakati qoidalari o'zgaradi. <b>Rasmiy imtihondan oldin amaldagi qoidalarni va avtomaktab ustozingiz ko'rsatmalarini tekshiring.</b> Imtihondan o'tishga kafolat bermaymiz.</p>
      <h2>3. Hisob</h2><p>Hisob Telegram orqali yaratiladi. Hisobingiz xavfsizligi uchun o'zingiz javobgarsiz; boshqa shaxsga bermang. Yolg'on ma'lumot kiritish, tizimni buzishga urinish, ball yoki reytingni algʻoritmik aldash taqiqlanadi va hisobni to'xtatishga sabab bo'ladi.</p>
      <h2>4. Mazmun va mualliflik</h2><p>Sayt dizayni, kodi va tushuntirish matnlari Chorraha'ga tegishli. Test savollari yo'l harakati qoidalari va o'quv materiallariga asoslangan; ularning huquq egalari bilan bog'liq masalalar bo'yicha murojaatlar ${contact()} orqali ko'rib chiqiladi va zarur bo'lsa mazmun olib tashlanadi. Simulyatordagi ba'zi 3D modellar mualliflarning CC BY litsenziyasi bilan berilgan (masalan, Porsche GT3 RS — blenderbett).</p>
      <h2>5. Narx</h2><p>Hozirgi vaqtda Xizmat bepul. Kelajakda pullik funksiyalar qo'shilishi mumkin; bunda oldindan ogohlantiriladi va bepul qismi saqlanadi.</p>
      <h2>6. Javobgarlik cheklovi</h2><p>Xizmat "mavjud holicha" taqdim etiladi. Uzilishlar, ma'lumot yo'qolishi yoki xatolar uchun qonun ruxsat bergan darajada javobgar emasmiz. Haqiqiy yo'lda haydashda har doim amaldagi qoidalarga va yo'l sharoitiga amal qiling, simulyator va testlar yo'ldagi tajribani almashtirmaydi.</p>
      <h2>7. O'zgartirishlar</h2><p>Shartlar yangilanishi mumkin. Xizmatdan foydalanishni davom ettirsangiz, yangilangan shartlarga rozilik bildirgan hisoblanasiz.</p>
      <h2>8. Aloqa</h2><p>${who()}. ${contact()}.</p>`);

  V.acts = Object.assign(V.acts || {}, {
    async 'del-account'() {
      if (!confirm('Hisobingiz va barcha natijalaringiz butunlay o\'chiriladi. Davom etasizmi?')) return;
      try {
        const r = await fetch((CFG.apiBase || '').replace(/\/$/, '') + '/account/delete', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + Cloud.token() }, body: '{}' });
        if (!r.ok) throw 0;
        Cloud.logout(); try { localStorage.removeItem('yoldosh_v1'); } catch (e) { } UI.toast('Hisobingiz o\'chirildi'); setTimeout(() => { location.hash = '#/'; location.reload(); }, 900);
      } catch (e) { UI.toast('O\'chirib bo\'lmadi. Keyinroq urinib ko\'ring yoki aloqaga yozing'); }
    },
  });
})();
