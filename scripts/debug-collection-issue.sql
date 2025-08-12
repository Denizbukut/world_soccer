-- Debug Collection Loading Issue After Selling Cards
-- This script helps identify why the collection page shows white screen after selling cards

-- 1. Check if user has any cards at all
SELECT 
    user_id,
    COUNT(*) as total_cards,
    SUM(quantity) as total_quantity
FROM user_cards 
WHERE user_id = 'jiraiya'
GROUP BY user_id;

-- 2. Check if there are any cards with quantity 0 (should be removed)
SELECT 
    user_id,
    card_id,
    quantity,
    level
FROM user_cards 
WHERE user_id = 'jiraiya' AND quantity = 0;

-- 3. Check if the user has any active listings
SELECT 
    ml.id,
    ml.seller_id,
    ml.card_id,
    ml.price,
    ml.status,
    ml.created_at,
    c.name,
    c.rarity
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE ml.seller_id = 'jiraiya' AND ml.status = 'active'
ORDER BY ml.created_at DESC;

-- 4. Check if there are any cards that exist but user doesn't have
SELECT 
    c.id,
    c.name,
    c.rarity,
    CASE 
        WHEN uc.card_id IS NOT NULL THEN 'User has this card'
        ELSE 'User does not have this card'
    END as status
FROM cards c
LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = 'jiraiya' AND uc.quantity > 0
WHERE c.rarity = 'wbc'
ORDER BY c.name;

-- 5. Check for any orphaned user_cards entries (cards that don't exist in cards table)
SELECT 
    uc.user_id,
    uc.card_id,
    uc.quantity,
    uc.level,
    CASE 
        WHEN c.id IS NOT NULL THEN 'Card exists'
        ELSE 'ERROR: Card not found in cards table!'
    END as card_status
FROM user_cards uc
LEFT JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = 'jiraiya' AND uc.quantity > 0
ORDER BY uc.card_id;

-- 6. Check if there are any duplicate entries that might cause issues
SELECT 
    user_id,
    card_id,
    COUNT(*) as duplicate_count,
    SUM(quantity) as total_quantity
FROM user_cards 
WHERE user_id = 'jiraiya'
GROUP BY user_id, card_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 7. Summary of user's collection
SELECT 
    'COLLECTION SUMMARY' as report_type,
    (SELECT COUNT(*) FROM user_cards WHERE user_id = 'jiraiya' AND quantity > 0) as total_cards,
    (SELECT SUM(quantity) FROM user_cards WHERE user_id = 'jiraiya' AND quantity > 0) as total_quantity,
    (SELECT COUNT(*) FROM market_listings WHERE seller_id = 'jiraiya' AND status = 'active') as active_listings,
    (SELECT COUNT(*) FROM user_cards WHERE user_id = 'jiraiya' AND quantity = 0) as zero_quantity_cards;
