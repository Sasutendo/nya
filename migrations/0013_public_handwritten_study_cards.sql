ALTER TABLE study_cards ADD COLUMN question_ink_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE study_cards ADD COLUMN answer_ink_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE study_cards ADD COLUMN published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_study_cards_public ON study_cards(published, updated_at DESC);

UPDATE study_cards SET published = 1 WHERE id LIKE 'starter_card_%';
