-- Create SBC Completion Table
-- Erstellt eine Tabelle die zeigt, welche SBC abgeschlossen wurden und von welchem User

-- 1. Erstelle die Tabelle
CREATE TABLE IF NOT EXISTS sbc_completion_overview (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    sbc_challenge_name VARCHAR(255) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    challenge_id INTEGER,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fülle die Tabelle mit den aktuellen Daten
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
ON CONFLICT DO NOTHING;

-- 3. Zeige die Tabelle an
SELECT 
    username,
    sbc_challenge_name,
    completed_at
FROM sbc_completion_overview
ORDER BY username, sbc_challenge_name;

-- 4. Statistiken der Tabelle
SELECT 
    COUNT(*) as total_completions,
    COUNT(DISTINCT username) as unique_users,
    COUNT(DISTINCT sbc_challenge_name) as unique_challenges
FROM sbc_completion_overview;
