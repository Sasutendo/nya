UPDATE content_items
SET title = 'Welcome to my learning corner',
    content_json = json_set(content_json, '$.slides[0].eyebrow', 'Nya Yuuki''s Learning Corner'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'starter_welcome'
  AND title IN ('Welcome to my learning studio', 'Welcome to my learning atelier');
