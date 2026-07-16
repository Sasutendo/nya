UPDATE site_settings
SET value_json = json_set(
  value_json,
  '$.trainingLabel', 'General nursing training · Starting August'
)
WHERE key = 'site'
  AND json_valid(value_json)
  AND lower(COALESCE(json_extract(value_json, '$.trainingLabel'), '')) LIKE '%pflegefachkraft%';
