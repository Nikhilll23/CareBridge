-- Add missing columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS uhid text UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS govt_id_type text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS govt_id_number text;

-- Backfill UHID for existing records
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM patients WHERE uhid IS NULL LOOP
        UPDATE patients
        SET uhid = 'HIS-' || to_char(created_at, 'YYYY') || '-' || lpad(floor(random() * 100000)::text, 6, '0')
        WHERE id = r.id;
    END LOOP;
END $$;
