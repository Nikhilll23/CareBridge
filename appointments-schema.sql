-- ================================================
-- Appointments Table for OPD/Consultation Scheduling
-- ================================================

-- Create appointment status enum
CREATE TYPE appointment_status AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL, -- References users.id (Clerk user ID)
  appointment_date TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'SCHEDULED',
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view and manage all appointments
CREATE POLICY "Admins can manage all appointments"
  ON appointments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'ADMIN'
    )
  );

-- RLS Policy: Doctors can view and update their own appointments
CREATE POLICY "Doctors can view their appointments"
  ON appointments
  FOR SELECT
  USING (
    doctor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('ADMIN', 'DOCTOR')
    )
  );

CREATE POLICY "Doctors can update their appointments"
  ON appointments
  FOR UPDATE
  USING (
    doctor_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'ADMIN'
    )
  );

-- RLS Policy: Patients can view only their own appointments
CREATE POLICY "Patients can view their appointments"
  ON appointments
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE patients.id = appointments.patient_id
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();

-- Insert some sample appointments for testing (optional)
-- Uncomment and modify with actual patient_id and doctor_id values
/*
INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, notes)
VALUES 
  ('patient-uuid-here', 'doctor-clerk-id-here', NOW() + INTERVAL '1 day', 'SCHEDULED', 'Regular Checkup', 'First consultation'),
  ('patient-uuid-here', 'doctor-clerk-id-here', NOW() + INTERVAL '2 days', 'SCHEDULED', 'Follow-up', 'Review test results');
*/

-- Grant necessary permissions
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON appointments TO service_role;
