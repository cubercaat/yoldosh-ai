#!/bin/bash
# Botni fon rejimida ishga tushiradi (agar ishlamayotgan bo'lsa). CRON har 5 daqiqada chaqiradi.
D="$(cd "$(dirname "$0")" && pwd)"
NODE="${NODE:-$HOME/node22/bin/node}"
[ -x "$NODE" ] || NODE="$(command -v node)"
pgrep -f "$D/src/index.js" >/dev/null && exit 0
grep -q '^BOT_TOKEN=..' "$D/.env" 2>/dev/null || exit 0
cd "$D"
nohup bash -c "\"$NODE\" --no-warnings \"$D/src/index.js\"; c=\$?; if [ \$c = 2 ] || [ \$c = 3 ]; then mv \"$D/.env\" \"$D/.env.bad\"; fi" >> "$D/bot.log" 2>&1 < /dev/null &
