CREATE TABLE calendar_events_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL,
  end_date TEXT,
  event_time TEXT,
  end_time TEXT,
  category TEXT NOT NULL DEFAULT 'school',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  colour TEXT NOT NULL DEFAULT '#d37f9c',
  template_id TEXT,
  related_item_slug TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO calendar_events_new (id,title,description,event_date,end_date,event_time,category,visibility,related_item_slug,created_at,updated_at)
SELECT id,title,description,event_date,end_date,event_time,category,visibility,related_item_slug,created_at,updated_at FROM calendar_events;

DROP TABLE calendar_events;
ALTER TABLE calendar_events_new RENAME TO calendar_events;
UPDATE calendar_events SET colour = CASE category
  WHEN 'school' THEN '#cfa8f5'
  WHEN 'placement' THEN '#86a9c9'
  WHEN 'assignment' THEN '#e99a68'
  WHEN 'exam' THEN '#a77aa5'
  WHEN 'milestone' THEN '#d37f9c'
  WHEN 'personal' THEN '#8ab69c'
  ELSE '#d37f9c'
END;
CREATE INDEX idx_calendar_public_date ON calendar_events (visibility, event_date);
CREATE INDEX idx_calendar_date ON calendar_events (event_date);

CREATE TABLE planner_shift_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  short_label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  start_time TEXT,
  end_time TEXT,
  category TEXT NOT NULL DEFAULT 'placement',
  colour TEXT NOT NULL DEFAULT '#d37f9c',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shift_templates_updated ON planner_shift_templates(updated_at DESC);

INSERT INTO planner_shift_templates (id,title,short_label,start_time,end_time,category,colour,visibility) VALUES
  ('shift_school', 'Schule', 'S', '07:30', NULL, 'school', '#cfa8f5', 'private'),
  ('shift_early', 'Frühschicht', 'F', '06:00', '14:00', 'early_shift', '#e79ac3', 'private'),
  ('shift_late', 'Spätschicht', 'S', '13:30', '21:30', 'late_shift', '#e99a68', 'private'),
  ('shift_night', 'Nachtdienst', 'N', '21:00', '06:30', 'night_shift', '#7483c1', 'private'),
  ('shift_free', 'Frei', 'F', NULL, NULL, 'free', '#e51f68', 'private'),
  ('shift_vacation', 'Urlaub', 'U', NULL, NULL, 'vacation', '#b9dda1', 'private'),
  ('shift_sick', 'Krank', 'K', NULL, NULL, 'sick', '#d96f73', 'private'),
  ('shift_exam', 'Prüfung', 'P', NULL, NULL, 'exam', '#a77aa5', 'private');
