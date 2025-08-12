-- Debug WBC Card Issue
-- 1. Check if user has the WBC card
SELECT 
    id,
    user_id,
    card_id,
    quantity,
    level
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 2. Check recent SBC submissions
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

-- 3. Check SBC progress
SELECT 
    id,
    user_id,
    challenge_id,
    is_completed,
    reward_claimed,
    claimed_at
FROM sbc_user_progress 
WHERE user_id = (SELECT id FROM users WHERE username = 'jiraiya')
AND challenge_id = (SELECT id FROM sbc_challenges WHERE name = 'Rare Formation');

-- 4. Check if WBC card exists in cards table
SELECT 
    id,
    name,
    rarity,
    image_url,
    obtainable
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 5. Check SBC challenge configuration
SELECT 
    id,
    name,
    is_active,
    is_repeatable,
    wbc_card_reward
FROM sbc_challenges 
WHERE name = 'Rare Formation';

-- 6. Check all WBC cards in user's collection
SELECT 
    uc.id,
    uc.user_id,
    uc.card_id,
    uc.quantity,
    uc.level,
    c.name,
    c.rarity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = 'jiraiya' 
AND c.rarity = 'wbc';
