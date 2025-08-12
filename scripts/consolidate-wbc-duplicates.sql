-- Consolidate duplicate WBC card entries automatically
-- This script merges duplicate WBC cards by keeping the first entry and summing quantities

-- Step 1: Show what we're going to consolidate
SELECT 
    'BEFORE CONSOLIDATION' as status,
    user_id,
    card_id,
    COUNT(*) as duplicate_count,
    SUM(quantity) as total_quantity,
    STRING_AGG(uc.id::text, ', ') as duplicate_ids
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE c.rarity = 'wbc'
GROUP BY user_id, card_id
HAVING COUNT(*) > 1
ORDER BY user_id, card_id;

-- Step 2: Consolidate duplicates for 'jiraiya' specifically
-- Keep the first entry (lowest ID) and sum all quantities
WITH duplicates AS (
    SELECT 
        user_id,
        card_id,
        MIN(uc.id) as keep_id,
        SUM(quantity) as total_quantity,
        ARRAY_AGG(uc.id ORDER BY uc.id) as all_ids
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    WHERE c.rarity = 'wbc'
    AND uc.user_id = 'jiraiya'
    GROUP BY user_id, card_id
    HAVING COUNT(*) > 1
)
UPDATE user_cards 
SET quantity = d.total_quantity
FROM duplicates d
WHERE user_cards.id = d.keep_id;

-- Step 3: Delete the duplicate entries (keep only the first one)
WITH duplicates AS (
    SELECT 
        user_id,
        card_id,
        MIN(uc.id) as keep_id,
        ARRAY_AGG(uc.id ORDER BY uc.id) as all_ids
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    WHERE c.rarity = 'wbc'
    AND uc.user_id = 'jiraiya'
    GROUP BY user_id, card_id
    HAVING COUNT(*) > 1
)
DELETE FROM user_cards 
WHERE id IN (
    SELECT unnest(all_ids[2:]) -- Keep first, delete rest
    FROM duplicates
);

-- Step 4: Show the result after consolidation
SELECT 
    'AFTER CONSOLIDATION' as status,
    uc.user_id,
    uc.card_id,
    uc.quantity,
    uc.level,
    c.name,
    c.rarity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE c.rarity = 'wbc'
AND uc.user_id = 'jiraiya'
ORDER BY uc.card_id, uc.level, uc.id;
