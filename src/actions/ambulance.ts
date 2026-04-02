'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from './audit'
import { currentUser } from '@clerk/nextjs/server'

export async function updateAmbulanceStatus(id: string, status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE') {
    try {
        const user = await currentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check permissions (Admin only)
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || userData.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can update ambulance status' }
        }

        const { error } = await supabaseAdmin
            .from('ambulances')
            .update({ status })
            .eq('id', id)

        if (error) throw error

        await logAuditAction(
            'UPDATE_AMBULANCE_STATUS',
            'AMBULANCE',
            id,
            {
                newStatus: status,
                updatedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/admin/map')
        return { success: true }
    } catch (error) {
        console.warn('Error updating ambulance:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

export async function deleteAmbulance(id: string) {
    try {
        const user = await currentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check permissions (Admin only)
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || userData.role !== 'ADMIN') {
            return { success: false, error: 'Only admins can delete ambulances' }
        }

        const { error } = await supabaseAdmin
            .from('ambulances')
            .delete()
            .eq('id', id)

        if (error) throw error

        await logAuditAction(
            'DELETE_AMBULANCE',
            'AMBULANCE',
            id,
            {
                deletedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/admin/map')
        return { success: true }
    } catch (error) {
        console.warn('Error deleting ambulance:', error)
        return { success: false, error: 'Failed to delete ambulance' }
    }
}
