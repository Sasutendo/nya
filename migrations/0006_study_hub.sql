CREATE TABLE IF NOT EXISTS study_cards (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_cards_updated ON study_cards(updated_at DESC);

CREATE TABLE IF NOT EXISTS nursing_skills (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  skill_status TEXT NOT NULL DEFAULT 'learning' CHECK(skill_status IN ('learning', 'practising', 'confident')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nursing_skills_status ON nursing_skills(skill_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS study_reflections (
  id TEXT PRIMARY KEY,
  reflection_date TEXT NOT NULL,
  win TEXT NOT NULL DEFAULT '',
  learned TEXT NOT NULL DEFAULT '',
  revisit TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_reflections_date ON study_reflections(reflection_date DESC, updated_at DESC);

INSERT OR IGNORE INTO study_cards (id, question, answer, category, created_at, updated_at) VALUES
  ('starter_card_1', 'What are the five moments for hand hygiene?', 'Before touching a patient; before a clean or aseptic procedure; after body-fluid exposure risk; after touching a patient; after touching patient surroundings.', 'Hygiene', datetime('now'), datetime('now')),
  ('starter_card_2', 'What does SBAR stand for?', 'Situation, Background, Assessment and Recommendation.', 'Communication', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO nursing_skills (id, title, category, skill_status, notes, created_at, updated_at) VALUES
  ('starter_skill_1', 'Measure and document vital signs', 'Core care', 'practising', 'Focus on a calm explanation and accurate documentation.', datetime('now'), datetime('now')),
  ('starter_skill_2', 'Perform hygienic hand disinfection', 'Hygiene', 'confident', 'Keep reviewing all indications, not only the technique.', datetime('now'), datetime('now')),
  ('starter_skill_3', 'Give a structured handover', 'Communication', 'learning', 'Practise with a short SBAR-style structure.', datetime('now'), datetime('now'));
