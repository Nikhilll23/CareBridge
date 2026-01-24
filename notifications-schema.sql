-- Notifications System Schema
-- Run this in your Supabase SQL Editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, ERROR, APPOINTMENT, PATIENT, SYSTEM
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500), -- Optional link to navigate to
    metadata JSONB DEFAULT '{}', -- Additional data like appointment_id, patient_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Create user notification settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    appointment_reminders BOOLEAN DEFAULT TRUE,
    patient_updates BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid()::text = user_id::text OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'ADMIN'
    ));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_notification_settings
DROP POLICY IF EXISTS "Users can view own settings" ON user_notification_settings;
CREATE POLICY "Users can view own settings" ON user_notification_settings
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own settings" ON user_notification_settings;
CREATE POLICY "Users can update own settings" ON user_notification_settings
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_notification_settings;
CREATE POLICY "Users can insert own settings" ON user_notification_settings
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'INFO',
    p_link VARCHAR(500) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, link, metadata)
    VALUES (p_user_id, p_title, p_message, p_type, p_link, p_metadata)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample notifications for testing (optional)
-- DO $$
-- DECLARE
--     v_user_id UUID;
-- BEGIN
--     -- Get first admin user
--     SELECT id INTO v_user_id FROM users WHERE role = 'ADMIN' LIMIT 1;
--     
--     IF v_user_id IS NOT NULL THEN
--         PERFORM create_notification(v_user_id, 'Welcome to HIS Core', 'Your hospital information system is ready to use.', 'SUCCESS', '/dashboard');
--         PERFORM create_notification(v_user_id, 'New Appointment', 'A new appointment has been scheduled for today.', 'APPOINTMENT', '/dashboard/appointments');
--         PERFORM create_notification(v_user_id, 'System Update', 'The system will undergo maintenance tonight at 2 AM.', 'SYSTEM', NULL);
--         PERFORM create_notification(v_user_id, 'Patient Admitted', 'John Doe has been admitted to Ward A.', 'PATIENT', '/dashboard/patients');
--     END IF;
-- END $$;

SELECT 'Notifications schema created successfully!' as status;
