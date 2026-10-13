# Telegram bot orqali ro'yxatdan o'tish — ishga tushirish (taxminan 15 daqiqa)

Oqim: saytda **Telegram orqali davom etish** → Telegram ochiladi → botda **Start** → botdagi **Saytga qaytish** tugmasi → ism-familya → **Boshlash**.

## 1. Botni yarating (Telegram'da)
1. @BotFather → `/newbot` → nom va username (masalan `chorraha_bot`).
2. U bergan **token**ni saqlang (hech kimga bermang, GitHub'ga yozmang).

## 2. Cloudflare Worker (bepul)
Cloudflare hisobi kerak (dash.cloudflare.com). Kompyuterda Node.js bo'lsa:
```bash
cd yoldosh/server
npx wrangler login
npx wrangler kv namespace create AUTH        # chiqqan id ni wrangler.toml dagi KV_ID_SHU_YERGA o'rniga yozing
# wrangler.toml da BOT_USERNAME ni o'zgartiring
npx wrangler secret put TELEGRAM_BOT_TOKEN   # BotFather tokeni
npx wrangler secret put WEBHOOK_SECRET       # istalgan uzun tasodifiy matn (masalan 32 ta harf/raqam)
npx wrangler deploy                          # oxirida https://chorraha-api.<hisob>.workers.dev chiqadi
```

## 3. Telegram'ga webhook ulang
Brauzerda (TOKEN, SECRET, WORKER_URL ni almashtiring):
```
https://api.telegram.org/botTOKEN/setWebhook?url=WORKER_URL/telegram/webhook&secret_token=SECRET
```
`{"ok":true,...}` chiqsa tayyor.

## 4. Saytni ulang
`yoldosh/js/config.js` da:
```js
apiBase: 'https://chorraha-api.<hisob>.workers.dev',
telegramBot: 'chorraha_bot',
```
Saqlab GitHub'ga yuboring — sayt yangi oqimga o'tadi (bu ikkalasi bo'sh bo'lsa demo rejim ishlaydi).

## Sinash
- Mahalliy (tokensiz): `node server/dev-auth.mjs` — soxta bot serveri; `node server/worker.test.mjs` — avtomatik testlar.
- Haqiqiy: saytda tugmani bosing → Telegram → Start → "Saytga qaytish".

## Eslatma
- Token 15 daqiqa amal qiladi va bir martalik.
- Hozir talaba ma'lumoti brauzerda saqlanadi (demo); Telegram ID va username bot orqali tasdiqlanadi. Server bazasi (reyting, ustoz paneli) keyingi bosqich.
