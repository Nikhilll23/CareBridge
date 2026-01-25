'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { auth } from '@clerk/nextjs/server'

export interface MedicationData {
    patientId: string
    medicationName: string
    dosage: string
    route: 'oral' | 'iv' | 'im' | 'sc' | 'topical' | 'inhalation'
    scheduledTime: string
    notes?: string
}

export async function scheduleMedication(data: MedicationData) {
    try {
        const { userId } = await auth()
        if (!userId) return { success: false, error: 'Not authenticated' }

        const supabase = await createClient()

        const { data: medication, error } = await supabase
            .from('medication_administration')
            .insert({
                patient_id: data.patientId,
                medication_name: data.medicationName,
                dosage: data.dosage,
                route: data.route,
                scheduled_time: data.scheduledTime,
                notes: data.notes,
                status: 'scheduled',
                // recorded_by: userId  <-- Add this if the table has such a column, otherwise existing schema is fine
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: medication }
    } catch (error: any) {
        console.error('Error scheduling medication:', error)
        return { success: false, error: error.message }
    }
}

export async function administerMedication(
    id: string,
    notes?: string
) {
    try {
        const { userId } = await auth()
        if (!userId) return { success: false, error: 'Not authenticated' }

        const supabase = await createClient()

        const { data: medication, error } = await supabase
            .from('medication_administration')
            .update({
                status: 'administered',
                administered_time: new Date().toISOString(),
                administered_by: userId,
                notes: notes
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: medication }
    } catch (error: any) {
        console.error('Error administering medication:', error)
        return { success: false, error: error.message }
    }
}

export async function updateMedicationStatus(
    id: string,
    status: 'missed' | 'refused' | 'held',
    reason: string
) {
    try {
        const { userId } = await auth()
        if (!userId) return { success: false, error: 'Not authenticated' }

        const supabase = await createClient()

        const { data: medication, error } = await supabase
            .from('medication_administration')
            .update({
                status,
                reason_not_given: reason,
                administered_by: userId,
                administered_time: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Create alert for missed/refused medications
        if (status === 'missed' || status === 'refused') {
            const { data: med } = await supabase
                .from('medication_administration')
                .select('patient_id, medication_name')
                .eq('id', id)
                .single()

            if (med) {
                await supabase.from('nursing_alerts').insert({
                    patient_id: med.patient_id,
                    alert_type: 'medication',
                    severity: status === 'refused' ? 'high' : 'medium',
                    message: `Medication ${status}: ${med.medication_name} - ${reason}`,
                    is_acknowledged: false
                })
            }
        }

        revalidatePath('/dashboard/nurse')
        return { success: true, data: medication }
    } catch (error: any) {
        console.error('Error updating medication status:', error)
        return { success: false, error: error.message }
    }
}

export async function getMedicationSchedule(patientId: string, date?: string) {
    try {
        const supabase = await createClient()
        const targetDate = date || new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('medication_administration')
            .select(`
                *,
                administrator:users!medication_administration_administered_by_fkey(first_name, last_name)
            `)
            .eq('patient_id', patientId)
            .gte('scheduled_time', `${targetDate}T00:00:00`)
            .lt('scheduled_time', `${targetDate}T23:59:59`)
            .order('scheduled_time', { ascending: true })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching medication schedule:', error)
        return { success: false, error: error.message }
    }
}

export async function getPendingMedications() {
    try {
        const supabase = await createClient()
        const now = new Date().toISOString()

        const { data, error } = await supabase
            .from('medication_administration')
            .select(`
                *,
                patient:patients(first_name, last_name)
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_time', now)
            .order('scheduled_time', { ascending: true })
            .limit(50)

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching pending medications:', error)
        return { success: false, error: error.message }
    }
}

export async function getTodaysMedications() {
    try {
        const supabase = await createClient()
        const today = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('medication_administration')
            .select(`
                *,
                patient:patients(first_name, last_name),
                administrator:users!medication_administration_administered_by_fkey(first_name, last_name)
            `)
            .gte('scheduled_time', `${today}T00:00:00`)
            .lt('scheduled_time', `${today}T23:59:59`)
            .order('scheduled_time', { ascending: true })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching today\'s medications:', error)
        return { success: false, error: error.message }
    }
}

export async function updateMedicationDetails(
    id: string,
    data: Partial<MedicationData>
) {
    try {
        const { userId } = await auth()
        if (!userId) return { success: false, error: 'Not authenticated' }

        const supabase = await createClient()

        // Construct update object
        const updates: any = {}
        if (data.medicationName) updates.medication_name = data.medicationName
        if (data.dosage) updates.dosage = data.dosage
        if (data.route) updates.route = data.route
        if (data.scheduledTime) updates.scheduled_time = data.scheduledTime
        if (data.notes) updates.notes = data.notes

        const { data: medication, error } = await supabase
            .from('medication_administration')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: medication }
    } catch (error: any) {
        console.error('Error updating medication details:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteMedication(id: string) {
    try {
        const { userId } = await auth()
        if (!userId) return { success: false, error: 'Not authenticated' }

        const supabase = await createClient()

        const { error } = await supabase
            .from('medication_administration')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting medication:', error)
        return { success: false, error: error.message }
    }
}
