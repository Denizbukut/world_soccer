-- Comprehensive WBC System Test
-- This script tests all aspects of the WBC system

-- 1. Check WBC card exists and is not obtainable
SELECT 
    id,
    name,
    rarity,
    obtainable,
    created_at
FROM cards 
WHERE rarity = 'wbc'
ORDER BY name;

-- 2. Check if any users have WBC cards (should only be from SBC rewards)
SELECT 
    uc.user_id,
    uc.card_id,
    uc.quantity,
    uc.level,
    c.name,
    c.rarity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE c.rarity = 'wbc'
ORDER BY uc.user_id, c.name;

-- 3. Check SBC challenges that give WBC rewards
SELECT 
    id,
    name,
    description,
    wbc_card_reward,
    is_active
FROM sbc_challenges 
WHERE wbc_card_reward IS NOT NULL
ORDER BY name;

-- 4. Check SBC submissions that should have given WBC cards
SELECT 
    sus.id,
    sus.user_id,
    sus.challenge_id,
    sus.submitted_at,
    sc.name as challenge_name,
    sc.wbc_card_reward
FROM sbc_user_squads sus
JOIN sbc_challenges sc ON sus.challenge_id = sc.id
WHERE sc.wbc_card_reward IS NOT NULL
ORDER BY sus.submitted_at DESC;

-- 5. Check if WBC cards are being used in battles (should work)
SELECT 
    COUNT(*) as total_wbc_cards_in_collections,
    COUNT(DISTINCT uc.user_id) as users_with_wbc,
    SUM(uc.quantity) as total_wbc_cards_quantity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE c.rarity = 'wbc';

-- 6. Check if WBC cards can be traded (should work)
SELECT 
    ml.id,
    ml.seller_id,
    ml.price,
    ml.status,
    ml.created_at,
    c.name,
    c.rarity
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE c.rarity = 'wbc'
ORDER BY ml.created_at DESC;

-- 7. Check recent WBC transactions
SELECT 
    ml.id,
    ml.seller_id,
    ml.buyer_id,
    ml.price,
    ml.sold_at,
    c.name,
    c.rarity
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE c.rarity = 'wbc' 
AND ml.status = 'sold'
ORDER BY ml.sold_at DESC
LIMIT 10;

-- 8. Verify WBC cards are NOT obtainable through draws
-- This should return 0 rows
SELECT 
    COUNT(*) as wbc_cards_obtainable,
    'ERROR: WBC cards should not be obtainable!' as issue
FROM cards 
WHERE rarity = 'wbc' AND obtainable = true;

-- 9. Check for any duplicate WBC card entries (should be consolidated)
SELECT 
    uc.user_id,
    uc.card_id,
    COUNT(*) as duplicate_count,
    SUM(uc.quantity) as total_quantity,
    c.name
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE c.rarity = 'wbc'
GROUP BY uc.user_id, uc.card_id, c.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 10. Test data integrity: Check if WBC card rewards exist in cards table
SELECT 
    sc.id as challenge_id,
    sc.name as challenge_name,
    sc.wbc_card_reward,
    CASE 
        WHEN c.id IS NOT NULL THEN 'WBC card exists'
        ELSE 'ERROR: WBC card reward not found in cards table!'
    END as status
FROM sbc_challenges sc
LEFT JOIN cards c ON sc.wbc_card_reward = c.id
WHERE sc.wbc_card_reward IS NOT NULL
ORDER BY sc.name;

-- 11. Check if WBC cards have correct image URLs
SELECT 
    id,
    name,
    rarity,
    image_url,
    CASE 
        WHEN image_url IS NULL OR image_url = '' THEN 'ERROR: Missing image URL'
        WHEN image_url LIKE '%doue%' THEN 'OK: Doue card image'
        ELSE 'WARNING: Unexpected image URL'
    END as image_status
FROM cards 
WHERE rarity = 'wbc';

-- 12. Summary report
SELECT 
    'WBC SYSTEM SUMMARY' as report_type,
    (SELECT COUNT(*) FROM cards WHERE rarity = 'wbc') as total_wbc_cards_in_db,
    (SELECT COUNT(*) FROM user_cards uc JOIN cards c ON uc.card_id = c.id WHERE c.rarity = 'wbc') as total_wbc_user_entries,
    (SELECT COUNT(DISTINCT uc.user_id) FROM user_cards uc JOIN cards c ON uc.card_id = c.id WHERE c.rarity = 'wbc') as users_with_wbc,
    (SELECT COUNT(*) FROM sbc_challenges WHERE wbc_card_reward IS NOT NULL) as sbc_challenges_with_wbc_rewards,
    (SELECT COUNT(*) FROM market_listings ml JOIN cards c ON ml.card_id = c.id WHERE c.rarity = 'wbc' AND ml.status = 'active') as active_wbc_listings;
