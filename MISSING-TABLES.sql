-- ============================================================
-- MISSING TABLES: Run this in Supabase SQL Editor
-- Adds: specialization column, referrals table, duty_roster table
-- ============================================================

-- 1. Add specialization column to users (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization TEXT;

-- 2. Update doctor emails with specializations
UPDATE users SET specialization = 'General Medicine' WHERE email IN (
  'vu1f2223065@pvppcoe.ac.in',
  'vu1f2223139@pvppcoe.ac.in',
  'vu1f2223123@pvppcoe.ac.in',
  'vu1f2223167@pvppcoe.ac.in'
);

-- 3. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  referring_doctor_id TEXT,
  target_doctor_id TEXT,
  target_specialization TEXT,
  reason TEXT,
  status TEXT DEFAULT 'REQUESTED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_all" ON referrals;
CREATE POLICY "referrals_all" ON referrals
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Create duty_roster table
CREATE TABLE IF NOT EXISTS duty_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL,
  shift_type TEXT NOT NULL,
  department TEXT,
  shift_date TIMESTAMPTZ NOT NULL,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duty_roster_all" ON duty_roster;
CREATE POLICY "duty_roster_all" ON duty_roster
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Create audit_logs table (if not already created)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  module TEXT,
  record_id TEXT,
  details JSONB,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_all" ON audit_logs;
CREATE POLICY "audit_logs_all" ON audit_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
