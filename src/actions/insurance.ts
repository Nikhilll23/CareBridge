'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from './audit'
import { currentUser } from '@clerk/nextjs/server'

export interface InsuranceClaimData {
    patient_id: string
    provider_name: string
    policy_number: string
    diagnosis_code: string
    amount_claimed: number
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    notes?: string
}

export async function createClaim(data: InsuranceClaimData) {
    try {
        const { error } = await supabaseAdmin
            .from('insurance_claims')
            .insert({
                ...data,
                submission_date: new Date().toISOString()
            })

        if (error) throw error

        // Log Audit
        const user = await currentUser()
        await logAuditAction(
            'CREATE_CLAIM',
            'INSURANCE',
            'NEW_CLAIM', // No ID returned from insert unless selected, fixing simplicity
            {
                patientId: data.patient_id,
                amount: data.amount_claimed,
                provider: data.provider_name,
                createdBy: user?.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/admin/insurance')
        return { success: true }
    } catch (error) {
        console.error('Error creating claim:', error)
        return { success: false, error: 'Failed' }
    }
}

export async function updateClaim(id: string, data: Partial<InsuranceClaimData>) {
    try {
        const { error } = await supabaseAdmin
            .from('insurance_claims')
            .update({
                ...data,
                last_updated: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
        revalidatePath('/dashboard/admin/insurance')
        return { success: true }
    } catch (error) {
        console.error('Error updating claim:', error)
        return { success: false, error: 'Failed' }
    }
}

export async function deleteClaim(id: string) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        const { data: claim } = await supabaseAdmin.from('insurance_claims').select('policy_number, provider_name').eq('id', id).single()

        const { error } = await supabaseAdmin
            .from('insurance_claims')
            .delete()
            .eq('id', id)

        if (error) throw error

        await logAuditAction(
            'DELETE_CLAIM',
            'INSURANCE',
            id,
            {
                policyNumber: claim?.policy_number,
                providerName: claim?.provider_name,
                deletedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/admin/insurance')
        return { success: true }
    } catch (error) {
        console.error('Error deleting claim:', error)
        return { success: false, error: 'Failed' }
    }
}
