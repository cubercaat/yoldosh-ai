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

## Ommaga chiqarishdan oldin
- Admin demo PIN (`adminPin` config.js da) hozircha demo: haqiqiy rejimda admin kirishini serverga o'tkazish kerak.
- "Maxfiylik siyosati" va "Foydalanish shartlari" sahifalari (Telegram ID va ism saqlanadi).
- Savollar manbasi uchun huquqlarni tekshiring.
