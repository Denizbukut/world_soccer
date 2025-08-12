-- Add the missing WBC card to the database
INSERT INTO cards (
    id,
    name,
    character,
    image_url,
    rarity,
    type,
    overall_rating,
    level,
    epoch,
    obtainable,
    created_at,
    updated_at
) VALUES (
    'de1a7d49-d937-466b-bce0-84ca3abab47b',
    'doue',
    'doue',
    '/world-soccer/Douewbc.webp',
    'wbc',
    'player',
    95,
    1,
    1,
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify the card was added
SELECT 
    id,
    name,
    rarity,
    image_url
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';
