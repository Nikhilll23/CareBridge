'use server'

import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

// Search medicines from OpenFDA database
export async function searchMedicinesFDA(query: string) {
    try {
        const response = await fetch(
            `https://api.fda.gov/drug/ndc.json?search=brand_name:${encodeURIComponent(query)}*&limit=20`,
            {
                headers: {
                    'User-Agent': 'HIS-Core/1.0'
                }
            }
        )

        if (!response.ok) {
            return { success: false, error: 'Failed to fetch from OpenFDA' }
        }

        const data = await response.json()

        const medicines = data.results?.map((item: any) => ({
            name: item.brand_name || item.generic_name,
            genericName: item.generic_name,
            manufacturer: item.labeler_name,
            ndc: item.product_ndc,
            dosageForm: item.dosage_form,
            route: item.route?.[0]
        })) || []

        return { success: true, medicines }
    } catch (error: any) {
        console.error('OpenFDA Search Error:', error)
        return { success: false, error: error.message }
    }
}

// Get receptionist dashboard stats
export async function getReceptionistStats() {
    try {
        const user = await currentUser()
        if (!user) return null

        const { supabaseAdmin } = await import('@/lib/supabase')

        // Today's appointments
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data: todaysAppointments } = await supabaseAdmin
            .from('appointments')
            .select('*', { count: 'exact' })
            .gte('appointment_date', today.toISOString())
            .lt('appointment_date', tomorrow.toISOString())

        // Today's payments
        const { data: todaysPayments } = await supabaseAdmin
            .from('payments')
            .select('amount', { count: 'exact' })
            .gte('created_at', today.toISOString())

        const todaysRevenue = todaysPayments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0

        // Pending payments
        const { data: pendingPayments } = await supabaseAdmin
            .from('payments')
            .select('*', { count: 'exact' })
            .eq('status', 'PENDING')

        return {
            todaysAppointments: todaysAppointments?.length || 0,
            todaysRevenue,
            pendingPayments: pendingPayments?.length || 0
        }
    } catch (error) {
        console.error('Get Receptionist Stats Error:', error)
        return null
    }
}

// Schedule appointment (receptionist)
export async function scheduleAppointmentReceptionist(data: {
    patientId: string
    doctorId: string
    appointmentDate: string
    reason: string
}) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { supabaseAdmin } = await import('@/lib/supabase')

        const { data: appointment, error } = await supabaseAdmin
            .from('appointments')
            .insert({
                patient_id: data.patientId,
                doctor_id: data.doctorId,
                appointment_date: data.appointmentDate,
                reason: data.reason,
                status: 'SCHEDULED'
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/receptionist')
        return { success: true, appointment }
    } catch (error: any) {
        console.error('Schedule Appointment Error:', error)
        return { success: false, error: error.message }
    }
}

// Register walk-in patient
export async function registerWalkInPatient(data: {
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    email?: string
    phone?: string
    address?: string
}) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { supabaseAdmin } = await import('@/lib/supabase')

        // Generate UHID
        const { data: lastPatient } = await supabaseAdmin
            .from('patients')
            .select('uhid')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        let nextNumber = 1
        if (lastPatient?.uhid) {
            const match = lastPatient.uhid.match(/PAT-(\d+)/)
            if (match) {
                nextNumber = parseInt(match[1]) + 1
            }
        }
        const uhid = `PAT-${nextNumber.toString().padStart(5, '0')}`

        const { data: patient, error } = await supabaseAdmin
            .from('patients')
            .insert({
                first_name: data.firstName,
                last_name: data.lastName,
                date_of_birth: data.dateOfBirth,
                gender: data.gender,
                email: data.email,
                phone: data.phone,
                address: data.address,
                uhid
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/receptionist')
        return { success: true, patient }
    } catch (error: any) {
        console.error('Register Patient Error:', error)
        return { success: false, error: error.message }
    }
}

// Get all payments (for receptionist)
export async function getAllPaymentsReceptionist() {
    try {
        const user = await currentUser()
        if (!user) return []

        const { supabaseAdmin } = await import('@/lib/supabase')

        const { data: payments } = await supabaseAdmin
            .from('payments')
            .select(`
                *,
                patient:patients(first_name, last_name, uhid),
                receptionist:users!payments_receptionist_id_fkey(first_name, last_name)
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        return payments || []
    } catch (error) {
        console.error('Get Payments Error:', error)
        return []
    }
}

// Get patient balance
export async function getPatientBalance(patientId: string) {
    try {
        const { supabaseAdmin } = await import('@/lib/supabase')

        const { data: payments, error } = await supabaseAdmin
            .from('payments')
            .select('amount, status, created_at')
            .eq('patient_id', patientId)

        if (error) throw error

        const totalBilled = payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
        const totalPaid = payments?.filter(p => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
        const outstanding = totalBilled - totalPaid

        return {
            success: true,
            balance: {
                totalBilled,
                totalPaid,
                outstanding,
                paymentHistory: payments || []
            }
        }
    } catch (error: any) {
        console.error('Get Balance Error:', error)
        return { success: false, error: error.message }
    }
}

// Create billing invoice with PDF
export async function createBillingInvoice(data: {
    patientId: string
    items: Array<{
        name: string
        type: string
        quantity: number
        price: number
    }>
    paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'INSURANCE'
    notes?: string
}) {
    try {
        const user = await currentUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { supabaseAdmin } = await import('@/lib/supabase')

        // Calculate total
        const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const tax = subtotal * 0.05 // 5% tax
        const total = subtotal + tax

        // Generate invoice number
        const { data: invoiceNum } = await supabaseAdmin
            .rpc('generate_invoice_number')

        // Separate medicines
        const medicines = data.items
            .filter(item => item.type === 'MEDICINE')
            .map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }))

        // Determine payment type
        const types = [...new Set(data.items.map(i => i.type))]
        const paymentType = types.length === 1 ? types[0] : 'MIXED'

        // Create payment record
        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .insert({
                patient_id: data.patientId,
                receptionist_id: user.id,
                amount: total,
                payment_method: data.paymentMethod,
                payment_type: paymentType,
                invoice_number: invoiceNum || `INV-${Date.now()}`,
                medicines: medicines,
                items: data.items.map(item => ({
                    ...item,
                    total: item.price * item.quantity
                })),
                notes: data.notes,
                status: 'COMPLETED'
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/receptionist/billing')
        return { success: true, payment }
    } catch (error: any) {
        console.error('Create Invoice Error:', error)
        return { success: false, error: error.message }
    }
}
