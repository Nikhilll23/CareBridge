-- ================================================
-- Phase 12: Admin Dashboard Analytics - Database Schema
-- Create invoices table for revenue tracking
-- ================================================

-- 1. Create ENUM for invoice status
CREATE TYPE invoice_status AS ENUM ('PAID', 'PENDING', 'CANCELLED');

-- 2. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status invoice_status NOT NULL DEFAULT 'PENDING',
  payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'INSURANCE', 'UPI', 'CHEQUE')),
  description TEXT,
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for faster queries
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_appointment_id ON invoices(appointment_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Admins can insert invoices
CREATE POLICY "Admins can insert invoices"
ON invoices
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Admins can update invoices
CREATE POLICY "Admins can update invoices"
ON invoices
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- ================================================
-- SEED DATA - Critical for Testing
-- ================================================

-- Insert dummy invoices (using existing patient IDs)
-- First, let's get some patient IDs
DO $$
DECLARE
  patient_ids UUID[];
  appointment_ids UUID[];
BEGIN
  -- Get existing patient IDs
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 5;
  
  -- Get existing appointment IDs (if any)
  SELECT ARRAY_AGG(id) INTO appointment_ids FROM appointments LIMIT 3;
  
  -- Only proceed if we have patients
  IF array_length(patient_ids, 1) > 0 THEN
    -- Insert 10 dummy invoices
    INSERT INTO invoices (patient_id, appointment_id, amount, status, payment_method, description, invoice_date, paid_at)
    VALUES
      -- PAID invoices (for revenue calculation)
      (patient_ids[1], appointment_ids[1], 150.00, 'PAID', 'CARD', 'General Consultation + Lab Tests', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
      (patient_ids[2], appointment_ids[2], 200.50, 'PAID', 'INSURANCE', 'X-Ray + Doctor Consultation', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
      (patient_ids[3], NULL, 75.00, 'PAID', 'CASH', 'Pharmacy - Medication Purchase', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      (patient_ids[1], appointment_ids[3], 300.00, 'PAID', 'UPI', 'Specialist Consultation', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
      (patient_ids[4], NULL, 125.75, 'PAID', 'CARD', 'Lab Tests - Blood Work', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
      (patient_ids[2], NULL, 450.00, 'PAID', 'INSURANCE', 'MRI Scan', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
      
      -- PENDING invoices
      (patient_ids[5], NULL, 180.00, 'PENDING', 'INSURANCE', 'Pending Insurance Claim', NOW() - INTERVAL '3 days', NULL),
      (patient_ids[3], NULL, 90.00, 'PENDING', 'CARD', 'Follow-up Consultation', NOW() - INTERVAL '1 day', NULL),
      
      -- CANCELLED invoice
      (patient_ids[4], NULL, 50.00, 'CANCELLED', NULL, 'Cancelled Appointment', NOW() - INTERVAL '8 days', NULL);
  END IF;
END $$;

-- ================================================
-- Ensure we have DOCTOR/NURSE users for "Active Staff"
-- ================================================

-- Check if we need to add dummy staff
DO $$
BEGIN
  -- Only add if we have less than 2 staff members
  IF (SELECT COUNT(*) FROM users WHERE role IN ('DOCTOR', 'NURSE')) < 2 THEN
    -- Insert 2 dummy doctors (using Clerk-style user IDs)
    INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
    VALUES
      ('user_doctor_dummy_001', 'dr.smith@hiscore.com', 'John', 'Smith', 'DOCTOR', NOW(), NOW()),
      ('user_nurse_dummy_001', 'nurse.jones@hiscore.com', 'Sarah', 'Jones', 'NURSE', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check invoices
SELECT 
  i.id,
  i.amount,
  i.status,
  i.payment_method,
  i.description,
  i.invoice_date,
  p.first_name || ' ' || p.last_name as patient_name
FROM invoices i
LEFT JOIN patients p ON i.patient_id = p.id
ORDER BY i.created_at DESC;

-- Calculate total revenue (PAID only)
SELECT 
  COUNT(*) as total_invoices,
  SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as total_revenue,
  COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
  SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END) as pending_amount
FROM invoices;

-- Check staff count
SELECT role, COUNT(*) as count
FROM users
WHERE role IN ('ADMIN', 'DOCTOR', 'NURSE')
GROUP BY role;
