-- Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID,
    patient_id UUID NOT NULL,
    drug_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now
CREATE POLICY "Allow all on prescriptions" ON prescriptions
    FOR ALL USING (true) WITH CHECK (true);
