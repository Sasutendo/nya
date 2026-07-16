UPDATE study_cards
SET question = 'What does SBAR stand for?',
    answer = 'Situation, Background, Assessment and Recommendation.',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'starter_card_2'
  AND question = 'What should a clear nursing handover include?';
