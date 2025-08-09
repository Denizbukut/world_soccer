-- Fix SBC Challenge Issues
-- This script makes challenges repeatable and resets progress for testing

-- 1. Make all active challenges repeatable
UPDATE sbc_challenges 
SET is_repeatable = true 
WHERE is_active = true;

-- 2. Reset all SBC progress (for testing)
DELETE FROM sbc_user_progress;

-- 3. Show current challenge status
SELECT 
    id,
    name,
    is_repeatable,
    is_active,
    requirements_total_cards,
    requirements_team_rating,
    requirements_specific_rarities,
    rewards_tickets,
    rewards_elite_tickets
FROM sbc_challenges 
WHERE is_active = true
ORDER BY id;

-- 4. Verify no progress exists
SELECT COUNT(*) as remaining_progress FROM sbc_user_progress;

-- 5. Show sample user cards for testing
SELECT 
    uc.user_id,
    c.name as card_name,
    c.rarity,
    c.overall_rating,
    uc.quantity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.quantity > 0
ORDER BY uc.user_id, c.rarity
LIMIT 10;
