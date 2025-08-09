-- Temporarily disable RLS for sbc_user_squads to test functionality
-- Run this script to disable Row Level Security

-- Disable RLS for sbc_user_squads table
ALTER TABLE sbc_user_squads DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON sbc_user_squads TO authenticated;
GRANT ALL ON sbc_user_squads TO anon;

-- Also make sure the sequence is accessible
GRANT USAGE, SELECT ON SEQUENCE sbc_user_squads_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sbc_user_squads_id_seq TO anon;

-- Verify RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'sbc_user_squads';
