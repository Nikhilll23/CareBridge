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

        const supabase = await createClient()

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

        const supabase = await createClient()
        let query = supabase
            .from('referrals')
            .select(`
                *,
                patient:patients(first_name, last_name)
            `)
            .order('created_at', { ascending: false })

        if (role === 'PATIENT') {
            const { data: patient } = await supabase.from('patients').select('id').eq('email', user.emailAddresses[0]?.emailAddress).single()
            if (patient) {
                query = query.eq('patient_id', patient.id)
            } else {
                return { success: false, error: 'Patient profile not found' }
            }
        } else if (role === 'DOCTOR') {
            query = query.or(`referring_doctor_id.eq.${user.id},target_doctor_id.eq.${user.id}`)
        }

        const { data: referrals, error } = await query

        if (error) throw error

        // Manually fetch doctor details to avoid join/embedding issues
        if (referrals && referrals.length > 0) {
            const doctorIds = new Set<string>()
            referrals.forEach((ref: any) => {
                if (ref.referring_doctor_id) doctorIds.add(ref.referring_doctor_id)
                if (ref.target_doctor_id && !ref.target_doctor_id.startsWith('user_doc_')) doctorIds.add(ref.target_doctor_id)
            })

            if (doctorIds.size > 0) {
                const { data: doctors } = await supabase
                    .from('users')
                    .select('id, first_name, last_name')
                    .in('id', Array.from(doctorIds))

                if (doctors) {
                    const doctorMap = new Map(doctors.map((d: any) => [d.id, d]))

                    return {
                        success: true,
                        data: referrals.map((ref: any) => ({
                            ...ref,
                            referring_doctor: doctorMap.get(ref.referring_doctor_id) || null,
                            target_doctor: doctorMap.get(ref.target_doctor_id) || null
                        }))
                    }
                }
            }
        }

        return { success: true, data: referrals }
    } catch (error: any) {
        console.error('Get referrals error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateReferralStatus(id: string, status: ReferralStatus, notes?: string) {
    try {
        const supabase = await createClient()
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
    const supabase = await createClient()
    const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, specialization')
        .eq('role', 'DOCTOR')
        .eq('specialization', specialization)

    return data || []
}
