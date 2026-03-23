-- ================================================
-- MISSING TABLES SETUP
-- Run this once in Supabase SQL Editor
-- ================================================

-- ================================================
-- 1. PRESCRIPTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    drug_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on prescriptions" ON prescriptions;
CREATE POLICY "Allow all on prescriptions" ON prescriptions
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON prescriptions TO authenticated;
GRANT ALL ON prescriptions TO service_role;

-- ================================================
-- 2. MEDICAL REPORTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS medical_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL DEFAULT 'MANUAL',
    title TEXT NOT NULL,
    content JSONB,
    raw_text TEXT,
    images TEXT[],
    audio_url TEXT,
    language TEXT DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    sent_to_patient_at TIMESTAMPTZ,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_doctor ON medical_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_status ON medical_reports(status);

ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on medical_reports" ON medical_reports;
CREATE POLICY "Allow all on medical_reports" ON medical_reports
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON medical_reports TO authenticated;
GRANT ALL ON medical_reports TO service_role;

-- ================================================
-- 3. PATIENT SYMPTOMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS patient_symptoms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    symptom TEXT NOT NULL,
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    notes TEXT,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patient_symptoms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on patient_symptoms" ON patient_symptoms;
CREATE POLICY "Allow all on patient_symptoms" ON patient_symptoms
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON patient_symptoms TO authenticated;
GRANT ALL ON patient_symptoms TO service_role;

-- ================================================
-- 4. INCIDENT REPORTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS incident_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'LOW',
    reported_by TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    capa_action TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on incident_reports" ON incident_reports;
CREATE POLICY "Allow all on incident_reports" ON incident_reports
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON incident_reports TO authenticated;
GRANT ALL ON incident_reports TO service_role;

-- ================================================
-- 5. CLINICAL RULES TABLE (for safety checks)
-- ================================================
CREATE TABLE IF NOT EXISTS clinical_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    trigger_condition JSONB NOT NULL,
    warning_msg TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinical_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on clinical_rules" ON clinical_rules;
CREATE POLICY "Allow all on clinical_rules" ON clinical_rules
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON clinical_rules TO authenticated;
GRANT ALL ON clinical_rules TO service_role;

-- Seed some basic clinical rules
INSERT INTO clinical_rules (type, trigger_condition, warning_msg) VALUES
    ('ALLERGY_INTERACTION', '{"drug_class": "Penicillin"}', 'Warning: Patient may be allergic to Penicillin-class drugs.'),
    ('ALLERGY_INTERACTION', '{"drug_class": "Sulfa"}', 'Warning: Patient may be allergic to Sulfonamides.'),
    ('CRITICAL_VITAL', '{"vital": "heartRate", "max": 120}', 'Warning: Heart rate is critically high.'),
    ('CRITICAL_VITAL', '{"vital": "heartRate", "min": 40}', 'Warning: Heart rate is critically low.'),
    ('CRITICAL_VITAL', '{"vital": "spo2", "min": 90}', 'Warning: Oxygen saturation is critically low.')
ON CONFLICT DO NOTHING;

-- ================================================
-- 6. ASSETS TABLE (for resource management)
-- ================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    current_location_id TEXT,
    serial_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on assets" ON assets;
CREATE POLICY "Allow all on assets" ON assets
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON assets TO authenticated;
GRANT ALL ON assets TO service_role;

-- Seed sample assets
INSERT INTO assets (name, type, status) VALUES
    ('Ventilator #1', 'Ventilator', 'AVAILABLE'),
    ('Ventilator #2', 'Ventilator', 'IN_USE'),
    ('Ventilator #3', 'Ventilator', 'MAINTENANCE'),
    ('ECG Machine #1', 'ECG', 'AVAILABLE'),
    ('Ultrasound #1', 'Ultrasound', 'IN_USE'),
    ('Wheelchair #1', 'Wheelchair', 'AVAILABLE'),
    ('Wheelchair #2', 'Wheelchair', 'AVAILABLE'),
    ('Defibrillator #1', 'Defibrillator', 'AVAILABLE')
ON CONFLICT DO NOTHING;

-- ================================================
-- 7. STAFF ROSTER TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS staff_roster (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    role TEXT NOT NULL,
    ward_id TEXT,
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_roster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on staff_roster" ON staff_roster;
CREATE POLICY "Allow all on staff_roster" ON staff_roster
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON staff_roster TO authenticated;
GRANT ALL ON staff_roster TO service_role;

-- ================================================
-- 8. PAYMENTS TABLE (for receptionist billing)
-- ================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    receptionist_id TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT,
    payment_type TEXT,
    invoice_number TEXT,
    medicines JSONB,
    items JSONB,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on payments" ON payments;
CREATE POLICY "Allow all on payments" ON payments
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON payments TO authenticated;
GRANT ALL ON payments TO service_role;

-- ================================================
-- 9. AUDIT LOGS TABLE (if not already created)
-- ================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    module TEXT,
    record_id TEXT,
    entity_table TEXT,
    entity_id TEXT,
    details JSONB,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on audit_logs" ON audit_logs;
CREATE POLICY "Allow all on audit_logs" ON audit_logs
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;

-- ================================================
-- 10. MISSING COLUMNS ON EXISTING TABLES
-- ================================================

-- patients: add email, phone, uhid, blood_type, allergies, chronic_conditions
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS uhid TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_conditions TEXT;

-- users: add specialization, phone, department
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;

-- ================================================
-- VERIFICATION
-- ================================================
SELECT table_name, COUNT(*) as row_count
FROM (
    SELECT 'prescriptions' as table_name FROM prescriptions
    UNION ALL SELECT 'medical_reports' FROM medical_reports
    UNION ALL SELECT 'patient_symptoms' FROM patient_symptoms
    UNION ALL SELECT 'incident_reports' FROM incident_reports
    UNION ALL SELECT 'clinical_rules' FROM clinical_rules
    UNION ALL SELECT 'assets' FROM assets
    UNION ALL SELECT 'staff_roster' FROM staff_roster
    UNION ALL SELECT 'payments' FROM payments
    UNION ALL SELECT 'audit_logs' FROM audit_logs
) t
GROUP BY table_name
ORDER BY table_name;

SELECT '✅ All missing tables created successfully!' as status;
