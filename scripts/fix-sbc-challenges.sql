-- Fix SBC Challenges Data
-- This script corrects the JSON formatting and data issues in the SBC challenges

-- Update Starter Squad with correct JSON format
UPDATE sbc_challenges SET
  requirements_rarity_level_counts = '{"Basic": {"count": 7, "min_level": 2}, "Rare": {"count": 3, "min_level": 1}, "Elite": {"count": 1, "min_level": 1}}',
  requirements_specific_rarities = NULL,
  updated_at = NOW()
WHERE name = 'Starter Squad';

-- Update Elite Formation with correct JSON format
UPDATE sbc_challenges SET
  requirements_specific_rarities = ARRAY['Elite'],
  requirements_rarity_level_counts = NULL,
  updated_at = NOW()
WHERE name = 'Elite Formation';

-- Update Legendary Lineup with correct JSON format
UPDATE sbc_challenges SET
  requirements_specific_rarities = ARRAY['Legendary'],
  requirements_rarity_level_counts = NULL,
  updated_at = NOW()
WHERE name = 'Legendary Lineup';

-- Update Iconic Masters with correct JSON format
UPDATE sbc_challenges SET
  requirements_specific_rarities = ARRAY['Icon'],
  requirements_rarity_level_counts = NULL,
  updated_at = NOW()
WHERE name = 'Iconic Masters';

-- Verify the updates
SELECT 
  name,
  requirements_team_rating,
  requirements_rarity_level_counts,
  requirements_specific_rarities,
  reward_type,
  reward_amount
FROM sbc_challenges 
ORDER BY id;
