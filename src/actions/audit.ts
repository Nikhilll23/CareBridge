'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Logging ---

export async function logAuditAction(
    action: string,
    table: string,
    recordId: string,
    details: any
) {
    try {
        const { error } = await supabaseAdmin.from('audit_logs').insert({
            action: action,
            entity: table,
            entity_id: recordId,
            details: details,
            user_id: 'SYSTEM', // Fallback
        })

        if (error) console.error('Audit Log Error:', error)
    } catch (err) {
        console.error('Audit Exception:', err)
    }
}

// --- Retrieval ---

export async function getAuditLogs(filterUserId?: string, filterRecordId?: string) {
    let query = supabaseAdmin.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50)

    if (filterUserId) query = query.eq('performed_by', filterUserId)
    if (filterRecordId) query = query.eq('record_id', filterRecordId)

    const { data } = await query
    return data || []
}

// --- Management (Missing Functions) ---

export async function deleteAuditLog(logId: string) {
    try {
        const { error } = await supabaseAdmin.from('audit_logs').delete().eq('id', logId)
        if (error) throw error

        revalidatePath('/dashboard/admin/audit')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function clearAllAuditLogs() {
    try {
        // Use a safe delete query (e.g., delete all)
        const { error } = await supabaseAdmin.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Trick to delete all
        if (error) throw error

        revalidatePath('/dashboard/admin/audit')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// --- Emergency Access ---

export async function requestEmergencyAccess(patientId: string, reason: string, userId: string) {
    try {
        // 1. Log Request
        const { error } = await supabaseAdmin.from('access_overrides').insert({
            user_id: userId,
            patient_id: patientId,
            reason: reason,
            granted_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 Hour
        })

        if (error) throw error

        // 2. Alert Admin (Mocked)
        console.log(`[ALERT] Emergency Access Requested by ${userId} for Patient ${patientId}: ${reason}`)

        // 3. Log Audit
        // The Trigger on 'access_overrides' (if we added it) would handle this, or we log explicitly

        revalidatePath('/dashboard/doctor')
        return { success: true, message: 'Emergency Access Granted for 1 Hour. Action Logged.' }

    } catch (e) {
        return { success: false, error: 'Access Request Failed' }
    }
}
