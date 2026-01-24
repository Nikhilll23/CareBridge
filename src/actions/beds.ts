'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server'

export async function getWardStatus() {
    const { data } = await supabaseAdmin.from('wards').select(`
        *,
        beds (
            *
        )
    `).order('name')
    return data || []
}

// Get all patients for dropdown selection
export async function getPatientsForAllocation() {
    const { data } = await supabaseAdmin
        .from('patients')
        .select('id, first_name, last_name, uhid, contact_number')
        .order('first_name')

    return data || []
}

// Get patient's current bed allocation
export async function getPatientBedAllocation(patientEmail: string) {
    try {
        // First get patient ID from email
        const { data: patient } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('email', patientEmail)
            .single()

        if (!patient) return null

        // Get active bed allocation
        const { data: allocation } = await supabaseAdmin
            .from('bed_allocations')
            .select(`
                *,
                bed:beds (
                    id,
                    bed_number,
                    type,
                    ward:wards (
                        id,
                        name,
                        floor_number
                    )
                )
            `)
            .eq('patient_id', patient.id)
            .is('discharged_at', null)
            .single()

        return allocation
    } catch {
        return null
    }
}

export async function allocateBed(patientId: string, bedId: string) {
    // Check admin permission
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'ADMIN') {
        return { success: false, error: 'Only admins can allocate beds' }
    }

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
        revalidatePath('/dashboard/patient')
        return { success: true }
    } catch (e) {
        return { success: false, error: 'Failed to allocate' }
    }
}

export async function dischargePatientFromBed(bedId: string, allocationId?: string) {
    // Check admin permission
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'ADMIN') {
        return { success: false, error: 'Only admins can discharge patients' }
    }

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
        revalidatePath('/dashboard/patient')
        return { success: true }
    } catch {
        return { success: false, error: 'Failed to discharge' }
    }
}

export async function markBedClean(bedId: string) {
    // Check admin permission
    const user = await currentUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'ADMIN') {
        return { success: false, error: 'Only admins can mark beds as clean' }
    }

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
