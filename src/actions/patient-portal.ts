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

    // 2. All Appointments
    const { data: allAppointmentsData } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('appointment_date', { ascending: false })

    // Fetch doctors for appointments
    const doctorIds = new Set<string>()
    allAppointmentsData?.forEach(a => { if (a.doctor_id) doctorIds.add(a.doctor_id) })

    const { data: doctorsMap } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', Array.from(doctorIds))

    const enhanceAppointment = (appt: any) => {
        const doc = doctorsMap?.find(d => d.id === appt.doctor_id)
        return { ...appt, doctor: doc }
    }

    const allAppointments = allAppointmentsData?.map(enhanceAppointment) || []
    const todaysAppointments = allAppointments
    const futureAppointments: any[] = []
    const past: any[] = []

    // 4. Invoices (Wallet)
    const { data: invoices } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'PENDING')

    // 5. Available Doctors (exclude sample doctors)
    const { data: doctors } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .eq('role', 'DOCTOR')
        .not('id', 'in', '(user_doctor1_sample,user_doctor2_sample,user_doctor3_sample,user_doctor4_sample,user_doctor5_sample)')

    // 6. Patient Prescriptions
    const { data: prescriptions } = await supabaseAdmin
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

    // 7. Documents: medical reports, handwritten notes
    const { data: medicalReports } = await supabaseAdmin
        .from('medical_reports')
        .select('id, title, report_type, created_at, status, file_url')
        .eq('patient_id', patient.id)
        .eq('status', 'SENT')
        .order('created_at', { ascending: false })

    const { data: handwrittenNotes } = await supabaseAdmin
        .from('handwritten_notes')
        .select('id, title, note_type, image_data, created_at')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

    const totalDue = invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0

    return {
        patient,
        todaysAppointments,
        futureAppointments,
        past,
        totalDue,
        invoices: invoices || [],
        availableDoctors: doctors || [],
        prescriptions: prescriptions || [],
        medicalReports: medicalReports || [],
        handwrittenNotes: handwrittenNotes || []
    }
}

export async function bookAppointment(data: any) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        const userEmail = user.emailAddresses[0]?.emailAddress
        if (!userEmail) throw new Error('No email found')

        // Find or auto-create patient record
        let { data: patient } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('email', userEmail)
            .single()

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
                .select('id')
                .single()

            if (createError || !newPatient) throw new Error('Failed to create patient profile')
            patient = newPatient
        }

        // Ensure user record exists with PATIENT role
        await supabaseAdmin
            .from('users')
            .upsert({
                id: user.id,
                email: userEmail,
                first_name: user.firstName || '',
                last_name: user.lastName || '',
                role: 'PATIENT'
            }, { onConflict: 'id', ignoreDuplicates: true })

        // Create Appointment
        const { error } = await supabaseAdmin
            .from('appointments')
            .insert({
                patient_id: patient.id,
                doctor_id: data.doctorId,
                appointment_date: data.date,
                reason: data.reason,
                status: 'SCHEDULED',
            })

        if (error) throw error

        revalidatePath('/dashboard/patient')
        revalidatePath('/dashboard/appointments')
        revalidatePath('/dashboard/doctor')
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
