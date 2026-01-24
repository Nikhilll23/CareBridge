-- ================================================
-- Handwritten Notes/Prescriptions Schema
-- For tablet/stylus input support
-- ================================================

-- Create note type enum
CREATE TYPE handwritten_note_type AS ENUM (
  'prescription',
  'clinical_note',
  'diagram',
  'other'
);

-- Create handwritten notes table
CREATE TABLE handwritten_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id TEXT NOT NULL, -- References users.id (Clerk user ID)
  
  -- Note Content
  note_type handwritten_note_type DEFAULT 'clinical_note',
  title TEXT,
  image_data TEXT NOT NULL, -- Base64 encoded PNG image
  stroke_data JSONB, -- JSON stroke data for reconstruction/editing
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_handwritten_notes_patient_id ON handwritten_notes(patient_id);
CREATE INDEX idx_handwritten_notes_appointment_id ON handwritten_notes(appointment_id);
CREATE INDEX idx_handwritten_notes_doctor_id ON handwritten_notes(doctor_id);
CREATE INDEX idx_handwritten_notes_type ON handwritten_notes(note_type);
CREATE INDEX idx_handwritten_notes_created_at ON handwritten_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE handwritten_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all notes (for now, refine as needed)
CREATE POLICY "Allow authenticated users to view handwritten notes"
  ON handwritten_notes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own notes
CREATE POLICY "Allow users to insert handwritten notes"
  ON handwritten_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update their own notes
CREATE POLICY "Allow users to update their own handwritten notes"
  ON handwritten_notes
  FOR UPDATE
  TO authenticated
  USING (doctor_id = (SELECT id FROM users WHERE email = current_user LIMIT 1))
  WITH CHECK (doctor_id = (SELECT id FROM users WHERE email = current_user LIMIT 1));

-- Policy: Users can delete their own notes
CREATE POLICY "Allow users to delete their own handwritten notes"
  ON handwritten_notes
  FOR DELETE
  TO authenticated
  USING (doctor_id = (SELECT id FROM users WHERE email = current_user LIMIT 1));

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_handwritten_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
CREATE TRIGGER handwritten_notes_updated_at_trigger
  BEFORE UPDATE ON handwritten_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_handwritten_notes_updated_at();

-- ================================================
-- Usage Notes:
-- ================================================
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. The image_data column stores base64 PNG data
-- 3. The stroke_data column stores the raw stroke
--    points for potential re-editing/reconstruction
-- 4. Palm rejection and stylus support is handled
--    on the client side in HandwritingCanvas.tsx
-- ================================================
