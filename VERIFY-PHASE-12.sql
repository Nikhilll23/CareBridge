-- ================================================
-- Quick Verification Script
-- Run this to check if Phase 12 is properly set up
-- ================================================

-- Check 1: Does invoices table exist with correct structure?
SELECT 
  '✓ Invoices Table Structure' as check_name,
  CASE 
    WHEN COUNT(*) >= 11 THEN '✅ PASS - All columns present'
    ELSE '❌ FAIL - Missing columns'
  END as status,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'invoices';

-- Check 2: Does invoices table have data?
SELECT 
  '✓ Invoices Data' as check_name,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ PASS - ' || COUNT(*) || ' invoices found'
    WHEN COUNT(*) > 0 THEN '⚠️  WARNING - Only ' || COUNT(*) || ' invoices (expected 10+)'
    ELSE '❌ FAIL - No invoices found. Run FINAL-PHASE-12-COMPLETE.sql'
  END as status
FROM invoices;

-- Check 3: Is revenue calculation working?
SELECT 
  '✓ Revenue Calculation' as check_name,
  CASE 
    WHEN SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) > 0 
    THEN '✅ PASS - $' || TO_CHAR(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 'FM999,999.00') || ' in PAID invoices'
    ELSE '❌ FAIL - No PAID invoices found'
  END as status
FROM invoices;

-- Check 4: Are there appointments for today?
SELECT 
  '✓ Today Appointments' as check_name,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS - ' || COUNT(*) || ' appointments today'
    WHEN COUNT(*) > 0 THEN '⚠️  WARNING - Only ' || COUNT(*) || ' appointments today'
    ELSE '❌ FAIL - No appointments today. Run FINAL-PHASE-12-COMPLETE.sql Part 3'
  END as status
FROM appointments
WHERE appointment_date >= date_trunc('day', NOW())
  AND appointment_date < date_trunc('day', NOW()) + INTERVAL '1 day';

-- Check 5: Are RLS policies in place?
SELECT 
  '✓ RLS Policies' as check_name,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS - ' || COUNT(*) || ' policies found'
    ELSE '❌ FAIL - Missing RLS policies. Run FINAL-PHASE-12-COMPLETE.sql Part 1'
  END as status
FROM pg_policies 
WHERE tablename = 'invoices';

-- Check 6: Do we have patients?
SELECT 
  '✓ Patients Data' as check_name,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ PASS - ' || COUNT(*) || ' patients'
    WHEN COUNT(*) > 0 THEN '⚠️  WARNING - Only ' || COUNT(*) || ' patients'
    ELSE '❌ FAIL - No patients. Run insert-sample-patients.sql'
  END as status
FROM patients;

-- Check 7: Do we have active staff?
SELECT 
  '✓ Active Staff' as check_name,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS - ' || COUNT(*) || ' staff members'
    WHEN COUNT(*) > 0 THEN '⚠️  WARNING - Only ' || COUNT(*) || ' staff members'
    ELSE '❌ FAIL - No staff. Run insert-sample-doctors.sql'
  END as status
FROM users 
WHERE role IN ('ADMIN', 'DOCTOR', 'NURSE');

-- Check 8: Admin user exists?
SELECT 
  '✓ Admin User' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - Admin user found'
    ELSE '❌ FAIL - No ADMIN user. Run: UPDATE users SET role = ''ADMIN'' WHERE email = ''your-email@example.com'';'
  END as status
FROM users 
WHERE role = 'ADMIN';

-- ================================================
-- Final Summary
-- ================================================

SELECT 
  '📊 FINAL SUMMARY' as section,
  (SELECT COUNT(*) FROM patients) as total_patients,
  (SELECT COUNT(*) FROM appointments WHERE appointment_date >= date_trunc('day', NOW()) AND appointment_date < date_trunc('day', NOW()) + INTERVAL '1 day') as appointments_today,
  (SELECT COUNT(*) FROM users WHERE role IN ('ADMIN', 'DOCTOR', 'NURSE')) as active_staff,
  TO_CHAR((SELECT SUM(amount) FROM invoices WHERE status = 'PAID'), 'FM$999,999.00') as total_revenue,
  TO_CHAR((SELECT SUM(amount) FROM invoices WHERE status = 'PENDING'), 'FM$999,999.00') as pending_revenue,
  (SELECT COUNT(*) FROM invoices) as total_invoices;

-- ================================================
-- If you see any ❌ FAIL messages above:
-- 1. Run FINAL-PHASE-12-COMPLETE.sql
-- 2. Make sure your user has ADMIN role
-- 3. Check Supabase logs for errors
-- ================================================
