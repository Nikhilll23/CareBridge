-- ================================================
-- ALL MODULES SETUP - COMPREHENSIVE SQL
-- Run this in Supabase SQL Editor AFTER running:
--   1. MASTER-SETUP.sql
--   2. MISSING-TABLES-SETUP.sql
--   3. DOCTOR-MODULE-TABLES.sql
-- ================================================

-- ================================================
-- FIX: invoice_items - add missing columns
-- (table created in DOCTOR-MODULE-TABLES.sql but
--  billing.ts and lab.ts use category + source_module)
-- ================================================
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_module TEXT;

-- ================================================
-- FIX: invoices - add discount columns
-- ================================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_approved_by TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ================================================
-- FIX: payments - add Razorpay columns
-- (table created in MISSING-TABLES-SETUP.sql but
--  billing.ts uses order_id, currency, method)
-- ================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ================================================
-- FIX: prescriptions - add medication + status cols
-- (pharmacy.ts queries medication and status fields)
-- ================================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medication TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';

-- ================================================
-- 1. PHARMACY INVENTORY
-- ================================================
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    drug_name TEXT NOT NULL,
    batch_number TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    price_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    manufacturer TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_drug ON pharmacy_inventory(drug_name);

ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pharmacy_inventory" ON pharmacy_inventory;
CREATE POLICY "Allow all on pharmacy_inventory" ON pharmacy_inventory
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON pharmacy_inventory TO authenticated;
GRANT ALL ON pharmacy_inventory TO service_role;

-- Seed sample inventory
INSERT INTO pharmacy_inventory (drug_name, batch_number, quantity, price_per_unit, expiry_date, category) VALUES
    ('Paracetamol 500mg', 'BATCH-001', 500, 2.50, '2027-12-31', 'Analgesic'),
    ('Amoxicillin 250mg', 'BATCH-002', 200, 8.00, '2026-06-30', 'Antibiotic'),
    ('Metformin 500mg',   'BATCH-003', 300, 5.00, '2027-03-31', 'Antidiabetic'),
    ('Aspirin 75mg',      'BATCH-004', 400, 1.50, '2027-09-30', 'Antiplatelet'),
    ('Warfarin 5mg',      'BATCH-005', 150, 12.00,'2026-12-31', 'Anticoagulant'),
    ('Atorvastatin 10mg', 'BATCH-006', 250, 15.00,'2027-06-30', 'Statin'),
    ('Omeprazole 20mg',   'BATCH-007', 350, 6.00, '2027-01-31', 'PPI'),
    ('Amlodipine 5mg',    'BATCH-008', 200, 7.00, '2026-09-30', 'Antihypertensive')
ON CONFLICT DO NOTHING;


