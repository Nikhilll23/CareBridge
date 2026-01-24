'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Types ---
export interface SaleData {
    patientId: string
    drugName: string
    quantity: number
    batchId: string // The specific batch chosen
}

// --- Safety Checks ---
export async function checkSafety(patientId: string, drugName: string) {
    // 1. Fetch Patient for Allergies
    const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('allergies, medical_history') // Assuming medical_history stores conditions/meds
        .eq('id', patientId)
        .single()

    if (!patient) return { alert: false }

    const alerts = []

    // Check Allergies (Simple string match)
    // In real app, this would be a normalized join.
    // Assuming allergies is a text array or comma-separated string
    const allergyList = Array.isArray(patient.allergies)
        ? patient.allergies
        : (patient.allergies || '').split(',')

    const isAllergic = allergyList.some((a: string) =>
        a.toLowerCase().includes(drugName.toLowerCase()) ||
        drugName.toLowerCase().includes(a.trim().toLowerCase())
    )

    if (isAllergic) {
        alerts.push({ type: 'ALLERGY', message: `Patient is allergic to ${drugName}` })
    }

    // Check Interaction (Mock: Warfarin + Aspirin)
    // We need to know what meds patient is currently on. 
    // For now, let's assume medical_history contains current meds text or we query specific active prescriptions
    // Let's query active prescriptions instead
    const { data: activeMeds } = await supabaseAdmin
        .from('prescriptions')
        .select('medication')
        .eq('patient_id', patientId)
        .eq('status', 'DISPENSED') // Currently taking

    const currentMeds = activeMeds?.map(m => m.medication.toLowerCase()) || []

    if (drugName.toLowerCase() === 'aspirin' && currentMeds.includes('warfarin')) {
        alerts.push({ type: 'INTERACTION', message: 'Wait! Aspirin interacts with Warfarin (Bleeding Risk)' })
    }

    if (drugName.toLowerCase() === 'warfarin' && currentMeds.includes('aspirin')) {
        alerts.push({ type: 'INTERACTION', message: 'Wait! Warfarin interacts with Aspirin (Bleeding Risk)' })
    }

    return { alert: alerts.length > 0, alerts }
}

// --- Dispense Logic ---
export async function processDispense(saleData: SaleData) {
    const { patientId, drugName, quantity, batchId } = saleData

    // 1. Get Batch Info
    const { data: batch } = await supabaseAdmin
        .from('pharmacy_inventory')
        .select('*')
        .eq('id', batchId)
        .single()

    if (!batch || batch.quantity < quantity) {
        return { success: false, error: 'Insufficient Stock in this batch' }
    }

    // 2. Deduct Stock
    const { error: stockError } = await supabaseAdmin
        .from('pharmacy_inventory')
        .update({ quantity: batch.quantity - quantity })
        .eq('id', batchId)

    if (stockError) return { success: false, error: 'Failed to update stock' }

    // 3. Create Audit Log
    await supabaseAdmin.from('inventory_audit').insert({
        drug_id: batchId,
        action: 'DISPENSED',
        quantity_change: -quantity,
        performed_by: 'System', // Replace with user ID if available context
        timestamp: new Date().toISOString()
    })

    // 4. Create Sale Record (Billing)
    const totalAmount = batch.price_per_unit * quantity
    const { data: sale, error: saleError } = await supabaseAdmin.from('pharmacy_sales').insert({
        patient_id: patientId,
        total_amount: totalAmount,
        payment_status: 'PENDING'
    }).select().single()

    if (saleError) return { success: false, error: 'Billing failed' }

    revalidatePath('/dashboard/pharmacy')
    return { success: true, saleId: sale.id, totalAmount } // Retrun ID for Razorpay
}

export async function getPendingPrescriptions() {
    const { data } = await supabaseAdmin
        .from('prescriptions')
        .select(`
            *,
            patients (first_name, last_name)
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
    return data || []
}

export async function getInventory(drugName?: string) {
    let query = supabaseAdmin.from('pharmacy_inventory').select('*').gt('quantity', 0)
    if (drugName) {
        query = query.ilike('drug_name', `%${drugName}%`)
    }
    // FIFO Order
    query = query.order('expiry_date', { ascending: true })

    const { data } = await query
    return data || []
}
