CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('presentation', 'note', 'project')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured INTEGER NOT NULL DEFAULT 0,
  cover_image TEXT NOT NULL DEFAULT '',
  assets_json TEXT NOT NULL DEFAULT '[]',
  content_json TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_public ON content_items (status, type, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_updated ON content_items (updated_at DESC);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  fingerprint TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts (fingerprint, attempted_at);

INSERT OR IGNORE INTO site_settings (key, value_json) VALUES (
  'site',
  '{"siteTitle":"Nya Learning Studio","ownerName":"Yuuki","eyebrow":"Nursing training · learning archive","tagline":"Learn with care. Share with clarity.","introduction":"A growing collection of presentations, study notes and practical projects from my journey to becoming a qualified nurse.","trainingLabel":"General nursing training · Starting August","footerNote":"Built as a calm place for useful knowledge."}'
);

INSERT OR IGNORE INTO content_items (
  id, type, slug, title, excerpt, category, tags_json, status, featured, assets_json, content_json, published_at
) VALUES (
  'starter_welcome',
  'presentation',
  'welcome-to-my-learning-studio',
  'Welcome to my learning studio',
  'A short tour of how presentations, notes and projects live together in this archive.',
  'Orientation',
  '["Welcome","Portfolio"]',
  'published',
  1,
  '[]',
  '{"kind":"presentation","slides":[{"id":"welcome_1","layout":"title","tone":"sage","eyebrow":"Nya Learning Studio","title":"Learning, documented with care.","body":"Presentations, notes and projects from my nursing training — organised in one calm, public archive.","speakerNotes":"Introduce the purpose of the learning portfolio."},{"id":"welcome_2","layout":"list","tone":"paper","eyebrow":"What you will find here","title":"One home for every kind of work","points":["Focused study notes for quick revision","Full-screen presentations for school and practice","Projects that show the process as well as the result"]},{"id":"welcome_3","layout":"quote","tone":"clay","title":"Knowledge becomes more useful when it is clear enough to share.","body":"This studio will grow with every module, placement and new skill."},{"id":"welcome_4","layout":"statement","tone":"ocean","eyebrow":"The beginning","title":"Training starts in August.","body":"The archive starts now — ready for everything that comes next."}]}',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO content_items (
  id, type, slug, title, excerpt, category, tags_json, status, featured, assets_json, content_json, published_at
) VALUES (
  'starter_note',
  'note',
  'how-i-structure-study-notes',
  'How I structure study notes',
  'A simple note format built for understanding first and revision later.',
  'Study methods',
  '["Learning","Organisation"]',
  'published',
  0,
  '[]',
  '{"kind":"note","body":"## Start with the purpose\n\nBefore writing details, I add one sentence that answers: **What should I understand after reading this?**\n\n## Keep one clear hierarchy\n\n- Main concept\n- Important details\n- Example from practice\n- Questions to revisit\n\n## End with a quick check\n\nI finish every note with three small questions. If I can answer them without looking, the note has done its job."}',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO content_items (
  id, type, slug, title, excerpt, category, tags_json, status, featured, assets_json, content_json, published_at
) VALUES (
  'starter_project',
  'project',
  'my-training-portfolio',
  'My training portfolio',
  'The long-term project behind this website: making progress visible without making learning feel cluttered.',
  'Portfolio',
  '["Planning","Reflection"]',
  'published',
  1,
  '[]',
  '{"kind":"project","body":"## Why this exists\n\nNursing training creates a lot of valuable work: classroom presentations, placement reflections, practical preparation and revision notes. This project gives all of it a permanent, organised home.\n\n## The approach\n\nEach piece can begin as a private draft. When it is ready, it can be published to the public library with one change.","goals":["Keep school work easy to find on phone and computer","Present finished work in a professional way","Build a useful record of progress throughout training"],"outcome":"A living portfolio that grows with every part of the training."}',
  CURRENT_TIMESTAMP
);
