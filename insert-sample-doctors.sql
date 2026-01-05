-- ================================================
-- Insert 5 Sample Doctors into Users Table
-- Run this in Supabase SQL Editor
-- ================================================

-- Insert 5 doctors with different names
INSERT INTO users (id, email, first_name, last_name, role)
VALUES 
  ('user_doctor1_sample', 'dr.sarah.johnson@hospital.com', 'Sarah', 'Johnson', 'DOCTOR'),
  ('user_doctor2_sample', 'dr.michael.chen@hospital.com', 'Michael', 'Chen', 'DOCTOR'),
  ('user_doctor3_sample', 'dr.priya.patel@hospital.com', 'Priya', 'Patel', 'DOCTOR'),
  ('user_doctor4_sample', 'dr.james.williams@hospital.com', 'James', 'Williams', 'DOCTOR'),
  ('user_doctor5_sample', 'dr.emma.martinez@hospital.com', 'Emma', 'Martinez', 'DOCTOR')
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;

-- Verify the doctors were inserted
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE role = 'DOCTOR' 
ORDER BY first_name;
