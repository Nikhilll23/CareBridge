-- ================================================
-- Radiology & Imaging Module Schema
-- ================================================

-- Create ENUM for imaging modalities
CREATE TYPE imaging_modality AS ENUM (
  'XRAY',
  'MRI',
  'CT',
  'ULTRASOUND',
  'MAMMOGRAPHY',
  'PET',
  'NUCLEAR_MEDICINE',
  'FLUOROSCOPY'
);

-- Create ENUM for report status
CREATE TYPE radiology_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'FINALIZED',
  'CANCELLED'
);

-- Create radiology_reports table
CREATE TABLE IF NOT EXISTS radiology_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  modality imaging_modality NOT NULL,
  study_title TEXT NOT NULL,
  study_url TEXT,
  findings TEXT,
  impression TEXT,
  status radiology_status NOT NULL DEFAULT 'PENDING',
  radiopaedia_case_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_radiology_patient ON radiology_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_doctor ON radiology_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_radiology_status ON radiology_reports(status);
CREATE INDEX IF NOT EXISTS idx_radiology_created ON radiology_reports(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_radiology_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER radiology_updated_at_trigger
  BEFORE UPDATE ON radiology_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_radiology_updated_at();

-- Sample data (Optional - for testing)
INSERT INTO radiology_reports (patient_id, doctor_id, modality, study_title, findings, status)
SELECT 
  p.id,
  'user_doctor1_sample',
  'XRAY',
  'Chest X-ray - Routine',
  'Clear lung fields. No evidence of consolidation or pleural effusion. Heart size normal.',
  'FINALIZED'
FROM patients p
LIMIT 1;

-- Verify the table was created
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'radiology_reports' 
ORDER BY ordinal_position;
