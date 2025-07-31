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

-- Add RLS (Row Level Security) policies
ALTER TABLE icon_passes ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own passes
CREATE POLICY "Users can view their own icon passes" ON icon_passes
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy to allow users to insert their own passes
CREATE POLICY "Users can insert their own icon passes" ON icon_passes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy to allow users to update their own passes
CREATE POLICY "Users can update their own icon passes" ON icon_passes
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy to allow users to delete their own passes
CREATE POLICY "Users can delete their own icon passes" ON icon_passes
    FOR DELETE USING (auth.uid()::text = user_id); 