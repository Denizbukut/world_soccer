-- Reset SBC Progress for Testing
-- This script allows you to reset SBC progress so challenges can be completed again

-- Option 1: Reset ALL SBC progress (DANGEROUS - only for testing)
-- DELETE FROM sbc_user_progress;

-- Option 2: Reset progress for a specific user (SAFER)
-- Replace 'your_username' with the actual username
-- DELETE FROM sbc_user_progress 
-- WHERE user_id IN (
--   SELECT id FROM users WHERE username = 'your_username'
-- );

-- Option 3: Reset specific challenge progress (SAFEST)
-- Replace 'challenge_id' with the actual challenge ID you want to reset
-- DELETE FROM sbc_user_progress 
-- WHERE challenge_id = 1; -- Change this to the challenge ID you want to reset

-- Option 4: Show current progress (INFORMATIONAL)
SELECT 
    u.username,
    sc.name as challenge_name,
    sup.is_completed,
    sup.reward_claimed,
    sup.created_at,
    sup.updated_at
FROM sbc_user_progress sup
JOIN users u ON sup.user_id = u.id
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
ORDER BY u.username, sc.name;

-- Option 5: Make all challenges repeatable (if needed)
-- UPDATE sbc_challenges SET is_repeatable = true WHERE is_active = true;

-- Option 6: Show challenge repeatability status
SELECT 
    id,
    name,
    is_repeatable,
    is_active,
    requirements_total_cards,
    rewards_tickets,
    rewards_elite_tickets
FROM sbc_challenges 
WHERE is_active = true
ORDER BY id;
