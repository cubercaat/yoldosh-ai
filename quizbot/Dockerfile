FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production DB_PATH=/app/db/bot.db
VOLUME ["/app/db"]
CMD ["node", "--no-warnings", "src/index.js"]
