-- ================================================
-- FINAL Phase 12 Complete Setup - Idempotent
-- Safe to run multiple times - checks before creating
-- ================================================

-- ================================================
-- PART 1: CREATE INVOICES TABLE (If Not Exists)
-- ================================================

-- Create ENUM for invoice status if not exists
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('PAID', 'PENDING', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create invoices table with all necessary columns
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status invoice_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add optional columns if they don't exist
DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'INSURANCE', 'UPI', 'CHEQUE'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ DEFAULT NOW();
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;

-- Simple RLS policies (all authenticated users)
CREATE POLICY "Authenticated users can view invoices"
ON invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices"
ON invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
ON invoices FOR UPDATE TO authenticated USING (true);

-- ================================================
-- PART 2: SEED INVOICES DATA (Only if table is empty)
-- ================================================

DO $$
DECLARE
  patient_ids UUID[];
  patient_id UUID;
  invoice_count INTEGER;
BEGIN
  -- Check if invoices table already has data
  SELECT COUNT(*) INTO invoice_count FROM invoices;
  
  IF invoice_count > 0 THEN
    RAISE NOTICE '⏭️  Invoices table already has % records. Skipping seed data.', invoice_count;
    RETURN;
  END IF;

  -- Get patient IDs
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 10;
  
  IF patient_ids IS NULL OR array_length(patient_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No patients found. Please run insert-sample-patients.sql first.';
  END IF;

  -- Insert 10 invoices with realistic data
  -- 7 PAID invoices
  FOR i IN 1..7 LOOP
    patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
    
    INSERT INTO invoices (patient_id, amount, status, payment_method, description, invoice_date, paid_at, created_at)
    VALUES (
      patient_id,
      (random() * 4000 + 500)::NUMERIC(10, 2),
      'PAID',
      (ARRAY['CASH', 'CARD', 'INSURANCE', 'UPI'])[floor(random() * 4 + 1)],
      (ARRAY['Consultation Fee', 'Laboratory Tests', 'X-Ray Imaging', 'Medication Purchase', 'Emergency Treatment', 'General Checkup', 'Follow-up Visit'])[floor(random() * 7 + 1)],
      NOW() - (i * INTERVAL '2 days'),
      NOW() - (i * INTERVAL '2 days'),
      NOW() - (i * INTERVAL '2 days')
    );
  END LOOP;

  -- 2 PENDING invoices
  FOR i IN 1..2 LOOP
    patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
    
    INSERT INTO invoices (patient_id, amount, status, description, invoice_date, created_at)
    VALUES (
      patient_id,
      (random() * 2000 + 200)::NUMERIC(10, 2),
      'PENDING',
      'Pending Payment - ' || (ARRAY['Surgery', 'MRI Scan', 'Blood Tests'])[floor(random() * 3 + 1)],
      NOW() - (i * INTERVAL '1 day'),
      NOW() - (i * INTERVAL '1 day')
    );
  END LOOP;

  -- 1 CANCELLED invoice
  patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
  
  INSERT INTO invoices (patient_id, amount, status, description, invoice_date, created_at)
  VALUES (
    patient_id,
    150.00,
    'CANCELLED',
    'Cancelled Appointment - No Show',
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '5 hours'
  );

  RAISE NOTICE '✅ Successfully inserted 10 invoices (7 PAID, 2 PENDING, 1 CANCELLED)';
END $$;

-- ================================================
-- PART 3: UPDATE APPOINTMENTS FOR TODAY
-- ================================================

-- Add reason column to appointments if it doesn't exist
DO $$ BEGIN
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$
DECLARE
  patient_ids UUID[];
  doctor_ids TEXT[];
  patient_id UUID;
  doctor_id TEXT;
  today_date TIMESTAMPTZ;
  existing_count INTEGER;
BEGIN
  -- Get today's date (start of day)
  today_date := date_trunc('day', NOW());
  
  -- Check if there are already appointments for today
  SELECT COUNT(*) INTO existing_count 
  FROM appointments 
  WHERE appointment_date >= today_date 
    AND appointment_date < today_date + INTERVAL '1 day';
  
  IF existing_count >= 5 THEN
    RAISE NOTICE '⏭️  Already have % appointments for today. Skipping.', existing_count;
    RETURN;
  END IF;

  -- Get sample patients and doctors
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 5;
  SELECT ARRAY_AGG(id) INTO doctor_ids FROM users WHERE role = 'DOCTOR' LIMIT 3;
  
  IF patient_ids IS NULL OR array_length(patient_ids, 1) = 0 THEN
    RAISE NOTICE '⚠️  No patients found. Cannot create appointments.';
    RETURN;
  END IF;
  
  IF doctor_ids IS NULL OR array_length(doctor_ids, 1) = 0 THEN
    RAISE NOTICE '⚠️  No doctors found. Using placeholder.';
    doctor_ids := ARRAY['placeholder_doctor_id'];
  END IF;

  -- Create 5 appointments for today (only if needed)
  FOR i IN 1..5 LOOP
    patient_id := patient_ids[(i % array_length(patient_ids, 1)) + 1];
    doctor_id := doctor_ids[(i % array_length(doctor_ids, 1)) + 1];
    
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, created_at)
    VALUES (
      patient_id,
      doctor_id,
      today_date + ((8 + i) * INTERVAL '1 hour'),
      (CASE 
        WHEN i <= 2 THEN 'SCHEDULED'
        WHEN i = 3 THEN 'COMPLETED'
        WHEN i = 4 THEN 'IN_PROGRESS'
        ELSE 'SCHEDULED'
      END)::appointment_status,
      (ARRAY['General Checkup', 'Follow-up Consultation', 'Lab Results Review', 'Vaccination', 'Emergency Consultation'])[i],
      NOW() - (i * INTERVAL '30 minutes')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE '✅ Created appointments for today';
END $$;

-- ================================================
-- PART 4: VERIFICATION QUERIES
-- ================================================

-- Show invoice summary
SELECT 
  COUNT(*) as total_invoices,
  SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as total_paid,
  SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END) as total_pending,
  SUM(CASE WHEN status = 'CANCELLED' THEN amount ELSE 0 END) as total_cancelled,
  TO_CHAR(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 'FM$999,999.00') as formatted_paid
FROM invoices;

-- Show today's appointments
SELECT 
  COUNT(*) as appointments_today,
  COUNT(CASE WHEN status = 'SCHEDULED' THEN 1 END) as scheduled,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress
FROM appointments
WHERE appointment_date >= date_trunc('day', NOW())
  AND appointment_date < date_trunc('day', NOW()) + INTERVAL '1 day';

-- Show patients and staff count
SELECT 
  (SELECT COUNT(*) FROM patients) as total_patients,
  (SELECT COUNT(*) FROM users WHERE role IN ('ADMIN', 'DOCTOR', 'NURSE')) as active_staff;

-- ================================================
-- SUCCESS! Phase 12 Complete
-- ================================================

SELECT '🎉 Phase 12 Setup Complete! Your admin dashboard is now live with real data.' as message;
