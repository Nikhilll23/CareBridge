-- Run this in Supabase SQL Editor
-- Makes patient columns optional so new signups auto-create a profile

ALTER TABLE patients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE patients ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN contact_number DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN address DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN gender DROP NOT NULL;

-- Set defaults for existing rows that might be empty
ALTER TABLE patients ALTER COLUMN contact_number SET DEFAULT '';
ALTER TABLE patients ALTER COLUMN address SET DEFAULT '';
ALTER TABLE patients ALTER COLUMN gender SET DEFAULT 'Other';
