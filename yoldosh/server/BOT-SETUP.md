# Chorraha: haqiqiy ro'yxatdan o'tish (Telegram bot + Cloudflare, bepul)

Oqim: saytda **Telegram orqali davom etish** → botda **Start** → saytga qaytish → ism-familya → **Boshlash**.
Ma'lumotlar (foydalanuvchi, ball, natijalar) Cloudflare D1 bazasida saqlanadi, istalgan qurilmadan shu hisob bilan kirish mumkin.

## 1. Telegram bot
@BotFather → `/newbot` → nom va username (masalan `chorraha_bot`). Berilgan **token**ni saqlang (hech kimga bermang, GitHub'ga yozmang).

## 2. Cloudflare (terminalda, `yoldosh/server` papkasida)
```bash
npx wrangler login                                # brauzer ochiladi, ruxsat bering
npx wrangler d1 create chorraha                   # chiqqan database_id ni wrangler.toml dagi D1_ID_SHU_YERGA o'rniga yozing
npx wrangler d1 execute chorraha --remote --file=schema.sql
npx wrangler kv namespace create AUTH             # chiqqan id ni wrangler.toml dagi KV_ID_SHU_YERGA o'rniga yozing
# wrangler.toml da BOT_USERNAME (@siz) va SITE_URL / ALLOWED_ORIGIN ni o'zingizning domeningizga o'zgartiring
npx wrangler secret put TELEGRAM_BOT_TOKEN        # BotFather tokeni
npx wrangler secret put WEBHOOK_SECRET            # istalgan uzun tasodifiy matn
npx wrangler secret put SESSION_SECRET            # kamida 32 belgili uzun tasodifiy matn
npx wrangler deploy                               # oxirida https://chorraha-api.<hisob>.workers.dev chiqadi
```

## 3. Webhook (brauzerda bir marta)
```
https://api.telegram.org/botTOKEN/setWebhook?url=WORKER_URL/telegram/webhook&secret_token=WEBHOOK_SECRET_QIYMATI
```
`{"ok":true,...}` chiqsa tayyor.

## 4. Saytni ulash
`yoldosh/js/config.js`:
```js
apiBase: 'https://chorraha-api.<hisob>.workers.dev',
telegramBot: 'chorraha_bot',
```
Saqlab GitHub'ga yuboring. Bo'sh qoldirilsa sayt demo rejimda ishlaydi.

## Sinash
- Mahalliy (tokensiz): `node --experimental-sqlite server/dev-auth.mjs`
- Testlar: `node server/worker.test.mjs` va `node --experimental-sqlite server/worker.db.test.mjs`

## Majburiy obuna (kanalga a'zolik)
Ro'yxatdan o'tishdan oldin foydalanuvchi sizning kanal(lar)ingizga obuna bo'lishi shart qilinadi. Bot ichida boshqariladi:
1. Botni kanalga **administrator** qilib qo'shing (aks holda Telegram a'zolikni tekshirishga ruxsat bermaydi).
2. Botda `/admin` → **🔒 Majburiy obuna** → **➕ Kanal qo'shish** → kanal `@username` ini yozing (yopiq kanal bo'lsa undan xabar forward qiling).
3. Obuna avtomatik yoqiladi. Yoqish/o'chirish va kanalni olib tashlash shu bo'limda. Eng ko'pi 5 ta kanal.
- Foydalanuvchi botda Start bosganda obuna bo'lmagan bo'lsa, kanal tugmalari va «✅ Tekshirish» tugmasi chiqadi; obuna bo'lgach saytga qaytish tugmasi keladi.
- Tekshirib bo'lmasa (bot kanalda admin emas, kanal o'chirilgan) foydalanuvchi to'siqda qolmaydi.
- Egalar (`ADMIN_TG_IDS`) hamma ruxsatga ega. Boshqa admin uchun: `/admin` → **👥 Adminlar** → ruxsatlar ichida «Majburiy obunani sozlash» ni belgilang.
- Qo'shimcha sozlama yoki migratsiya shart emas (mavjud `settings` jadvali ishlatiladi); faqat `npx wrangler deploy` qiling.

## Ommaga chiqarishdan oldin
- Admin demo PIN (`adminPin` config.js da) hozircha demo: haqiqiy rejimda admin kirishini serverga o'tkazish kerak.
- "Maxfiylik siyosati" va "Foydalanish shartlari" sahifalari (Telegram ID va ism saqlanadi).
- Savollar manbasi uchun huquqlarni tekshiring.
