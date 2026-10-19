import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// .env faylini o'qish (tashqi kutubxonasiz)
const envFile = process.env.ENV_FILE || path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const CFG = {
  token: process.env.BOT_TOKEN || '',
  admins: (process.env.ADMIN_IDS || '').split(/[,\s]+/).filter(Boolean).map(Number),
  site: (process.env.SITE_URL || 'https://chorrahaa.uz').replace(/\/+$/, ''),
  apiRoot: (process.env.API_ROOT || 'https://api.telegram.org').replace(/\/+$/, ''),
  dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),
  db: process.env.DB_PATH || path.join(ROOT, 'data', 'bot.db'),
  deleteWebhook: process.env.DELETE_WEBHOOK === '1',
  tickMs: Number(process.env.TICK_MS || 30000),
};

export const isAdmin = (id) => CFG.admins.includes(Number(id));
