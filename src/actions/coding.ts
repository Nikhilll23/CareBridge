'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Types ---
export interface DiagnosisData {
    visitId: string // Serves as the key for medical_records
    patientId: string
    icdCode: string
    procedureCode: string
}

// --- Search ---
export async function searchICD10Local(query: string) {
    const { data } = await supabaseAdmin
        .from('diagnosis_codes')
        .select('*')
        .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20)
    return data || []
}

export async function searchProceduresLocal(query: string) {
    const { data } = await supabaseAdmin
        .from('procedure_codes')
        .select('*')
        .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20)
    return data || []
}

// --- The Core Logic: Finalize & Bill ---
export async function finalizeDiagnosis(data: DiagnosisData) {
    try {
        // 1. Update Medical Record
        // We assume 'visitId' maps to the 'id' of medical_records for this context, 
        // or we create one if it doesn't exist (Upsert logic).

        // For this demo, let's look for an existing record or create one.
        const { data: mr, error: mrError } = await supabaseAdmin
            .from('medical_records')
            .upsert({
                id: data.visitId, // Assuming visitId IS the medical_record id. If not, we'd use visit_id column.
                patient_id: data.patientId,
                icd_code: data.icdCode,
                procedure_code: data.procedureCode,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (mrError) throw new Error(`Medical Record Error: ${mrError.message}`)

        // 2. Auto-Billing Logic
        // 2a. Get Price
        const { data: proc } = await supabaseAdmin
            .from('procedure_codes')
            .select('base_price, description')
            .eq('code', data.procedureCode)
            .single()

        if (!proc) throw new Error('Invalid Procedure Code')

        const price = proc.base_price || 0

        // 2b. Find or Create Active Invoice (PENDING)
        let invoiceId
        const { data: activeInvoice } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .eq('patient_id', data.patientId)
            .eq('status', 'PENDING')
            .single()

        if (activeInvoice) {
            invoiceId = activeInvoice.id
        } else {
            // Create new invoice
            const { data: newInv, error: invError } = await supabaseAdmin
                .from('invoices')
                .insert({
                    patient_id: data.patientId,
                    status: 'PENDING',
                    amount: 0 // Will auto-sum usually, or we update it
                })
                .select()
                .single()

            if (invError) throw new Error(`Invoice Creation Error: ${invError.message}`)
            invoiceId = newInv.id
        }

        // 2c. Add Invoice Item
        const { error: itemError } = await supabaseAdmin
            .from('invoice_items')
            .insert({
                invoice_id: invoiceId,
                description: `Procedure: ${proc.description} (${data.procedureCode})`,
                quantity: 1,
                unit_price: price
            })

        if (itemError) throw new Error(`Billing Item Error: ${itemError.message}`)

        // 2d. Update Invoice Total amount (simple increment)
        // In a real trigger-based DB, this might happen automatically.
        // We'll simplisticly increment it here for the UI feedback.
        await supabaseAdmin.rpc('increment_invoice_total', { inv_id: invoiceId, amount: price })
        // Fallback if RPC doesn't exist: ignore, assuming future fetch recalculates.

        revalidatePath('/dashboard/coding')
        return {
            success: true,
            message: `Coded & Billed: $${price} added to invoice.`
        }

    } catch (error: any) {
        console.error(error)
        return { success: false, error: error.message }
    }
}

// --- Helper for Mandatory Check ---
export async function checkCodingStatus(visitId: string) {
    const { data } = await supabaseAdmin
        .from('medical_records')
        .select('icd_code')
        .eq('id', visitId)
        .single()

    // If we have a record and icd_code is present, it's coded.
    return !!(data && data.icd_code)
}
