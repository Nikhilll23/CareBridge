-- Fix RLS - open read access for authenticated users on all tables
-- This resolves "Error fetching doctors/users/roster: {}" errors

-- Users - allow all authenticated to read
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);

-- Also allow update (needed for ID sync)
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated USING (true);

-- Make sure service role can do everything
DROP POLICY IF EXISTS "users_service_role" ON users;
CREATE POLICY "users_service_role" ON users FOR ALL USING (true) WITH CHECK (true);

SELECT '✅ RLS fixed' as status;
