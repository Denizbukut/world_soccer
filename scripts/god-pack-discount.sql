-- God Pack Discount System
-- This script sets up the database for god pack specific discounts

-- Ensure discount_configs table has the necessary columns
ALTER TABLE public.discount_configs 
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;

-- Add unique constraint on name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'discount_configs_name_unique'
    ) THEN
        ALTER TABLE public.discount_configs 
        ADD CONSTRAINT discount_configs_name_unique UNIQUE (name);
    END IF;
END $$;

-- Function to get active god pack discount
CREATE OR REPLACE FUNCTION get_active_god_pack_discount()
RETURNS TABLE (
    name text,
    value numeric,
    is_active boolean,
    start_time timestamp with time zone,
    end_time timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.name,
        dc.value,
        dc.is_active,
        dc.start_time,
        dc.end_time
    FROM public.discount_configs dc
    WHERE dc.name = 'god_pack_discount'
    AND dc.is_active = true
    AND (dc.end_time IS NULL OR dc.end_time > NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to activate god pack discount
CREATE OR REPLACE FUNCTION activate_god_pack_discount(
    discount_percent numeric DEFAULT 20,
    duration_hours integer DEFAULT 24
)
RETURNS boolean AS $$
BEGIN
    INSERT INTO public.discount_configs (name, value, is_active, start_time, end_time) 
    VALUES (
        'god_pack_discount',
        discount_percent / 100,  -- Convert percentage to decimal
        true,  -- active
        NOW(), -- starts now
        NOW() + INTERVAL '1 hour' * duration_hours  -- ends in specified hours
    ) ON CONFLICT (name) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        value = EXCLUDED.value,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate god pack discount
CREATE OR REPLACE FUNCTION deactivate_god_pack_discount()
RETURNS boolean AS $$
BEGIN
    UPDATE public.discount_configs 
    SET is_active = false
    WHERE name = 'god_pack_discount';
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Example: Activate 20% god pack discount for 24 hours
-- SELECT activate_god_pack_discount(20, 24);

-- Example: Deactivate god pack discount
-- SELECT deactivate_god_pack_discount();

-- Example: Check current god pack discount status
-- SELECT * FROM get_active_god_pack_discount();
