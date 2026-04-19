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
            .update({ reason: notes, status: 'COMPLETED' })
            .eq('id', appointmentId)

        if (apptError) throw apptError

        // 2. Get patient_id from appointment
        const { data: apptData, error: apptFetchErr } = await supabaseAdmin
            .from('appointments')
            .select('patient_id')
            .eq('id', appointmentId)
            .single()

        if (apptFetchErr) console.warn('Failed to fetch appointment patient_id:', apptFetchErr.message)

        const patientId = apptData?.patient_id
        console.log('[Consultation] patientId:', patientId, '| appointmentId:', appointmentId)

        // 3. Handle prescriptions
        const medicines: any[] = prescriptionData
            ? Array.isArray(prescriptionData) ? prescriptionData : [prescriptionData]
            : []

        console.log('[Consultation] medicines count:', medicines.length, medicines.map(m => m.drugName))

        for (const med of medicines) {
            if (!med.drugName) continue

            // Save prescription
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
            if (rxError) console.warn('[Consultation] Prescription insert failed:', rxError.message, rxError.details)

            // Find inventory item
            const { data: inventoryItem, error: invLookupErr } = await supabaseAdmin
                .from('pharmacy_inventory')
                .select('id, quantity, price_per_unit')
                .ilike('drug_name', `%${med.drugName}%`)
                .limit(1)
                .maybeSingle()

            if (invLookupErr) console.warn('[Consultation] Inventory lookup failed:', invLookupErr.message)
            console.log('[Consultation] inventoryItem for', med.drugName, ':', inventoryItem?.id, '₹', inventoryItem?.price_per_unit)

            if (inventoryItem) {
                await supabaseAdmin
                    .from('pharmacy_inventory')
                    .update({ quantity: Math.max(0, inventoryItem.quantity - 1) })
                    .eq('id', inventoryItem.id)
            }

            // Add to cart
            if (patientId) {
                const { error: cartError } = await supabaseAdmin
                    .from('pharmacy_cart_items')
                    .insert({
                        patient_id: patientId,
                        medicine_id: inventoryItem?.id || null,
                        medicine_name: med.drugName,
                        price: inventoryItem?.price_per_unit || 0,
                        quantity: 1,
                        status: 'PENDING'
                    })
                if (cartError) {
                    console.warn('[Consultation] Cart insert FAILED:', cartError.message, cartError.details, cartError.hint)
                } else {
                    console.log('[Consultation] Cart insert SUCCESS for:', med.drugName)
                }
            } else {
                console.warn('[Consultation] No patientId — skipping cart insert')
            }
        }

        // Log Audit
        await logAuditAction('COMPLETE_CONSULTATION', 'APPOINTMENTS', appointmentId, {
            notesLength: notes.length,
            prescriptionIssued: medicines.length > 0,
            medicinesCount: medicines.length,
            completedBy: user.emailAddresses[0]?.emailAddress
        })

        revalidatePath('/dashboard/doctor')
        revalidatePath('/dashboard/patient')
        revalidatePath('/dashboard/patient/cart')

        // Auto-create consultation invoice
        if (patientId) {
            try {
                let invoiceId: string | null = null

                const { data: existingInvoice } = await supabaseAdmin
                    .from('invoices')
                    .select('id')
                    .eq('patient_id', patientId)
                    .eq('status', 'PENDING')
                    .maybeSingle()

                if (existingInvoice) {
                    invoiceId = existingInvoice.id
                } else {
                    const { data: newInvoice, error: invErr } = await supabaseAdmin
                        .from('invoices')
                        .insert({ patient_id: patientId, amount: 0, status: 'PENDING' })
                        .select('id')
                        .single()
                    if (invErr) console.warn('[Consultation] Invoice create failed:', invErr.message)
                    invoiceId = newInvoice?.id || null
                }

                console.log('[Consultation] invoiceId:', invoiceId)

                if (invoiceId) {
                    const { error: itemErr } = await supabaseAdmin
                        .from('invoice_items')
                        .insert({
                            invoice_id: invoiceId,
                            description: `Consultation Fee - ${new Date().toLocaleDateString('en-IN')}`,
                            quantity: 1,
                            unit_price: 500,
                            source_module: 'CONSULTATION'
                        })
                    if (itemErr) console.warn('[Consultation] Invoice item failed:', itemErr.message, itemErr.details)
                    else console.log('[Consultation] Invoice item SUCCESS ₹500')

                    const { data: items } = await supabaseAdmin
                        .from('invoice_items').select('total_price').eq('invoice_id', invoiceId)
                    const total = items?.reduce((s, i) => s + Number(i.total_price), 0) || 500
                    await supabaseAdmin.from('invoices').update({ amount: total }).eq('id', invoiceId)
                }
            } catch (invoiceErr) {
                console.warn('[Consultation] Invoice block failed:', invoiceErr)
            }
        }

        return { success: true }
    } catch (error) {
        console.warn('[Consultation] FATAL error:', error)
        return { success: false, error: 'Failed to save consultation' }
    }
}
