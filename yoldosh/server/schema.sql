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
