-- Check SBC Completions and WBC Card Rewards
-- This script helps identify how many times a user has completed SBC challenges and received WBC cards

-- 1. Check how many times the user has completed the "Rare Formation" challenge
SELECT 
    'RARE FORMATION COMPLETIONS' as check_type,
    sup.user_id,
    sup.challenge_id,
    sc.name as challenge_name,
    sup.is_completed,
    sup.reward_claimed,
    sup.claimed_at,
    sup.created_at,
    sup.updated_at
FROM sbc_user_progress sup
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
WHERE sup.user_id = 'jiraiya' 
  AND sc.name LIKE '%Rare Formation%'
ORDER BY sup.claimed_at DESC;

-- 2. Check the "Rare Formation" challenge details
SELECT 
    'RARE FORMATION CHALLENGE DETAILS' as check_type,
    id,
    name,
    description,
    is_repeatable,
    wbc_card_reward,
    is_active
FROM sbc_challenges 
WHERE name LIKE '%Rare Formation%';

-- 3. Check how many WBC cards the user currently has
SELECT 
    'CURRENT WBC CARDS' as check_type,
    uc.user_id,
    uc.card_id,
    uc.quantity,
    uc.level,
    c.name,
    c.rarity,
    c.character
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = 'jiraiya' 
  AND c.rarity = 'wbc'
ORDER BY c.name;

-- 4. Check if the user should have received the specific WBC card from Rare Formation
SELECT 
    'EXPECTED WBC CARD' as check_type,
    c.id,
    c.name,
    c.rarity,
    c.character,
    CASE 
        WHEN uc.card_id IS NOT NULL THEN 'User has this card'
        ELSE 'User does NOT have this card'
    END as status,
    COALESCE(uc.quantity, 0) as user_quantity
FROM cards c
LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = 'jiraiya'
WHERE c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'  -- doue WBC card ID
ORDER BY c.name;

-- 5. Check all SBC completions for the user
SELECT 
    'ALL SBC COMPLETIONS' as check_type,
    sup.user_id,
    sup.challenge_id,
    sc.name as challenge_name,
    sc.is_repeatable,
    sup.is_completed,
    sup.reward_claimed,
    sup.claimed_at,
    sc.wbc_card_reward
FROM sbc_user_progress sup
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
WHERE sup.user_id = 'jiraiya' 
  AND sup.is_completed = true
ORDER BY sup.claimed_at DESC;

-- 6. Summary of expected vs actual WBC cards
SELECT 
    'WBC CARD SUMMARY' as summary,
    (SELECT COUNT(*) FROM sbc_user_progress sup 
     JOIN sbc_challenges sc ON sup.challenge_id = sc.id 
     WHERE sup.user_id = 'jiraiya' 
       AND sup.is_completed = true 
       AND sc.wbc_card_reward IS NOT NULL) as completed_wbc_challenges,
    (SELECT SUM(uc.quantity) FROM user_cards uc 
     JOIN cards c ON uc.card_id = c.id 
     WHERE uc.user_id = 'jiraiya' 
       AND c.rarity = 'wbc') as total_wbc_cards_owned,
    (SELECT COUNT(*) FROM user_cards uc 
     JOIN cards c ON uc.card_id = c.id 
     WHERE uc.user_id = 'jiraiya' 
       AND c.rarity = 'wbc') as unique_wbc_cards_owned;
