-- ================================================
-- MASTER DATABASE SETUP - Run this ONCE in Supabase SQL Editor
-- Sets up the entire HIS Core database from scratch
-- ================================================

-- ================================================
-- STEP 1: HELPER FUNCTION (needed by triggers)
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- STEP 2: USERS TABLE (Clerk-based auth)
-- ================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'DOCTOR' CHECK (role IN ('ADMIN', 'DOCTOR', 'NURSE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;

CREATE POLICY "Service role has full access" ON users
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all users" ON users
  FOR SELECT TO authenticated USING (true);

-- ================================================
-- STEP 3: PATIENTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  contact_number TEXT NOT NULL,
  address TEXT NOT NULL,
  metriport_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_metriport_id ON patients(metriport_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to patients" ON patients;
DROP POLICY IF EXISTS "Admins can manage all patients" ON patients;
DROP POLICY IF EXISTS "Doctors can view and update patients" ON patients;
DROP POLICY IF EXISTS "Doctors can insert patients" ON patients;
DROP POLICY IF EXISTS "Doctors can update patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can read patients" ON patients;

CREATE POLICY "Service role has full access to patients" ON patients
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read patients" ON patients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage all patients" ON patients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  );

CREATE POLICY "Doctors can insert patients" ON patients
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('DOCTOR', 'NURSE'))
  );

CREATE POLICY "Doctors can update patients" ON patients
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('DOCTOR', 'NURSE'))
  );

CREATE OR REPLACE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================
-- STEP 4: APPOINTMENTS TABLE
-- ================================================

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'SCHEDULED',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;

CREATE POLICY "Authenticated users can view appointments" ON appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage all appointments" ON appointments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  );

CREATE POLICY "Doctors can update their appointments" ON appointments
  FOR UPDATE USING (
    doctor_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  );

CREATE POLICY "Authenticated users can insert appointments" ON appointments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON appointments TO authenticated;
GRANT ALL ON appointments TO service_role;

-- ================================================
-- STEP 5: INVOICES TABLE
-- ================================================

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('PAID', 'PENDING', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status invoice_status NOT NULL DEFAULT 'PENDING',
  payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'INSURANCE', 'UPI', 'CHEQUE', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER')),
  description TEXT,
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;

CREATE POLICY "Authenticated users can view invoices" ON invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices" ON invoices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices" ON invoices
  FOR UPDATE TO authenticated USING (true);

GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoices TO service_role;


-- ================================================
-- STEP 6: INVENTORY TABLE
-- ================================================

DO $$ BEGIN
  CREATE TYPE inventory_category AS ENUM (
    'ANTIBIOTICS','ANALGESICS','ANTIPYRETICS','ANTI_INFLAMMATORY',
    'ANTACIDS','ANTIHISTAMINES','CARDIOVASCULAR','DIABETES',
    'RESPIRATORY','VITAMINS','SURGICAL_SUPPLIES','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category inventory_category DEFAULT 'OTHER',
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 50,
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  expiry_date DATE,
  ndc_code TEXT,
  manufacturer TEXT,
  dosage_form TEXT,
  strength TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispense_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dispensed_by TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  dispensed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_ndc ON inventory(ndc_code);
CREATE INDEX IF NOT EXISTS idx_dispense_log_inventory ON dispense_log(inventory_id);
CREATE INDEX IF NOT EXISTS idx_dispense_log_patient ON dispense_log(patient_id);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispense_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and medical staff can view inventory" ON inventory;
DROP POLICY IF EXISTS "Only admins can manage inventory" ON inventory;
DROP POLICY IF EXISTS "Medical staff can view dispense logs" ON dispense_log;
DROP POLICY IF EXISTS "Medical staff can create dispense logs" ON dispense_log;

CREATE POLICY "Admin and medical staff can view inventory" ON inventory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE'))
  );

CREATE POLICY "Only admins can manage inventory" ON inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'ADMIN')
  );

CREATE POLICY "Medical staff can view dispense logs" ON dispense_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE'))
  );

CREATE POLICY "Medical staff can create dispense logs" ON dispense_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE'))
  );

CREATE OR REPLACE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON inventory TO authenticated;
GRANT ALL ON inventory TO service_role;
GRANT ALL ON dispense_log TO authenticated;
GRANT ALL ON dispense_log TO service_role;

-- ================================================
-- STEP 7: HANDWRITTEN NOTES TABLE
-- ================================================

