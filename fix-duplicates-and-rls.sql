-- ================================================
-- Fix Duplicate Patients and Add RLS Policy
-- Run this in Supabase SQL Editor
-- ================================================

-- STEP 1: Remove duplicate patients (keep the oldest one)
-- This will delete the newer duplicate records
WITH ranked_patients AS (
  SELECT 
    id,
    first_name,
    last_name,
    date_of_birth,
    ROW_NUMBER() OVER (
      PARTITION BY first_name, last_name, date_of_birth 
      ORDER BY created_at ASC
    ) as rn
  FROM patients
)
DELETE FROM patients
WHERE id IN (
  SELECT id 
  FROM ranked_patients 
  WHERE rn > 1
);

-- STEP 2: Add RLS policy for authenticated users to read patients
-- This allows browser clients to fetch patient data
CREATE POLICY "Authenticated users can read patients"
ON patients
FOR SELECT
TO authenticated
USING (true);

-- STEP 3: Verify - should show exactly 5 patients
SELECT 
  id, 
  first_name, 
  last_name, 
  date_of_birth, 
  gender,
  contact_number,
  created_at
FROM patients 
ORDER BY last_name, first_name;

-- Expected result: 5 patients (Amit Patel, Anjali Verma, Lakshmi Reddy, Mohammed Khan, Rahul Sharma)
