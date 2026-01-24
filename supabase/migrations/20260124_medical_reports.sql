-- Create medical_reports table for storing OCR and voice consultation reports
CREATE TABLE IF NOT EXISTS medical_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('OCR_SCAN', 'VOICE_NOTE', 'MANUAL')),
  title TEXT NOT NULL,
  content JSONB, -- Structured report data
  raw_text TEXT, -- OCR/Voice extracted text
  images TEXT[], -- Array of image URLs (for OCR reports)
  audio_url TEXT, -- Audio file URL (for voice notes)
  language TEXT DEFAULT 'en', -- Language code for voice notes
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED', 'SENT')),
  sent_to_patient_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_doctor ON medical_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_appointment ON medical_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_status ON medical_reports(status);

-- Add RLS policies
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;

-- Doctors can see all reports they created
CREATE POLICY "Doctors can view their own reports" ON medical_reports
  FOR SELECT USING (doctor_id = auth.uid());

-- Patients can see reports sent to them
CREATE POLICY "Patients can view their reports" ON medical_reports
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    ) AND status = 'SENT'
  );

-- Doctors can insert reports
CREATE POLICY "Doctors can create reports" ON medical_reports
  FOR INSERT WITH CHECK (
    doctor_id = auth.uid() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'DOCTOR')
  );

-- Doctors can update their own reports
CREATE POLICY "Doctors can update their reports" ON medical_reports
  FOR UPDATE USING (doctor_id = auth.uid());
