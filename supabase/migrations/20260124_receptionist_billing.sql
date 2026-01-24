-- Add RECEPTIONIST role and create billing tables
-- Migration: 20260124_receptionist_billing

-- Step 1: Add RECEPTIONIST to user_role enum (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'user_role' AND e.enumlabel = 'RECEPTIONIST') THEN
        ALTER TYPE user_role ADD VALUE 'RECEPTIONIST';
    END IF;
END $$;

-- Step 2: Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  receptionist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'INSURANCE')),
  payment_type TEXT CHECK (payment_type IN ('CONSULTATION', 'MEDICINE', 'LAB', 'PROCEDURE', 'MIXED')),
  invoice_number TEXT UNIQUE,
  invoice_pdf_url TEXT,
  medicines JSONB DEFAULT '[]'::jsonb,
  items JSONB DEFAULT '[]'::jsonb, -- Itemized bill
  notes TEXT,
  status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'REFUNDED', 'PARTIAL')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create medicine_inventory table
CREATE TABLE IF NOT EXISTS medicine_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_name TEXT NOT NULL,
  generic_name TEXT,
  manufacturer TEXT,
  fda_ndc TEXT, -- National Drug Code from OpenFDA
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_receptionist ON payments(receptionist_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_medicine_inventory_name ON medicine_inventory(medicine_name);
CREATE INDEX IF NOT EXISTS idx_medicine_inventory_ndc ON medicine_inventory(fda_ndc);

-- Step 5: Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_inventory ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies for payments

-- Receptionists can view all payments
CREATE POLICY "Receptionists view all payments" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RECEPTIONIST')
  );

-- Receptionists can create payments
CREATE POLICY "Receptionists create payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RECEPTIONIST')
  );

-- Receptionists can update payments
CREATE POLICY "Receptionists update payments" ON payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RECEPTIONIST')
  );

-- Patients can view their own payments
CREATE POLICY "Patients view own payments" ON payments
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Admins can do everything
CREATE POLICY "Admins full access payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Step 7: RLS Policies for medicine_inventory

-- Receptionists can view medicine inventory
CREATE POLICY "Receptionists view medicine inventory" ON medicine_inventory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('RECEPTIONIST', 'ADMIN', 'DOCTOR', 'NURSE'))
  );

-- Only admins can modify medicine inventory
CREATE POLICY "Admins manage medicine inventory" ON medicine_inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Step 8: Update RLS policies for appointments (receptionist access)

-- Receptionists can view all appointments
CREATE POLICY "Receptionists view all appointments" ON appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RECEPTIONIST')
  );

-- Receptionists can create appointments
CREATE POLICY "Receptionists create appointments" ON appointments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RECEPTIONIST')
  );

-- Receptionists can update appointments
CREATE POLICY "Receptionists update appointments" ON appointments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RECEPTIONIST')
  );

-- Step 9: Assign receptionist role to omarhashmi343@gmail.com
UPDATE users 
SET role = 'RECEPTIONIST' 
WHERE email = 'omarhashmi343@gmail.com';

-- Step 10: Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM payments
  WHERE invoice_number LIKE 'INV-%';
  
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;
