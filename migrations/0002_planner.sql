CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL,
  end_date TEXT,
  event_time TEXT,
  category TEXT NOT NULL DEFAULT 'school' CHECK (category IN ('school', 'placement', 'assignment', 'exam', 'milestone', 'personal')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  related_item_slug TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calendar_public_date ON calendar_events (visibility, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events (event_date);

CREATE TABLE IF NOT EXISTS planner_sticky_notes (
  id TEXT PRIMARY KEY,
  note_text TEXT NOT NULL,
  colour TEXT NOT NULL DEFAULT 'pink' CHECK (colour IN ('pink', 'peach', 'yellow', 'sage', 'lilac')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_due ON planner_tasks (completed, due_date);
