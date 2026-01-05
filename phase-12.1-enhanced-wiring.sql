-- ================================================
-- Phase 12.1: Real-Time Admin Dashboard Wiring
-- Simplified Version - Works Without Type Issues
-- ================================================

-- ================================================
-- PART 1: INVOICES TABLE (Financial Engine)
-- ================================================

-- Drop existing table if needed
DROP TABLE IF EXISTS invoices CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;

-- Create ENUM for invoice status
CREATE TYPE invoice_status AS ENUM ('PAID', 'PENDING', 'CANCELLED');

-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status invoice_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies (no role checks)
CREATE POLICY "Authenticated users can view invoices"
ON invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices"
ON invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
ON invoices FOR UPDATE TO authenticated USING (true);

-- ================================================
-- PART 2: SEED DATA - 10 INVOICES (~$15,000 Total)
-- ================================================

DO $$
DECLARE
  patient_ids UUID[];
  patient_id UUID;
BEGIN
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients;
  
  IF patient_ids IS NULL OR array_length(patient_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No patients found. Please run insert-sample-patients.sql first.';
  END IF;

  -- 7 PAID invoices
  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 1250.00, 'PAID', NOW() - INTERVAL '15 days');

  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 2800.50, 'PAID', NOW() - INTERVAL '12 days');

  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 4500.00, 'PAID', NOW() - INTERVAL '10 days');

  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 980.75, 'PAID', NOW() - INTERVAL '8 days');

  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 1100.00, 'PAID', NOW() - INTERVAL '5 days');

  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 1650.25, 'PAID', NOW() - INTERVAL '3 days');

  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 850.00, 'PAID', NOW() - INTERVAL '2 days');

  -- 2 PENDING invoices
  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 1200.00, 'PENDING', NOW() - INTERVAL '1 day');

  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 425.50, 'PENDING', NOW() - INTERVAL '6 hours');

  -- 1 CANCELLED invoice
  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  INSERT INTO invoices (patient_id, amount, status, created_at)
  VALUES (patient_id, 120.00, 'CANCELLED', NOW() - INTERVAL '3 hours');

  RAISE NOTICE '✅ Inserted 10 invoices totaling ~$15,000';
END $$;

-- ================================================
-- PART 3: SEED APPOINTMENTS FOR TODAY
-- ================================================

DO $$
DECLARE
  patient_ids UUID[];
  doctor_ids TEXT[];
  patient_id UUID;
  doctor_id TEXT;
  today_date DATE := CURRENT_DATE;
BEGIN
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 5;
  SELECT ARRAY_AGG(id) INTO doctor_ids FROM users WHERE role = 'DOCTOR' LIMIT 3;
  
  IF patient_ids IS NULL OR array_length(patient_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No patients found. Cannot create appointments.';
  END IF;
  
  IF doctor_ids IS NULL OR array_length(doctor_ids, 1) = 0 THEN
    RAISE NOTICE 'No doctors found, using placeholder doctor_id';
    doctor_ids := ARRAY['placeholder_doctor_id'];
  END IF;

  -- Delete existing appointments for today
  DELETE FROM appointments WHERE appointment_date = today_date;

  -- Create 5 appointments for today
  FOR i IN 1..5 LOOP
    patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
    doctor_id := doctor_ids[1 + (random() * (array_length(doctor_ids, 1) - 1))::int];
    
    INSERT INTO appointments (
      patient_id,
      doctor_id,
      appointment_date,
      status,
      reason,
      created_at
    )
    VALUES (
      patient_id,
      doctor_id,
      today_date,
      (CASE 
        WHEN i <= 2 THEN 'SCHEDULED'
        WHEN i = 3 THEN 'COMPLETED'
        WHEN i = 4 THEN 'IN_PROGRESS'
        ELSE 'SCHEDULED'
      END)::appointment_status,
      CASE i
        WHEN 1 THEN 'General Checkup'
        WHEN 2 THEN 'Follow-up Consultation'
        WHEN 3 THEN 'Lab Results Review'
        WHEN 4 THEN 'Vaccination'
        ELSE 'Emergency Consultation'
      END,
      NOW() - (i * INTERVAL '1 hour')
    );
  END LOOP;

  RAISE NOTICE '✅ Created 5 appointments for today';
END $$;

-- ================================================
-- PART 4: VERIFICATION QUERIES
-- ================================================

-- Show invoice summary
SELECT 
  COUNT(*) as total_invoices,
  SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as total_paid,
  SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END) as total_pending,
  SUM(CASE WHEN status = 'CANCELLED' THEN amount ELSE 0 END) as total_cancelled
FROM invoices;

-- Show today's appointments
SELECT 
  COUNT(*) as appointments_today,
  COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as scheduled,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress
FROM appointments
WHERE appointment_date = CURRENT_DATE;

-- ================================================
-- DONE! Now go test your dashboard at /admin
-- ================================================
