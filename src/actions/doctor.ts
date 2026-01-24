'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from './audit'

export async function getDoctorStats() {
    const user = await currentUser()
    if (!user) return null

    // Get current doctor's ID
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.emailAddresses[0]?.emailAddress)
        .single()

    if (!userData) return null
    const doctorId = userData.id

    // 1. My Queue (Scheduled)
    const { count: queueCount } = await supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .eq('status', 'SCHEDULED')

    // 2. Total Patients (Unique)
    // Optimization: Limiting to 1000 interactions to prevent timeouts. For accurate large-scale stats, consider an RPC function or a dedicated stats table.
    const { data: visits } = await supabaseAdmin
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorId)
        .limit(1000)

    const uniquePatients = new Set(visits?.map(v => v.patient_id)).size

    // 3. Pending Reports (Mock/Placeholder or real if table exists)
    // Assuming 'radiology_studies' has a status field, or just mock for now as requested
    const pendingReports = 3 // Placeholder

    return {
        queue: queueCount || 0,
        totalPatients: uniquePatients,
        pendingReports
    }
}

export async function getDoctorAppointments() {
    const user = await currentUser()
    if (!user) return []

    // Get current doctor's ID
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.emailAddresses[0]?.emailAddress)
        .single()

    if (!userData) return []
    const doctorId = userData.id

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: appointments } = await supabaseAdmin
        .from('appointments')
        .select(`
            *,
            patients (
                first_name,
                last_name,
                date_of_birth,
                gender
            )
        `)
        .eq('doctor_id', doctorId)
        .gte('appointment_date', today.toISOString())
        .order('appointment_date', { ascending: true })
        .limit(100) // Optimization: Limit to next 100 appointments

    return appointments || []
}

export async function updateConsultation(appointmentId: string, notes: string, prescriptionData?: any) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // 1. Update Appointment Notes & Status
        const { error: apptError } = await supabaseAdmin
            .from('appointments')
            .update({
                reason: notes, // Storing clinical notes in 'reason' or ideally a new column 'clinical_notes'
                status: 'COMPLETED'
            })
            .eq('id', appointmentId)

        if (apptError) throw apptError

        // 2. Create Prescription if provided
        if (prescriptionData) {
            const { error: rxError } = await supabaseAdmin
                .from('prescriptions')
                .insert({
                    appointment_id: appointmentId,
                    drug_name: prescriptionData.drugName,
                    dosage: prescriptionData.dosage,
                    frequency: prescriptionData.frequency,
                    duration: prescriptionData.duration,
                    instructions: prescriptionData.instructions
                })

            if (rxError) throw rxError

            if (rxError) throw rxError

            // Deduct inventory
            // We attempt to find the drug by name to deduct stock
            const { data: inventoryItem } = await supabaseAdmin
                .from('inventory')
                .select('id, stock_quantity')
                .eq('item_name', prescriptionData.drugName)
                .single()

            if (inventoryItem) {
                const newQuantity = inventoryItem.stock_quantity - 1 // Assuming 1 unit per prescription for simplicity or parse dosage
                // For MVP, we just deduct 1 unit or parse if possible. Let's just deduct 1 to show the flow.

                await supabaseAdmin
                    .from('inventory')
                    .update({ stock_quantity: Math.max(0, newQuantity) })
                    .eq('id', inventoryItem.id)

                // Log dispense (implied)
                await logAuditAction(
                    'DISPENSE_MEDICATION', // Reusing action name or creating new
                    'PHARMACY',
                    inventoryItem.id,
                    {
                        quantity: 1,
                        reason: 'Prescription Auto-Deduct',
                        appointmentId
                    }
                )
            }
        }

        // Log Audit
        await logAuditAction(
            'COMPLETE_CONSULTATION',
            'APPOINTMENTS',
            appointmentId,
            {
                notesLength: notes.length,
                prescriptionIssued: !!prescriptionData,
                completedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/doctor')
        return { success: true }
    } catch (error) {
        console.error('Consultation Error:', error)
        return { success: false, error: 'Failed to save consultation' }
    }
}
