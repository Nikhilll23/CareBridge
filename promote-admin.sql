-- =====================================================
-- Promote User to ADMIN Role
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- IMPORTANT: Replace 'YOUR_EMAIL@EXAMPLE.COM' with your actual email
-- =====================================================

-- Step 1: Check if the user exists and see their current role
SELECT id, email, role, first_name, last_name 
FROM users 
WHERE email = 'YOUR_EMAIL@EXAMPLE.COM';

-- Step 2: Update the user's role to ADMIN
UPDATE users 
SET role = 'ADMIN'
WHERE email = 'YOUR_EMAIL@EXAMPLE.COM';

-- Step 3: Verify the update was successful
SELECT id, email, role, first_name, last_name 
FROM users 
WHERE email = 'YOUR_EMAIL@EXAMPLE.COM';

-- =====================================================
-- Expected Result:
-- The user's role should now show 'ADMIN'
-- =====================================================

-- Optional: View all users and their roles
-- SELECT email, role, created_at FROM users ORDER BY created_at DESC;
