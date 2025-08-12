-- Update SBC Completion Table with latest completions
-- Fügt neue SBC-Completions zur sbc_completion_overview Tabelle hinzu

-- 1. Füge neue Completions hinzu (die noch nicht in der Tabelle sind)
INSERT INTO sbc_completion_overview (username, sbc_challenge_name, completed_at, challenge_id, user_id)
SELECT 
    u.username,
    sc.name as sbc_challenge_name,
    sup.claimed_at as completed_at,
    sup.challenge_id,
    sup.user_id
FROM sbc_user_progress sup
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
JOIN users u ON sup.user_id = u.id
WHERE sup.is_completed = true
AND NOT EXISTS (
    SELECT 1 FROM sbc_completion_overview sco 
    WHERE sco.username = u.username 
    AND sco.sbc_challenge_name = sc.name 
    AND sco.completed_at = sup.claimed_at
);

-- 2. Zeige die aktualisierte Tabelle an
SELECT 
    username,
    sbc_challenge_name,
    completed_at
FROM sbc_completion_overview
ORDER BY completed_at DESC;

-- 3. Zeige die neuesten Einträge
SELECT 
    username,
    sbc_challenge_name,
    completed_at
FROM sbc_completion_overview
ORDER BY completed_at DESC
LIMIT 10;
