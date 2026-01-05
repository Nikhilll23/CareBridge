-- ===================================
-- COMPREHENSIVE DATA POPULATION SCRIPT
-- Run this in Supabase SQL Editor
-- ===================================

-- STEP 0: Add location columns to patients table if they don't exist
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- PART 1: Update patients with location data
DO $$ 
DECLARE
  patient_record RECORD;
  city_state TEXT[];
  cities TEXT[] := ARRAY[
    'New York,NY', 'Los Angeles,CA', 'Chicago,IL', 'Houston,TX', 
    'Phoenix,AZ', 'Philadelphia,PA', 'San Antonio,TX', 'San Diego,CA',
    'Dallas,TX', 'Austin,TX', 'Jacksonville,FL', 'Fort Worth,TX',
    'Columbus,OH', 'Charlotte,NC', 'San Francisco,CA', 'Indianapolis,IN',
    'Seattle,WA', 'Denver,CO', 'Boston,MA', 'Nashville,TN',
    'Portland,OR', 'Las Vegas,NV', 'Detroit,MI', 'Memphis,TN',
    'Louisville,KY', 'Baltimore,MD', 'Milwaukee,WI', 'Albuquerque,NM',
    'Tucson,AZ', 'Fresno,CA', 'Sacramento,CA', 'Kansas City,MO',
    'Atlanta,GA', 'Miami,FL', 'Oakland,CA', 'Raleigh,NC'
  ];
  random_index INT;
BEGIN
  FOR patient_record IN SELECT id FROM patients LOOP
    random_index := floor(random() * array_length(cities, 1) + 1)::int;
    city_state := string_to_array(cities[random_index], ',');
    
    UPDATE patients 
    SET 
      city = city_state[1],
      state = city_state[2],
      address = (floor(random() * 9000 + 1000)::text || ' ' || 
                 (ARRAY['Main St', 'Oak Ave', 'Maple Dr', 'Park Blvd', 'Cedar Ln', 
                        'Washington St', 'Lake Rd', 'Hill Ave', 'Forest Dr', 'River Rd'])[floor(random() * 10 + 1)::int]),
      zip_code = (floor(random() * 90000 + 10000)::text)
    WHERE id = patient_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Part 1: Updated patients with location data';
END $$;

-- PART 2: Add more appointments for next 7 days
DO $$
DECLARE
  patient_ids UUID[];
  doctor_ids TEXT[];  -- Changed from UUID[] to TEXT[] to handle string IDs
  appointment_statuses TEXT[] := ARRAY['SCHEDULED', 'COMPLETED', 'IN_PROGRESS', 'CANCELLED'];
  appointment_reasons TEXT[] := ARRAY[
    'Annual Checkup', 'Follow-up Visit', 'Lab Results Review',
    'Vaccination', 'Physical Examination', 'Consultation',
    'Prescription Refill', 'Chronic Disease Management',
    'Urgent Care', 'Preventive Care'
  ];
  day_offset INT;
  appointments_per_day INT;
  i INT;
  selected_doctor_id TEXT;
BEGIN
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 50;
  SELECT ARRAY_AGG(id::TEXT) INTO doctor_ids FROM users WHERE role = 'DOCTOR';
  
  -- Check if we have doctors
  IF doctor_ids IS NULL OR array_length(doctor_ids, 1) IS NULL THEN
    RAISE NOTICE '⚠️ No doctors found, skipping appointment creation';
    RETURN;
  END IF;
  
  FOR day_offset IN 0..6 LOOP
    appointments_per_day := floor(random() * 8 + 5)::int;
    
    FOR i IN 1..appointments_per_day LOOP
      selected_doctor_id := doctor_ids[floor(random() * array_length(doctor_ids, 1) + 1)::int];
      
      INSERT INTO appointments (
        id, patient_id, doctor_id, appointment_date, status, reason, created_at
      ) VALUES (
        gen_random_uuid(),
        patient_ids[floor(random() * array_length(patient_ids, 1) + 1)::int],
        selected_doctor_id::UUID,  -- Cast back to UUID when inserting
        (CURRENT_DATE + (day_offset || ' days')::interval) + 
          ((8 + floor(random() * 10))::text || ' hours')::interval +
          ((floor(random() * 4) * 15)::text || ' minutes')::interval,
        appointment_statuses[floor(random() * array_length(appointment_statuses, 1) + 1)::int],
        appointment_reasons[floor(random() * array_length(appointment_reasons, 1) + 1)::int],
        NOW()
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Part 2: Created appointments for next 7 days';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error creating appointments: %', SQLERRM;
END $$;

-- PART 3: Add more invoices for past 3 months
DO $$
DECLARE
  patient_ids UUID[];
  invoice_statuses TEXT[] := ARRAY['PAID', 'PENDING', 'CANCELLED'];
  payment_methods TEXT[] := ARRAY['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'INSURANCE', 'BANK_TRANSFER'];
  descriptions TEXT[] := ARRAY[
    'Consultation Fee', 'Laboratory Tests', 'Medical Imaging',
    'Prescription Medications', 'Emergency Service', 'Surgical Procedure',
    'Therapy Session', 'Vaccination', 'Medical Equipment', 'Hospital Admission'
  ];
  month_offset INT;
  invoices_per_month INT;
  i INT;
  random_date TIMESTAMPTZ;
  random_amount NUMERIC;
  random_status TEXT;
BEGIN
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 100;
  
  FOR month_offset IN 0..2 LOOP
    invoices_per_month := floor(random() * 30 + 40)::int;
    
    FOR i IN 1..invoices_per_month LOOP
      random_status := invoice_statuses[floor(random() * array_length(invoice_statuses, 1) + 1)::int];
      random_amount := (random() * 4500 + 100)::numeric(10,2);
      random_date := (CURRENT_DATE - (month_offset || ' months')::interval) + 
                     ((floor(random() * 30))::text || ' days')::interval;
      
      INSERT INTO invoices (
        id, patient_id, amount, status, payment_method, description,
        invoice_date, due_date, paid_at, created_at
      ) VALUES (
        gen_random_uuid(),
        patient_ids[floor(random() * array_length(patient_ids, 1) + 1)::int],
        random_amount,
        random_status::invoice_status,  -- Cast to enum type
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
  
  RAISE NOTICE '✅ Part 3: Created invoices for past 3 months';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error creating invoices: %', SQLERRM;
END $$;

-- VERIFICATION QUERIES
SELECT '=== PATIENTS WITH LOCATIONS ===' as section;
SELECT 
  COUNT(*) as total_patients,
  COUNT(city) as patients_with_city,
  COUNT(DISTINCT city || ', ' || state) as unique_locations
FROM patients;

SELECT '=== UPCOMING APPOINTMENTS ===' as section;
SELECT 
  DATE(appointment_date) as date,
  COUNT(*) as appointments
FROM appointments
WHERE appointment_date >= CURRENT_DATE
  AND appointment_date < CURRENT_DATE + INTERVAL '7 days'
GROUP BY DATE(appointment_date)
ORDER BY date;

SELECT '=== REVENUE SUMMARY ===' as section;
SELECT 
  status,
  COUNT(*) as invoice_count,
  SUM(amount)::numeric(10,2) as total_amount
FROM invoices
GROUP BY status;

SELECT '=== 🎉 DATA POPULATION COMPLETE! ===' as final_message;
