-- 4-Hour 15% Discount Setup
-- This script creates a 4-hour time-based discount

-- Add time columns if they don't exist
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

-- Create a 15% discount for 4 hours
INSERT INTO public.discount_configs (name, value, is_active, start_time, end_time) 
VALUES (
  'time_based_15_percent_4h',
  0.15,  -- 15% discount
  true,  -- active
  NOW(), -- starts now
  NOW() + INTERVAL '4 hours'  -- ends in 4 hours
) ON CONFLICT (name) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;

-- Function to get active time-based discount
CREATE OR REPLACE FUNCTION get_active_time_discount()
RETURNS TABLE (
  id integer,
  name text,
  value numeric,
  is_active boolean,
  start_time timestamp with time zone,
  end_time timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.name,
    dc.value,
    dc.is_active,
    dc.start_time,
    dc.end_time
  FROM public.discount_configs dc
  WHERE dc.name = 'time_based_15_percent_4h'
    AND dc.is_active = true
    AND (dc.start_time IS NULL OR dc.start_time <= NOW())
    AND (dc.end_time IS NULL OR dc.end_time > NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to activate 4-hour discount
CREATE OR REPLACE FUNCTION activate_4hour_discount()
RETURNS void AS $$
BEGIN
  UPDATE public.discount_configs 
  SET 
    is_active = true,
    start_time = NOW(),
    end_time = NOW() + INTERVAL '4 hours'
  WHERE name = 'time_based_15_percent_4h';
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate discount
CREATE OR REPLACE FUNCTION deactivate_time_discount()
RETURNS void AS $$
BEGIN
  UPDATE public.discount_configs 
  SET is_active = false
  WHERE name = 'time_based_15_percent_4h';
END;
$$ LANGUAGE plpgsql; 