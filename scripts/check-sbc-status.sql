-- Check SBC Status and Fix Issues
-- This script checks the current state and fixes any remaining problems

-- 1. Check current challenge status
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

-- 2. Check if there's any existing progress
SELECT 
    sup.user_id,
    u.username,
    sc.name as challenge_name,
    sup.is_completed,
    sup.reward_claimed,
    sup.created_at
FROM sbc_user_progress sup
JOIN users u ON sup.user_id = u.id
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
ORDER BY u.username, sc.name;

-- 3. Reset progress for testing (uncomment if needed)
-- DELETE FROM sbc_user_progress;

-- 4. Show user cards for testing
SELECT 
    uc.user_id,
    u.username,
    c.name as card_name,
    c.rarity,
    c.overall_rating,
    uc.quantity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
JOIN users u ON uc.user_id = u.id
WHERE uc.quantity > 0
ORDER BY u.username, c.rarity
LIMIT 20;
