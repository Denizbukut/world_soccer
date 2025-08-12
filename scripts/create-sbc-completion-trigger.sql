-- Create Trigger for automatic SBC completion tracking
-- Erstellt einen Trigger der automatisch die sbc_completion_overview Tabelle aktualisiert

-- 1. Erstelle die Trigger-Funktion
CREATE OR REPLACE FUNCTION update_sbc_completion_overview()
RETURNS TRIGGER AS $$
BEGIN
    -- Wenn eine neue Completion hinzugefügt wird
    IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
        INSERT INTO sbc_completion_overview (username, sbc_challenge_name, completed_at, challenge_id, user_id)
        SELECT 
            u.username,
            sc.name as sbc_challenge_name,
            NEW.claimed_at as completed_at,
            NEW.challenge_id,
            NEW.user_id
        FROM sbc_challenges sc
        JOIN users u ON NEW.user_id = u.id
        WHERE sc.id = NEW.challenge_id
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Erstelle den Trigger
DROP TRIGGER IF EXISTS sbc_completion_trigger ON sbc_user_progress;
CREATE TRIGGER sbc_completion_trigger
    AFTER UPDATE ON sbc_user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_sbc_completion_overview();

-- 3. Teste den Trigger - zeige aktuelle Daten
SELECT 
    username,
    sbc_challenge_name,
    completed_at
FROM sbc_completion_overview
ORDER BY completed_at DESC;
