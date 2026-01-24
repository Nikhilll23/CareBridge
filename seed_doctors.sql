-- Insert Dummy Doctors with Specializations
-- Using explicit string IDs to mimic Clerk IDs
INSERT INTO users (id, email, first_name, last_name, role, specialization, created_at, updated_at) 
VALUES 
('user_doc_cardio', 'doctor.cardio@hospital.com', 'Sarah', 'Connor', 'DOCTOR', 'Cardiologist', NOW(), NOW()),
('user_doc_neuro', 'doctor.neuro@hospital.com', 'John', 'Shephard', 'DOCTOR', 'Neurologist', NOW(), NOW()),
('user_doc_ent', 'doctor.ent@hospital.com', 'Gregory', 'House', 'DOCTOR', 'ENT', NOW(), NOW()),
('user_doc_eye', 'doctor.eye@hospital.com', 'Stephen', 'Strange', 'DOCTOR', 'Ophthalmologist', NOW(), NOW()),
('user_doc_ortho', 'doctor.ortho@hospital.com', 'Leonard', 'McCoy', 'DOCTOR', 'Orthopedic', NOW(), NOW()),
('user_doc_derma', 'doctor.derma@hospital.com', 'Derek', 'Shepherd', 'DOCTOR', 'Dermatologist', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
