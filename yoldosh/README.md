# Chorraha

Avtomaktablar uchun prava tayyorlov platformasi: talaba ilovasi + ustoz paneli + AI yordamchi.

## Ishga tushirish
```
node server/dev.js
```
So'ng http://localhost:5173 ni oching. Hech narsa o'rnatish shart emas (oddiy HTML/CSS/JS).
Statik hosting (Netlify, Vercel, Cloudflare Pages, GitHub Pages) ga shu papkani yuklash kifoya.

## Hozir nima ishlaydi (demo rejim)
- Bosh sahifa (rahbarlarga ko'rsatish uchun), talaba va ustoz kirishi
- 630 savol (faqat o'rta va qiyin; 360 tasi chorraha masalalari qoidalar mexanizmi bilan hisoblangan), 60 ta chizilgan yo'l belgisi, 9 mavzu (kesishmalar va yo'l chiziqlari sahnalari bilan), «Qiyin savollar» rejimi, 20 savollik vaqtli imtihon (asosan o'rta va qiyin)
- Xatolar uchun AI tushuntirishi, xatolar ustida ishlash, AI chat (ichki bilim bazasi)
- Belgilar katalogi, kamera/rasm orqali belgini taxminiy aniqlash (ranglar bo'yicha)
- Ustoz paneli: tayyorlik %, o'zlashtirish, faollik vaqti, mavzular xaritasi, AI tahlil, xabarlar
- Talabaning haqiqiy natijasi ustoz panelida «Siz» bo'lib ko'rinadi (bir brauzerda)

## Hozircha demo (haqiqiy ulanish kerak)
| Narsa | Hozir | Haqiqiy qilish uchun |
|---|---|---|
| Talabalar ro'yxati | 14 ta namunaviy + o'zingiz | Server va ma'lumotlar bazasi (hisoblar, guruhlar) |
| Ma'lumot saqlash | brauzer (localStorage) | Baza (Supabase / Firebase) |
| AI javoblari | ichki bilim bazasi | `server/worker.js` + ANTHROPIC_API_KEY |
| Telegramga yuborish | xabar nusxalanadi + chat ochiladi | `server/worker.js` + bot tokeni |
| Belgini kamerada aniqlash | rang bo'yicha taxmin | `/vision` (Claude ko'rish) |

## Backend ulash
1. `server/worker.js` ni Cloudflare Worker sifatida joylang.
2. Sirlar: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ANTHROPIC_API_KEY` (`wrangler secret put ...`), `ALLOWED_ORIGIN` = sayt manzili.
3. `js/config.js` da `apiBase` ga Worker manzilini yozing. Tamom.

## Muhim
- Savollar demo uchun yozilgan. Ishga tushirishdan oldin amaldagi Yo'l harakati qoidalari bilan ustoz tekshirib chiqsin.
- Kerakli sozlamalar (ustoz ismi, Telegram, o'tish foizi, imtihon vaqti) — `js/config.js`.

