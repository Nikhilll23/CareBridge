-- =====================================================
-- Hospital Information System - Patients Table Schema
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- 1. Create Patients Table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  contact_number TEXT NOT NULL,
  address TEXT NOT NULL,
  metriport_id TEXT, -- Stores the ID returned by Metriport API
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create Indexes for Performance
CREATE INDEX idx_patients_metriport_id ON patients(metriport_id);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to patients"
  ON patients
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: ADMIN can do everything
CREATE POLICY "Admins can manage all patients"
  ON patients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'ADMIN'
    )
  );

-- Policy: DOCTOR can view and update patients
CREATE POLICY "Doctors can view and update patients"
  ON patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('DOCTOR', 'NURSE')
    )
  );

CREATE POLICY "Doctors can insert patients"
  ON patients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('DOCTOR', 'NURSE')
    )
  );

CREATE POLICY "Doctors can update patients"
  ON patients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('DOCTOR', 'NURSE')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('DOCTOR', 'NURSE')
    )
  );

-- 5. Create updated_at trigger
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Schema creation complete!
-- =====================================================
-- Next: Run this in Supabase SQL Editor
-- =====================================================