DO $$ BEGIN
  CREATE TYPE handwritten_note_type AS ENUM ('prescription', 'clinical_note', 'diagram', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS handwritten_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id TEXT NOT NULL,
  note_type handwritten_note_type DEFAULT 'clinical_note',
  title TEXT,
  image_data TEXT NOT NULL,
  stroke_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handwritten_notes_patient_id ON handwritten_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_appointment_id ON handwritten_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_doctor_id ON handwritten_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_created_at ON handwritten_notes(created_at DESC);

ALTER TABLE handwritten_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view handwritten notes" ON handwritten_notes;
DROP POLICY IF EXISTS "Allow users to insert handwritten notes" ON handwritten_notes;
DROP POLICY IF EXISTS "Allow users to update their own handwritten notes" ON handwritten_notes;
DROP POLICY IF EXISTS "Allow users to delete their own handwritten notes" ON handwritten_notes;

CREATE POLICY "Allow authenticated users to view handwritten notes" ON handwritten_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to insert handwritten notes" ON handwritten_notes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow users to update their own handwritten notes" ON handwritten_notes
  FOR UPDATE TO authenticated USING (doctor_id = auth.uid()::text);

CREATE POLICY "Allow users to delete their own handwritten notes" ON handwritten_notes
  FOR DELETE TO authenticated USING (doctor_id = auth.uid()::text);

CREATE OR REPLACE TRIGGER handwritten_notes_updated_at_trigger
  BEFORE UPDATE ON handwritten_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================
-- STEP 8: NOTIFICATIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  appointment_reminders BOOLEAN DEFAULT TRUE,
  patient_updates BOOLEAN DEFAULT TRUE,
  system_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own settings" ON user_notification_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_notification_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_notification_settings;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
  ));

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own settings" ON user_notification_settings
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own settings" ON user_notification_settings
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own settings" ON user_notification_settings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Notification helper functions
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id TEXT,
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'INFO',
  p_link VARCHAR(500) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, metadata)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = p_notification_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE notifications SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 9: SAMPLE DATA - PATIENTS
-- ================================================

INSERT INTO patients (first_name, last_name, date_of_birth, gender, contact_number, address)
VALUES
  ('Rahul',    'Sharma',  '1985-03-15', 'Male',   '+91-9876543210', '45 MG Road, Bangalore, Karnataka 560001'),
  ('Anjali',   'Verma',   '1992-07-22', 'Female', '+91-9876543212', '12 Park Street, Kolkata, West Bengal 700016'),
  ('Mohammed', 'Khan',    '1978-11-08', 'Male',   '+91-9876543214', '78 Civil Lines, Delhi 110054'),
  ('Lakshmi',  'Reddy',   '2000-05-30', 'Female', '+91-9876543216', '23 Banjara Hills, Hyderabad, Telangana 500034'),
  ('Amit',     'Patel',   '1968-09-12', 'Male',   '+91-9876543218', '56 CG Road, Ahmedabad, Gujarat 380009')
ON CONFLICT DO NOTHING;

-- ================================================
-- STEP 10: SAMPLE DATA - DOCTORS
-- ================================================

INSERT INTO users (id, email, first_name, last_name, role)
VALUES
  ('user_doctor1_sample', 'dr.sarah.johnson@hospital.com', 'Sarah',   'Johnson',  'DOCTOR'),
  ('user_doctor2_sample', 'dr.michael.chen@hospital.com',  'Michael', 'Chen',     'DOCTOR'),
  ('user_doctor3_sample', 'dr.priya.patel@hospital.com',   'Priya',   'Patel',    'DOCTOR'),
  ('user_doctor4_sample', 'dr.james.williams@hospital.com','James',   'Williams', 'DOCTOR'),
  ('user_doctor5_sample', 'dr.emma.martinez@hospital.com', 'Emma',    'Martinez', 'DOCTOR')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name, role = EXCLUDED.role;


-- ================================================
-- STEP 11: SAMPLE DATA - INVENTORY
-- ================================================

INSERT INTO inventory (item_name, category, stock_quantity, low_stock_threshold, unit_price, expiry_date, ndc_code, manufacturer, dosage_form, strength)
VALUES
  ('Paracetamol',        'ANTIPYRETICS',      500, 100, 0.50,  '2026-12-31', '50090-0001', 'Generic Pharma',      'Tablet',  '500mg'),
  ('Amoxicillin',        'ANTIBIOTICS',       200,  50, 2.50,  '2026-06-30', '0093-4182',  'Teva Pharmaceuticals','Capsule', '500mg'),
  ('Ibuprofen',          'ANALGESICS',        300,  75, 1.00,  '2026-09-30', '50111-0001', 'Advil',               'Tablet',  '400mg'),
  ('Omeprazole',         'ANTACIDS',          150,  50, 3.00,  '2026-08-31', '0093-5153',  'Prilosec',            'Capsule', '20mg'),
  ('Insulin Glargine',   'DIABETES',           45,  50, 45.00, '2025-12-31', '0088-2220',  'Sanofi',              'Injection','100 units/ml'),
  ('Cetirizine',         'ANTIHISTAMINES',    180,  60, 0.75,  '2027-03-31', '50090-0002', 'Zyrtec',              'Tablet',  '10mg'),
  ('Salbutamol Inhaler', 'RESPIRATORY',        80,  30, 12.00, '2026-11-30', '0173-0682',  'Ventolin',            'Inhaler', '100mcg'),
  ('Surgical Gloves',    'SURGICAL_SUPPLIES', 120,  40, 8.50,  '2028-12-31', NULL,         'MedLine',             'Box',     'Large'),
  ('Vitamin D3',         'VITAMINS',          250,  80, 5.00,  '2027-12-31', '76439-0001', 'Nature Made',         'Softgel', '2000 IU'),
  ('Atorvastatin',       'CARDIOVASCULAR',    100,  40, 4.50,  '2026-10-31', '0071-0155',  'Lipitor',             'Tablet',  '20mg')
