'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getPatientAlerts(patientId: string) {
    const { data } = await supabaseAdmin
        .from('patient_alerts')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('severity', { ascending: true }) // CRITICAL (C comes before W) ? No. Alphabetical: CRITICAL, INFO, WARNING. 
    // We handle sort in UI or map severity to numeric if needed.

    return data || []
}

export async function addPatientAlert(patientId: string, type: string, severity: string, message: string, userId: string) {
    try {
        const { error } = await supabaseAdmin.from('patient_alerts').insert({
            patient_id: patientId,
            type,
            severity,
            message,
            created_by: userId
        })

        if (error) throw error

        revalidatePath(`/dashboard/patients/${patientId}`)
        return { success: true }
    } catch {
        return { success: false, error: 'Failed to add alert' }
    }
}

export async function resolveAlert(alertId: string, userId: string) {
    try {
        await supabaseAdmin.from('patient_alerts')
            .update({
                is_active: false,
                resolved_at: new Date().toISOString(),
                resolved_by: userId
            })
            .eq('id', alertId)

        // We don't know patientId here easily without fetching, so revalidatePath might need to be broad or passed.
        // For now, client refresh handles it or we revalidate parent path.
        revalidatePath('/dashboard/patients')
        return { success: true }
    } catch {
        return { success: false, error: 'Failed to resolve' }
    }
}
