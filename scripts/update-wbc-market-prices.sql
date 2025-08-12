-- Set ALL WBC cards in the market to exactly $5.00 USD minimum price
-- This script sets ALL WBC cards to the minimum price, regardless of current price

-- Step 1: Show current WBC cards and their USD prices
SELECT 
    ml.id,
    ml.price as current_wld_price,
    c.name,
    c.rarity,
    (ml.price * 0.5)::numeric(10,2) as current_usd_price  -- Assuming WLD = $0.50
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE c.rarity = 'wbc'
AND ml.status = 'active'
ORDER BY ml.price ASC;

-- Step 2: Update ALL WBC cards to exactly $5.00 USD minimum price
-- If WLD = $0.50, then $5.00 = 10 WLD
-- If WLD = $1.00, then $5.00 = 5 WLD  
-- If WLD = $2.00, then $5.00 = 2.5 WLD

UPDATE market_listings 
SET price = 5.000  -- Set ALL WBC cards to 5.000 WLD
WHERE card_id IN (
    SELECT id 
    FROM cards 
    WHERE rarity = 'wbc'
) 
AND status = 'active';  -- Update ALL active WBC listings

-- Show the updated listings
SELECT 
    ml.id,
    ml.price,
    c.name,
    c.rarity,
    ml.status,
    ml.created_at
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE c.rarity = 'wbc'
AND ml.status = 'active'
ORDER BY ml.price DESC;
