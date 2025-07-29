-- Create xp_pass_purchases table to track XP pass payment transactions
CREATE TABLE IF NOT EXISTS xp_pass_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    price_usd DECIMAL(10,2) NOT NULL,
    price_wld DECIMAL(10,6),
    duration_days INTEGER NOT NULL DEFAULT 14,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_xp_pass_purchases_username ON xp_pass_purchases(username);
CREATE INDEX IF NOT EXISTS idx_xp_pass_purchases_purchased_at ON xp_pass_purchases(purchased_at);

-- Add comment to table
COMMENT ON TABLE xp_pass_purchases IS 'Tracks XP pass purchase transactions for payment history and analytics'; 