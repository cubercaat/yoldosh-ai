-- Chorraha: foydalanuvchilar bazasi (Cloudflare D1)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first TEXT NOT NULL,
  last TEXT NOT NULL,
  region TEXT,
  group_code TEXT,
  ref TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  prem_until INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE TABLE IF NOT EXISTS state (
  user_id INTEGER PRIMARY KEY,
  json TEXT NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, region TEXT, city TEXT, address TEXT, phone TEXT, price TEXT, hours TEXT, note TEXT, telegram TEXT, tg_chat TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  free_until INTEGER NOT NULL DEFAULT 0,   -- bepul ulanish muddati tugaydigan vaqt (ms); 0 = belgilanmagan
  per_student INTEGER NOT NULL DEFAULT 0,  -- bepul davrdan keyin har talaba uchun (so'm)
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL, user_id INTEGER NOT NULL, phone TEXT, created INTEGER NOT NULL,
  UNIQUE(school_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_school ON leads(school_id);

-- CMS: sozlamalar, qo'shimcha savollar, tahrirlar, promokodlar, rasmlar
CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cquestions (id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT, text TEXT NOT NULL, options TEXT NOT NULL, answer INTEGER NOT NULL, explain TEXT, img TEXT, active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS qedits (n INTEGER PRIMARY KEY, hide INTEGER NOT NULL DEFAULT 0, text TEXT, options TEXT, answer INTEGER, explain TEXT);
CREATE TABLE IF NOT EXISTS promos (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, days INTEGER NOT NULL, max_uses INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, used INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS promo_uses (promo_id INTEGER NOT NULL, user_id INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (promo_id, user_id));
CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, mime TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS battle_results (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, sec INTEGER NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS battle_code ON battle_results (code);

-- To'lovlar (qo'lda: karta orqali, admin tasdiqlaydi)
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, kind TEXT NOT NULL, days INTEGER NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL, note TEXT, reason TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status ON orders (status);

-- Telegram bot adminlari va ommaviy yuborish
CREATE TABLE IF NOT EXISTS admins (tg_id TEXT PRIMARY KEY, name TEXT, perms TEXT NOT NULL, added_by TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS broadcasts (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_tg TEXT NOT NULL, text TEXT, photo TEXT, btn_text TEXT, btn_url TEXT, audience TEXT NOT NULL, after INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, created INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0);
