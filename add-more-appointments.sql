-- Add more appointments for better data visualization
-- Creates appointments for the next 7 days

DO $$
DECLARE
  patient_ids UUID[];
  doctor_ids UUID[];
  appointment_statuses TEXT[] := ARRAY['SCHEDULED', 'COMPLETED', 'IN_PROGRESS', 'CANCELLED'];
  appointment_reasons TEXT[] := ARRAY[
    'Annual Checkup',
    'Follow-up Visit',
    'Lab Results Review',
    'Vaccination',
    'Physical Examination',
    'Consultation',
    'Prescription Refill',
    'Chronic Disease Management',
    'Urgent Care',
    'Preventive Care'
  ];
  day_offset INT;
  appointments_per_day INT;
  i INT;
BEGIN
  -- Get available patient and doctor IDs
  SELECT ARRAY_AGG(id) INTO patient_ids FROM patients LIMIT 50;
  SELECT ARRAY_AGG(id) INTO doctor_ids FROM users WHERE role = 'DOCTOR';
  
  -- Create appointments for next 7 days
  FOR day_offset IN 0..6 LOOP
    appointments_per_day := floor(random() * 8 + 5)::int; -- 5-12 appointments per day
    
    FOR i IN 1..appointments_per_day LOOP
      INSERT INTO appointments (
        id,
        patient_id,
        doctor_id,
        appointment_date,
        status,
        reason,
        created_at
      ) VALUES (
        gen_random_uuid(),
        patient_ids[floor(random() * array_length(patient_ids, 1) + 1)::int],
        doctor_ids[floor(random() * array_length(doctor_ids, 1) + 1)::int],
        (CURRENT_DATE + (day_offset || ' days')::interval) + 
          ((8 + floor(random() * 10))::text || ' hours')::interval + -- 8am-6pm
          ((floor(random() * 4) * 15)::text || ' minutes')::interval, -- 15 min intervals
        appointment_statuses[floor(random() * array_length(appointment_statuses, 1) + 1)::int],
        appointment_reasons[floor(random() * array_length(appointment_reasons, 1) + 1)::int],
        NOW()
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created appointments for the next 7 days';
END $$;

-- Verify appointments
SELECT 
  DATE(appointment_date) as date,
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE status = 'SCHEDULED') as scheduled,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled
FROM appointments
WHERE appointment_date >= CURRENT_DATE
  AND appointment_date < CURRENT_DATE + INTERVAL '7 days'
GROUP BY DATE(appointment_date)
ORDER BY date;
