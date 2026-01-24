'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server'

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'APPOINTMENT' | 'PATIENT' | 'SYSTEM'

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    type: NotificationType
    is_read: boolean
    link: string | null
    metadata: Record<string, any>
    created_at: string
    read_at: string | null
}

export interface NotificationSettings {
    id: string
    user_id: string
    email_notifications: boolean
    appointment_reminders: boolean
    patient_updates: boolean
    system_alerts: boolean
}

// Get current user's ID from Clerk and map to Supabase
async function getCurrentUserId(): Promise<string | null> {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    const { data } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', clerkUser.id)
        .single()

    return data?.id || null
}

// Get notifications for current user
export async function getNotifications(limit: number = 20): Promise<{ data: Notification[] | null; error: string | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return { data: [], error: null }
        }

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return { data: data as Notification[], error: null }
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return { data: null, error: 'Failed to fetch notifications' }
    }
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<number> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return 0

        const { count, error } = await supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false)

        if (error) throw error

        return count || 0
    } catch (error) {
        console.error('Error fetching unread count:', error)
        return 0
    }
}

// Mark a single notification as read
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return { success: false, error: 'Not authenticated' }
        }

        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('user_id', userId)

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return { success: false, error: 'Failed to mark as read' }
    }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_read', false)
            .select()

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true, count: data?.length || 0 }
    } catch (error) {
        console.error('Error marking all as read:', error)
        return { success: false, error: 'Failed to mark all as read' }
    }
}

// Delete a notification
export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return { success: false, error: 'Not authenticated' }
        }

        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId)

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting notification:', error)
        return { success: false, error: 'Failed to delete notification' }
    }
}

// Clear all notifications
export async function clearAllNotifications(): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return { success: false, error: 'Not authenticated' }
        }

        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('user_id', userId)

        if (error) throw error

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error clearing notifications:', error)
        return { success: false, error: 'Failed to clear notifications' }
    }
}

// Create a notification (for system use)
export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'INFO',
    link?: string,
    metadata?: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                link: link || null,
                metadata: metadata || {}
            })
            .select('id')
            .single()

        if (error) throw error

        return { success: true, id: data.id }
    } catch (error) {
        console.error('Error creating notification:', error)
        return { success: false, error: 'Failed to create notification' }
    }
}

// Create notification for multiple users
export async function createBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType = 'INFO',
    link?: string,
    metadata?: Record<string, any>
): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const notifications = userIds.map(userId => ({
            user_id: userId,
            title,
            message,
            type,
            link: link || null,
            metadata: metadata || {}
        }))

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)
            .select()

        if (error) throw error

        return { success: true, count: data?.length || 0 }
    } catch (error) {
        console.error('Error creating bulk notifications:', error)
        return { success: false, error: 'Failed to create notifications' }
    }
}

// Get notification settings
export async function getNotificationSettings(): Promise<{ data: NotificationSettings | null; error: string | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return { data: null, error: 'Not authenticated' }
        }

        const { data, error } = await supabaseAdmin
            .from('user_notification_settings')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found

        // Return default settings if none exist
        if (!data) {
            return {
                data: {
                    id: '',
                    user_id: userId,
                    email_notifications: true,
                    appointment_reminders: true,
                    patient_updates: true,
                    system_alerts: true
                },
                error: null
            }
        }

        return { data: data as NotificationSettings, error: null }
    } catch (error) {
        console.error('Error fetching notification settings:', error)
        return { data: null, error: 'Failed to fetch settings' }
    }
}

// Update notification settings
export async function updateNotificationSettings(settings: {
    email_notifications?: boolean
    appointment_reminders?: boolean
    patient_updates?: boolean
    system_alerts?: boolean
}): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return { success: false, error: 'Not authenticated' }
        }

        // Upsert settings
        const { error } = await supabaseAdmin
            .from('user_notification_settings')
            .upsert({
                user_id: userId,
                ...settings,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })

        if (error) throw error

        revalidatePath('/dashboard/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating notification settings:', error)
        return { success: false, error: 'Failed to update settings' }
    }
}

// Notify user about appointment (helper function)
export async function notifyAppointmentScheduled(
    userId: string,
    patientName: string,
    appointmentDate: string,
    appointmentId: string
): Promise<void> {
    await createNotification(
        userId,
        'New Appointment Scheduled',
        `Appointment scheduled with ${patientName} on ${appointmentDate}`,
        'APPOINTMENT',
        `/dashboard/appointments`,
        { appointment_id: appointmentId }
    )
}

// Notify user about patient update (helper function)
export async function notifyPatientUpdate(
    userId: string,
    patientName: string,
    updateType: string,
    patientId: string
): Promise<void> {
    await createNotification(
        userId,
        'Patient Update',
        `${patientName}: ${updateType}`,
        'PATIENT',
        `/dashboard/patients/${patientId}`,
        { patient_id: patientId }
    )
}
