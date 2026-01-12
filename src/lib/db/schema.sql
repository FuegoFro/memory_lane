CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  dropbox_path TEXT NOT NULL UNIQUE,
  title TEXT,
  transcript TEXT,
  position INTEGER,
  disabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_position ON entries(position);
CREATE INDEX IF NOT EXISTS idx_entries_disabled ON entries(disabled);
