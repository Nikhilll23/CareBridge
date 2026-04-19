'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/actions/audit'

export async function getPatientPortalData() {
    try {
    const user = await currentUser()
    if (!user) return { error: 'Not authenticated with Clerk' }

    const userEmail = user.emailAddresses[0]?.emailAddress
    if (!userEmail) return { error: 'Clerk email address not found' }

    console.log('[Portal] Fetching data for email:', userEmail)

    const { data: patients, error: patientsError } = await supabaseAdmin
        .from('patients')
        .select('*')
        .ilike('email', userEmail)
        .order('created_at', { ascending: true })

    if (patientsError) {
        console.error('[Portal] Supabase patients fetch error:', patientsError)
        return { error: `Database error: ${patientsError.message}` }
    }

    console.log(`[Portal] Lookup for ${userEmail} found ${patients?.length || 0} records`)

    const patient = patients?.[0] || null

    if (!patient) {
        console.warn('[Portal] No patient found for email:', userEmail)
        // Check if user exists in 'users' table at least
        const { data: userRecord } = await supabaseAdmin.from('users').select('role').ilike('email', userEmail).single()
        console.log('[Portal] User record role:', userRecord?.role)
        
        return { error: 'Patient clinical record not found. Please contact hospital administration to register your profile.' }
    }

    const { data: allAppointmentsData } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('patient_id', patient.id)
        .order('appointment_date', { ascending: false })

    const doctorIds = new Set<string>()
    allAppointmentsData?.forEach(a => { if (a.doctor_id) doctorIds.add(a.doctor_id) })

    const { data: doctorsMap } = doctorIds.size > 0 ? await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', Array.from(doctorIds)) : { data: [] }

    const enhanceAppointment = (appt: any) => {
        const doc = doctorsMap?.find((d: any) => d.id === appt.doctor_id)
        return { ...appt, doctor: doc }
    }

    const allAppointments = allAppointmentsData?.map(enhanceAppointment) || []

    const { data: invoices } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('status', 'PENDING')

    const { data: doctors } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .eq('role', 'DOCTOR')
        .not('id', 'in', '(user_doctor1_sample,user_doctor2_sample,user_doctor3_sample,user_doctor4_sample,user_doctor5_sample)')

    const { data: prescriptions, error: rxError } = await supabaseAdmin
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

    if (rxError) console.warn('[Portal] prescriptions error:', rxError.message)
    console.log('[Portal] patient.id:', patient.id, '| prescriptions found:', prescriptions?.length, prescriptions?.map(p => p.drug_name))

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
        todaysAppointments: allAppointments,
        futureAppointments: [],
        past: [],
        totalDue,
        invoices: invoices || [],
        availableDoctors: doctors || [],
        prescriptions: prescriptions || [],
        medicalReports: medicalReports || [],
        handwrittenNotes: handwrittenNotes || []
    }
    } catch (err: any) {
        console.error('getPatientPortalData failed:', {
            message: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint
        })
        return { error: err.message || 'Database connection failed' }
    }
}

export async function bookAppointment(data: any) {
    try {
        const user = await currentUser()
        if (!user) throw new Error('Unauthorized')

        const userEmail = user.emailAddresses[0]?.emailAddress
        if (!userEmail) throw new Error('No email found')

        // Find patient record — no auto-create to prevent duplicates
        const { data: patientList } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('email', userEmail)
            .order('created_at', { ascending: true })
            .limit(1)

        const patient = patientList?.[0] || null
        if (!patient) throw new Error('Patient profile not found. Please contact hospital administration.')

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
        console.warn('Booking Error:', error)
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
        console.warn('Symptom Log Error:', error)
        return { success: false, error: 'Failed to log symptom' }
    }
}
