-- Add hidden column to existing weekend_league_matches table
ALTER TABLE public.weekend_league_matches 
ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT true;

-- Add index for the hidden column
CREATE INDEX IF NOT EXISTS idx_weekend_league_matches_hidden 
ON public.weekend_league_matches USING btree (hidden) TABLESPACE pg_default;

-- Add comment for the hidden column
COMMENT ON COLUMN public.weekend_league_matches.hidden IS 'Whether the match result is hidden from public view (true = hidden, false = visible)';
