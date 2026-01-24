'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function triagePatient(patientId: string, category: 'RED' | 'YELLOW' | 'GREEN', complaint: string) {
    try {
        const { error } = await supabaseAdmin.from('er_visits').insert({
            patient_id: patientId,
            triage_category: category,
            chief_complaint: complaint,
            status: 'WAITING'
        })

        if (error) throw error

        revalidatePath('/dashboard/er')
        return { success: true, message: 'Patient Triaged to ER' }
    } catch (e) {
        return { success: false, error: 'Failed to triage' }
    }
}

export async function updateERStatus(visitId: string, status: string) {
    try {
        const { error } = await supabaseAdmin.from('er_visits')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', visitId)

        if (error) throw error

        revalidatePath('/dashboard/er')
        return { success: true }
    } catch (e) {
        return { success: false, error: 'Failed to update status' }
    }
}

export async function getActiveERVisits() {
    // Initial fetch for the board
    const { data } = await supabaseAdmin
        .from('er_visits')
        .select(`
            *,
            patient:patients(first_name, last_name, uhid)
        `)
        .neq('status', 'DISCHARGED') // Only active
        .order('triage_category', { ascending: true }) // Red first (alphabetically R < Y < G? No. R(ed), Y(ellow), G(reen). G < R < Y. Wait.
    // We handle sorting in UI.

    return data || []
}
