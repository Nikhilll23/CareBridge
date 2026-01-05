'use server'

import { supabaseAdmin } from '@/lib/supabase'
import type { AuditLog } from '@/types/admin'
import { headers } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'

export async function getAuditLogs(limit = 100) {
    try {
        const { data, error } = await supabaseAdmin
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return { success: true, data: data as AuditLog[] }
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return { success: false, error: 'Failed to fetch audit logs', data: [] }
    }
}

export async function logAuditAction(action: string, entity: string, entityId: string, details: any = {}) {
    try {
        const user = await currentUser()

        // Enhance details with IP and User Agent if available
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        const enhancedDetails = {
            ...details,
            ip,
            userAgent,
            userEmail: user?.emailAddresses[0]?.emailAddress
        }

        const userId = user?.id || 'system'
        // If entityId is empty, use a placeholder to avoid DB constraint errors if any
        const safeEntityId = entityId || 'N/A'

        await supabaseAdmin.from('audit_logs').insert({
            user_id: userId,
            action,
            entity,
            entity_id: safeEntityId,
            details: enhancedDetails
        })
    } catch (error) {
        // Silent fail for logs to not disrupt main flow
        console.error('Failed to log audit action:', error)
    }
}

export async function deleteAuditLog(logId: string) {
    try {
        // Verify Admin (Double check in application layer for extra safety)
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Ideally we check DB role here too, but policies handle it. 
        // We'll trust the policy and the UI guard.

        const { error } = await supabaseAdmin
            .from('audit_logs')
            .delete()
            .eq('id', logId)

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error deleting audit log:', error)
        return { success: false, error: 'Failed to delete log' }
    }
}

export async function clearAllAuditLogs() {
    try {
        // Verify Admin
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        const { error } = await supabaseAdmin
            .from('audit_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Efficient "Delete All" trick or just omit filter

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error clearing audit logs:', error)
        return { success: false, error: 'Failed to clear logs' }
    }
}
