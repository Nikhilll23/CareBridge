'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { logAuditAction } from './audit'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function deleteUser(userId: string) {
    try {
        // Verify Admin
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Fetch user details first for logging
        const { data: targetUser } = await supabaseAdmin.from('users').select('email, role').eq('id', userId).single()

        // Delete from DB
        const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)

        if (error) throw error

        // Log Audit
        await logAuditAction(
            'DELETE_USER',
            'STAFF',
            userId,
            {
                deletedUserEmail: targetUser?.email,
                deletedUserRole: targetUser?.role,
                performedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/admin/staff')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}
