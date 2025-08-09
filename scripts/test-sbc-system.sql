-- Test SBC System
-- This script tests all components of the SBC system

-- 1. Check if all required tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('sbc_challenges', 'sbc_user_progress', 'user_cards', 'cards', 'users') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sbc_challenges', 'sbc_user_progress', 'user_cards', 'cards', 'users')
ORDER BY table_name;

-- 2. Check SBC Challenges
SELECT 
    'SBC Challenges' as component,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 0 THEN '✅ ACTIVE' ELSE '❌ NO CHALLENGES' END as status
FROM sbc_challenges 
WHERE is_active = true;

-- 3. Check User Cards
SELECT 
    'User Cards' as component,
    COUNT(*) as total_cards,
    COUNT(DISTINCT user_id) as unique_users,
    CASE WHEN COUNT(*) > 0 THEN '✅ HAS CARDS' ELSE '❌ NO CARDS' END as status
FROM user_cards 
WHERE quantity > 0;

-- 4. Check SBC Progress Table Structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('id', 'user_id', 'challenge_id', 'is_completed') 
        THEN '✅ REQUIRED' 
        ELSE 'ℹ️ OPTIONAL' 
    END as importance
FROM information_schema.columns 
WHERE table_name = 'sbc_user_progress'
ORDER BY ordinal_position;

-- 5. Check RLS Policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sbc_user_progress';

-- 6. Test Sample Data (if any exists)
SELECT 
    'Sample SBC Progress' as test,
    COUNT(*) as entries,
    COUNT(CASE WHEN is_completed = true THEN 1 END) as completed,
    COUNT(CASE WHEN reward_claimed = true THEN 1 END) as rewards_claimed
FROM sbc_user_progress;

-- 7. Check for any orphaned records
SELECT 
    'Orphaned Progress Records' as issue,
    COUNT(*) as count
FROM sbc_user_progress sup
LEFT JOIN users u ON sup.user_id = u.id
WHERE u.id IS NULL;

-- 8. Check for any orphaned challenge references
SELECT 
    'Orphaned Challenge References' as issue,
    COUNT(*) as count
FROM sbc_user_progress sup
LEFT JOIN sbc_challenges sc ON sup.challenge_id = sc.id
WHERE sc.id IS NULL;

-- 9. Show sample challenge details
SELECT 
    id,
    name,
    requirements_total_cards,
    requirements_team_rating,
    requirements_specific_rarities,
    rewards_tickets,
    rewards_elite_tickets,
    is_repeatable,
    is_active
FROM sbc_challenges 
WHERE is_active = true
ORDER BY id
LIMIT 3;

-- 10. Show sample user cards
SELECT 
    uc.user_id,
    COUNT(*) as card_count,
    SUM(uc.quantity) as total_quantity,
    AVG(c.overall_rating) as avg_rating
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.quantity > 0
GROUP BY uc.user_id
ORDER BY card_count DESC
LIMIT 3;