-- ================================================
-- 2. INVENTORY AUDIT
-- ================================================
CREATE TABLE IF NOT EXISTS inventory_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    drug_id UUID REFERENCES pharmacy_inventory(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    performed_by TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on inventory_audit" ON inventory_audit;
CREATE POLICY "Allow all on inventory_audit" ON inventory_audit
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON inventory_audit TO authenticated;
GRANT ALL ON inventory_audit TO service_role;

-- ================================================
-- 3. PHARMACY SALES
-- ================================================
CREATE TABLE IF NOT EXISTS pharmacy_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pharmacy_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pharmacy_sales" ON pharmacy_sales;
CREATE POLICY "Allow all on pharmacy_sales" ON pharmacy_sales
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON pharmacy_sales TO authenticated;
GRANT ALL ON pharmacy_sales TO service_role;

-- ================================================
-- 4. PHARMACY CART ITEMS
-- ================================================
CREATE TABLE IF NOT EXISTS pharmacy_cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES pharmacy_inventory(id) ON DELETE SET NULL,
    medicine_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_patient ON pharmacy_cart_items(patient_id);

ALTER TABLE pharmacy_cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pharmacy_cart_items" ON pharmacy_cart_items;
CREATE POLICY "Allow all on pharmacy_cart_items" ON pharmacy_cart_items
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON pharmacy_cart_items TO authenticated;
GRANT ALL ON pharmacy_cart_items TO service_role;

-- ================================================
-- 5. LAB TEST MASTER
-- ================================================
CREATE TABLE IF NOT EXISTS lab_test_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name TEXT NOT NULL,
    category TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit TEXT,
    ref_range_min NUMERIC,
    ref_range_max NUMERIC,
    turnaround_hours INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lab_test_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on lab_test_master" ON lab_test_master;
CREATE POLICY "Allow all on lab_test_master" ON lab_test_master
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON lab_test_master TO authenticated;
GRANT ALL ON lab_test_master TO service_role;

-- Seed common lab tests
INSERT INTO lab_test_master (test_name, category, price, unit, ref_range_min, ref_range_max) VALUES
    ('Complete Blood Count (CBC)',        'Hematology',   250, 'cells/µL', NULL, NULL),
    ('Hemoglobin',                        'Hematology',   150, 'g/dL',     12.0, 17.5),
    ('Blood Glucose (Fasting)',           'Biochemistry', 100, 'mg/dL',    70.0, 100.0),
    ('HbA1c',                             'Biochemistry', 300, '%',         4.0,  5.7),
    ('Lipid Panel',                       'Biochemistry', 350, 'mg/dL',    NULL, NULL),
    ('LDL Cholesterol',                   'Biochemistry', 200, 'mg/dL',    NULL, 100.0),
    ('Serum Creatinine',                  'Biochemistry', 150, 'mg/dL',    0.6,  1.2),
    ('Liver Function Test (LFT)',         'Biochemistry', 400, 'U/L',      NULL, NULL),
    ('Thyroid Stimulating Hormone (TSH)', 'Endocrinology',450, 'mIU/L',    0.4,  4.0),
    ('Urine Routine',                     'Microbiology', 100, 'N/A',      NULL, NULL),
    ('Urine Culture',                     'Microbiology', 300, 'N/A',      NULL, NULL),
    ('Troponin I',                        'Cardiac',      600, 'ng/mL',    0.0,  0.04),
    ('D-Dimer',                           'Coagulation',  500, 'µg/mL',    0.0,  0.5),
    ('PT/INR',                            'Coagulation',  200, 'ratio',    0.8,  1.2),
    ('COVID-19 Antigen',                  'Serology',     400, 'N/A',      NULL, NULL),
    ('Dengue NS1 Antigen',                'Serology',     500, 'N/A',      NULL, NULL),
    ('Malaria Antigen',                   'Serology',     350, 'N/A',      NULL, NULL),
    ('Vitamin D (25-OH)',                 'Biochemistry', 700, 'ng/mL',    30.0, 100.0),
    ('Vitamin B12',                       'Biochemistry', 600, 'pg/mL',    200,  900),
    ('Serum Electrolytes',                'Biochemistry', 300, 'mEq/L',    NULL, NULL)
ON CONFLICT DO NOTHING;


-- ================================================
-- 6. LAB ORDERS
-- ================================================
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ORDERED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);

ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on lab_orders" ON lab_orders;
CREATE POLICY "Allow all on lab_orders" ON lab_orders
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON lab_orders TO authenticated;
GRANT ALL ON lab_orders TO service_role;

-- ================================================
-- 7. LAB RESULTS
-- ================================================
CREATE TABLE IF NOT EXISTS lab_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    test_id UUID REFERENCES lab_test_master(id) ON DELETE SET NULL,
    result_value NUMERIC,
    is_abnormal BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_order ON lab_results(order_id);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on lab_results" ON lab_results;
CREATE POLICY "Allow all on lab_results" ON lab_results
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON lab_results TO authenticated;
GRANT ALL ON lab_results TO service_role;

-- ================================================
-- 8. CLINICAL ALERTS
-- ================================================
CREATE TABLE IF NOT EXISTS clinical_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'WARNING',
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient ON clinical_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_resolved ON clinical_alerts(is_resolved);

ALTER TABLE clinical_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on clinical_alerts" ON clinical_alerts;
CREATE POLICY "Allow all on clinical_alerts" ON clinical_alerts
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON clinical_alerts TO authenticated;
GRANT ALL ON clinical_alerts TO service_role;

-- ================================================
-- 9. TARIFF MASTER (billing misc charges)
-- ================================================
CREATE TABLE IF NOT EXISTS tariff_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tariff_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on tariff_master" ON tariff_master;
CREATE POLICY "Allow all on tariff_master" ON tariff_master
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON tariff_master TO authenticated;
GRANT ALL ON tariff_master TO service_role;

