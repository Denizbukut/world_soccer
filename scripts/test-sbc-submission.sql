-- Test SBC Submission Process
-- Check current state of SBC challenges and user data

-- 1. Check SBC Challenges
SELECT 
    id,
    name,
    is_active,
    is_repeatable,
    wbc_card_reward,
    rewards_tickets,
    rewards_elite_tickets,
    rewards_icon_tickets,
    reward_amount
FROM sbc_challenges 
WHERE name = 'Rare Formation';

-- 2. Check if user exists and has cards
SELECT 
    u.id,
    u.username,
    u.tickets,
    u.elite_tickets,
    u.icon_tickets,
    u.tokens
FROM users u 
WHERE u.username = 'jiraiya';

-- 3. Check user cards for jiraiya
SELECT 
    uc.id,
    uc.card_id,
    uc.quantity,
    c.name,
    c.rarity,
    c.overall_rating
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = (SELECT id FROM users WHERE username = 'jiraiya')
ORDER BY uc.quantity DESC
LIMIT 20;

-- 4. Check if WBC card exists
SELECT 
    id,
    name,
    rarity,
    image_url
FROM cards 
WHERE name = 'doue' AND rarity = 'wbc';

-- 5. Check SBC progress for jiraiya
SELECT 
    sp.*,
    sc.name as challenge_name
FROM sbc_user_progress sp
JOIN sbc_challenges sc ON sp.challenge_id = sc.id
WHERE sp.user_id = (SELECT id FROM users WHERE username = 'jiraiya');
