-- Simple script to update ALL WBC cards to 5.000 WLD
-- This script ONLY does the UPDATE, no SELECT statements

UPDATE market_listings 
SET price = 5.000
WHERE card_id IN (
    SELECT id 
    FROM cards 
    WHERE rarity = 'wbc'
) 
AND status = 'active';

-- Show how many rows were updated
SELECT 
    'WBC cards updated to 5.000 WLD' as message,
    COUNT(*) as updated_count
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE c.rarity = 'wbc'
AND ml.status = 'active'
AND ml.price = 5.000;
