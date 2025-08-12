-- God Pack Discount System - Separate Tabelle
-- Diese Tabelle ist nur für God Pack Rabatte

-- 1. Eigene Tabelle für God Pack Rabatte erstellen
CREATE TABLE IF NOT EXISTS public.god_pack_discounts (
    id SERIAL PRIMARY KEY,
    discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 90),
    duration_hours INTEGER NOT NULL CHECK (duration_hours >= 1 AND duration_hours <= 168),
    is_active BOOLEAN DEFAULT false,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT DEFAULT 'admin',
    notes TEXT
);

-- 2. Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_god_pack_discounts_active ON public.god_pack_discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_god_pack_discounts_time ON public.god_pack_discounts(start_time, end_time);

-- 3. Funktion zum Aktivieren eines God Pack Rabatts
CREATE OR REPLACE FUNCTION activate_god_pack_discount(
    p_discount_percent INTEGER DEFAULT 20,
    p_duration_hours INTEGER DEFAULT 24,
    p_created_by TEXT DEFAULT 'admin',
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Alle bestehenden Rabatte deaktivieren
    UPDATE public.god_pack_discounts 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true;
    
    -- Neuen Rabatt erstellen
    INSERT INTO public.god_pack_discounts (
        discount_percent, 
        duration_hours, 
        is_active, 
        start_time, 
        end_time, 
        created_by, 
        notes
    ) VALUES (
        p_discount_percent,
        p_duration_hours,
        true,
        NOW(),
        NOW() + INTERVAL '1 hour' * p_duration_hours,
        p_created_by,
        p_notes
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 4. Funktion zum Deaktivieren aller God Pack Rabatte
CREATE OR REPLACE FUNCTION deactivate_god_pack_discount()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.god_pack_discounts 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 5. Funktion zum Abrufen des aktiven God Pack Rabatts
CREATE OR REPLACE FUNCTION get_active_god_pack_discount()
RETURNS TABLE (
    id INTEGER,
    discount_percent INTEGER,
    duration_hours INTEGER,
    is_active BOOLEAN,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    time_remaining INTERVAL,
    created_by TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gpd.id,
        gpd.discount_percent,
        gpd.duration_hours,
        gpd.is_active,
        gpd.start_time,
        gpd.end_time,
        gpd.end_time - NOW() as time_remaining,
        gpd.created_by,
        gpd.notes
    FROM public.god_pack_discounts gpd
    WHERE gpd.is_active = true
    AND gpd.end_time > NOW()
    ORDER BY gpd.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Funktion zum Bereinigen abgelaufener Rabatte
CREATE OR REPLACE FUNCTION cleanup_expired_god_pack_discounts()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE public.god_pack_discounts 
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true 
    AND end_time <= NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger für automatische Bereinigung
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_discounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Bereinige abgelaufene Rabatte beim Einfügen neuer
    PERFORM cleanup_expired_god_pack_discounts();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_discounts_trigger
    BEFORE INSERT ON public.god_pack_discounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_expired_discounts();

-- 8. Beispiel-Rabatte einfügen (optional)
-- INSERT INTO public.god_pack_discounts (discount_percent, duration_hours, is_active, notes) VALUES
-- (5, 12, false, 'Kleiner Rabatt für 12h'),
-- (10, 24, false, 'Standard Rabatt für 24h'),
-- (15, 24, false, 'Mittlerer Rabatt für 24h'),
-- (20, 24, false, 'Großer Rabatt für 24h'),
-- (25, 12, false, 'Flash Sale für 12h'),
-- (30, 6, false, 'Mega Flash Sale für 6h'),
-- (50, 2, false, 'Ultra Flash Sale für 2h');

-- 9. Kommentare hinzufügen
COMMENT ON TABLE public.god_pack_discounts IS 'Separate Tabelle für God Pack Rabatte';
COMMENT ON COLUMN public.god_pack_discounts.discount_percent IS 'Rabatt in Prozent (1-90)';
COMMENT ON COLUMN public.god_pack_discounts.duration_hours IS 'Dauer in Stunden (1-168)';
COMMENT ON COLUMN public.god_pack_discounts.is_active IS 'Aktiver Status des Rabatts';
COMMENT ON COLUMN public.god_pack_discounts.notes IS 'Notizen zum Rabatt (optional)';

-- 10. Berechtigungen setzen (falls RLS aktiviert ist)
-- ALTER TABLE public.god_pack_discounts ENABLE ROW LEVEL SECURITY;
-- GRANT ALL ON public.god_pack_discounts TO authenticated;
-- GRANT USAGE ON SEQUENCE public.god_pack_discounts_id_seq TO authenticated;
