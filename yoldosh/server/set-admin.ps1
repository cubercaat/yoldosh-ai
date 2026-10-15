# Admin login va parolini xavfsiz o'rnatish. Ishga tushiring: powershell -ExecutionPolicy Bypass -File set-admin.ps1
# Parol hech qayerda ochiq saqlanmaydi: faqat PBKDF2 xeshi Cloudflare'ga sir sifatida yuboriladi.
Set-Location $PSScriptRoot
Write-Host ""
$login = Read-Host "Admin LOGIN (masalan: bosh, kamida 3 belgi)"
if ($login.Length -lt 3 -or $login.Contains(':')) { Write-Host "Login kamida 3 belgi bo'lsin va ':' belgisi bo'lmasin." -ForegroundColor Red; exit 1 }
$p1 = Read-Host "Admin PAROL (kamida 10 belgi, ekranda ko'rinmaydi)" -AsSecureString
$p2 = Read-Host "Parolni takrorlang" -AsSecureString
$a = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
$b = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
if ($a -ne $b) { Write-Host "Parollar mos kelmadi." -ForegroundColor Red; exit 1 }
if ($a.Length -lt 10) { Write-Host "Parol kamida 10 belgidan iborat bo'lsin." -ForegroundColor Red; exit 1 }
$salt = New-Object byte[] 16; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
$kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes($a, $salt, 100000, [Security.Cryptography.HashAlgorithmName]::SHA256)
$hash = $kdf.GetBytes(32)
$b64 = { param($x) [Convert]::ToBase64String($x).TrimEnd('=').Replace('+','-').Replace('/','_') }
$cred = "$($login):100000:$(& $b64 $salt):$(& $b64 $hash)"
$cred | npx wrangler secret put ADMIN_CRED
Write-Host ""
Write-Host "Tayyor bo'lsa 'Success! Uploaded secret ADMIN_CRED' yozuvi chiqadi. Endi saytda /#/admin sahifasidan shu login va parol bilan kiring." -ForegroundColor Green
