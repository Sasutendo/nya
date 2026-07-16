UPDATE site_settings
SET value_json = json_set(
  value_json,
  '$.siteTitle', 'Nya Yuuki''s Learning Corner',
  '$.eyebrow', 'Nursing training · personal learning journal'
)
WHERE key = 'site'
  AND json_valid(value_json)
  AND json_extract(value_json, '$.siteTitle') IN ('Nya Learning Studio', 'Nya''s Learning Atelier');
