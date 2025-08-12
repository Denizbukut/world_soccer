-- Cleanup Zero Quantity Cards
-- This script removes cards with quantity 0 to prevent collection loading issues

-- 1. First, show what will be deleted
SELECT 
    user_id,
    card_id,
    quantity,
    level,
    'Will be deleted' as action
FROM user_cards 
WHERE quantity = 0;

-- 2. Delete cards with quantity 0
DELETE FROM user_cards 
WHERE quantity = 0;

-- 3. Verify cleanup
SELECT 
    'Cleanup complete' as status,
    (SELECT COUNT(*) FROM user_cards WHERE quantity = 0) as remaining_zero_quantity_cards,
    (SELECT COUNT(*) FROM user_cards WHERE quantity > 0) as cards_with_quantity;

-- 4. Show summary of remaining cards
SELECT 
    user_id,
    COUNT(*) as total_cards,
    SUM(quantity) as total_quantity
FROM user_cards 
WHERE quantity > 0
GROUP BY user_id
ORDER BY total_quantity DESC;
