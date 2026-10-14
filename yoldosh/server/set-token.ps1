# Bot tokenini Cloudflare'ga xavfsiz joylash. Ishga tushiring: powershell -ExecutionPolicy Bypass -File set-token.ps1
Set-Location $PSScriptRoot
Write-Host ""
Write-Host "BotFather bergan YANGI tokenni qo'ying va Enter bosing (qo'yganda ekranda ko'rinmaydi):" -ForegroundColor Cyan
$sec = Read-Host -AsSecureString
$tok = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)).Trim()
if ($tok -notmatch '^\d{6,12}:[A-Za-z0-9_-]{30,50}$') { Write-Host "Bu token ko'rinishida emas. Faqat BotFather bergan tokenni qo'ying (raqam:harflar)." -ForegroundColor Red; exit 1 }
$tok | npx wrangler secret put TELEGRAM_BOT_TOKEN
Write-Host ""
Write-Host "Tayyor bo'lsa yuqorida 'Success! Uploaded secret TELEGRAM_BOT_TOKEN' yozuvi bo'ladi. Keyin Claude'ga 'tayyor' deb yozing." -ForegroundColor Green
