-- Fix SBC User Squads Table
-- Run this script to create/fix the sbc_user_squads table

-- Create sbc_user_squads table if it doesn't exist
CREATE TABLE IF NOT EXISTS sbc_user_squads (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  challenge_id INTEGER NOT NULL,
  squad_name VARCHAR(255),
  card_ids UUID[] NOT NULL,
  total_level INTEGER NOT NULL DEFAULT 0,
  team_rating INTEGER NOT NULL DEFAULT 0,
  total_rarity_count JSONB NOT NULL DEFAULT '{}',
  is_valid BOOLEAN NOT NULL DEFAULT true,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Check and add card_ids column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sbc_user_squads' AND column_name='card_ids') THEN
    ALTER TABLE sbc_user_squads ADD COLUMN card_ids UUID[] NOT NULL DEFAULT '{}';
  END IF;
  
  -- Check and add total_level column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sbc_user_squads' AND column_name='total_level') THEN
    ALTER TABLE sbc_user_squads ADD COLUMN total_level INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Check and add team_rating column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sbc_user_squads' AND column_name='team_rating') THEN
    ALTER TABLE sbc_user_squads ADD COLUMN team_rating INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Check and add total_rarity_count column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sbc_user_squads' AND column_name='total_rarity_count') THEN
    ALTER TABLE sbc_user_squads ADD COLUMN total_rarity_count JSONB NOT NULL DEFAULT '{}';
  END IF;
  
  -- Check and add is_valid column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sbc_user_squads' AND column_name='is_valid') THEN
    ALTER TABLE sbc_user_squads ADD COLUMN is_valid BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  -- Check and add submitted_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sbc_user_squads' AND column_name='submitted_at') THEN
    ALTER TABLE sbc_user_squads ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create RLS policy for sbc_user_squads
ALTER TABLE sbc_user_squads ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sbc_user_squads' AND policyname = 'Users can manage own squads') THEN
    DROP POLICY "Users can manage own squads" ON sbc_user_squads;
  END IF;
  
  CREATE POLICY "Users can manage own squads" ON sbc_user_squads
    FOR ALL USING (user_id = current_user);
END $$;

-- Grant permissions
GRANT ALL ON sbc_user_squads TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sbc_user_squads_id_seq TO authenticated;

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'sbc_user_squads'
ORDER BY ordinal_position;
