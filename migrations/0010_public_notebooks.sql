ALTER TABLE whiteboards ADD COLUMN published INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_whiteboards_public ON whiteboards(published, updated_at DESC);
