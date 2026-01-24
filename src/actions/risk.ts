'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function reportIncident(data: any) {
    try {
        const { error } = await supabaseAdmin.from('incident_reports').insert({
            type: data.type,
            description: data.description,
            severity: data.severity,
            reported_by: data.reportedBy, // Email or Name
            status: 'OPEN'
        })

        if (error) throw error

        revalidatePath('/dashboard/admin/risk')
        return { success: true }
    } catch {
        return { success: false, error: 'Failed' }
    }
}

export async function getIncidents() {
    const { data } = await supabaseAdmin.from('incident_reports').select('*').order('created_at', { ascending: false })
    return data || []
}

export async function closeIncident(id: string, capa: string, resolvedBy: string) {
    try {
        const { error } = await supabaseAdmin.from('incident_reports')
            .update({
                status: 'CLOSED',
                capa_action: capa,
                resolved_by: resolvedBy,
                resolved_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/admin/risk')
        return { success: true }
    } catch {
        return { success: false, error: 'Failed to close incident' }
    }
}
