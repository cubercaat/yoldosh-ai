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
  created INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE TABLE IF NOT EXISTS state (
  user_id INTEGER PRIMARY KEY,
  json TEXT NOT NULL,
  updated INTEGER NOT NULL
);
