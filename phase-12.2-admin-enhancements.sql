-- ================================================
-- Phase 12.2: Admin Portal Enhancements
-- Creates tables for Audit, Insurance, Roster, Ambulances
-- ================================================

-- 1. AUDIT LOGS
-- ================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Clerk User ID or System
  action TEXT NOT NULL, -- LOGIN, CREATE, UPDATE, DELETE, SYSTEM_EVENT
  entity TEXT NOT NULL, -- PATIENT, APPOINTMENT, INVOICE, USER, SYSTEM
  entity_id TEXT, -- UUID or ID of the affected entity
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  );

-- Service role can insert logs (for server actions)
CREATE POLICY "Service role can manage audit logs" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');


-- 2. INSURANCE CLAIMS (TPA)
-- ================================================
CREATE TYPE claim_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED');

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL, -- e.g., BlueCross, Aetna
  policy_number TEXT NOT NULL,
  diagnosis_code TEXT, -- ICD-10 code mock
  treatment_description TEXT,
  amount_claimed DECIMAL(10, 2) NOT NULL,
  approved_amount DECIMAL(10, 2),
  status claim_status DEFAULT 'PENDING',
  submission_date TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON insurance_claims(patient_id);

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

-- Admins and Staff can view/manage claims
CREATE POLICY "Staff can manage claims" ON insurance_claims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE'))
  );


-- 3. DUTY ROSTER
-- ================================================
CREATE TYPE shift_type AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'ON_CALL');

CREATE TABLE IF NOT EXISTS duty_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Clerk User ID
  shift_date DATE NOT NULL,
  shift_type shift_type NOT NULL,
  department TEXT DEFAULT 'GENERAL',
  status TEXT DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, SWAPPED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roster_date ON duty_roster(shift_date);
CREATE INDEX IF NOT EXISTS idx_roster_staff ON duty_roster(staff_id);

ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view roster" ON duty_roster
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE'))
  );

CREATE POLICY "Admins can manage roster" ON duty_roster
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  );


-- 4. AMBULANCES (Emergency Map)
-- ================================================
CREATE TYPE ambulance_status AS ENUM ('AVAILABLE', 'BUSY', 'MAINTENANCE', 'OFFLINE');

CREATE TABLE IF NOT EXISTS ambulances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number TEXT NOT NULL UNIQUE,
  driver_name TEXT,
  driver_contact TEXT,
  status ambulance_status DEFAULT 'AVAILABLE',
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view ambulances" ON ambulances
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage ambulances" ON ambulances
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  );


-- ================================================
-- SEED DATA
-- ================================================

-- Seed Ambulances
INSERT INTO ambulances (vehicle_number, driver_name, status, current_lat, current_lng)
VALUES
  ('AMB-101', 'John Doe', 'AVAILABLE', 19.0760, 72.8777), -- Mumbai
  ('AMB-102', 'Jane Smith', 'BUSY', 19.0800, 72.8800),
  ('AMB-103', 'Mike Ross', 'AVAILABLE', 19.0700, 72.8700),
  ('AMB-104', 'Rachel Green', 'MAINTENANCE', 19.0900, 72.8900)
ON CONFLICT (vehicle_number) DO NOTHING;

-- Seed Audit Logs (Sample)
INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
VALUES
  ('system', 'SYSTEM_EVENT', 'SYSTEM', 'sys-001', '{"message": "Daily backup completed"}', NOW() - INTERVAL '1 hour'),
  ('system', 'SYSTEM_EVENT', 'SYSTEM', 'sys-002', '{"message": "Inventory check ran successfully"}', NOW() - INTERVAL '4 hours'),
  ('user_doctor_dummy_001', 'LOGIN', 'USER', 'user_doctor_dummy_001', '{"ip": "192.168.1.1"}', NOW() - INTERVAL '2 hours');

-- Seed Insurance Claims (Require Patients)
DO $$
DECLARE
  p_id UUID;
BEGIN
  -- Get a patient ID
  SELECT id INTO p_id FROM patients LIMIT 1;
  
  IF p_id IS NOT NULL THEN
    INSERT INTO insurance_claims (patient_id, provider_name, policy_number, diagnosis_code, treatment_description, amount_claimed, approved_amount, status, submission_date)
    VALUES
      (p_id, 'BlueCross', 'POL-998877', 'J01.90', 'Acute sinusitis treatment', 450.00, 400.00, 'APPROVED', NOW() - INTERVAL '5 days'),
      (p_id, 'Aetna', 'POL-112233', 'R51', 'Migraine consultation', 150.00, NULL, 'PENDING', NOW() - INTERVAL '1 day');
  END IF;
END $$;

-- Seed Duty Roster
DO $$
DECLARE
  doc_id TEXT;
  nurse_id TEXT;
BEGIN
  SELECT id INTO doc_id FROM users WHERE role = 'DOCTOR' LIMIT 1;
  SELECT id INTO nurse_id FROM users WHERE role = 'NURSE' LIMIT 1;

  IF doc_id IS NOT NULL THEN
    INSERT INTO duty_roster (staff_id, shift_date, shift_type, department, status)
    VALUES
      (doc_id, CURRENT_DATE, 'MORNING', 'Emergency', 'SCHEDULED'),
      (doc_id, CURRENT_DATE + 1, 'MORNING', 'Emergency', 'SCHEDULED');
  END IF;

  IF nurse_id IS NOT NULL THEN
    INSERT INTO duty_roster (staff_id, shift_date, shift_type, department, status)
    VALUES
      (nurse_id, CURRENT_DATE, 'EVENING', 'ICU', 'SCHEDULED'),
      (nurse_id, CURRENT_DATE + 1, 'EVENING', 'ICU', 'SCHEDULED');
  END IF;
END $$;
