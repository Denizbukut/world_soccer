-- Fix Rare Formation Challenge Requirements
-- The challenge should require 3 basic and 3 elite cards

-- First, let's see what the current requirements are
SELECT 
    id,
    name,
    requirements_total_cards,
    requirements_min_level,
    requirements_team_rating,
    requirements_rarity_level_counts,
    requirements_specific_rarities,
    is_active,
    is_repeatable
FROM sbc_challenges 
WHERE name = 'Rare Formation';

-- Update Rare Formation with correct requirements: 3 basic + 3 elite cards
UPDATE sbc_challenges SET
  requirements_rarity_level_counts = '{"basic": {"count": 3, "min_level": 1}, "elite": {"count": 3, "min_level": 1}}',
  requirements_specific_rarities = NULL,
  requirements_total_cards = 11,
  requirements_min_level = 1,
  requirements_team_rating = NULL,
  updated_at = NOW()
WHERE name = 'Rare Formation';

-- Verify the update
SELECT 
    id,
    name,
    requirements_total_cards,
    requirements_min_level,
    requirements_team_rating,
    requirements_rarity_level_counts,
    requirements_specific_rarities,
    is_active,
    is_repeatable
FROM sbc_challenges 
WHERE name = 'Rare Formation';
