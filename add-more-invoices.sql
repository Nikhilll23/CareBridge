-- Add more invoices for better revenue analytics
-- Creates invoices for the past 3 months

DO $$
DECLARE
  patient_ids UUID[];
  invoice_statuses TEXT[] := ARRAY['PAID', 'PENDING', 'CANCELLED'];
  payment_methods TEXT[] := ARRAY['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'INSURANCE', 'BANK_TRANSFER'];
  descriptions TEXT[] := ARRAY[
    'Consultation Fee',
    'Laboratory Tests',
    'Medical Imaging',
    'Prescription Medications',
    'Emergency Service',
    'Surgical Procedure',
    'Therapy Session',
    'Vaccination',
    'Medical Equipment',
    'Hospital Admission'
  ];
  month_offset INT;
  invoices_per_month INT;
  i INT;
  random_date TIMESTAMPTZ;
  random_amount NUMERIC;
  random_status TEXT;
BEGIN
  -- Get available patient IDs
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 100;
  
  -- Create invoices for past 3 months
  FOR month_offset IN 0..2 LOOP
    invoices_per_month := floor(random() * 30 + 40)::int; -- 40-70 invoices per month
    
    FOR i IN 1..invoices_per_month LOOP
      random_status := invoice_statuses[floor(random() * array_length(invoice_statuses, 1) + 1)::int];
      random_amount := (random() * 4500 + 100)::numeric(10,2); -- $100-$4600
      random_date := (CURRENT_DATE - (month_offset || ' months')::interval) + 
                     ((floor(random() * 30))::text || ' days')::interval;
      
      INSERT INTO invoices (
        id,
        patient_id,
        amount,
        status,
        payment_method,
        description,
        invoice_date,
        due_date,
        paid_at,
        created_at
      ) VALUES (
        gen_random_uuid(),
        patient_ids[floor(random() * array_length(patient_ids, 1) + 1)::int],
        random_amount,
        random_status,
        payment_methods[floor(random() * array_length(payment_methods, 1) + 1)::int],
        descriptions[floor(random() * array_length(descriptions, 1) + 1)::int],
        random_date,
        random_date + INTERVAL '30 days',
        CASE 
          WHEN random_status = 'PAID' THEN random_date + ((floor(random() * 20))::text || ' days')::interval
          ELSE NULL 
        END,
        random_date
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created invoices for the past 3 months';
END $$;

-- Revenue summary by month
SELECT 
  TO_CHAR(DATE_TRUNC('month', invoice_date), 'YYYY-MM') as month,
  COUNT(*) as total_invoices,
  SUM(amount) FILTER (WHERE status = 'PAID') as paid_revenue,
  SUM(amount) FILTER (WHERE status = 'PENDING') as pending_revenue,
  COUNT(*) FILTER (WHERE status = 'PAID') as paid_count,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_count
FROM invoices
WHERE invoice_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY DATE_TRUNC('month', invoice_date)
ORDER BY month DESC;

-- Overall stats
SELECT 
  COUNT(*) as total_invoices,
  SUM(amount) FILTER (WHERE status = 'PAID') as total_revenue,
  AVG(amount) FILTER (WHERE status = 'PAID') as avg_invoice_amount,
  SUM(amount) FILTER (WHERE status = 'PENDING') as pending_amount
FROM invoices;
