@echo off
chcp 65001 >nul
title Chorraha viktorina boti
cd /d "%~dp0"

if not exist "quizbot\src\index.js" (
  echo Fayllar ochilmoqda, biroz kuting...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force 'kod.zip' '.'; Expand-Archive -Force 'rasmlar1.zip' 'quizbot\data'; Expand-Archive -Force 'rasmlar2.zip' 'quizbot\data'"
)
if not exist "quizbot\src\index.js" (
  echo [XATO] Fayllarni ochib bo'lmadi. kod.zip, rasmlar1.zip, rasmlar2.zip shu papkada turganini tekshiring.
  pause
  exit /b
)

where node >nul 2>nul
if errorlevel 1 goto nonode
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 goto nonode

cd quizbot

:ask
if exist ".env" goto run
echo.
echo ==================================================
echo   CHORRAHA VIKTORINA BOTI - birinchi sozlash
echo ==================================================
echo.
echo  1) @BotFather da /newbot orqali YANGI bot oching
echo     (@chorahabot tokenini ishlatmang - u sayt uchun)
echo  2) Bergan tokenni shu yerga qo'ying (sichqoncha o'ng tugmasi = qo'yish)
echo.
set "TOKEN="
set /p "TOKEN=Bot tokeni: "
if "%TOKEN%"=="" goto ask
echo.
echo  Telegram ID raqamingiz (admin panel uchun). Bilish uchun @userinfobot ga /start yozing.
set "ADMIN="
set /p "ADMIN=ID raqamingiz: "
> ".env" echo BOT_TOKEN=%TOKEN%
>> ".env" echo ADMIN_IDS=%ADMIN%
>> ".env" echo SITE_URL=https://chorrahaa.uz
echo.
echo Saqlandi.

:run
echo.
echo Bot ishga tushmoqda... Bu oynani YOPMANG - yopilsa bot to'xtaydi.
echo.
node --no-warnings src\index.js
if errorlevel 3 goto webhook
if errorlevel 2 goto badtoken
echo.
echo Bot to'xtadi. 5 soniyadan keyin qayta ishga tushadi (chiqish uchun oynani yoping)...
timeout /t 5 >nul
goto run

:badtoken
del ".env" >nul 2>nul
echo Token noto'g'ri ekan. Qaytadan kiriting.
goto ask

:webhook
del ".env" >nul 2>nul
echo Bu token boshqa joyda (sayt uchun) ishlatilmoqda. @BotFather da YANGI bot oching va o'sha tokenni kiriting.
goto ask

:nonode
echo.
echo [!] Kompyuterda Node.js yo'q yoki eski. Hozir yuklab olish sahifasi ochiladi.
echo     "LTS" versiyasini yuklab o'rnating, keyin shu faylni qayta oching.
start https://nodejs.org/en/download
pause
exit /b
