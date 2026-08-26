ALTER TABLE whiteboards ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS whiteboard_views (
  whiteboard_id TEXT NOT NULL,
  view_id TEXT NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (whiteboard_id, view_id),
  FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_whiteboard_views_board ON whiteboard_views(whiteboard_id);
