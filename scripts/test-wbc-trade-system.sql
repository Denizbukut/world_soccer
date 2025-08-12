-- Test WBC Trade System
-- This script tests if WBC cards can be properly traded

-- 1. Check if WBC card exists in cards table
SELECT 
    id,
    name,
    rarity,
    obtainable
FROM cards 
WHERE rarity = 'wbc'
ORDER BY name;

-- 2. Check if any user has WBC cards
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

-- 3. Check if there are any active WBC listings
SELECT 
    ml.id,
    ml.seller_id,
    ml.price,
    ml.status,
    c.name,
    c.rarity
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE c.rarity = 'wbc'
ORDER BY ml.created_at DESC;

-- 4. Check recent WBC transactions
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

-- 5. Test: Create a test WBC listing for jiraiya (if they have WBC cards)
-- First check if jiraiya has WBC cards
SELECT 
    uc.id as user_card_id,
    uc.card_id,
    uc.quantity,
    c.name,
    c.rarity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = 'jiraiya' 
AND c.rarity = 'wbc'
AND uc.quantity > 0;

-- 6. Check marketplace filters work with WBC
-- This would be tested in the frontend, but we can verify the data exists
SELECT 
    COUNT(*) as total_wbc_cards,
    COUNT(DISTINCT c.id) as unique_wbc_cards,
    COUNT(DISTINCT uc.user_id) as users_with_wbc
FROM cards c
LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.quantity > 0
WHERE c.rarity = 'wbc';
