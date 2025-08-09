-- Debug Card Relations
-- This script helps identify why card details aren't loading

-- 1. Check user_cards structure
SELECT 
    id,
    user_id,
    card_id,
    quantity
FROM user_cards 
LIMIT 5;

-- 2. Check cards table structure
SELECT 
    id,
    name,
    rarity,
    overall_rating
FROM cards 
LIMIT 5;

-- 3. Check if card_ids in user_cards exist in cards table
SELECT 
    uc.card_id,
    CASE WHEN c.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status,
    c.name as card_name
FROM user_cards uc
LEFT JOIN cards c ON uc.card_id = c.id
WHERE uc.quantity > 0
LIMIT 10;

-- 4. Show sample user cards with details
SELECT 
    uc.id as user_card_id,
    uc.card_id,
    uc.quantity,
    c.name,
    c.rarity,
    c.overall_rating
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.quantity > 0
ORDER BY uc.user_id, c.rarity
LIMIT 10;
