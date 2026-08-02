CREATE TABLE IF NOT EXISTS whiteboards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  background TEXT NOT NULL DEFAULT 'grid' CHECK (background IN ('plain', 'grid', 'lined', 'dots')),
  strokes_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whiteboards_updated ON whiteboards(updated_at DESC);
