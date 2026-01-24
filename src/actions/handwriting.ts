'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from './audit'

export interface HandwrittenNote {
    id: string
    patient_id: string
    appointment_id?: string
    doctor_id: string
    note_type: 'prescription' | 'clinical_note' | 'diagram' | 'other'
    image_data: string // Base64 PNG
    stroke_data: string // JSON for reconstruction
    title?: string
    created_at: string
    updated_at: string
}

/**
 * Save a handwritten note/prescription
 */
export async function saveHandwrittenNote(data: {
    patientId: string
    appointmentId?: string
    noteType: 'prescription' | 'clinical_note' | 'diagram' | 'other'
    imageData: string
    strokeData: string
    title?: string
}) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        // Get doctor's internal ID
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', user.emailAddresses[0]?.emailAddress)
            .single()

        if (!userData) return { success: false, error: 'User not found' }

        const { data: note, error } = await supabaseAdmin
            .from('handwritten_notes')
            .insert({
                patient_id: data.patientId,
                appointment_id: data.appointmentId || null,
                doctor_id: userData.id,
                note_type: data.noteType,
                image_data: data.imageData,
                stroke_data: data.strokeData,
                title: data.title || `${data.noteType} - ${new Date().toLocaleDateString()}`
            })
            .select()
            .single()

        if (error) throw error

        // Log audit action
        await logAuditAction(
            'CREATE_HANDWRITTEN_NOTE',
            'CLINICAL',
            note.id,
            {
                patientId: data.patientId,
                appointmentId: data.appointmentId,
                noteType: data.noteType,
                createdBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/doctor')
        return { success: true, data: note }
    } catch (error) {
        console.error('Save Handwritten Note Error:', error)
        return { success: false, error: 'Failed to save handwritten note' }
    }
}

/**
 * Update an existing handwritten note
 */
export async function updateHandwrittenNote(
    noteId: string,
    data: {
        imageData: string
        strokeData: string
        title?: string
    }
) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { data: note, error } = await supabaseAdmin
            .from('handwritten_notes')
            .update({
                image_data: data.imageData,
                stroke_data: data.strokeData,
                title: data.title,
                updated_at: new Date().toISOString()
            })
            .eq('id', noteId)
            .select()
            .single()

        if (error) throw error

        // Log audit action
        await logAuditAction(
            'UPDATE_HANDWRITTEN_NOTE',
            'CLINICAL',
            noteId,
            {
                updatedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/doctor')
        return { success: true, data: note }
    } catch (error) {
        console.error('Update Handwritten Note Error:', error)
        return { success: false, error: 'Failed to update handwritten note' }
    }
}

/**
 * Get handwritten notes for a patient
 */
export async function getPatientHandwrittenNotes(patientId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('handwritten_notes')
            .select(`
                *,
                users:doctor_id (
                    first_name,
                    last_name
                )
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error) {
        console.error('Get Patient Notes Error:', error)
        return { success: false, error: 'Failed to fetch notes', data: [] }
    }
}

/**
 * Get handwritten notes for an appointment
 */
export async function getAppointmentHandwrittenNotes(appointmentId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('handwritten_notes')
            .select(`
                *,
                users:doctor_id (
                    first_name,
                    last_name
                )
            `)
            .eq('appointment_id', appointmentId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error) {
        console.error('Get Appointment Notes Error:', error)
        return { success: false, error: 'Failed to fetch notes', data: [] }
    }
}

/**
 * Get a single handwritten note by ID
 */
export async function getHandwrittenNote(noteId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('handwritten_notes')
            .select(`
                *,
                users:doctor_id (
                    first_name,
                    last_name
                ),
                patients:patient_id (
                    first_name,
                    last_name
                )
            `)
            .eq('id', noteId)
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (error) {
        console.error('Get Handwritten Note Error:', error)
        return { success: false, error: 'Failed to fetch note', data: null }
    }
}

/**
 * Delete a handwritten note
 */
export async function deleteHandwrittenNote(noteId: string) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { error } = await supabaseAdmin
            .from('handwritten_notes')
            .delete()
            .eq('id', noteId)

        if (error) throw error

        // Log audit action
        await logAuditAction(
            'DELETE_HANDWRITTEN_NOTE',
            'CLINICAL',
            noteId,
            {
                deletedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/doctor')
        return { success: true }
    } catch (error) {
        console.error('Delete Handwritten Note Error:', error)
        return { success: false, error: 'Failed to delete note' }
    }
}

/**
 * Get all handwritten notes by the current doctor
 */
export async function getDoctorHandwrittenNotes(limit = 50) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized', data: [] }

        // Get doctor's internal ID
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', user.emailAddresses[0]?.emailAddress)
            .single()

        if (!userData) return { success: false, error: 'User not found', data: [] }

        const { data, error } = await supabaseAdmin
            .from('handwritten_notes')
            .select(`
                *,
                patients:patient_id (
                    first_name,
                    last_name
                ),
                appointments:appointment_id (
                    appointment_date,
                    reason
                )
            `)
            .eq('doctor_id', userData.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error) {
        console.error('Get Doctor Notes Error:', error)
        return { success: false, error: 'Failed to fetch notes', data: [] }
    }
}
