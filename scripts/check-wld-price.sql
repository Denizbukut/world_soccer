-- Check current WLD price and calculate correct minimum price for WBC cards
-- This script helps determine the correct WLD amount for $5.00 USD minimum price

-- Step 1: Check if there's a WLD price stored in the database
-- (You might need to check your API or external source for current WLD price)

-- For now, let's assume common WLD prices and calculate the minimum WLD amount:

-- If WLD = $0.50, then $5.00 = 10.000 WLD
-- If WLD = $1.00, then $5.00 = 5.000 WLD  
-- If WLD = $2.00, then $5.00 = 2.500 WLD
-- If WLD = $0.25, then $5.00 = 20.000 WLD

-- Step 2: Show current WBC cards in market
SELECT 
    ml.id,
    ml.price as current_wld_price,
    c.name,
    c.rarity,
    ml.status,
    -- Calculate USD equivalent for different WLD prices
    (ml.price * 0.50)::numeric(10,2) as usd_if_wld_050,
    (ml.price * 1.00)::numeric(10,2) as usd_if_wld_100,
    (ml.price * 2.00)::numeric(10,2) as usd_if_wld_200,
    (ml.price * 0.25)::numeric(10,2) as usd_if_wld_025
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE c.rarity = 'wbc'
AND ml.status = 'active'
ORDER BY ml.price ASC;

-- Step 3: Show what the minimum WLD price should be for $5.00 USD
SELECT 
    'WLD Price' as info,
    'USD Amount' as usd,
    'WLD Amount for $5.00' as wld_for_5_usd
UNION ALL
SELECT '0.50', '5.00', '10.000'
UNION ALL  
SELECT '1.00', '5.00', '5.000'
UNION ALL
SELECT '2.00', '5.00', '2.500'
UNION ALL
SELECT '0.25', '5.00', '20.000';
