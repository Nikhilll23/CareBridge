'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface VitalSignsData {
    patientId: string
    appointmentId?: string
    temperature?: number
    bloodPressureSystolic?: number
    bloodPressureDiastolic?: number
    heartRate?: number
    respiratoryRate?: number
    oxygenSaturation?: number
    weight?: number
    height?: number
    painScale?: number
    notes?: string
}

export interface VitalSigns extends VitalSignsData {
    id: string
    recordedBy: string
    isCritical: boolean
    recordedAt: string
    createdAt: string
    bmi?: number
}

// Critical value thresholds
const CRITICAL_THRESHOLDS = {
    temperature: { min: 35, max: 38.5 },
    bloodPressureSystolic: { min: 90, max: 180 },
    bloodPressureDiastolic: { min: 60, max: 110 },
    heartRate: { min: 50, max: 120 },
    respiratoryRate: { min: 12, max: 24 },
    oxygenSaturation: { min: 92 }
}

function checkCriticalVitals(vitals: VitalSignsData): { isCritical: boolean; alerts: string[] } {
    const alerts: string[] = []
    let isCritical = false

    if (vitals.temperature) {
        if (vitals.temperature < CRITICAL_THRESHOLDS.temperature.min) {
            alerts.push(`Hypothermia: Temperature ${vitals.temperature}°C (< ${CRITICAL_THRESHOLDS.temperature.min}°C)`)
            isCritical = true
        } else if (vitals.temperature > CRITICAL_THRESHOLDS.temperature.max) {
            alerts.push(`Fever: Temperature ${vitals.temperature}°C (> ${CRITICAL_THRESHOLDS.temperature.max}°C)`)
            isCritical = true
        }
    }

    if (vitals.bloodPressureSystolic) {
        if (vitals.bloodPressureSystolic < CRITICAL_THRESHOLDS.bloodPressureSystolic.min) {
            alerts.push(`Low BP: ${vitals.bloodPressureSystolic} mmHg (< ${CRITICAL_THRESHOLDS.bloodPressureSystolic.min})`)
            isCritical = true
        } else if (vitals.bloodPressureSystolic > CRITICAL_THRESHOLDS.bloodPressureSystolic.max) {
            alerts.push(`High BP: ${vitals.bloodPressureSystolic} mmHg (> ${CRITICAL_THRESHOLDS.bloodPressureSystolic.max})`)
            isCritical = true
        }
    }

    if (vitals.heartRate) {
        if (vitals.heartRate < CRITICAL_THRESHOLDS.heartRate.min) {
            alerts.push(`Bradycardia: ${vitals.heartRate} bpm (< ${CRITICAL_THRESHOLDS.heartRate.min})`)
            isCritical = true
        } else if (vitals.heartRate > CRITICAL_THRESHOLDS.heartRate.max) {
            alerts.push(`Tachycardia: ${vitals.heartRate} bpm (> ${CRITICAL_THRESHOLDS.heartRate.max})`)
            isCritical = true
        }
    }

    if (vitals.respiratoryRate) {
        if (vitals.respiratoryRate < CRITICAL_THRESHOLDS.respiratoryRate.min) {
            alerts.push(`Low RR: ${vitals.respiratoryRate} breaths/min (< ${CRITICAL_THRESHOLDS.respiratoryRate.min})`)
            isCritical = true
        } else if (vitals.respiratoryRate > CRITICAL_THRESHOLDS.respiratoryRate.max) {
            alerts.push(`High RR: ${vitals.respiratoryRate} breaths/min (> ${CRITICAL_THRESHOLDS.respiratoryRate.max})`)
            isCritical = true
        }
    }

    if (vitals.oxygenSaturation && vitals.oxygenSaturation < CRITICAL_THRESHOLDS.oxygenSaturation.min) {
        alerts.push(`Low O2: ${vitals.oxygenSaturation}% (< ${CRITICAL_THRESHOLDS.oxygenSaturation.min}%)`)
        isCritical = true
    }

    return { isCritical, alerts }
}

export async function recordVitalSigns(data: VitalSignsData) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        // Check for critical values
        const { isCritical, alerts } = checkCriticalVitals(data)

        // Insert vital signs
        const { data: vitalSigns, error } = await supabase
            .from('vital_signs')
            .insert({
                patient_id: data.patientId,
                appointment_id: data.appointmentId,
                recorded_by: user.id,
                temperature: data.temperature,
                blood_pressure_systolic: data.bloodPressureSystolic,
                blood_pressure_diastolic: data.bloodPressureDiastolic,
                heart_rate: data.heartRate,
                respiratory_rate: data.respiratoryRate,
                oxygen_saturation: data.oxygenSaturation,
                weight: data.weight,
                height: data.height,
                pain_scale: data.painScale,
                notes: data.notes,
                is_critical: isCritical
            })
            .select()
            .single()

        if (error) throw error

        // Create alerts if critical
        if (isCritical && alerts.length > 0) {
            const alertsData = alerts.map(alert => ({
                patient_id: data.patientId,
                alert_type: 'vital_signs',
                severity: 'critical',
                message: alert,
                is_acknowledged: false
            }))

            await supabase.from('nursing_alerts').insert(alertsData)
        }

        revalidatePath('/dashboard/nurse')
        return { success: true, data: vitalSigns, isCritical, alerts }
    } catch (error: any) {
        console.error('Error recording vital signs:', error)
        return { success: false, error: error.message }
    }
}

export async function getPatientVitalSigns(patientId: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('vital_signs')
            .select(`
                *,
                recorder:users!vital_signs_recorded_by_fkey(first_name, last_name)
            `)
            .eq('patient_id', patientId)
            .order('recorded_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching vital signs:', error)
        return { success: false, error: error.message }
    }
}

export async function getVitalSignsHistory(patientId: string, days: number = 7) {
    try {
        const supabase = await createClient()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { data, error } = await supabase
            .from('vital_signs')
            .select('*')
            .eq('patient_id', patientId)
            .gte('recorded_at', startDate.toISOString())
            .order('recorded_at', { ascending: true })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching vital signs history:', error)
        return { success: false, error: error.message }
    }
}

export async function getCriticalVitalSigns() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('vital_signs')
            .select(`
                *,
                patient:patients(first_name, last_name),
                recorder:users!vital_signs_recorded_by_fkey(first_name, last_name)
            `)
            .eq('is_critical', true)
            .order('recorded_at', { ascending: false })
            .limit(20)

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching critical vital signs:', error)
        return { success: false, error: error.message }
    }
}
