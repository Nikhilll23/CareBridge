'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ShiftHandoverData {
    shiftDate: string
    shiftType: 'morning' | 'afternoon' | 'night'
    incomingNurse?: string
    patientId: string
    summary: string
    criticalItems?: string
    pendingTasks?: string
}

import { auth } from '@clerk/nextjs/server'

// ... existing imports

export async function createShiftHandover(data: ShiftHandoverData) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return { success: false, error: 'Not authenticated' }
        }

        const supabase = await createClient()

        const { data: handover, error } = await supabase
            .from('shift_handovers')
            .insert({
                shift_date: data.shiftDate,
                shift_type: data.shiftType,
                outgoing_nurse: userId,
                incoming_nurse: data.incomingNurse,
                patient_id: data.patientId,
                summary: data.summary,
                critical_items: data.criticalItems,
                pending_tasks: data.pendingTasks
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: handover }
    } catch (error: any) {
        console.error('Error creating shift handover:', error)
        return { success: false, error: error.message }
    }
}

export async function getShiftHandovers(date: string, shift?: string) {
    try {
        const supabase = await createClient()

        let query = supabase
            .from('shift_handovers')
            .select(`
                *,
                patient:patients(first_name, last_name),
                outgoing:users!shift_handovers_outgoing_nurse_fkey(first_name, last_name),
                incoming:users!shift_handovers_incoming_nurse_fkey(first_name, last_name)
            `)
            .eq('shift_date', date)

        if (shift) {
            query = query.eq('shift_type', shift)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching shift handovers:', error)
        return { success: false, error: error.message }
    }
}

export async function getPatientHandoverHistory(patientId: string, limit: number = 10) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('shift_handovers')
            .select(`
                *,
                outgoing:users!shift_handovers_outgoing_nurse_fkey(first_name, last_name),
                incoming:users!shift_handovers_incoming_nurse_fkey(first_name, last_name)
            `)
            .eq('patient_id', patientId)
            .order('shift_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching patient handover history:', error)
        return { success: false, error: error.message }
    }
}

export async function getTodaysHandovers() {
    try {
        const supabase = await createClient()
        const today = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('shift_handovers')
            .select(`
                *,
                patient:patients(first_name, last_name),
                outgoing:users!shift_handovers_outgoing_nurse_fkey(first_name, last_name),
                incoming:users!shift_handovers_incoming_nurse_fkey(first_name, last_name)
            `)
            .eq('shift_date', today)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching today\'s handovers:', error)
        return { success: false, error: error.message }
    }
}
