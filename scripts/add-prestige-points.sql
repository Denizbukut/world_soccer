-- Add prestige_points column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS prestige_points INTEGER DEFAULT 100;

-- Update existing users to have default prestige points if they don't have any
UPDATE users SET prestige_points = 100 WHERE prestige_points IS NULL;

-- Create index for better performance when querying by prestige points
CREATE INDEX IF NOT EXISTS idx_users_prestige_points ON users(prestige_points DESC);
