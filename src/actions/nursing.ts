'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Vitals ---

export async function recordVitals(data: { patientId: string, temp: number, bpSys: number, bpDia: number, hr: number, spo2: number, nurseId: string }) {
    try {
        // 1. Log Vitals
        const { error } = await supabaseAdmin.from('vitals_log').insert({
            patient_id: data.patientId,
            temperature: data.temp,
            bp_systolic: data.bpSys,
            bp_diastolic: data.bpDia,
            heart_rate: data.hr,
            spo2: data.spo2,
            nurse_id: data.nurseId
        })

        if (error) throw error

        // 2. Safety Trigger (The "Prompt 17" Logic)
        if (data.hr > 120 || data.spo2 < 90) {
            await supabaseAdmin.from('clinical_alerts').insert({
                patient_id: data.patientId,
                alert_type: 'VITALS_CRITICAL',
                message: `Critical Vitals: HR ${data.hr}, SpO2 ${data.spo2}%`,
                severity: 'CRITICAL',
                is_resolved: false
            })
            // In a real system, trigger SMS/Pager here
        }

        revalidatePath('/dashboard/nurse')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getPatientVitals(patientId: string) {
    const { data } = await supabaseAdmin
        .from('vitals_log')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: true })
        .limit(24) // Last 24 entries usually
    return data || []
}

// --- MAR (Medication Administration Record) ---

export async function getDueMeds(wardId: string) {
    // 1. Get Patients in Ward (Mock query, assuming relation or separate call)
    // For demo, we just get *all* prescriptions and filter by mock ward logic or just return all active.
    // In production: JOIN patients p ON p.id = pres.patient_id WHERE p.ward_id = wardId

    // We'll return active prescriptions.
    const { data } = await supabaseAdmin
        .from('prescriptions')
        .select('*, patients(first_name, last_name, uhid)')
        .eq('status', 'ACTIVE')
        .limit(20)

    return data || []
}

export async function administerMed(prescriptionId: string, patientId: string, status: 'GIVEN' | 'REFUSED', notes: string, nurseId: string) {
    try {
        await supabaseAdmin.from('mar_log').insert({
            prescription_id: prescriptionId,
            patient_id: patientId,
            status,
            notes,
            nurse_id: nurseId,
            administered_at: new Date().toISOString()
        })

        revalidatePath('/dashboard/nurse')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getMarHistory(patientId: string) {
    const { data } = await supabaseAdmin
        .from('mar_log')
        .select('*')
        .eq('patient_id', patientId)
        .order('administered_at', { ascending: false })
    return data || []
}

// --- Care Plans & Notes ---
export async function addNursingNote(data: any) {
    await supabaseAdmin.from('nursing_notes').insert(data)
    revalidatePath('/dashboard/nurse')
    return { success: true }
}

export async function getNotes(patientId: string) {
    const { data } = await supabaseAdmin.from('nursing_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
    return data || []
}
