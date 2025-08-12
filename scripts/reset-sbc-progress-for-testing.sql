-- Reset SBC Progress for Testing
-- This will allow the user to test the WBC card reward again

-- 1. Delete the existing progress for Rare Formation
DELETE FROM sbc_user_progress 
WHERE user_id = (SELECT id FROM users WHERE username = 'jiraiya')
AND challenge_id = (SELECT id FROM sbc_challenges WHERE name = 'Rare Formation');

-- 2. Delete the existing squad submissions for Rare Formation
DELETE FROM sbc_user_squads 
WHERE user_id = (SELECT id FROM users WHERE username = 'jiraiya')
AND challenge_id = (SELECT id FROM sbc_challenges WHERE name = 'Rare Formation');

-- 3. Remove the WBC card from user's collection (if it exists)
DELETE FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 4. Verify the reset
SELECT 
    'SBC Progress' as check_type,
    COUNT(*) as count
FROM sbc_user_progress 
WHERE user_id = (SELECT id FROM users WHERE username = 'jiraiya')
AND challenge_id = (SELECT id FROM sbc_challenges WHERE name = 'Rare Formation')

UNION ALL

SELECT 
    'SBC Squads' as check_type,
    COUNT(*) as count
FROM sbc_user_squads 
WHERE user_id = (SELECT id FROM users WHERE username = 'jiraiya')
AND challenge_id = (SELECT id FROM sbc_challenges WHERE name = 'Rare Formation')

UNION ALL

SELECT 
    'WBC Card in Collection' as check_type,
    COUNT(*) as count
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';
