-- ================================================
-- DOCTOR MODULE - MISSING TABLES
-- Run this in Supabase SQL Editor
-- ================================================

-- ================================================
-- 1. HANDWRITTEN NOTES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS handwritten_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'prescription',
    image_data TEXT NOT NULL,
    stroke_data TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handwritten_notes_patient ON handwritten_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_appointment ON handwritten_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_handwritten_notes_doctor ON handwritten_notes(doctor_id);

ALTER TABLE handwritten_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on handwritten_notes" ON handwritten_notes;
CREATE POLICY "Allow all on handwritten_notes" ON handwritten_notes
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON handwritten_notes TO authenticated;
GRANT ALL ON handwritten_notes TO service_role;

-- ================================================
-- 2. MEDICAL RECORDS TABLE (for clinical coding)
-- ================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    icd_code TEXT,
    procedure_code TEXT,
    diagnosis TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on medical_records" ON medical_records;
CREATE POLICY "Allow all on medical_records" ON medical_records
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON medical_records TO authenticated;
GRANT ALL ON medical_records TO service_role;

-- ================================================
-- 3. DIAGNOSIS CODES TABLE (ICD-10 local cache)
-- ================================================
CREATE TABLE IF NOT EXISTS diagnosis_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diagnosis_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on diagnosis_codes" ON diagnosis_codes;
CREATE POLICY "Allow all on diagnosis_codes" ON diagnosis_codes
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON diagnosis_codes TO authenticated;
GRANT ALL ON diagnosis_codes TO service_role;

-- Seed common ICD-10 codes
INSERT INTO diagnosis_codes (code, description, category) VALUES
    ('J06.9',  'Acute upper respiratory infection, unspecified', 'Respiratory'),
    ('J18.9',  'Pneumonia, unspecified organism', 'Respiratory'),
    ('J45.9',  'Asthma, unspecified', 'Respiratory'),
    ('I10',    'Essential (primary) hypertension', 'Cardiovascular'),
    ('I25.10', 'Atherosclerotic heart disease of native coronary artery', 'Cardiovascular'),
    ('E11.9',  'Type 2 diabetes mellitus without complications', 'Endocrine'),
    ('E11.65', 'Type 2 diabetes mellitus with hyperglycemia', 'Endocrine'),
    ('E78.5',  'Hyperlipidemia, unspecified', 'Endocrine'),
    ('K21.0',  'Gastro-esophageal reflux disease with esophagitis', 'Digestive'),
    ('K29.70', 'Gastritis, unspecified, without bleeding', 'Digestive'),
    ('M54.5',  'Low back pain', 'Musculoskeletal'),
    ('M79.3',  'Panniculitis, unspecified', 'Musculoskeletal'),
    ('F32.9',  'Major depressive disorder, single episode, unspecified', 'Mental Health'),
    ('F41.1',  'Generalized anxiety disorder', 'Mental Health'),
    ('N39.0',  'Urinary tract infection, site not specified', 'Genitourinary'),
    ('A09',    'Other and unspecified gastroenteritis and colitis', 'Infectious'),
    ('B34.9',  'Viral infection, unspecified', 'Infectious'),
    ('Z00.00', 'Encounter for general adult medical examination', 'Preventive'),
    ('Z23',    'Encounter for immunization', 'Preventive'),
    ('R05.9',  'Cough, unspecified', 'Symptoms'),
    ('R50.9',  'Fever, unspecified', 'Symptoms'),
    ('R51.9',  'Headache, unspecified', 'Symptoms')
ON CONFLICT (code) DO NOTHING;

-- ================================================
-- 4. PROCEDURE CODES TABLE (CPT-style billing)
-- ================================================
CREATE TABLE IF NOT EXISTS procedure_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE procedure_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on procedure_codes" ON procedure_codes;
CREATE POLICY "Allow all on procedure_codes" ON procedure_codes
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON procedure_codes TO authenticated;
GRANT ALL ON procedure_codes TO service_role;

-- Seed common procedure codes
INSERT INTO procedure_codes (code, description, category, base_price) VALUES
    ('99213', 'Office visit - Established patient, low complexity',       'Consultation', 500.00),
    ('99214', 'Office visit - Established patient, moderate complexity',  'Consultation', 800.00),
    ('99215', 'Office visit - Established patient, high complexity',      'Consultation', 1200.00),
    ('99202', 'Office visit - New patient, low complexity',               'Consultation', 700.00),
    ('99203', 'Office visit - New patient, moderate complexity',          'Consultation', 1000.00),
    ('99204', 'Office visit - New patient, high complexity',              'Consultation', 1500.00),
    ('93000', 'Electrocardiogram (ECG/EKG)',                              'Diagnostics',  350.00),
    ('71046', 'Chest X-Ray, 2 views',                                     'Radiology',    600.00),
    ('74177', 'CT Abdomen & Pelvis with contrast',                        'Radiology',    3500.00),
    ('70553', 'MRI Brain with contrast',                                  'Radiology',    5000.00),
    ('85025', 'Complete Blood Count (CBC)',                               'Lab',          250.00),
    ('80053', 'Comprehensive Metabolic Panel',                            'Lab',          400.00),
    ('83036', 'HbA1c (Glycated Hemoglobin)',                              'Lab',          300.00),
    ('80061', 'Lipid Panel',                                              'Lab',          350.00),
    ('84443', 'Thyroid Stimulating Hormone (TSH)',                        'Lab',          450.00),
    ('36415', 'Routine venipuncture (blood draw)',                        'Procedure',    100.00),
    ('90471', 'Immunization administration',                              'Procedure',    150.00),
    ('10060', 'Incision and drainage of abscess',                         'Procedure',    1200.00),
    ('29125', 'Application of short arm splint',                          'Procedure',    800.00),
    ('99232', 'Subsequent hospital care, per day',                        'Inpatient',    1000.00)
