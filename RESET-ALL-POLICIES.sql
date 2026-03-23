-- ================================================
-- NUCLEAR RESET - Drops ALL policies on ALL tables
-- Then recreates them cleanly
-- ================================================

-- Step 1: Drop ALL existing policies on all tables at once
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 2: Recreate all policies cleanly
CREATE POLICY "users_service_role" ON users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);

CREATE POLICY "patients_service_role" ON patients FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "patients_select" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "patients_insert" ON patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "patients_update" ON patients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (true);

CREATE POLICY "inventory_select" ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_all" ON inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "dispense_log_select" ON dispense_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "dispense_log_insert" ON dispense_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "handwritten_notes_select" ON handwritten_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "handwritten_notes_insert" ON handwritten_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "handwritten_notes_update" ON handwritten_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "handwritten_notes_delete" ON handwritten_notes FOR DELETE TO authenticated USING (true);

-- audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  user_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- Verify
SELECT tablename, COUNT(*) as policies FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;
SELECT '✅ Done!' as status;
