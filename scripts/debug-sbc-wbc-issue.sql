-- Debug SBC WBC Issue
-- 1. Check SBC Challenge configuration
SELECT 
    id,
    name,
    is_active,
    wbc_card_reward,
    requirements_rarity_level_counts,
    requirements_team_rating
FROM sbc_challenges 
WHERE name = 'Rare Formation';

-- 2. Check if WBC card exists
SELECT 
    id,
    name,
    rarity,
    image_url,
    obtainable
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 3. Check if user already has the WBC card
SELECT 
    id,
    user_id,
    card_id,
    quantity,
    level
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 4. Check user's SBC progress for Rare Formation
SELECT 
    id,
    user_id,
    challenge_id,
    is_completed,
    reward_claimed
FROM sbc_user_progress 
WHERE user_id = (SELECT id FROM users WHERE username = 'jiraiya')
AND challenge_id = (SELECT id FROM sbc_challenges WHERE name = 'Rare Formation');

-- 5. Check user's recent SBC submissions
SELECT 
    id,
    user_id,
    challenge_id,
    squad_name,
    is_valid,
    submitted_at
FROM sbc_user_squads 
WHERE user_id = (SELECT id FROM users WHERE username = 'jiraiya')
AND challenge_id = (SELECT id FROM sbc_challenges WHERE name = 'Rare Formation')
ORDER BY submitted_at DESC
LIMIT 5;
