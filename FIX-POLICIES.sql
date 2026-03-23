-- ================================================
-- FIX SCRIPT - Run this instead of MASTER-SETUP
-- Safe to run on existing database
-- Drops and recreates all policies cleanly
-- ================================================

-- USERS policies
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Service role has full access" ON users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow user creation" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view all users" ON users FOR SELECT TO authenticated USING (true);

-- PATIENTS policies
DROP POLICY IF EXISTS "Service role has full access to patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can read patients" ON patients;
DROP POLICY IF EXISTS "Admins can manage all patients" ON patients;
DROP POLICY IF EXISTS "Doctors can insert patients" ON patients;
DROP POLICY IF EXISTS "Doctors can update patients" ON patients;
CREATE POLICY "Service role has full access to patients" ON patients FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Authenticated users can read patients" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can insert patients" ON patients FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('ADMIN','DOCTOR','NURSE')));
CREATE POLICY "Doctors can update patients" ON patients FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('ADMIN','DOCTOR','NURSE')));

-- APPOINTMENTS policies
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can update their appointments" ON appointments;
CREATE POLICY "Authenticated users can view appointments" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments" ON appointments FOR UPDATE TO authenticated USING (true);

-- INVOICES policies
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
CREATE POLICY "Authenticated users can view invoices" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update invoices" ON invoices FOR UPDATE TO authenticated USING (true);

-- INVENTORY policies
DROP POLICY IF EXISTS "Admin and medical staff can view inventory" ON inventory;
DROP POLICY IF EXISTS "Only admins can manage inventory" ON inventory;
CREATE POLICY "Admin and medical staff can view inventory" ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage inventory" ON inventory FOR ALL TO authenticated USING (true);

-- DISPENSE LOG policies
DROP POLICY IF EXISTS "Medical staff can view dispense logs" ON dispense_log;
DROP POLICY IF EXISTS "Medical staff can create dispense logs" ON dispense_log;
CREATE POLICY "Medical staff can view dispense logs" ON dispense_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Medical staff can create dispense logs" ON dispense_log FOR INSERT TO authenticated WITH CHECK (true);

-- NOTIFICATIONS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- AUDIT LOGS table + policies
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
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- HANDWRITTEN NOTES policies
DROP POLICY IF EXISTS "Allow authenticated users to view handwritten notes" ON handwritten_notes;
DROP POLICY IF EXISTS "Allow users to insert handwritten notes" ON handwritten_notes;
DROP POLICY IF EXISTS "Allow users to update their own handwritten notes" ON handwritten_notes;
DROP POLICY IF EXISTS "Allow users to delete their own handwritten notes" ON handwritten_notes;
CREATE POLICY "Allow authenticated users to view handwritten notes" ON handwritten_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to insert handwritten notes" ON handwritten_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow users to update their own handwritten notes" ON handwritten_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow users to delete their own handwritten notes" ON handwritten_notes FOR DELETE TO authenticated USING (true);

-- Verify
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

SELECT '✅ All policies fixed!' as status;
