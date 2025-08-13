-- Fix Elite Formation SBC requirements
-- Change "legendary" to "ultimate" in the requirements

-- Step 1: Show current requirements
SELECT 
    'BEFORE FIX' as status,
    name,
    requirements_rarity_level_counts
FROM sbc_challenges 
WHERE name = 'Elite Formation';

-- Step 2: Update the requirements to use "ultimate" instead of "legendary"
UPDATE sbc_challenges 
SET requirements_rarity_level_counts = '{"elite":{"count":8,"min_level":3},"ultimate":{"count":3,"min_level":2}}'
WHERE name = 'Elite Formation';

-- Step 3: Show updated requirements
SELECT 
    'AFTER FIX' as status,
    name,
    requirements_rarity_level_counts
FROM sbc_challenges 
WHERE name = 'Elite Formation';
