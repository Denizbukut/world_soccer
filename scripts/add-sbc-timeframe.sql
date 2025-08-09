-- Add timeframe columns to sbc_challenges table
-- This adds start_date and end_date columns to control when SBCs are available

-- Add start_date column (when SBC becomes available)
ALTER TABLE sbc_challenges 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Add end_date column (when SBC expires/becomes unavailable)
ALTER TABLE sbc_challenges 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when filtering by date
CREATE INDEX IF NOT EXISTS idx_sbc_challenges_dates 
ON sbc_challenges (start_date, end_date);

-- Update existing challenges to be available immediately (if they don't have dates set)
UPDATE sbc_challenges 
SET start_date = NOW() 
WHERE start_date IS NULL;

-- Optional: Set some challenges to expire in the future (example)
-- UPDATE sbc_challenges 
-- SET end_date = NOW() + INTERVAL '30 days' 
-- WHERE id = 1; -- Example for challenge ID 1

-- Add comment to explain the new columns
COMMENT ON COLUMN sbc_challenges.start_date IS 'When the SBC becomes available (NULL = available immediately)';
COMMENT ON COLUMN sbc_challenges.end_date IS 'When the SBC expires (NULL = never expires)';
