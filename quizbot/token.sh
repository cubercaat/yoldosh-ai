#!/bin/bash
# Foydalanish: bash ~/quizbot/token.sh BOT_TOKENI SIZNING_TELEGRAM_ID
D="$(cd "$(dirname "$0")" && pwd)"
if [ -z "$1" ]; then echo "Foydalanish: bash $D/token.sh BOT_TOKENI TELEGRAM_ID"; exit 1; fi
printf 'BOT_TOKEN=%s\nADMIN_IDS=%s\nSITE_URL=https://chorrahaa.uz\n' "$1" "$2" > "$D/.env"
chmod 600 "$D/.env"; rm -f "$D/.env.bad"
pkill -f "$D/src/index.js"; sleep 1
bash "$D/start.sh"
(crontab -l 2>/dev/null | grep -v "$D/start.sh"; echo "*/5 * * * * bash $D/start.sh") | crontab -
sleep 8
tail -n 6 "$D/bot.log"
pgrep -f "$D/src/index.js" >/dev/null && echo "=== BOT ISHLAYAPTI ===" || echo "=== BOT ISHGA TUSHMADI — yuqoridagi xabarni o'qing ==="
