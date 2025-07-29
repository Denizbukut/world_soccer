-- Create xp_passes table if it doesn't exist
CREATE TABLE IF NOT EXISTS xp_passes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_xp_passes_user_id ON xp_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_passes_active ON xp_passes(active);
CREATE INDEX IF NOT EXISTS idx_xp_passes_expires_at ON xp_passes(expires_at);

-- Add comment to table
COMMENT ON TABLE xp_passes IS 'Stores XP pass subscriptions for users';

-- Grant necessary permissions
GRANT ALL ON xp_passes TO authenticated;
GRANT ALL ON xp_passes TO service_role; 