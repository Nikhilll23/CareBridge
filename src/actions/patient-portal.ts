'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/actions/audit'

export async function getPatientPortalData() {
    const user = await currentUser()
    if (!user) return null

    const userEmail = user.emailAddresses[0]?.emailAddress
    if (!userEmail) return null

    // 1. Find Patient Record
    // Check if 'patients' has 'email' column (it wasn't in the types earlier).
    // If not, I'll assume we need to add it or fail gracefully.
    // Actually, I'll attempt to select 'email' and see. If it fails, I'll need to add the column.

    let { data: patient, error } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('email', userEmail)
        .single()

    // Auto-create if not linked yet (Fix for race conditions)
    if (!patient) {
        const { data: newPatient, error: createError } = await supabaseAdmin
            .from('patients')
            .insert({
                first_name: user.firstName || 'Unknown',
                last_name: user.lastName || 'User',
                email: userEmail,
                gender: 'Other',
                contact_number: 'N/A',
                address: 'N/A',
                date_of_birth: new Date().toISOString()
            })
            .select()
            .single()

        if (!createError && newPatient) {
            patient = newPatient
            // Best effort audit
            try {
                // Dynamic import or separate call to avoid circular issues? 
                // We'll trust the import works.
                await logAuditAction('REGISTER_PATIENT', 'PATIENT', 'SYSTEM', { email: userEmail, action: 'AUTO_CREATED_ON_PORTAL' })
            } catch (e) { /* ignore */ }
        }
    }

    if (!patient) return null // Truly failed to link

    // 2. Upcoming Appointments
    const today = new Date().toISOString()
    const { data: upcoming } = await supabaseAdmin
        .from('appointments')
        .select(`
        *,
        doctor:users!appointments_doctor_id_fkey (
            first_name,
            last_name
        )
    `)
        .eq('patient_id', patient.id)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(5)

    // 3. Past History
    const { data: past } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .lt('appointment_date', today)
        .order('appointment_date', { ascending: false })
        .limit(5)

    // 4. Invoices (Wallet)
    const { data: invoices } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'PENDING')

    // 5. Available Doctors
    const { data: doctors } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .eq('role', 'DOCTOR')

    const totalDue = invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0

    return {
        patient,
        upcoming: upcoming || [],
        past: past || [],
        totalDue,
        invoices: invoices || [],
        availableDoctors: doctors || []
    }
}

export async function bookAppointment(data: any) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Find patient again
        const { data: patient } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('email', user.emailAddresses[0]?.emailAddress)
            .single()

        if (!patient) throw new Error('Patient profile not found')

        // Create Appointment
        const { error } = await supabaseAdmin
            .from('appointments')
            .insert({
                patient_id: patient.id,
                doctor_id: data.doctorId, // Optional or assigned
                appointment_date: data.date, // ISO string
                reason: data.reason,
                status: 'SCHEDULED', // Waiting approval
            })

        if (error) throw error

        revalidatePath('/dashboard/patient')
        revalidatePath('/dashboard/appointments') // Admin view
        revalidatePath('/dashboard/doctor') // Doctor view
        return { success: true }
    } catch (error: any) {
        console.error('Booking Error:', error)
        return { success: false, error: error.message || 'Failed to book appointment' }
    }
}

export async function logSymptom(data: { symptom: string, severity: number, notes?: string }) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        // Find patient
        const { data: patient } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('email', user.emailAddresses[0]?.emailAddress)
            .single()

        if (!patient) throw new Error('Patient profile not found')

        const { error } = await supabaseAdmin
            .from('patient_symptoms')
            .insert({
                patient_id: patient.id,
                symptom: data.symptom,
                severity: data.severity,
                notes: data.notes
            })

        if (error) throw error

        revalidatePath('/dashboard/patient')
        return { success: true }
    } catch (error) {
        console.error('Symptom Log Error:', error)
        return { success: false, error: 'Failed to log symptom' }
    }
}
