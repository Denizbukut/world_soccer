-- Create icon_passes table
CREATE TABLE IF NOT EXISTS icon_passes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true,
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_icon_passes_user_id ON icon_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_icon_passes_active ON icon_passes(active);
CREATE INDEX IF NOT EXISTS idx_icon_passes_expires_at ON icon_passes(expires_at);

-- Create unique constraint to ensure only one active pass per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_icon_passes_user_active ON icon_passes(user_id) WHERE active = true;

-- Note: RLS policies are removed as they cause issues in browser environment
-- The application handles user authentication and authorization at the application level 