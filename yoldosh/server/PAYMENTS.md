# Payme va Click ulash

Kod tayyor (`server/pay.js`). Ishga tushirish uchun faqat kalitlar kerak — kalit qo'yilmaguncha tugmalar ko'rinmaydi, qo'lda karta to'lovi ishlayveradi.

## 1. Payme (Payme Business)
1. business.payme.uz da kassa oching (shartnoma). Kassa sozlamalarida:
   - **Endpoint URL:** `https://chorraha-api.chorraha.workers.dev/pay/payme`
   - **Account maydoni:** `order_id` (raqam)
2. Kassa **ID** va **KEY** (test va haqiqiy kalit alohida) ni bering:
```bash
cd yoldosh/server
npx wrangler secret put PAYME_MERCHANT_ID
npx wrangler secret put PAYME_KEY
```
3. Payme sandbox'da «Sinov» tugmasini bosib barcha metodlarni tekshiring (CheckPerform, Create, Perform, Cancel, CheckTransaction, GetStatement ishlaydi).

## 2. Click (Click Merchant)
1. merchant.click.uz da xizmat oching. Sozlamalar:
   - **Prepare URL:** `https://chorraha-api.chorraha.workers.dev/pay/click/prepare`
   - **Complete URL:** `https://chorraha-api.chorraha.workers.dev/pay/click/complete`
2. Xizmat **ID**, **Merchant ID** va **Secret key** ni bering:
```bash
npx wrangler secret put CLICK_SERVICE_ID
npx wrangler secret put CLICK_MERCHANT_ID
npx wrangler secret put CLICK_SECRET
```

## 3. Qanday ishlaydi
- Foydalanuvchi tarif tanlaydi → buyurtma yaratiladi → «Payme» yoki «Click» tugmasi → to'lov sahifasi.
- To'lov o'tgach provayder serverimizga murojaat qiladi, buyurtma avtomatik tasdiqlanadi, tarif ochiladi va Telegramga xabar boradi.
- Bajarilgan to'lovni Payme `CancelTransaction` bilan bekor qila olmaydi (-31007 qaytariladi): qaytarish kerak bo'lsa, pulni provayder kabinetidan qaytaring va admin panelda foydalanuvchining muddatini qo'lda kamaytiring.
- Barcha tranzaksiyalar D1 dagi `ptx` jadvalida saqlanadi.