ON CONFLICT DO NOTHING;

-- ================================================
-- STEP 12: SAMPLE DATA - INVOICES (past 3 months)
-- ================================================

DO $$
DECLARE
  patient_ids UUID[];
  patient_id UUID;
  descriptions TEXT[] := ARRAY['Consultation Fee','Laboratory Tests','Medical Imaging','Prescription Medications','Emergency Service','Surgical Procedure','Therapy Session','Vaccination'];
  methods TEXT[] := ARRAY['CASH','CARD','INSURANCE','UPI','CHEQUE'];
  random_date TIMESTAMPTZ;
  i INT;
BEGIN
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients;
  IF patient_ids IS NULL THEN RAISE EXCEPTION 'No patients found'; END IF;

  -- 20 PAID invoices
  FOR i IN 1..20 LOOP
    patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
    random_date := NOW() - ((random() * 90)::text || ' days')::interval;
    INSERT INTO invoices (patient_id, amount, status, payment_method, description, invoice_date, paid_at, created_at)
    VALUES (patient_id, (random() * 4500 + 200)::NUMERIC(10,2), 'PAID',
      methods[1 + (random() * 4)::int],
      descriptions[1 + (random() * 7)::int],
      random_date, random_date + INTERVAL '2 days', random_date);
  END LOOP;

  -- 5 PENDING invoices
  FOR i IN 1..5 LOOP
    patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
    random_date := NOW() - ((random() * 10)::text || ' days')::interval;
    INSERT INTO invoices (patient_id, amount, status, description, invoice_date, created_at)
    VALUES (patient_id, (random() * 2000 + 200)::NUMERIC(10,2), 'PENDING',
      descriptions[1 + (random() * 7)::int], random_date, random_date);
  END LOOP;

  -- 2 CANCELLED invoices
  FOR i IN 1..2 LOOP
    patient_id := patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int];
    INSERT INTO invoices (patient_id, amount, status, description, invoice_date, created_at)
    VALUES (patient_id, 150.00, 'CANCELLED', 'Cancelled Appointment', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');
  END LOOP;

  RAISE NOTICE '✅ Inserted 27 invoices';
END $$;

-- ================================================
-- STEP 13: SAMPLE DATA - APPOINTMENTS (next 7 days)
-- ================================================

DO $$
DECLARE
  patient_ids UUID[];
  doctor_ids TEXT[];
  reasons TEXT[] := ARRAY['General Checkup','Follow-up Consultation','Lab Results Review','Vaccination','Emergency Consultation','Prescription Refill','Chronic Disease Management'];
  statuses appointment_status[] := ARRAY['SCHEDULED','COMPLETED','IN_PROGRESS','CANCELLED']::appointment_status[];
  i INT;
  d INT;
BEGIN
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients;
  SELECT ARRAY_AGG(id) INTO doctor_ids FROM users WHERE role = 'DOCTOR';
  IF patient_ids IS NULL THEN RAISE EXCEPTION 'No patients found'; END IF;
  IF doctor_ids IS NULL THEN doctor_ids := ARRAY['user_doctor1_sample']; END IF;

  FOR d IN 0..6 LOOP
    FOR i IN 1..5 LOOP
      INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, created_at)
      VALUES (
        patient_ids[1 + (random() * (array_length(patient_ids, 1) - 1))::int],
        doctor_ids[1 + (random() * (array_length(doctor_ids, 1) - 1))::int],
        (CURRENT_DATE + (d || ' days')::interval) + ((8 + i) * INTERVAL '1 hour'),
        statuses[1 + (random() * 3)::int],
        reasons[1 + (random() * 6)::int],
        NOW()
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Created 35 appointments across 7 days';
END $$;

-- ================================================
-- STEP 14: VERIFICATION
-- ================================================

SELECT 'users'         as table_name, COUNT(*) as rows FROM users
UNION ALL
SELECT 'patients',       COUNT(*) FROM patients
UNION ALL
SELECT 'appointments',   COUNT(*) FROM appointments
UNION ALL
SELECT 'invoices',       COUNT(*) FROM invoices
UNION ALL
SELECT 'inventory',      COUNT(*) FROM inventory
UNION ALL
SELECT 'notifications',  COUNT(*) FROM notifications;

SELECT '🎉 Database setup complete! All tables created and seeded.' as status;
