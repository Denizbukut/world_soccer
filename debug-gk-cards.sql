-- Debug script to check GK cards
SELECT 
    c.id,
    c.name,
    c.position,
    c.character
FROM cards c 
WHERE c.position = 'GK'
ORDER BY c.name;

-- Check if user has any GK cards
SELECT 
    uc.user_id,
    c.name,
    c.position,
    uc.quantity,
    uc.level
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE c.position = 'GK'
ORDER BY uc.user_id, c.name;