-- Seed tariff items
INSERT INTO tariff_master (code, name, category, unit_price) VALUES
    ('CONS-GP',   'General Physician Consultation',  'Consultation', 500.00),
    ('CONS-SPEC', 'Specialist Consultation',         'Consultation', 1000.00),
    ('PROC-DRSG', 'Wound Dressing',                  'Procedure',    200.00),
    ('PROC-INJ',  'Injection Administration',        'Procedure',    100.00),
    ('PROC-IV',   'IV Cannula Insertion',             'Procedure',    150.00),
    ('ROOM-GEN',  'General Ward (per day)',           'Room',         800.00),
    ('ROOM-SEM',  'Semi-Private Room (per day)',      'Room',         1500.00),
    ('ROOM-PVT',  'Private Room (per day)',           'Room',         2500.00),
    ('ROOM-ICU',  'ICU (per day)',                    'Room',         5000.00),
    ('MISC-AMB',  'Ambulance Service',                'Misc',         1000.00),
    ('MISC-OXY',  'Oxygen Therapy (per hour)',        'Misc',         200.00),
    ('MISC-PPE',  'PPE Kit',                          'Misc',         150.00)
ON CONFLICT (code) DO NOTHING;


-- ================================================
-- 10. WARDS
-- ================================================
CREATE TABLE IF NOT EXISTS wards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    floor_number INTEGER DEFAULT 1,
    total_beds INTEGER DEFAULT 0,
    ward_type TEXT DEFAULT 'GENERAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on wards" ON wards;
CREATE POLICY "Allow all on wards" ON wards
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON wards TO authenticated;
GRANT ALL ON wards TO service_role;

-- Seed wards
INSERT INTO wards (name, floor_number, total_beds, ward_type) VALUES
    ('General Ward A',    1, 20, 'GENERAL'),
    ('General Ward B',    1, 20, 'GENERAL'),
    ('ICU',               2, 10, 'ICU'),
    ('Surgical Ward',     2, 15, 'SURGICAL'),
    ('Maternity Ward',    3, 12, 'MATERNITY'),
    ('Pediatric Ward',    3, 10, 'PEDIATRIC'),
    ('Emergency Ward',    0, 8,  'EMERGENCY')
ON CONFLICT DO NOTHING;

-- ================================================
-- 11. BEDS
-- ================================================
CREATE TABLE IF NOT EXISTS beds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bed_number TEXT NOT NULL,
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    type TEXT DEFAULT 'STANDARD',
    daily_charge NUMERIC(10,2) DEFAULT 800.00,
    current_admission_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on beds" ON beds;
CREATE POLICY "Allow all on beds" ON beds
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON beds TO authenticated;
GRANT ALL ON beds TO service_role;

-- Seed beds for each ward
DO $$
DECLARE
    ward_rec RECORD;
    i INTEGER;
    bed_prefix TEXT;
    daily_rate NUMERIC;
BEGIN
    FOR ward_rec IN SELECT id, name, total_beds, ward_type FROM wards LOOP
        bed_prefix := UPPER(LEFT(ward_rec.name, 3));
        daily_rate := CASE ward_rec.ward_type
            WHEN 'ICU'       THEN 5000.00
            WHEN 'SURGICAL'  THEN 2000.00
            WHEN 'MATERNITY' THEN 1500.00
            WHEN 'EMERGENCY' THEN 1000.00
            ELSE 800.00
        END;
        FOR i IN 1..ward_rec.total_beds LOOP
            INSERT INTO beds (bed_number, ward_id, status, daily_charge)
            VALUES (bed_prefix || '-' || LPAD(i::TEXT, 2, '0'), ward_rec.id, 'AVAILABLE', daily_rate)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ================================================
-- 12. BED ALLOCATIONS
-- ================================================
CREATE TABLE IF NOT EXISTS bed_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    allocated_at TIMESTAMPTZ DEFAULT NOW(),
    discharged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bed_alloc_patient ON bed_allocations(patient_id);
CREATE INDEX IF NOT EXISTS idx_bed_alloc_bed ON bed_allocations(bed_id);

ALTER TABLE bed_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on bed_allocations" ON bed_allocations;
CREATE POLICY "Allow all on bed_allocations" ON bed_allocations
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON bed_allocations TO authenticated;
GRANT ALL ON bed_allocations TO service_role;

-- ================================================
-- 13. ADMISSIONS
-- ================================================
CREATE TABLE IF NOT EXISTS admissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    doctor_id TEXT,
    diagnosis TEXT,
    status TEXT NOT NULL DEFAULT 'ADMITTED',
    admitted_at TIMESTAMPTZ DEFAULT NOW(),
    discharged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);

ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on admissions" ON admissions;
CREATE POLICY "Allow all on admissions" ON admissions
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON admissions TO authenticated;
GRANT ALL ON admissions TO service_role;


