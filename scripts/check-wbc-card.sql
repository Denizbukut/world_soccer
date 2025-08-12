-- Check if the WBC card exists in the database
SELECT 
    id,
    name,
    rarity,
    image_url,
    created_at
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- Check if the user already has this WBC card
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
AND uc.card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- Check all WBC cards in the database
SELECT 
    id,
    name,
    rarity,
    image_url
FROM cards 
WHERE rarity = 'wbc';
