-- Check all WBC cards in the database
SELECT 
    id,
    name,
    character,
    rarity,
    image_url
FROM cards 
WHERE rarity = 'wbc'
ORDER BY name;