-- ================================================
-- 14. THEATERS (OT)
-- ================================================
CREATE TABLE IF NOT EXISTS theaters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'GENERAL',
    status TEXT DEFAULT 'AVAILABLE',
    floor_number INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE theaters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on theaters" ON theaters;
CREATE POLICY "Allow all on theaters" ON theaters
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON theaters TO authenticated;
GRANT ALL ON theaters TO service_role;

-- Seed theaters
INSERT INTO theaters (name, type, floor_number) VALUES
    ('OT-1 (General Surgery)',    'GENERAL',    2),
    ('OT-2 (Orthopedic)',         'ORTHOPEDIC', 2),
    ('OT-3 (Cardiac)',            'CARDIAC',    3),
    ('OT-4 (Neurosurgery)',       'NEURO',      3),
    ('OT-5 (Emergency)',          'EMERGENCY',  0)
ON CONFLICT DO NOTHING;

-- ================================================
-- 15. SURGERIES
-- ================================================
CREATE TABLE IF NOT EXISTS surgeries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    theater_id UUID REFERENCES theaters(id) ON DELETE SET NULL,
    procedure_name TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    team_mapping JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    pre_op_assessment TEXT,
    intra_op_notes TEXT,
    post_op_orders TEXT,
    anaesthesia_record TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_theater ON surgeries(theater_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(status);

ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on surgeries" ON surgeries;
CREATE POLICY "Allow all on surgeries" ON surgeries
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON surgeries TO authenticated;
GRANT ALL ON surgeries TO service_role;

-- ================================================
-- 16. SURGICAL CHECKLISTS (WHO Safety)
-- ================================================
CREATE TABLE IF NOT EXISTS surgical_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    checks_passed JSONB DEFAULT '{}',
    verified_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE surgical_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on surgical_checklists" ON surgical_checklists;
CREATE POLICY "Allow all on surgical_checklists" ON surgical_checklists
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON surgical_checklists TO authenticated;
GRANT ALL ON surgical_checklists TO service_role;

-- ================================================
-- 17. OT CONSUMABLES
-- ================================================
CREATE TABLE IF NOT EXISTS ot_consumables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    batch_no TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ot_consumables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ot_consumables" ON ot_consumables;
CREATE POLICY "Allow all on ot_consumables" ON ot_consumables
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ot_consumables TO authenticated;
GRANT ALL ON ot_consumables TO service_role;


-- ================================================
-- 18. VITALS LOG (Nursing)
-- ================================================
CREATE TABLE IF NOT EXISTS vitals_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    temperature NUMERIC(5,2),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    spo2 NUMERIC(5,2),
    respiratory_rate INTEGER,
    nurse_id TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded ON vitals_log(recorded_at DESC);

ALTER TABLE vitals_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on vitals_log" ON vitals_log;
CREATE POLICY "Allow all on vitals_log" ON vitals_log
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON vitals_log TO authenticated;
GRANT ALL ON vitals_log TO service_role;

-- ================================================
-- 19. MAR LOG (Medication Administration Record)
-- ================================================
CREATE TABLE IF NOT EXISTS mar_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'GIVEN',
    notes TEXT,
    nurse_id TEXT,
    administered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mar_patient ON mar_log(patient_id);

ALTER TABLE mar_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on mar_log" ON mar_log;
CREATE POLICY "Allow all on mar_log" ON mar_log
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON mar_log TO authenticated;
GRANT ALL ON mar_log TO service_role;

-- ================================================
-- 20. NURSING NOTES
-- ================================================
CREATE TABLE IF NOT EXISTS nursing_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nurse_id TEXT,
    note_type TEXT DEFAULT 'GENERAL',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nursing_notes_patient ON nursing_notes(patient_id);

ALTER TABLE nursing_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on nursing_notes" ON nursing_notes;
CREATE POLICY "Allow all on nursing_notes" ON nursing_notes
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON nursing_notes TO authenticated;
GRANT ALL ON nursing_notes TO service_role;

-- ================================================
-- 21. ER VISITS
-- ================================================
CREATE TABLE IF NOT EXISTS er_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    triage_category TEXT NOT NULL DEFAULT 'GREEN',
    chief_complaint TEXT,
    status TEXT NOT NULL DEFAULT 'WAITING',
    assigned_doctor_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_er_visits_patient ON er_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_er_visits_status ON er_visits(status);

ALTER TABLE er_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on er_visits" ON er_visits;
CREATE POLICY "Allow all on er_visits" ON er_visits
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON er_visits TO authenticated;
GRANT ALL ON er_visits TO service_role;


-- ================================================
-- 22. RADIOLOGY REPORTS
-- ================================================
CREATE TABLE IF NOT EXISTS radiology_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL,
    modality TEXT NOT NULL,
    study_title TEXT NOT NULL,
    study_url TEXT,
    findings TEXT,
    impression TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    radiopaedia_case_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radiology_patient ON radiology_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_status ON radiology_reports(status);

ALTER TABLE radiology_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on radiology_reports" ON radiology_reports;
CREATE POLICY "Allow all on radiology_reports" ON radiology_reports
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON radiology_reports TO authenticated;
GRANT ALL ON radiology_reports TO service_role;

-- ================================================
-- 23. RADIOLOGY STUDIES (TCIA saved studies)
-- ================================================
CREATE TABLE IF NOT EXISTS radiology_studies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    modality TEXT,
    body_part TEXT,
    study_date TIMESTAMPTZ,
    series_uid TEXT,
    preview_url TEXT,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE radiology_studies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on radiology_studies" ON radiology_studies;
CREATE POLICY "Allow all on radiology_studies" ON radiology_studies
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON radiology_studies TO authenticated;
GRANT ALL ON radiology_studies TO service_role;

-- ================================================
-- 24. DUTY ROSTER (fix missing columns)
-- ================================================
CREATE TABLE IF NOT EXISTS duty_roster (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id TEXT NOT NULL,
    shift_type TEXT NOT NULL,
    department TEXT,
    shift_date TIMESTAMPTZ NOT NULL,
    start_time TEXT,
    end_time TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duty_roster_staff ON duty_roster(staff_id);
CREATE INDEX IF NOT EXISTS idx_duty_roster_date ON duty_roster(shift_date);

ALTER TABLE duty_roster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on duty_roster" ON duty_roster;
CREATE POLICY "Allow all on duty_roster" ON duty_roster
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON duty_roster TO authenticated;
GRANT ALL ON duty_roster TO service_role;

-- ================================================
-- 25. INSURANCE CLAIMS
-- ================================================
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    diagnosis_code TEXT,
    amount_claimed NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    submission_date TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_status ON insurance_claims(status);

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on insurance_claims" ON insurance_claims;
CREATE POLICY "Allow all on insurance_claims" ON insurance_claims
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON insurance_claims TO authenticated;
GRANT ALL ON insurance_claims TO service_role;

-- ================================================
-- 26. AMBULANCES
-- ================================================
CREATE TABLE IF NOT EXISTS ambulances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_number TEXT NOT NULL,
    driver_name TEXT,
    driver_phone TEXT,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    current_lat NUMERIC(10,7),
    current_lng NUMERIC(10,7),
    last_service_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ambulances" ON ambulances;
CREATE POLICY "Allow all on ambulances" ON ambulances
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ambulances TO authenticated;
GRANT ALL ON ambulances TO service_role;

-- Seed ambulances
INSERT INTO ambulances (vehicle_number, driver_name, driver_phone, status) VALUES
    ('MH-01-AB-1234', 'Ramesh Kumar',  '9876543210', 'AVAILABLE'),
    ('MH-01-AB-5678', 'Suresh Patil',  '9876543211', 'AVAILABLE'),
    ('MH-01-AB-9012', 'Mahesh Sharma', '9876543212', 'BUSY'),
    ('MH-01-AB-3456', 'Dinesh Yadav',  '9876543213', 'MAINTENANCE')
ON CONFLICT DO NOTHING;


-- ================================================
-- 27. FIX: prescriptions - add missing columns
--     used by pharmacy.ts (medication, status)
-- ================================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medication TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';

-- Backfill medication from drug_name if null
UPDATE prescriptions SET medication = drug_name WHERE medication IS NULL;

-- ================================================
-- VERIFICATION - Check all tables exist
-- ================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'pharmacy_inventory', 'inventory_audit', 'pharmacy_sales', 'pharmacy_cart_items',
    'lab_test_master', 'lab_orders', 'lab_results', 'clinical_alerts',
    'tariff_master', 'wards', 'beds', 'bed_allocations', 'admissions',
    'theaters', 'surgeries', 'surgical_checklists', 'ot_consumables',
    'vitals_log', 'mar_log', 'nursing_notes',
    'er_visits', 'radiology_reports', 'radiology_studies',
    'duty_roster', 'insurance_claims', 'ambulances'
)
ORDER BY table_name;

SELECT '✅ ALL-MODULES-SETUP.sql completed successfully!' AS status;
