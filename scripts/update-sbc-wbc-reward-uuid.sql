-- Update SBC Challenge to use correct WBC card UUID
UPDATE sbc_challenges 
SET wbc_card_reward = 'de1a7d49-d937-466b-bce0-84ca3abab47b'
WHERE name = 'Rare Formation';

-- Verify the update
SELECT 
    id,
    name,
    is_active,
    wbc_card_reward
FROM sbc_challenges 
WHERE name = 'Rare Formation';

-- Verify the WBC card exists with the correct UUID
SELECT 
    id,
    name,
    rarity,
    image_url,
    obtainable
FROM cards 
WHERE id = 'de1a7d49-d937-466b-bce0-84ca3abab47b';
