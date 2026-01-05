-- ================================================
-- Insert 5 Sample Patients into Patients Table
-- Run this in Supabase SQL Editor
-- ================================================

-- Insert 5 patients with different profiles
INSERT INTO patients (
  first_name, 
  last_name, 
  date_of_birth, 
  gender, 
  contact_number, 
  address
)
VALUES 
  (
    'Rahul',
    'Sharma',
    '1985-03-15',
    'Male',
    '+91-9876543210',
    '45 MG Road, Bangalore, Karnataka 560001'
  ),
  (
    'Anjali',
    'Verma',
    '1992-07-22',
    'Female',
    '+91-9876543212',
    '12 Park Street, Kolkata, West Bengal 700016'
  ),
  (
    'Mohammed',
    'Khan',
    '1978-11-08',
    'Male',
    '+91-9876543214',
    '78 Civil Lines, Delhi 110054'
  ),
  (
    'Lakshmi',
    'Reddy',
    '2000-05-30',
    'Female',
    '+91-9876543216',
    '23 Banjara Hills, Hyderabad, Telangana 500034'
  ),
  (
    'Amit',
    'Patel',
    '1968-09-12',
    'Male',
    '+91-9876543218',
    '56 CG Road, Ahmedabad, Gujarat 380009'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the patients were inserted
SELECT 
  id, 
  first_name, 
  last_name, 
  date_of_birth, 
  gender, 
  contact_number 
FROM patients 
ORDER BY first_name;
