-- Count God Packs in the database
-- This script counts different types of "God Packs" or special packs

-- Count all packs that might be considered "God Packs"
SELECT 
    'Total God Packs' as category,
    COUNT(*) as count
FROM cards 
WHERE name ILIKE '%god%' 
   OR name ILIKE '%legendary%' 
   OR name ILIKE '%ultimate%'
   OR name ILIKE '%icon%'
   OR rarity IN ('ultimate', 'goat', 'icon');

-- Count by rarity
SELECT 
    rarity,
    COUNT(*) as count
FROM cards 
WHERE rarity IN ('ultimate', 'goat', 'icon')
GROUP BY rarity
ORDER BY count DESC;

-- Count specific God Pack types
SELECT 
    CASE 
        WHEN name ILIKE '%god%' THEN 'God Pack'
        WHEN name ILIKE '%legendary%' THEN 'Legendary Pack'
        WHEN name ILIKE '%ultimate%' THEN 'Ultimate Pack'
        WHEN name ILIKE '%icon%' THEN 'Icon Pack'
        ELSE 'Other Special Pack'
    END as pack_type,
    COUNT(*) as count
FROM cards 
WHERE name ILIKE '%god%' 
   OR name ILIKE '%legendary%' 
   OR name ILIKE '%ultimate%'
   OR name ILIKE '%icon%'
   OR rarity IN ('ultimate', 'goat', 'icon')
GROUP BY pack_type
ORDER BY count DESC;

-- Show all God Pack cards
SELECT 
    id,
    name,
    rarity,
    overall_rating,
    image_url
FROM cards 
WHERE name ILIKE '%god%' 
   OR name ILIKE '%legendary%' 
   OR name ILIKE '%ultimate%'
   OR name ILIKE '%icon%'
   OR rarity IN ('ultimate', 'goat', 'icon')
ORDER BY overall_rating DESC, name;

