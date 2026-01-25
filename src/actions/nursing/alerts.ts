'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { auth } from '@clerk/nextjs/server'

export interface AlertData {
    patientId: string
    alertType: 'vital_signs' | 'medication' | 'lab_result' | 'general'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
}

export async function createAlert(data: AlertData) {
    try {
        const supabase = await createClient()

        const { data: alert, error } = await supabase
            .from('nursing_alerts')
            .insert({
                patient_id: data.patientId,
                alert_type: data.alertType,
                severity: data.severity,
                message: data.message,
                is_acknowledged: false
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: alert }
    } catch (error: any) {
        console.error('Error creating alert:', error)
        return { success: false, error: error.message }
    }
}

export async function getActiveAlerts() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('nursing_alerts')
            .select(`
                *,
                patient:patients(first_name, last_name)
            `)
            .eq('is_acknowledged', false)
            .order('severity', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching active alerts:', error)
        return { success: false, error: error.message }
    }
}


// ... existing imports

export async function acknowledgeAlert(id: string) {
    try {
        const { userId } = await auth()
        if (!userId) return { success: false, error: 'Not authenticated' }

        const supabase = await createClient()

        const { data: alert, error } = await supabase
            .from('nursing_alerts')
            .update({
                is_acknowledged: true,
                acknowledged_by: userId,
                acknowledged_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: alert }
    } catch (error: any) {
        console.error('Error acknowledging alert:', error)
        return { success: false, error: error.message }
    }
}

export async function getPatientAlerts(patientId: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('nursing_alerts')
            .select(`
                *,
                acknowledger:users!nursing_alerts_acknowledged_by_fkey(first_name, last_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching patient alerts:', error)
        return { success: false, error: error.message }
    }
}

export async function getCriticalAlerts() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('nursing_alerts')
            .select(`
                *,
                patient:patients(first_name, last_name)
            `)
            .eq('is_acknowledged', false)
            .eq('severity', 'critical')
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching critical alerts:', error)
        return { success: false, error: error.message }
    }
}

export async function getAlertStats() {
    try {
        const supabase = await createClient()

        // Get counts by severity
        const { data: stats, error } = await supabase
            .from('nursing_alerts')
            .select('severity, is_acknowledged')
            .eq('is_acknowledged', false)

        if (error) throw error

        const counts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: 0
        }

        stats?.forEach(alert => {
            counts[alert.severity as keyof typeof counts]++
            counts.total++
        })

        return { success: true, data: counts }
    } catch (error: any) {
        console.error('Error fetching alert stats:', error)
        return { success: false, error: error.message }
    }
}
