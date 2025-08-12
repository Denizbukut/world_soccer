-- Test SBC WBC Card Logic
-- This script tests and verifies the SBC WBC card reward system

-- 1. Check current state before testing
SELECT 
    'CURRENT STATE' as test_phase,
    (SELECT COUNT(*) FROM sbc_user_progress sup 
     JOIN sbc_challenges sc ON sup.challenge_id = sc.id 
     WHERE sup.user_id = 'jiraiya' 
       AND sc.name LIKE '%Rare Formation%'
       AND sup.is_completed = true) as rare_formation_completions,
    (SELECT COALESCE(SUM(uc.quantity), 0) FROM user_cards uc 
     JOIN cards c ON uc.card_id = c.id 
     WHERE uc.user_id = 'jiraiya' 
       AND c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d') as current_wbc_quantity;

-- 2. Check if there are any duplicate user_cards entries for WBC cards
SELECT 
    'DUPLICATE CHECK' as test_phase,
    uc.user_id,
    uc.card_id,
    COUNT(*) as duplicate_count,
    SUM(uc.quantity) as total_quantity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = 'jiraiya' 
  AND c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'
GROUP BY uc.user_id, uc.card_id
HAVING COUNT(*) > 1;

-- 3. Consolidate duplicate WBC card entries (if any)
-- This will merge duplicate entries into a single entry with correct quantity
DO $$
DECLARE
    total_quantity INTEGER;
    first_entry_id INTEGER;
BEGIN
    -- Get total quantity and first entry ID
    SELECT SUM(uc.quantity), MIN(uc.id) INTO total_quantity, first_entry_id
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    WHERE uc.user_id = 'jiraiya' 
      AND c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d';
    
    -- If there are duplicates, consolidate them
    IF EXISTS (
        SELECT 1 FROM user_cards uc
        JOIN cards c ON uc.card_id = c.id
        WHERE uc.user_id = 'jiraiya' 
          AND c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'
        GROUP BY uc.user_id, uc.card_id
        HAVING COUNT(*) > 1
    ) THEN
        -- Update first entry with total quantity
        UPDATE user_cards 
        SET quantity = total_quantity
        WHERE id = first_entry_id;
        
        -- Delete other duplicate entries
        DELETE FROM user_cards 
        WHERE user_id = 'jiraiya' 
          AND card_id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'
          AND id != first_entry_id;
        
        RAISE NOTICE 'Consolidated WBC card entries. Total quantity: %', total_quantity;
    ELSE
        RAISE NOTICE 'No duplicate WBC card entries found.';
    END IF;
END $$;

-- 4. Verify consolidation
SELECT 
    'AFTER CONSOLIDATION' as test_phase,
    uc.user_id,
    uc.card_id,
    uc.quantity,
    c.name,
    c.rarity
FROM user_cards uc
JOIN cards c ON uc.card_id = c.id
WHERE uc.user_id = 'jiraiya' 
  AND c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d';

-- 5. Test the SBC completion logic
-- Simulate what should happen when SBC is completed
DO $$
DECLARE
    completion_count INTEGER;
    current_quantity INTEGER;
    expected_quantity INTEGER;
BEGIN
    -- Get completion count
    SELECT COUNT(*) INTO completion_count
    FROM sbc_user_progress sup
    JOIN sbc_challenges sc ON sup.challenge_id = sc.id
    WHERE sup.user_id = 'jiraiya' 
      AND sc.name LIKE '%Rare Formation%'
      AND sup.is_completed = true;
    
    -- Get current WBC quantity
    SELECT COALESCE(uc.quantity, 0) INTO current_quantity
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    WHERE uc.user_id = 'jiraiya' 
      AND c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d';
    
    expected_quantity := completion_count;
    
    RAISE NOTICE 'SBC Logic Test Results:';
    RAISE NOTICE '  - Rare Formation completions: %', completion_count;
    RAISE NOTICE '  - Current WBC quantity: %', current_quantity;
    RAISE NOTICE '  - Expected WBC quantity: %', expected_quantity;
    
    IF current_quantity = expected_quantity THEN
        RAISE NOTICE '  ✅ SBC logic is working correctly!';
    ELSE
        RAISE NOTICE '  ❌ SBC logic has issues. Missing % cards', expected_quantity - current_quantity;
    END IF;
END $$;

-- 6. Final verification
SELECT 
    'FINAL VERIFICATION' as test_phase,
    cc.completions as sbc_completions,
    cq.quantity as wbc_quantity,
    CASE 
        WHEN cq.quantity >= cc.completions THEN 'CORRECT'
        ELSE 'INCORRECT - Missing cards'
    END as status,
    CASE 
        WHEN cq.quantity < cc.completions THEN cc.completions - cq.quantity
        ELSE 0
    END as missing_cards
FROM (
    SELECT COUNT(*) as completions
    FROM sbc_user_progress sup
    JOIN sbc_challenges sc ON sup.challenge_id = sc.id
    WHERE sup.user_id = 'jiraiya' 
      AND sc.name LIKE '%Rare Formation%'
      AND sup.is_completed = true
) cc, (
    SELECT COALESCE(uc.quantity, 0) as quantity
    FROM user_cards uc
    JOIN cards c ON uc.card_id = c.id
    WHERE uc.user_id = 'jiraiya' 
      AND c.id = 'de1a7d49-d937-466b-bce0-84ca3abab47d'
) cq;
