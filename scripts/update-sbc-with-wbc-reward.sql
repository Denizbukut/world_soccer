-- Update an existing SBC challenge to reward the WBC doue card
UPDATE "public"."sbc_challenges" 
SET 
  "wbc_card_reward" = 'de1a7d49-d937-466b-bce0-84ca3abab47b',  -- doue WBC card ID
  "special_reward" = 'WBC Card: doue',  -- Update description
  "updated_at" = NOW()
WHERE "id" = '1';  -- Starter Squad challenge

-- Or create a new WBC-specific challenge
INSERT INTO "public"."sbc_challenges" (
  "id", 
  "name", 
  "description", 
  "difficulty", 
  "rewards_tickets", 
  "rewards_elite_tickets", 
  "rewards_icon_tickets", 
  "special_reward", 
  "requirements_total_cards", 
  "requirements_min_level", 
  "requirements_team_rating", 
  "requirements_rarity_level_counts", 
  "is_repeatable", 
  "is_active", 
  "wbc_card_reward",
  "start_date"
) VALUES (
  '5',
  'World Cup Qualifier', 
  'Prove your worth on the world stage! Build a squad with 8 Basic cards (level 3+) and 3 Rare cards (level 2+) with team rating 80+', 
  'Medium', 
  '50', 
  '10', 
  '2', 
  'WBC Card: doue', 
  '11', 
  '2', 
  '80', 
  '{"basic":{"count":8,"min_level":3},"rare":{"count":3,"min_level":2}}', 
  'false', 
  'true',
  'de1a7d49-d937-466b-bce0-84ca3abab47b',  -- doue WBC card ID
  NOW()
);
