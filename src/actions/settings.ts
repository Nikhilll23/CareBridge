'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function updateUserProfile(userId: string, data: { first_name: string, last_name: string, phone: string }) {
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                first_name: data.first_name,
                last_name: data.last_name,
                phone: data.phone
            })
            .eq('id', userId)

        if (error) throw error
        revalidatePath('/dashboard/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating profile:', error)
        return { success: false, error: 'Failed' }
    }
}

// Mock notification settings for now since DB table might not exist
// In a real app we'd have a user_settings table
export async function updateNotificationSettings(userId: string, settings: any) {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true }
}
