'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { logAuditAction } from './audit'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function deleteUser(userId: string) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        const { data: targetUser } = await supabaseAdmin.from('users').select('email, role').eq('id', userId).single()

        const { error } = await supabaseAdmin.from('users').delete().eq('id', userId)
        if (error) throw error

        await logAuditAction('DELETE_USER', 'STAFF', userId, {
            deletedUserEmail: targetUser?.email,
            deletedUserRole: targetUser?.role,
            performedBy: user.emailAddresses[0]?.emailAddress
        })

        revalidatePath('/dashboard/admin/staff')
        return { success: true }
    } catch (error) {
        console.warn('Error deleting user:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}

export async function createStaffUser(data: {
    firstName: string
    lastName: string
    email: string
    role: 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'ADMIN'
    phone?: string
    specialization?: string
    department?: string
}) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Check duplicate email
        const { data: existing } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', data.email)
            .single()

        if (existing) return { success: false, error: 'A user with this email already exists' }

        const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert({
                id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                role: data.role,
                phone: data.phone || null,
                specialization: data.specialization || null,
                department: data.department || null,
            })
            .select()
            .single()

        if (error) {
            console.warn('createStaffUser DB error:', error.message, error.details)
            return { success: false, error: error.message || 'Failed to create user' }
        }

        await logAuditAction('CREATE_USER', 'STAFF', newUser.id, {
            email: data.email,
            role: data.role,
            createdBy: user.emailAddresses[0]?.emailAddress
        })

        revalidatePath('/dashboard/admin/staff')
        return { success: true, data: newUser }
    } catch (error) {
        console.warn('Error creating user:', error)
        return { success: false, error: 'Failed to create user' }
    }
}

export async function updateStaffUser(userId: string, data: {
    firstName?: string
    lastName?: string
    phone?: string
    role?: string
    specialization?: string
    department?: string
}) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        const updates: any = {}
        if (data.firstName) updates.first_name = data.firstName
        if (data.lastName) updates.last_name = data.lastName
        if (data.phone !== undefined) updates.phone = data.phone
        if (data.role) updates.role = data.role
        if (data.specialization !== undefined) updates.specialization = data.specialization
        if (data.department !== undefined) updates.department = data.department

        const { error } = await supabaseAdmin.from('users').update(updates).eq('id', userId)
        if (error) throw error

        await logAuditAction('UPDATE_USER', 'STAFF', userId, {
            updatedFields: Object.keys(updates),
            updatedBy: user.emailAddresses[0]?.emailAddress
        })

        revalidatePath('/dashboard/admin/staff')
        return { success: true }
    } catch (error) {
        console.warn('Error updating user:', error)
        return { success: false, error: 'Failed to update user' }
    }
}

export async function broadcastNotification(data: {
    title: string
    message: string
    targetRoles: string[]
    type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'SYSTEM'
    link?: string
}) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Get all users with target roles
        const { data: targetUsers } = await supabaseAdmin
            .from('users')
            .select('id')
            .in('role', data.targetRoles)

        if (!targetUsers || targetUsers.length === 0) {
            return { success: false, error: 'No users found for selected roles' }
        }

        const notifications = targetUsers.map(u => ({
            user_id: u.id,
            title: data.title,
            message: data.message,
            type: data.type || 'SYSTEM',
            link: data.link || null,
            metadata: { broadcast: true, sentBy: user.emailAddresses[0]?.emailAddress }
        }))

        const { error } = await supabaseAdmin.from('notifications').insert(notifications)
        if (error) throw error

        await logAuditAction('BROADCAST_NOTIFICATION', 'SYSTEM', 'broadcast', {
            title: data.title,
            targetRoles: data.targetRoles,
            recipientCount: targetUsers.length,
            sentBy: user.emailAddresses[0]?.emailAddress
        })

        return { success: true, count: targetUsers.length }
    } catch (error) {
        console.warn('Error broadcasting notification:', error)
        return { success: false, error: 'Failed to send notification' }
    }
}
