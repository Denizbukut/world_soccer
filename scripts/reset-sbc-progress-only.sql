-- Reset SBC Progress Only
-- This script only resets the progress, keeping challenges repeatable

-- Reset all SBC progress
DELETE FROM sbc_user_progress;

-- Verify progress is reset
SELECT COUNT(*) as remaining_progress FROM sbc_user_progress;

-- Show current challenge status
SELECT 
    id,
    name,
    is_repeatable,
    is_active
FROM sbc_challenges 
WHERE is_active = true
ORDER BY id;