ON CONFLICT (code) DO NOTHING;

-- ================================================
-- 5. INVOICE ITEMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on invoice_items" ON invoice_items;
CREATE POLICY "Allow all on invoice_items" ON invoice_items
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON invoice_items TO authenticated;
GRANT ALL ON invoice_items TO service_role;

-- ================================================
-- 6. LAB REQUESTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lab_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id TEXT,
    test_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    result TEXT,
    result_value NUMERIC,
    unit TEXT,
    reference_range TEXT,
    notes TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lab_requests_patient ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);

ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on lab_requests" ON lab_requests;
CREATE POLICY "Allow all on lab_requests" ON lab_requests
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON lab_requests TO authenticated;
GRANT ALL ON lab_requests TO service_role;

-- ================================================
-- 7. ORDER SETS TABLE (Emergency protocols)
-- ================================================
CREATE TABLE IF NOT EXISTS order_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on order_sets" ON order_sets;
CREATE POLICY "Allow all on order_sets" ON order_sets
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON order_sets TO authenticated;
GRANT ALL ON order_sets TO service_role;

-- Seed emergency order sets
INSERT INTO order_sets (name, description, items) VALUES
(
    'Chest Pain Protocol',
    'Standard STEMI/ACS workup',
    '[
        {"type": "LAB",  "name": "Troponin I",          "priority": "STAT"},
        {"type": "LAB",  "name": "CBC",                  "priority": "STAT"},
        {"type": "LAB",  "name": "BMP",                  "priority": "STAT"},
        {"type": "LAB",  "name": "PT/INR",               "priority": "STAT"},
        {"type": "MED",  "name": "Aspirin",              "dose": "325mg",  "frequency": "STAT"},
        {"type": "MED",  "name": "Nitroglycerin",        "dose": "0.4mg",  "frequency": "SL PRN"},
        {"type": "MED",  "name": "Heparin",              "dose": "5000 IU","frequency": "IV STAT"}
    ]'
),
(
    'Stroke Protocol',
    'Acute ischemic stroke workup',
    '[
        {"type": "LAB",  "name": "CBC",                  "priority": "STAT"},
        {"type": "LAB",  "name": "PT/INR",               "priority": "STAT"},
        {"type": "LAB",  "name": "Blood Glucose",        "priority": "STAT"},
        {"type": "MED",  "name": "Aspirin",              "dose": "325mg",  "frequency": "STAT"},
        {"type": "MED",  "name": "Alteplase (tPA)",      "dose": "0.9mg/kg","frequency": "IV if eligible"}
    ]'
),
(
    'Trauma Protocol',
    'Major trauma resuscitation',
    '[
        {"type": "LAB",  "name": "Type & Screen",        "priority": "STAT"},
        {"type": "LAB",  "name": "CBC",                  "priority": "STAT"},
        {"type": "LAB",  "name": "BMP",                  "priority": "STAT"},
        {"type": "LAB",  "name": "Lactate",              "priority": "STAT"},
        {"type": "MED",  "name": "Normal Saline",        "dose": "1L",     "frequency": "IV STAT"},
        {"type": "MED",  "name": "Morphine",             "dose": "4mg",    "frequency": "IV PRN pain"},
        {"type": "MED",  "name": "Tetanus Toxoid",       "dose": "0.5mL",  "frequency": "IM STAT"}
    ]'
)
ON CONFLICT DO NOTHING;

-- ================================================
-- 8. RPC: increment_invoice_total
-- ================================================
CREATE OR REPLACE FUNCTION increment_invoice_total(inv_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
    UPDATE invoices
    SET amount = COALESCE(amount, 0) + increment_invoice_total.amount
    WHERE id = inv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_invoice_total TO authenticated;
GRANT EXECUTE ON FUNCTION increment_invoice_total TO service_role;

-- ================================================
-- VERIFICATION
-- ================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'handwritten_notes', 'medical_records', 'diagnosis_codes',
    'procedure_codes', 'invoice_items', 'lab_requests', 'order_sets'
)
ORDER BY table_name;

SELECT '✅ Doctor module tables created successfully!' AS status;
