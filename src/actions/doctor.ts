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
                reason: notes,
                status: 'COMPLETED'
            })
            .eq('id', appointmentId)

        if (apptError) throw apptError

        // 2. Get patient_id once
        const { data: apptData } = await supabaseAdmin
            .from('appointments')
            .select('patient_id')
            .eq('id', appointmentId)
            .single()

        const patientId = apptData?.patient_id

        // 3. Handle prescriptions — supports both single object and array
        const medicines: any[] = prescriptionData
            ? Array.isArray(prescriptionData) ? prescriptionData : [prescriptionData]
            : []

        for (const med of medicines) {
            if (!med.drugName) continue

            const { error: rxError } = await supabaseAdmin
                .from('prescriptions')
                .insert({
                    appointment_id: appointmentId,
                    patient_id: patientId,
                    drug_name: med.drugName,
                    dosage: med.dosage || '',
                    frequency: med.frequency || '',
                    duration: med.duration || '',
                    instructions: med.instructions || ''
                })

            if (rxError) {
                console.warn('Prescription insert error:', rxError)
                throw rxError
            }

            // Deduct from pharmacy_inventory by drug_name
            const { data: inventoryItem } = await supabaseAdmin
                .from('pharmacy_inventory')
                .select('id, quantity, price_per_unit')
                .eq('drug_name', med.drugName)
                .order('expiry_date', { ascending: true })
                .limit(1)
                .single()

            if (inventoryItem) {
                await supabaseAdmin
                    .from('pharmacy_inventory')
                    .update({ quantity: Math.max(0, inventoryItem.quantity - 1) })
                    .eq('id', inventoryItem.id)
            }

            // Add to patient's pharmacy cart
            if (patientId) {
                await supabaseAdmin
                    .from('pharmacy_cart_items')
                    .insert({
                        patient_id: patientId,
                        medicine_id: inventoryItem?.id || null,
                        medicine_name: med.drugName,
                        price: inventoryItem?.price_per_unit || 0,
                        quantity: 1,
                        status: 'PENDING'
                    })
            }
        }

        // Log Audit
        await logAuditAction(
            'COMPLETE_CONSULTATION',
            'APPOINTMENTS',
            appointmentId,
            {
                notesLength: notes.length,
                prescriptionIssued: medicines.length > 0,
                medicinesCount: medicines.length,
                completedBy: user.emailAddresses[0]?.emailAddress
            }
        )

        revalidatePath('/dashboard/doctor')
        revalidatePath('/dashboard/patient')
        return { success: true }
    } catch (error) {
        console.warn('Consultation Error:', error)
        return { success: false, error: 'Failed to save consultation' }
    }
}
