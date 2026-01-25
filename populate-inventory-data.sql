-- ===================================
-- POPULATE INVENTORY & SUPPLY CHAIN DATA
-- Run this in Supabase SQL Editor
-- Creates tables if they don't exist and adds sample data
-- ===================================

-- PART 1: Create pharmacy_inventory table (matches the actions/inventory.ts expectations)
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  category TEXT DEFAULT 'OTHER',
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  price_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  batch_number TEXT,
  expiry_date DATE,
  strength TEXT,
  dosage_form TEXT,
  manufacturer TEXT,
  ndc_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_drug_name ON pharmacy_inventory(drug_name);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_expiry ON pharmacy_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_category ON pharmacy_inventory(category);

-- Enable RLS
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all access to pharmacy_inventory" ON pharmacy_inventory;

-- Simple policy for authenticated users
CREATE POLICY "Allow all access to pharmacy_inventory"
ON pharmacy_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow service_role full access
GRANT ALL ON pharmacy_inventory TO service_role;

-- PART 2: Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_no TEXT,
  contact_details TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to vendors" ON vendors;
CREATE POLICY "Allow all access to vendors"
ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON vendors TO service_role;

-- PART 3: Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'SENT' CHECK (status IN ('DRAFT', 'SENT', 'CLOSED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to purchase_orders" ON purchase_orders;
CREATE POLICY "Allow all access to purchase_orders"
ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON purchase_orders TO service_role;

-- PART 4: Create po_items table
CREATE TABLE IF NOT EXISTS po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  requested_qty INTEGER NOT NULL DEFAULT 0,
  received_qty INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to po_items" ON po_items;
CREATE POLICY "Allow all access to po_items"
ON po_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON po_items TO service_role;

-- PART 5: Create inventory_audit table
CREATE TABLE IF NOT EXISTS inventory_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id UUID REFERENCES pharmacy_inventory(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  performed_by TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to inventory_audit" ON inventory_audit;
CREATE POLICY "Allow all access to inventory_audit"
ON inventory_audit FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON inventory_audit TO service_role;

-- PART 6: Create grn_entries table
CREATE TABLE IF NOT EXISTS grn_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE grn_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to grn_entries" ON grn_entries;
CREATE POLICY "Allow all access to grn_entries"
ON grn_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON grn_entries TO service_role;

-- PART 7: Create pharmacy_sales table
CREATE TABLE IF NOT EXISTS pharmacy_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pharmacy_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to pharmacy_sales" ON pharmacy_sales;
CREATE POLICY "Allow all access to pharmacy_sales"
ON pharmacy_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON pharmacy_sales TO service_role;

-- ===================================
-- SEED DATA
-- ===================================

-- SEED VENDORS (only if table is empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM vendors) = 0 THEN
    INSERT INTO vendors (name, license_no, contact_details, email, address) VALUES
      ('MedSupply Corp', 'LIC-2024-001', '+1-555-0101', 'orders@medsupply.com', '123 Pharma Lane, Boston, MA'),
      ('PharmaDist USA', 'LIC-2024-002', '+1-555-0102', 'sales@pharmadist.com', '456 Medical Blvd, Chicago, IL'),
      ('GlobalMeds International', 'LIC-2024-003', '+1-555-0103', 'contact@globalmeds.com', '789 Health Ave, San Francisco, CA'),
      ('Surgical Supplies Inc', 'LIC-2024-004', '+1-555-0104', 'info@surgicalsupplies.com', '321 Surgery Rd, New York, NY'),
      ('VitaHealth Distribution', 'LIC-2024-005', '+1-555-0105', 'orders@vitahealth.com', '555 Wellness Dr, Miami, FL');
    RAISE NOTICE '✅ Inserted 5 vendors';
  ELSE
    RAISE NOTICE '⏭️  Vendors table already has data, skipping';
  END IF;
END $$;

-- SEED PHARMACY INVENTORY (only if table is empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM pharmacy_inventory) = 0 THEN
    INSERT INTO pharmacy_inventory (drug_name, category, quantity, price_per_unit, batch_number, expiry_date, strength, dosage_form, manufacturer) VALUES
      -- Antibiotics
      ('Amoxicillin', 'ANTIBIOTICS', 250, 2.50, 'BATCH-AMX-001', '2026-08-15', '500mg', 'Capsule', 'Teva Pharmaceuticals'),
      ('Azithromycin', 'ANTIBIOTICS', 180, 4.75, 'BATCH-AZM-001', '2026-09-20', '250mg', 'Tablet', 'Pfizer'),
      ('Ciprofloxacin', 'ANTIBIOTICS', 120, 3.25, 'BATCH-CIP-001', '2026-07-10', '500mg', 'Tablet', 'Bayer'),
      ('Doxycycline', 'ANTIBIOTICS', 200, 1.80, 'BATCH-DOX-001', '2026-10-30', '100mg', 'Capsule', 'Sun Pharma'),
      ('Metronidazole', 'ANTIBIOTICS', 150, 2.10, 'BATCH-MET-001', '2026-06-25', '400mg', 'Tablet', 'Cipla'),
      
      -- Analgesics
      ('Paracetamol', 'ANALGESICS', 500, 0.45, 'BATCH-PAR-001', '2027-01-15', '500mg', 'Tablet', 'GSK'),
      ('Ibuprofen', 'ANALGESICS', 400, 0.80, 'BATCH-IBU-001', '2026-12-20', '400mg', 'Tablet', 'Advil'),
      ('Diclofenac', 'ANALGESICS', 220, 1.20, 'BATCH-DIC-001', '2026-11-10', '50mg', 'Tablet', 'Novartis'),
      ('Tramadol', 'ANALGESICS', 80, 3.50, 'BATCH-TRM-001', '2026-05-15', '50mg', 'Capsule', 'Janssen'),
      ('Naproxen', 'ANALGESICS', 160, 1.35, 'BATCH-NAP-001', '2026-09-05', '250mg', 'Tablet', 'Roche'),
      
      -- Vitamins
      ('Vitamin D3', 'VITAMINS', 300, 0.90, 'BATCH-VTD-001', '2027-06-30', '2000 IU', 'Softgel', 'Nature Made'),
      ('Vitamin B Complex', 'VITAMINS', 250, 1.10, 'BATCH-VTB-001', '2027-04-15', 'Standard', 'Tablet', 'Centrum'),
      ('Vitamin C', 'VITAMINS', 400, 0.65, 'BATCH-VTC-001', '2027-03-20', '1000mg', 'Tablet', 'Now Foods'),
      ('Multivitamin', 'VITAMINS', 180, 1.50, 'BATCH-MVT-001', '2027-05-10', 'Complete', 'Tablet', 'One A Day'),
      ('Folic Acid', 'VITAMINS', 350, 0.40, 'BATCH-FOL-001', '2027-02-28', '5mg', 'Tablet', 'Generic'),
      
      -- Cardiovascular
      ('Atorvastatin', 'CARDIOVASCULAR', 120, 4.50, 'BATCH-ATV-001', '2026-10-15', '20mg', 'Tablet', 'Lipitor'),
      ('Amlodipine', 'CARDIOVASCULAR', 200, 2.20, 'BATCH-AML-001', '2026-11-20', '5mg', 'Tablet', 'Pfizer'),
      ('Lisinopril', 'CARDIOVASCULAR', 180, 1.90, 'BATCH-LIS-001', '2026-09-30', '10mg', 'Tablet', 'Merck'),
      ('Metoprolol', 'CARDIOVASCULAR', 150, 2.75, 'BATCH-MPL-001', '2026-08-25', '50mg', 'Tablet', 'AstraZeneca'),
      ('Losartan', 'CARDIOVASCULAR', 140, 3.10, 'BATCH-LOS-001', '2026-12-10', '50mg', 'Tablet', 'Teva'),
      
      -- Diabetes
      ('Metformin', 'DIABETES', 300, 0.95, 'BATCH-MFM-001', '2026-07-20', '500mg', 'Tablet', 'Bristol-Myers Squibb'),
      ('Glibenclamide', 'DIABETES', 100, 1.40, 'BATCH-GLB-001', '2026-06-15', '5mg', 'Tablet', 'Sanofi'),
      ('Insulin Glargine', 'DIABETES', 45, 48.00, 'BATCH-INS-001', '2026-04-30', '100 units/ml', 'Injection', 'Sanofi'),
      ('Sitagliptin', 'DIABETES', 80, 12.50, 'BATCH-STG-001', '2026-09-10', '100mg', 'Tablet', 'Merck'),
      
      -- Respiratory
      ('Salbutamol Inhaler', 'RESPIRATORY', 60, 15.00, 'BATCH-SAL-001', '2026-08-20', '100mcg', 'Inhaler', 'Ventolin'),
      ('Montelukast', 'RESPIRATORY', 130, 4.80, 'BATCH-MON-001', '2026-11-15', '10mg', 'Tablet', 'Singulair'),
      ('Budesonide', 'RESPIRATORY', 45, 28.00, 'BATCH-BUD-001', '2026-05-25', '200mcg', 'Inhaler', 'AstraZeneca'),
      ('Fluticasone', 'RESPIRATORY', 55, 32.00, 'BATCH-FLU-001', '2026-07-18', '50mcg', 'Nasal Spray', 'Flonase'),
      
      -- Antacids & GI
      ('Omeprazole', 'ANTACIDS', 220, 2.80, 'BATCH-OMP-001', '2026-10-05', '20mg', 'Capsule', 'Prilosec'),
      ('Pantoprazole', 'ANTACIDS', 180, 3.20, 'BATCH-PAN-001', '2026-09-15', '40mg', 'Tablet', 'Protonix'),
      ('Ranitidine', 'ANTACIDS', 150, 1.50, 'BATCH-RAN-001', '2026-06-30', '150mg', 'Tablet', 'Zantac'),
      ('Esomeprazole', 'ANTACIDS', 100, 4.50, 'BATCH-ESO-001', '2026-11-25', '40mg', 'Capsule', 'Nexium'),
      
      -- Antihistamines
      ('Cetirizine', 'ANTIHISTAMINES', 280, 0.75, 'BATCH-CET-001', '2027-01-20', '10mg', 'Tablet', 'Zyrtec'),
      ('Loratadine', 'ANTIHISTAMINES', 200, 0.90, 'BATCH-LOR-001', '2027-02-15', '10mg', 'Tablet', 'Claritin'),
      ('Fexofenadine', 'ANTIHISTAMINES', 150, 1.25, 'BATCH-FEX-001', '2026-12-28', '180mg', 'Tablet', 'Allegra'),
      ('Diphenhydramine', 'ANTIHISTAMINES', 100, 0.60, 'BATCH-DIP-001', '2026-10-20', '25mg', 'Capsule', 'Benadryl'),
      
      -- Surgical Supplies  
      ('Surgical Gloves (Box)', 'SURGICAL_SUPPLIES', 50, 12.00, 'BATCH-GLV-001', '2028-12-31', 'Large', 'Box of 100', 'MedLine'),
      ('Surgical Masks (Box)', 'SURGICAL_SUPPLIES', 80, 8.50, 'BATCH-MSK-001', '2028-06-30', 'Standard', 'Box of 50', 'MedLine'),
      ('Sterile Gauze Pads', 'SURGICAL_SUPPLIES', 150, 5.00, 'BATCH-GAU-001', '2028-03-15', '4x4 inch', 'Pack of 100', '3M'),
      ('Syringes 5ml (Box)', 'SURGICAL_SUPPLIES', 40, 18.00, 'BATCH-SYR-001', '2027-09-30', '5ml', 'Box of 100', 'BD');
    
    RAISE NOTICE '✅ Inserted 40 pharmacy inventory items';
  ELSE
    RAISE NOTICE '⏭️  Pharmacy inventory table already has data, skipping';
  END IF;
END $$;

-- SEED SAMPLE PURCHASE ORDERS (only if table is empty)
DO $$
DECLARE
  vendor_id1 UUID;
  vendor_id2 UUID;
  po_id1 UUID;
  po_id2 UUID;
BEGIN
  IF (SELECT COUNT(*) FROM purchase_orders) = 0 THEN
    -- Get vendor IDs
    SELECT id INTO vendor_id1 FROM vendors WHERE name = 'MedSupply Corp' LIMIT 1;
    SELECT id INTO vendor_id2 FROM vendors WHERE name = 'PharmaDist USA' LIMIT 1;
    
    IF vendor_id1 IS NOT NULL AND vendor_id2 IS NOT NULL THEN
      -- Create purchase orders
      INSERT INTO purchase_orders (vendor_id, status) VALUES (vendor_id1, 'SENT') RETURNING id INTO po_id1;
      INSERT INTO purchase_orders (vendor_id, status) VALUES (vendor_id2, 'SENT') RETURNING id INTO po_id2;
      
      -- Add PO items
      INSERT INTO po_items (po_id, drug_name, requested_qty) VALUES
        (po_id1, 'Amoxicillin', 500),
        (po_id1, 'Paracetamol', 1000),
        (po_id2, 'Metformin', 300),
        (po_id2, 'Vitamin D3', 200);
      
      RAISE NOTICE '✅ Created 2 sample purchase orders with items';
    ELSE
      RAISE NOTICE '⚠️ Vendors not found, skipping purchase orders';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Purchase orders table already has data, skipping';
  END IF;
END $$;

-- VERIFICATION
SELECT '=== PHARMACY INVENTORY SUMMARY ===' as section;
SELECT 
  category,
  COUNT(*) as items,
  SUM(quantity) as total_stock,
  SUM(quantity * price_per_unit)::numeric(10,2) as inventory_value
FROM pharmacy_inventory
GROUP BY category
ORDER BY category;

SELECT '=== VENDORS ===' as section;
SELECT name, license_no, email FROM vendors;

SELECT '=== PURCHASE ORDERS ===' as section;
SELECT 
  po.id,
  v.name as vendor,
  po.status,
  COUNT(pi.id) as items
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN po_items pi ON pi.po_id = po.id
GROUP BY po.id, v.name, po.status;

SELECT '=== LOW STOCK ITEMS (qty < 50) ===' as section;
SELECT drug_name, category, quantity, price_per_unit 
FROM pharmacy_inventory 
WHERE quantity < 50 
ORDER BY quantity;

SELECT '🎉 INVENTORY DATA POPULATION COMPLETE!' as message;
