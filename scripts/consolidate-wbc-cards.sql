-- Consolidate WBC Cards
-- This will fix the duplicate WBC card entries

-- 1. First, let's see all the duplicate entries
SELECT 
    id,
    user_id,
    card_id,
    quantity,
    level
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b'
ORDER BY id;

-- 2. Calculate total quantity
SELECT 
    SUM(quantity) as total_quantity,
    COUNT(*) as total_entries
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 3. Delete all existing entries
DELETE FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 4. Create a single consolidated entry
INSERT INTO user_cards (
    user_id,
    card_id,
    quantity,
    level
) VALUES (
    'jiraiya',
    'de1a7d49-d937-466b-bce0-84ca3abab47b',
    5,  -- Total quantity from all entries
    1
);

-- 5. Verify the consolidation
SELECT 
    id,
    user_id,
    card_id,
    quantity,
    level
FROM user_cards 
WHERE user_id = 'jiraiya' 
AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';
