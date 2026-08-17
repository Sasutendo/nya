ALTER TABLE whiteboards ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_whiteboards_sort_order ON whiteboards(sort_order ASC, updated_at DESC);
