-- ================================================
-- Inventory/Pharmacy Management System
-- ================================================

-- Create inventory category enum
CREATE TYPE inventory_category AS ENUM (
  'ANTIBIOTICS',
  'ANALGESICS',
  'ANTIPYRETICS',
  'ANTI_INFLAMMATORY',
  'ANTACIDS',
  'ANTIHISTAMINES',
  'CARDIOVASCULAR',
  'DIABETES',
  'RESPIRATORY',
  'VITAMINS',
  'SURGICAL_SUPPLIES',
  'OTHER'
);

-- Create inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category inventory_category DEFAULT 'OTHER',
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 50,
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  expiry_date DATE,
  ndc_code TEXT, -- National Drug Code for FDA lookup
  manufacturer TEXT,
  dosage_form TEXT, -- e.g., "Tablet", "Syrup", "Injection"
  strength TEXT, -- e.g., "500mg", "10ml"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dispense_log table to track medication distribution
CREATE TABLE dispense_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dispensed_by TEXT NOT NULL, -- Clerk user ID
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  dispensed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX idx_inventory_ndc ON inventory(ndc_code);
CREATE INDEX idx_inventory_low_stock ON inventory(stock_quantity);
CREATE INDEX idx_dispense_log_inventory ON dispense_log(inventory_id);
CREATE INDEX idx_dispense_log_patient ON dispense_log(patient_id);
CREATE INDEX idx_dispense_log_date ON dispense_log(dispensed_at);

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispense_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins and Doctors can view all inventory
CREATE POLICY "Admin and medical staff can view inventory"
  ON inventory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE')
    )
  );

-- RLS Policy: Only Admins can insert/update inventory
CREATE POLICY "Only admins can manage inventory"
  ON inventory
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'ADMIN'
    )
  );

-- RLS Policy: Medical staff can view dispense logs
CREATE POLICY "Medical staff can view dispense logs"
  ON dispense_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE')
    )
  );

-- RLS Policy: Medical staff can insert dispense logs
CREATE POLICY "Medical staff can create dispense logs"
  ON dispense_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('ADMIN', 'DOCTOR', 'NURSE')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- Insert sample inventory data (optional)
INSERT INTO inventory (item_name, category, stock_quantity, low_stock_threshold, unit_price, expiry_date, ndc_code, manufacturer, dosage_form, strength)
VALUES 
  ('Paracetamol', 'ANTIPYRETICS', 500, 100, 0.50, '2026-12-31', '50090-0001', 'Generic Pharma', 'Tablet', '500mg'),
  ('Amoxicillin', 'ANTIBIOTICS', 200, 50, 2.50, '2026-06-30', '0093-4182', 'Teva Pharmaceuticals', 'Capsule', '500mg'),
  ('Ibuprofen', 'ANALGESICS', 300, 75, 1.00, '2026-09-30', '50111-0001', 'Advil', 'Tablet', '400mg'),
  ('Omeprazole', 'ANTACIDS', 150, 50, 3.00, '2026-08-31', '0093-5153', 'Prilosec', 'Capsule', '20mg'),
  ('Insulin Glargine', 'DIABETES', 45, 50, 45.00, '2025-12-31', '0088-2220', 'Sanofi', 'Injection', '100 units/ml'),
  ('Cetirizine', 'ANTIHISTAMINES', 180, 60, 0.75, '2027-03-31', '50090-0002', 'Zyrtec', 'Tablet', '10mg'),
  ('Salbutamol Inhaler', 'RESPIRATORY', 80, 30, 12.00, '2026-11-30', '0173-0682', 'Ventolin', 'Inhaler', '100mcg'),
  ('Surgical Gloves (Box)', 'SURGICAL_SUPPLIES', 120, 40, 8.50, '2028-12-31', NULL, 'MedLine', 'Box', 'Large'),
  ('Vitamin D3', 'VITAMINS', 250, 80, 5.00, '2027-12-31', '76439-0001', 'Nature Made', 'Softgel', '2000 IU'),
  ('Atorvastatin', 'CARDIOVASCULAR', 100, 40, 4.50, '2026-10-31', '0071-0155', 'Lipitor', 'Tablet', '20mg');

-- Grant necessary permissions
GRANT ALL ON inventory TO authenticated;
GRANT ALL ON inventory TO service_role;
GRANT ALL ON dispense_log TO authenticated;
GRANT ALL ON dispense_log TO service_role;
