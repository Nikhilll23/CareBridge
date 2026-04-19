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
/**
 * Search ICD-10 codes from the local cached table
 */
export async function searchICD10Local(query: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('diagnosis_codes')
            .select('*')
            .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(20)
        
        if (error) throw error
        return data || []
    } catch (err) {
        console.error('Error searching ICD10:', err)
        return []
    }
}

/**
 * Search procedure codes (CPT) from the local cached table
 */
export async function searchProceduresLocal(query: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from('procedure_codes')
            .select('*')
            .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(20)
        
        if (error) throw error
        return data || []
    } catch (err) {
        console.error('Error searching procedures:', err)
        return []
    }
}

// --- The Core Logic: Finalize & Bill ---
/**
 * Finalize clinical coding and trigger billing/invoice generation
 */
export async function finalizeDiagnosis(data: DiagnosisData) {
    try {
        // 1. Update Medical Record
        const { data: mr, error: mrError } = await supabaseAdmin
            .from('medical_records')
            .upsert({
                id: data.visitId && data.visitId !== 'DUMMY_VISIT_ID' ? data.visitId : undefined, 
                patient_id: data.patientId,
                icd_code: data.icdCode,
                procedure_code: data.procedureCode,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (mrError) throw new Error(`Medical Record Error: ${mrError.message}`)

        // 2. Auto-Billing Logic
        const { data: proc, error: procError } = await supabaseAdmin
            .from('procedure_codes')
            .select('base_price, description')
            .eq('code', data.procedureCode)
            .single()

        if (procError || !proc) throw new Error('Invalid Procedure Code or Price not found')

        const price = proc.base_price || 0

        // 3. Find or Create Active Invoice (PENDING)
        let invoiceId
        const { data: activeInvoice } = await supabaseAdmin
            .from('invoices')
            .select('id')
            .eq('patient_id', data.patientId)
            .eq('status', 'PENDING')
            .limit(1)
            .maybeSingle()

        if (activeInvoice) {
            invoiceId = activeInvoice.id
        } else {
            // Create new invoice if no pending one found
            const { data: newInv, error: invError } = await supabaseAdmin
                .from('invoices')
                .insert({
                    patient_id: data.patientId,
                    status: 'PENDING',
                    amount: 0 
                })
                .select()
                .single()

            if (invError) throw new Error(`Invoice Creation Error: ${invError.message}`)
            invoiceId = newInv.id
        }

        // 4. Add Invoice Item
        const { error: itemError } = await supabaseAdmin
            .from('invoice_items')
            .insert({
                invoice_id: invoiceId,
                description: `Procedure: ${proc.description} (${data.procedureCode})`,
                quantity: 1,
                unit_price: price
            })

        if (itemError) throw new Error(`Billing Item Error: ${itemError.message}`)

        // 5. Update Invoice Total amount
        // Attempting RPC update, failing gracefully if function doesn't exist
        try {
            await supabaseAdmin.rpc('increment_invoice_total', { inv_id: invoiceId, amount: price })
        } catch (rpcErr) {
            console.warn('RPC increment_invoice_total failed, check database functions:', rpcErr)
        }

        revalidatePath('/dashboard/coding')
        return {
            success: true,
            message: `Coded & Billed: ₹${price.toLocaleString()} added to invoice.`
        }

    } catch (error: any) {
        console.error('FinalizeDiagnosis Error:', error.message)
        return { success: false, error: error.message }
    }
}

/**
 * Check if a visit/record has been coded
 */
export async function checkCodingStatus(visitId: string) {
    if (!visitId || visitId === 'DUMMY_VISIT_ID') return false
    
    const { data, error } = await supabaseAdmin
        .from('medical_records')
        .select('icd_code')
        .eq('id', visitId)
        .maybeSingle()

    if (error) return false
    return !!(data && data.icd_code)
}

/**
 * Get recent coding history
 */
export async function getCodingHistory() {
    try {
        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .select(`
                *,
                patients (first_name, last_name)
            `)
            .order('updated_at', { ascending: false })
            .limit(10)
        
        if (error) throw error
        
        return (data || []).map(h => ({
            ...h,
            bill_amount: 0, // In production, this would be summed from invoice_items
            status: h.icd_code ? 'FINALIZED' : 'DRAFT',
            coded_at: h.updated_at
        }))
    } catch (err) {
        console.error('Error fetching coding history:', err)
        return []
    }
}
