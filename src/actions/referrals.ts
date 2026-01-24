'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { currentUser } from '@clerk/nextjs/server'
import { Referral, ReferralStatus } from '@/types'

export async function createReferral(data: {
    patientId: string,
    targetSpecialization: string,
    reason: string,
    targetDoctorId?: string
}) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const supabase = createClient()

        // Check if user is patient or doctor
        const { data: userData } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', user.id)
            .single()

        if (!userData) return { success: false, error: 'User not found' }

        const referralData: any = {
            patient_id: data.patientId,
            target_specialization: data.targetSpecialization,
            reason: data.reason,
            status: 'REQUESTED'
        }

        if (userData.role === 'DOCTOR') {
            referralData.referring_doctor_id = user.id
        }

        if (data.targetDoctorId) {
            referralData.target_doctor_id = data.targetDoctorId
        }

        const { error } = await supabase
            .from('referrals')
            .insert(referralData)

        if (error) throw error

        revalidatePath('/dashboard/patient')
        revalidatePath('/dashboard/doctor')
        return { success: true }
    } catch (error: any) {
        console.error('Create referral error:', error)
        return { success: false, error: error.message }
    }
}

export async function getReferrals(role: 'PATIENT' | 'DOCTOR') {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const supabase = createClient()
        let query = supabase
            .from('referrals')
            .select(`
                *,
                patient:patients(first_name, last_name),
                referring_doctor:users!referrals_referring_doctor_id_fkey(first_name, last_name),
                target_doctor:users!referrals_target_doctor_id_fkey(first_name, last_name)
            `)
            .order('created_at', { ascending: false })

        if (role === 'PATIENT') {
            // Patient needs their ID from users table mapping? No, patient_id is usually separate or linked.
            // Assuming current user is the patient for now
            // Get patient ID
            const { data: patient } = await supabase.from('patients').select('id').eq('email', user.emailAddresses[0]?.emailAddress).single()
            if (patient) {
                query = query.eq('patient_id', patient.id)
            } else {
                return { success: false, error: 'Patient profile not found' }
            }
        } else if (role === 'DOCTOR') {
            // Doctors see referrals they made OR referrals sent to them
            // OR referrals for their specialization (if we had that logic, maybe pool)
            // For now: specific to them or created by them
            query = query.or(`referring_doctor_id.eq.${user.id},target_doctor_id.eq.${user.id}`)
        }

        const { data, error } = await query

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Get referrals error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateReferralStatus(id: string, status: ReferralStatus, notes?: string) {
    try {
        const supabase = createClient()
        const { error } = await supabase
            .from('referrals')
            .update({ status, notes, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/doctor')
        revalidatePath('/dashboard/patient')
        return { success: true }

    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getDoctorsBySpecialization(specialization: string) {
    const supabase = createClient()
    const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, specialization')
        .eq('role', 'DOCTOR')
        .eq('specialization', specialization)

    return data || []
}
