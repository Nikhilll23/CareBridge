'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface NursingNoteData {
    patientId: string
    appointmentId?: string
    noteType: 'assessment' | 'progress' | 'incident' | 'discharge'
    title: string
    content: string
    isCritical?: boolean
}

export async function createNursingNote(data: NursingNoteData) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data: note, error } = await supabase
            .from('nursing_notes')
            .insert({
                patient_id: data.patientId,
                appointment_id: data.appointmentId,
                nurse_id: user.id,
                note_type: data.noteType,
                title: data.title,
                content: data.content,
                is_critical: data.isCritical || false
            })
            .select()
            .single()

        if (error) throw error

        // Create alert if critical
        if (data.isCritical) {
            await supabase.from('nursing_alerts').insert({
                patient_id: data.patientId,
                alert_type: 'general',
                severity: 'high',
                message: `Critical nursing note: ${data.title}`,
                is_acknowledged: false
            })
        }

        revalidatePath('/dashboard/nurse')
        return { success: true, data: note }
    } catch (error: any) {
        console.error('Error creating nursing note:', error)
        return { success: false, error: error.message }
    }
}

export async function getPatientNotes(patientId: string) {
    try {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('nursing_notes')
            .select(`
                *,
                nurse:users!nursing_notes_nurse_id_fkey(first_name, last_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching nursing notes:', error)
        return { success: false, error: error.message }
    }
}

export async function updateNursingNote(id: string, data: Partial<NursingNoteData>) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data: note, error } = await supabase
            .from('nursing_notes')
            .update({
                title: data.title,
                content: data.content,
                note_type: data.noteType,
                is_critical: data.isCritical,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('nurse_id', user.id) // Only allow updating own notes
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true, data: note }
    } catch (error: any) {
        console.error('Error updating nursing note:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteNursingNote(id: string) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { error } = await supabase
            .from('nursing_notes')
            .delete()
            .eq('id', id)
            .eq('nurse_id', user.id) // Only allow deleting own notes

        if (error) throw error

        revalidatePath('/dashboard/nurse')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting nursing note:', error)
        return { success: false, error: error.message }
    }
}

export async function getRecentNotes(limit: number = 10) {
    try {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('nursing_notes')
            .select(`
                *,
                patient:patients(first_name, last_name),
                nurse:users!nursing_notes_nurse_id_fkey(first_name, last_name)
            `)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching recent notes:', error)
        return { success: false, error: error.message }
    }
}
