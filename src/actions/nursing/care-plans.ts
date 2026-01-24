'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CarePlanData {
    patientId: string
    diagnosis: string
    goals: string
    interventions: string
    startDate: string
    endDate?: string
}

export async function createCarePlan(data: CarePlanData) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data: carePlan, error } = await supabase
            .from('care_plans')
            .insert({
                patient_id: data.patientId,
                created_by: user.id,
                diagnosis: data.diagnosis,
                goals: data.goals,
                interventions: data.interventions,
                start_date: data.startDate,
                end_date: data.endDate,
                status: 'active'
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: carePlan }
    } catch (error: any) {
        console.error('Error creating care plan:', error)
        return { success: false, error: error.message }
    }
}

export async function getPatientCarePlans(patientId: string) {
    try {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('care_plans')
            .select(`
                *,
                creator:users!care_plans_created_by_fkey(first_name, last_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching care plans:', error)
        return { success: false, error: error.message }
    }
}

export async function updateCarePlan(id: string, data: Partial<CarePlanData>) {
    try {
        const supabase = createClient()

        const { data: carePlan, error } = await supabase
            .from('care_plans')
            .update({
                diagnosis: data.diagnosis,
                goals: data.goals,
                interventions: data.interventions,
                end_date: data.endDate,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: carePlan }
    } catch (error: any) {
        console.error('Error updating care plan:', error)
        return { success: false, error: error.message }
    }
}

export async function discontinueCarePlan(id: string, reason: string) {
    try {
        const supabase = createClient()

        const { data: carePlan, error } = await supabase
            .from('care_plans')
            .update({
                status: 'discontinued',
                interventions: `${reason}\n\nPrevious interventions:\n`,
                end_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: carePlan }
    } catch (error: any) {
        console.error('Error discontinuing care plan:', error)
        return { success: false, error: error.message }
    }
}

export async function completeCarePlan(id: string) {
    try {
        const supabase = createClient()

        const { data: carePlan, error } = await supabase
            .from('care_plans')
            .update({
                status: 'completed',
                end_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: carePlan }
    } catch (error: any) {
        console.error('Error completing care plan:', error)
        return { success: false, error: error.message }
    }
}

export async function getActiveCarePlans() {
    try {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('care_plans')
            .select(`
                *,
                patient:patients(first_name, last_name),
                creator:users!care_plans_created_by_fkey(first_name, last_name)
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching active care plans:', error)
        return { success: false, error: error.message }
    }
}
