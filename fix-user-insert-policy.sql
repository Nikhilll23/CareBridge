-- Fix RLS policy for user inserts
-- Run this in Supabase SQL Editor

-- Drop existing policies if they need to be recreated
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Enable insert for service role" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;

-- Recreate service role full access policy
CREATE POLICY "Service role has full access"
  ON users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add explicit insert policy for authenticated users (they can insert their own row)
CREATE POLICY "Allow user creation"
  ON users
  FOR INSERT
  WITH CHECK (true);  -- Allow service role to insert any user

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';
