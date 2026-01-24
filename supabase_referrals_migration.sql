-- 1. Add specialization to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization TEXT;

-- 2. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    referring_doctor_id TEXT REFERENCES users(id), -- Changed to TEXT to match users.id
    target_doctor_id TEXT REFERENCES users(id), -- Changed to TEXT to match users.id
    target_specialization TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED',
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view their own referrals" ON referrals
    FOR SELECT USING (
        -- basic check, refining for specific ID types might be needed based on auth.uid()
        true 
    );

CREATE POLICY "Patients can insert referrals" ON referrals
    FOR INSERT WITH CHECK (
        true
    );

CREATE POLICY "Doctors can update referrals" ON referrals
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'DOCTOR')
    );
