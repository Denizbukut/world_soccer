-- Fix Missing WBC Card Rewards
-- This script adds missing WBC card rewards for SBC completions

-- 1. First, check how many times the user completed Rare Formation
SELECT 
    'RARE FORMATION COMPLETIONS COUNT' as check_type,
    COUNT(*) as completion_count
FROM sbc_user_progress sup
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
WHERE sup.user_id = 'jiraiya' 
  AND sc.name LIKE '%Rare Formation%'
  AND sup.is_completed = true;

-- 2. Check current WBC card quantity
SELECT 
    'CURRENT WBC CARD QUANTITY' as check_type,
    COALESCE(uc.quantity, 0) as current_quantity
FROM cards c
LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = 'jiraiya'
WHERE c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d';  -- doue WBC card

-- 3. Calculate how many WBC cards the user should have
WITH completion_count AS (
    SELECT COUNT(*) as completions
    FROM sbc_user_progress sup
    JOIN sbc_challenges sc ON sup.challenge_id = sc.id
    WHERE sup.user_id = 'jiraiya' 
      AND sc.name LIKE '%Rare Formation%'
      AND sup.is_completed = true
),
current_quantity AS (
    SELECT COALESCE(uc.quantity, 0) as quantity
    FROM cards c
    LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = 'jiraiya'
    WHERE c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'
)
SELECT 
    'CALCULATION' as check_type,
    cc.completions as sbc_completions,
    cq.quantity as current_wbc_quantity,
    cc.completions as expected_wbc_quantity,
    CASE 
        WHEN cq.quantity < cc.completions THEN cc.completions - cq.quantity
        ELSE 0
    END as missing_cards
FROM completion_count cc, current_quantity cq;

-- 4. Add missing WBC cards (if any)
-- This will only run if there are missing cards
DO $$
DECLARE
    completion_count INTEGER;
    current_quantity INTEGER;
    missing_cards INTEGER;
BEGIN
    -- Get completion count
    SELECT COUNT(*) INTO completion_count
    FROM sbc_user_progress sup
    JOIN sbc_challenges sc ON sup.challenge_id = sc.id
    WHERE sup.user_id = 'jiraiya' 
      AND sc.name LIKE '%Rare Formation%'
      AND sup.is_completed = true;
    
    -- Get current WBC card quantity
    SELECT COALESCE(uc.quantity, 0) INTO current_quantity
    FROM cards c
    LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = 'jiraiya'
    WHERE c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d';
    
    -- Calculate missing cards
    missing_cards := completion_count - current_quantity;
    
    -- Add missing cards if any
    IF missing_cards > 0 THEN
        -- Check if user already has this WBC card
        IF EXISTS (
            SELECT 1 FROM user_cards 
            WHERE user_id = 'jiraiya' 
              AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'
        ) THEN
            -- Update existing entry
            UPDATE user_cards 
            SET quantity = quantity + missing_cards
            WHERE user_id = 'jiraiya' 
              AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47d';
        ELSE
            -- Create new entry
            INSERT INTO user_cards (user_id, card_id, quantity, level)
            VALUES ('jiraiya', 'de1a7d49-d937-466b-bce0-84ca3abab47d', missing_cards, 1);
        END IF;
        
        RAISE NOTICE 'Added % missing WBC cards for user jiraiya', missing_cards;
    ELSE
        RAISE NOTICE 'No missing WBC cards to add';
    END IF;
END $$;

-- 5. Verify the fix
SELECT 
    'VERIFICATION' as check_type,
    cc.completions as sbc_completions,
    cq.quantity as final_wbc_quantity,
    CASE 
        WHEN cq.quantity >= cc.completions THEN 'FIXED'
        ELSE 'STILL MISSING'
    END as status
FROM (
    SELECT COUNT(*) as completions
    FROM sbc_user_progress sup
    JOIN sbc_challenges sc ON sup.challenge_id = sc.id
    WHERE sup.user_id = 'jiraiya' 
      AND sc.name LIKE '%Rare Formation%'
      AND sup.is_completed = true
) cc, (
    SELECT COALESCE(uc.quantity, 0) as quantity
    FROM cards c
    LEFT JOIN user_cards uc ON c.id = uc.card_id AND uc.user_id = 'jiraiya'
    WHERE c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'
) cq;
