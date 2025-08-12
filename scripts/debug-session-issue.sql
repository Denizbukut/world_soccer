-- Debug Session Issue After Selling Cards
-- This script helps identify why users are redirected to login after selling cards

-- 1. Check if user exists and has valid session data
SELECT 
    username,
    created_at,
    last_sign_in_at,
    email,
    world_id
FROM users 
WHERE username = 'jiraiya';

-- 2. Check if user has any active sessions
SELECT 
    id,
    user_id,
    created_at,
    expires_at,
    last_activity
FROM auth.sessions 
WHERE user_id = 'jiraiya'
ORDER BY created_at DESC;

-- 3. Check recent marketplace activity for the user
SELECT 
    id,
    seller_id,
    card_id,
    price,
    status,
    created_at,
    c.name,
    c.rarity
FROM market_listings ml
JOIN cards c ON ml.card_id = c.id
WHERE ml.seller_id = 'jiraiya'
ORDER BY ml.created_at DESC
LIMIT 10;

-- 4. Check if there are any cards with quantity 0 that should be cleaned up
SELECT 
    user_id,
    card_id,
    quantity,
    level,
    'Should be deleted' as action
FROM user_cards 
WHERE user_id = 'jiraiya' AND quantity = 0;

-- 5. Check for any orphaned user_cards entries
SELECT 
    uc.user_id,
    uc.card_id,
    uc.quantity,
    uc.level,
    CASE 
        WHEN c.id IS NOT NULL THEN 'Card exists'
        ELSE 'ERROR: Orphaned entry!'
    END as status
FROM user_cards uc
LEFT JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = 'jiraiya'
ORDER BY uc.card_id;

-- 6. Check if there are any database connection issues
SELECT 
    'Database connection test' as test,
    NOW() as current_time,
    (SELECT COUNT(*) FROM users WHERE username = 'jiraiya') as user_exists,
    (SELECT COUNT(*) FROM user_cards WHERE user_id = 'jiraiya') as user_cards_count;

-- 7. Check for any recent errors in the system
SELECT 
    'Recent activity summary' as summary,
    (SELECT COUNT(*) FROM market_listings WHERE seller_id = 'jiraiya' AND created_at > NOW() - INTERVAL '1 hour') as recent_listings,
    (SELECT COUNT(*) FROM user_cards WHERE user_id = 'jiraiya' AND quantity > 0) as current_cards,
    (SELECT COUNT(*) FROM user_cards WHERE user_id = 'jiraiya' AND quantity = 0) as zero_quantity_cards;
