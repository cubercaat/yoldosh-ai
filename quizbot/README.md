# Chorraha YHQ viktorina boti

Guruhlarda haydovchilik (YHQ) viktorinasi o'tkazadigan, odamlarni **chorrahaa.uz** ga jalb qiladigan Telegram bot.
1276 ta rasmiy savol (745 tasi rasmli), har biriga izoh. Hech qanday `npm install` kerak emas — faqat Node.js 22.13+.

## Nima qila oladi

**Guruhda** (bot admin qilinadi)
- `/quiz` yoki `/start` — har kim test boshlay oladi: savollar soni (5–50) → har bir savol vaqti (10–60 s) → mavzu (aralash yoki 9 mavzudan biri)
- `/quiz 20` — darhol 20 savol
- Qatnashish ixtiyoriy: xohlagan javob beradi, xohlamagan bermaydi
- Savollar Telegram quiz-so'rovnoma ko'rinishida (rasm bilan), varianti uzun savollar — tugmalar bilan
- Oxirida natija: 🥇🥈🥉, ball va vaqt, «Yana o'ynash», reyting, chorrahaa.uz tugmasi
- `/top` — kunlik / haftalik / oylik / umumiy, eng yaxshilar va eng faollar
- `/stop`, `/me`, `/konkurs`, `/settings` (adminlar: kim boshlay olishi, kunlik e'lon)
- Hech kim javob bermasa 4 savoldan keyin o'zi to'xtaydi (spam bo'lmaydi)
- Guruh savollari takrorlanmaydi (1276 tasi tugaguncha)

**Bot lichkasida** — har kim o'zi test yechadi (10–100 savol, mavzu bo'yicha), «Imtihon rejimi» (20 savol, 2 ta xato), xatolar ro'yxati, reyting, natijalar, konkurslar, do'stlarni taklif qilish havolasi.

**Admin panel** (`/admin`, faqat `ADMIN_IDS`dagilar uchun)
- 📊 Statistika: foydalanuvchilar, faollar, guruhlar va a'zolar soni, testlar, eng faol guruhlar
- 👥 Guruhlar: ro'yxat, qidiruv, har bir guruh kartochkasi, shu guruhga xabar, reklamani o'chirish/yoqish, **guruhdan chiqish**, bloklash (qayta qo'shilsa ham chiqib ketadi)
- 👤 Foydalanuvchilar: qidiruv, kartochka, shaxsan xabar yozish, CSV yuklab olish, eng ko'p taklif qilganlar
- 📣 Reklama/xabar: istalgan post (matn, rasm, video...) → tugmalar (chorrahaa.uz, guruhga qo'shish, o'z tugmangiz) → kimga (hammaga / barcha guruhlar / barcha foydalanuvchilar / tanlangan guruhlar / sinov uchun faqat o'zingizga) → pin, saqlash, **vaqtini belgilash**
- 🗂 Saqlangan reklamalar va avto-aylanma
- ⚙️ Avto-reklama: natija ostidagi reklama matni (bir nechta variant), har N testdan keyin reklama posti, kunlik avto-yuborish, kunlik/haftalik g'oliblar e'loni, savol izohida «chorrahaa.uz»
- 🎁 Konkurslar: qaysi guruh(lar) yoki lichka uchun, mezon (eng ko'p to'g'ri / eng faol / random / eng aniq % / eng ko'p do'st taklif qilgan), g'oliblar soni, muddat (bugun, 3/7/14/30 kun, aniq sana yoki **hozir** — o'tgan 24 soat / 7 kun bo'yicha), minimal shart, sovrin — qo'lda yoki **avtomatik Telegram sovg'a (gift)**. Muddat tugaganda bot o'zi g'oliblarni aniqlaydi, e'lon qiladi, g'oliblarni tabriklaydi va sizga ro'yxat (ID, havola) yuboradi.

**Reklama nuqtalari** — hamma havolalar `utm_source=telegram&utm_medium=quizbot&utm_campaign=...` bilan, sayt statistikasida botdan kelganlar alohida ko'rinadi. Botning menyu tugmasi chorrahaa.uz ni Telegram ichida ochadi; bot tavsifi ham saytni reklama qiladi.

## Ishga tushirish

1. **Yangi bot oching**: @BotFather → `/newbot`. ⚠️ @chorahabot tokenini ishlatmang — u saytdagi kirish uchun webhookda ishlaydi (bot buni o'zi tekshiradi va ogohlantiradi).
2. @BotFather → `/mybots` → bot → *Bot Settings* → *Allow Groups* — **Enabled**.
3. O'z Telegram ID raqamingizni @userinfobot dan bilib oling.
4. Serverda (Node.js 22.13 yoki yangisi):
   ```bash
   cd quizbot
   cp .env.example .env      # BOT_TOKEN va ADMIN_IDS ni yozing
   node --no-warnings src/index.js
   ```
   «✅ @bot_nomi ishga tushdi» chiqsa tayyor.
5. Doimiy ishlashi uchun (server qayta yonsa ham):
   ```bash
   npm i -g pm2
   pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
   ```
   yoki Docker: `docker build -t chorraha-quizbot . && docker run -d --restart=always --env-file .env -v quizbot-db:/app/db chorraha-quizbot`

Ma'lumotlar `data/bot.db` (SQLite) faylida saqlanadi — vaqti-vaqti bilan nusxa oling.

## Sinov
`node --no-warnings test/e2e.mjs` — soxta Telegram serveri bilan to'liq ssenariy (guruh testi, lichka, admin panel, reklama, konkurslar, sovg'a, avto-reklama, e'lonlar).
