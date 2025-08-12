-- Check and Fix WBC Card
-- 1. Check if the WBC card exists
SELECT 
    id,
    name,
    rarity,
    image_url,
    obtainable
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 2. If the card doesn't exist, add it
INSERT INTO cards (
    id,
    name,
    character,
    image_url,
    rarity,
    epoch,
    obtainable,
    created_at
) VALUES (
    'de1a7d49-d937-466b-bce0-84ca3abab47b',
    'doue',
    'doue',
    '/world-soccer/Douewbc.webp',
    'wbc',
    1,
    false,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Check again to confirm
SELECT 
    id,
    name,
    rarity,
    image_url,
    obtainable
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';

-- 4. Check the SBC challenge configuration
SELECT 
    id,
    name,
    is_active,
    wbc_card_reward
FROM sbc_challenges 
WHERE name = 'Rare Formation';
