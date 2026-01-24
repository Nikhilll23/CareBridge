'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getWardStatus() {
    const { data } = await supabaseAdmin.from('wards').select(`
        *,
        beds (
            *,
            admission:admissions(
                patient:patients(first_name, last_name, uhid)
            )
        )
    `).order('name')
    return data || []
}

export async function allocateBed(patientId: string, bedId: string) {
    // Transactional logic ideally
    try {
        // 1. Mark Bed Occupied
        const { error: bedError } = await supabaseAdmin
            .from('beds')
            .update({ status: 'OCCUPIED', current_admission_id: null }) // We use bed_allocations now, legacy field optional
            .eq('id', bedId)
            .eq('status', 'AVAILABLE') // Optimistic Lock

        if (bedError) return { success: false, error: 'Bed not available' }

        // 2. Create Allocation Record
        await supabaseAdmin.from('bed_allocations').insert({
            patient_id: patientId,
            bed_id: bedId,
            allocated_at: new Date().toISOString()
        })

        revalidatePath('/dashboard/beds')
        return { success: true }
    } catch (e) {
        return { success: false, error: 'Failed to allocate' }
    }
}

export async function dischargePatientFromBed(bedId: string, allocationId?: string) {
    try {
        // 1. Close Allocation
        // If allocationId provided use it, else find active one
        if (allocationId) {
            await supabaseAdmin.from('bed_allocations')
                .update({ discharged_at: new Date().toISOString() })
                .eq('id', allocationId)
        } else {
            // Heuristic: Close latest open allocation
            await supabaseAdmin.from('bed_allocations')
                .update({ discharged_at: new Date().toISOString() })
                .eq('bed_id', bedId)
                .is('discharged_at', null)
        }

        // 2. Mark Bed CLEANING (Not Available yet)
        await supabaseAdmin.from('beds')
            .update({ status: 'CLEANING' })
            .eq('id', bedId)

        revalidatePath('/dashboard/beds')
        return { success: true }
    } catch {
        return { success: false, error: 'Failed to discharge' }
    }
}

export async function markBedClean(bedId: string) {
    try {
        await supabaseAdmin.from('beds')
            .update({ status: 'AVAILABLE' })
            .eq('id', bedId)

        revalidatePath('/dashboard/beds')
        return { success: true }
    } catch {
        return { success: false, error: 'Failed to clean bed' }
    }
}
