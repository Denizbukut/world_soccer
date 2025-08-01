-- Fix icon_passes table by removing RLS policies that cause issues
-- This script should be run in the Supabase SQL editor

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own icon passes" ON icon_passes;
DROP POLICY IF EXISTS "Users can insert their own icon passes" ON icon_passes;
DROP POLICY IF EXISTS "Users can update their own icon passes" ON icon_passes;
DROP POLICY IF EXISTS "Users can delete their own icon passes" ON icon_passes;

-- Disable RLS on icon_passes table
ALTER TABLE icon_passes DISABLE ROW LEVEL SECURITY;

-- Verify the table structure
SELECT 
    table_name,
    row_security
FROM information_schema.tables 
WHERE table_name = 'icon_passes'; 