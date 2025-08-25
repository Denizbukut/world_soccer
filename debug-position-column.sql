-- Check all position values in cards table
SELECT 
    position,
    COUNT(*) as count
FROM cards 
GROUP BY position
ORDER BY count DESC;

-- Check for NULL positions
SELECT 
    id,
    name,
    position,
    character
FROM cards 
WHERE position IS NULL
LIMIT 10;

-- Check for empty string positions
SELECT 
    id,
    name,
    position,
    character
FROM cards 
WHERE position = ''
LIMIT 10;
