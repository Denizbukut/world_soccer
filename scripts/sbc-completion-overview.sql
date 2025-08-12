-- SBC Completion Overview - Shows which SBC challenges have been completed
-- This script provides a comprehensive view of all SBC completions

-- 1. Basic completion overview with challenge details
SELECT 
    sc.id as challenge_id,
    sc.title as challenge_title,
    sc.description as challenge_description,
    sc.is_active,
    sc.is_repeatable,
    COUNT(sup.id) as total_completions,
    COUNT(DISTINCT sup.user_id) as unique_users_completed
FROM sbc_challenges sc
LEFT JOIN sbc_user_progress sup ON sc.id = sup.challenge_id AND sup.is_completed = true
GROUP BY sc.id, sc.title, sc.description, sc.is_active, sc.is_repeatable
ORDER BY sc.id;

-- 2. Detailed user completion list with timestamps
SELECT 
    u.username,
    sc.title as challenge_title,
    sc.description as challenge_description,
    sup.claimed_at as completion_date,
    sc.is_repeatable,
    sc.rewards_tickets,
    sc.rewards_exp,
    sc.wbc_card_reward
FROM sbc_user_progress sup
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
JOIN users u ON sup.user_id = u.id
WHERE sup.is_completed = true
ORDER BY sup.claimed_at DESC;

-- 3. Challenge completion statistics
SELECT 
    sc.title,
    sc.is_active,
    sc.is_repeatable,
    COUNT(sup.id) as total_completions,
    COUNT(DISTINCT sup.user_id) as unique_users,
    MIN(sup.claimed_at) as first_completion,
    MAX(sup.claimed_at) as last_completion,
    sc.rewards_tickets,
    sc.rewards_exp,
    CASE 
        WHEN sc.wbc_card_reward IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as has_wbc_reward
FROM sbc_challenges sc
LEFT JOIN sbc_user_progress sup ON sc.id = sup.challenge_id AND sup.is_completed = true
GROUP BY sc.id, sc.title, sc.is_active, sc.is_repeatable, sc.rewards_tickets, sc.rewards_exp, sc.wbc_card_reward
ORDER BY total_completions DESC;

-- 4. User completion summary (how many challenges each user has completed)
SELECT 
    u.username,
    COUNT(sup.id) as challenges_completed,
    COUNT(DISTINCT sup.challenge_id) as unique_challenges_completed,
    SUM(sc.rewards_tickets) as total_tickets_earned,
    SUM(sc.rewards_exp) as total_exp_earned,
    COUNT(CASE WHEN sc.wbc_card_reward IS NOT NULL THEN 1 END) as wbc_cards_earned
FROM users u
LEFT JOIN sbc_user_progress sup ON u.id = sup.user_id AND sup.is_completed = true
LEFT JOIN sbc_challenges sc ON sup.challenge_id = sc.id
GROUP BY u.username
HAVING COUNT(sup.id) > 0
ORDER BY challenges_completed DESC;

-- 5. Recent completions (last 50)
SELECT 
    u.username,
    sc.title as challenge_title,
    sup.claimed_at as completed_at,
    sc.rewards_tickets,
    sc.rewards_exp,
    CASE 
        WHEN sc.wbc_card_reward IS NOT NULL THEN 'WBC Card: ' || c.name
        ELSE 'No WBC Card'
    END as wbc_reward
FROM sbc_user_progress sup
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
JOIN users u ON sup.user_id = u.id
LEFT JOIN cards c ON sc.wbc_card_reward = c.id
WHERE sup.is_completed = true
ORDER BY sup.claimed_at DESC
LIMIT 50;

-- 6. Challenge popularity ranking
SELECT 
    sc.title,
    sc.description,
    COUNT(sup.id) as completion_count,
    ROUND(COUNT(sup.id) * 100.0 / (SELECT COUNT(*) FROM users), 2) as completion_percentage,
    sc.is_active,
    sc.is_repeatable
FROM sbc_challenges sc
LEFT JOIN sbc_user_progress sup ON sc.id = sup.challenge_id AND sup.is_completed = true
GROUP BY sc.id, sc.title, sc.description, sc.is_active, sc.is_repeatable
ORDER BY completion_count DESC;

-- 7. WBC card reward distribution
SELECT 
    c.name as wbc_card_name,
    c.rarity as wbc_card_rarity,
    sc.title as challenge_title,
    COUNT(sup.id) as times_awarded,
    COUNT(DISTINCT sup.user_id) as unique_users_received
FROM sbc_challenges sc
JOIN cards c ON sc.wbc_card_reward = c.id
LEFT JOIN sbc_user_progress sup ON sc.id = sup.challenge_id AND sup.is_completed = true
WHERE sc.wbc_card_reward IS NOT NULL
GROUP BY c.id, c.name, c.rarity, sc.title
ORDER BY times_awarded DESC;
