-- Debug WBC Card Insertion
-- 1. Check user_cards table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_cards'
ORDER BY ordinal_position;

-- 2. Check if WBC card exists in cards table
SELECT 
    id,
    name,
    rarity,
    image_url,
    obtainable
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 3. Check if user already has the WBC card
SELECT 
    id,
    user_id,
    card_id,
    quantity,
    level
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 4. Check SBC challenge configuration
SELECT 
    id,
    name,
    is_active,
    is_repeatable,
    wbc_card_reward
FROM sbc_challenges 
WHERE name = 'Rare Formation';

-- 5. Test manual insertion of WBC card
INSERT INTO user_cards (
    user_id,
    card_id,
    quantity,
    level
) VALUES (
    'jiraiya',
    'de1a7d49-d937-466b-bce0-84ca3abab47b',
    1,
    1
);

-- 6. Verify the insertion
SELECT 
    id,
    user_id,
    card_id,
    quantity,
    level
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';
