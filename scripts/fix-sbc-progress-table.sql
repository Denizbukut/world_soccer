-- Fix SBC User Progress Table
-- This script ensures the sbc_user_progress table exists and has the correct structure

-- Create sbc_user_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS sbc_user_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES sbc_challenges(id) ON DELETE CASCADE,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_unlocked BOOLEAN NOT NULL DEFAULT TRUE,
    reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sbc_user_progress_user_challenge 
ON sbc_user_progress(user_id, challenge_id);

-- Create index for completion status
CREATE INDEX IF NOT EXISTS idx_sbc_user_progress_completed 
ON sbc_user_progress(user_id, is_completed);

-- Enable RLS
ALTER TABLE sbc_user_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own SBC progress" ON sbc_user_progress;
CREATE POLICY "Users can view their own SBC progress" ON sbc_user_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own SBC progress" ON sbc_user_progress;
CREATE POLICY "Users can insert their own SBC progress" ON sbc_user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own SBC progress" ON sbc_user_progress;
CREATE POLICY "Users can update their own SBC progress" ON sbc_user_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sbc_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sbc_user_progress_updated_at ON sbc_user_progress;
CREATE TRIGGER trigger_update_sbc_user_progress_updated_at
    BEFORE UPDATE ON sbc_user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_sbc_user_progress_updated_at();

-- Check if table exists and show structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sbc_user_progress'
ORDER BY ordinal_position;

-- Show any existing data
SELECT COUNT(*) as total_progress_entries FROM sbc_user_progress;
