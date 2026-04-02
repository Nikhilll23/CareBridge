'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from './audit'
import { currentUser } from '@clerk/nextjs/server'

export async function getDutyRoster(date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    try {
        const { data, error } = await supabaseAdmin
            .from('duty_roster')
            .select(`
        *,
        staff:users(id, first_name, last_name, role)
      `)
            .gte('shift_date', startOfDay.toISOString())
            .lte('shift_date', endOfDay.toISOString())
            .order('shift_date', { ascending: true })

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error) {
        console.warn('Error fetching roster:', error)
        return { success: false, data: [] }
    }
}

export async function getRosterStats() {
    const now = new Date().toISOString()

    // Simple check for currently active shifts based on time of day
    // This is an approximation. In a real app we'd check strict shift times.

    try {
        const { count, error } = await supabaseAdmin
            .from('duty_roster')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ON_DUTY')
        // In reality we'd check if NOW is between start_time and end_time
        // For this MVP we rely on the status field

        if (error) throw error

        return { onDuty: count || 0 }
    } catch (error) {
        console.warn('Error fetching roster stats:', error)
        return { onDuty: 0 }
    }
}

export async function addToRoster(data: {
    staffId: string
    shiftType: string
    department: string
    date: Date
    startTime?: string
    endTime?: string
}) {
    try {
        const { error } = await supabaseAdmin
            .from('duty_roster')
            .insert({
                staff_id: data.staffId,
                shift_type: data.shiftType,
                department: data.department,
                shift_date: data.date.toISOString(),
                status: 'SCHEDULED',
                start_time: data.startTime,
                end_time: data.endTime
            })

        if (error) throw error

        // Log Audit
        const user = await currentUser()
        await logAuditAction(
            'ADD_TO_ROSTER',
            'ROSTER',
            'NEW_ENTRY', // No ID returned from insert in current code, fixing simplicity
            {
                staffId: data.staffId,
                shiftType: data.shiftType,
                date: data.date.toISOString(),
                assignedBy: user?.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/admin/roster')
        return { success: true }
    } catch (error) {
        console.warn('Error adding to roster:', error)
        return { success: false, error: 'Failed to schedule staff' }
    }
}

export async function deleteFromRoster(id: string) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        const { data: entry } = await supabaseAdmin.from('duty_roster').select('shift_date, shift_type').eq('id', id).single()

        const { error } = await supabaseAdmin
            .from('duty_roster')
            .delete()
            .eq('id', id)

        if (error) throw error

        await logAuditAction(
            'DELETE_SHIFT',
            'ROSTER',
            id,
            {
                shiftDate: entry?.shift_date,
                shiftType: entry?.shift_type,
                deletedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/admin/roster')
        return { success: true }
    } catch (error) {
        console.warn('Error removing from roster:', error)
        return { success: false, error: 'Failed to remove entry' }
    }
}
