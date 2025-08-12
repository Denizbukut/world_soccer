-- Simple SBC Progress - Shows only username and which SBC challenge was completed
-- Einfache Übersicht: Username und welche SBC-Challenge abgeschlossen wurde

SELECT 
    u.username,
    sc.name as sbc_challenge_name,
    sup.claimed_at as completed_at
FROM sbc_user_progress sup
JOIN sbc_challenges sc ON sup.challenge_id = sc.id
JOIN users u ON sup.user_id = u.id
WHERE sup.is_completed = true
ORDER BY u.username, sc.name;
