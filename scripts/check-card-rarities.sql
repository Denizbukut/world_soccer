-- Check how rarities are stored in the cards table
SELECT DISTINCT rarity, COUNT(*) as count
FROM cards 
GROUP BY rarity 
ORDER BY rarity;

-- Check some example cards with their rarities
SELECT 
    id,
    name,
    rarity,
    LENGTH(rarity) as rarity_length,
    rarity ~ '^[a-zA-Z]+$' as is_clean
FROM cards 
WHERE rarity IN ('rare', 'basic', 'elite', 'common', 'epic', 'legendary')
LIMIT 20;

-- Check if there are any cards with quotes or special characters in rarity
SELECT 
    id,
    name,
    rarity,
    LENGTH(rarity) as rarity_length,
    rarity ~ '["""]' as has_quotes
FROM cards 
WHERE rarity ~ '["""]'
LIMIT 10;
