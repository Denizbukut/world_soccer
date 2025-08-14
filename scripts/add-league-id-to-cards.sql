-- Add league_id column to cards table if it doesn't exist
-- This script adds the league_id column to the cards table

-- Check if league_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cards' 
        AND column_name = 'league_id'
    ) THEN
        -- Add league_id column
        ALTER TABLE cards ADD COLUMN league_id UUID;
        
        -- Add index for better performance
        CREATE INDEX idx_cards_league_id ON cards(league_id);
        
        RAISE NOTICE 'Added league_id column to cards table';
    ELSE
        RAISE NOTICE 'league_id column already exists in cards table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cards' 
AND column_name = 'league_id';
