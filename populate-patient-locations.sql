-- Populate patient addresses with realistic US cities
-- This script updates existing patients with location data

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
    'Atlanta,GA', 'Miami,FL', 'Oakland,CA', 'Raleigh,NC',
    'Minneapolis,MN', 'Omaha,NE', 'Cleveland,OH', 'Tulsa,OK'
  ];
  random_index INT;
BEGIN
  -- Update each patient with a random city and state
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
  
  RAISE NOTICE 'Updated all patients with location data';
END $$;

-- Verify the update
SELECT 
  COUNT(*) as total_patients,
  COUNT(city) as patients_with_city,
  COUNT(state) as patients_with_state,
  COUNT(DISTINCT city || ', ' || state) as unique_locations
FROM patients;

-- Show sample of updated data
SELECT 
  first_name, 
  last_name, 
  city, 
  state, 
  address,
  zip_code
FROM patients 
WHERE city IS NOT NULL
LIMIT 10;
