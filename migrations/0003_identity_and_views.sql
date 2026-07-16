CREATE TABLE IF NOT EXISTS content_views (
  item_id TEXT NOT NULL,
  view_id TEXT NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, view_id),
  FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_views_date ON content_views (viewed_at);

UPDATE site_settings
SET value_json = json_set(
  value_json,
  '$.profileImage', '/images/yuuki-profile.png',
  '$.profileImageAlt', 'Yuuki profile picture'
)
WHERE key = 'site' AND json_valid(value_json) AND json_type(value_json, '$.profileImage') IS NULL;

UPDATE site_settings
SET value_json = json_set(
  value_json,
  '$.siteTitle', 'Nya Yuuki''s Learning Corner',
  '$.eyebrow', 'Nursing training · personal learning journal',
  '$.tagline', 'Carefully learning. Beautifully collected.',
  '$.footerNote', 'A soft, organised home for everything I learn.'
)
WHERE key = 'site'
  AND json_valid(value_json)
  AND json_extract(value_json, '$.siteTitle') = 'Nya Learning Studio';
