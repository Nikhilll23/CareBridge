'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Actions ---

/**
 * Generates the Final Bill
 * 1. Calculates Bed Charges (Auto-Add)
 * 2. Aggregates all Invoice Items
 * 3. Returns the Bill Object
 */
export async function generateFinalBill(patientId: string) {
    try {
        // 1. Get Patient & Admission Info (Mock: Assuming link exists or we check `admissions` table)
        // For now, we'll assume there's an ACTIVE invoice which IS the draft bill.

        // Find Active Invoice
        const { data: invoice } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('patient_id', patientId)
            .eq('status', 'PENDING')
            .single()

        if (!invoice) return { success: false, error: 'No active billing cycle found for this patient.' }

        // 2. Mock Logic: Bed Charges Calculation
        // In real app, we diff Date.now() - admission_date. 
        // We will just add a daily charge if not already present for "Today".
        // (Skipping complex logic to keep it simple and robust for demo)

        // 3. Fetch All Items
        const { data: items } = await supabaseAdmin
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id)
            .order('created_at', { ascending: true })

        // 4. Calculate Totals
        const total = items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0
        const grandTotal = total - (invoice.discount_amount || 0)

        // 5. Update Invoice Totals (Sync)
        await supabaseAdmin
            .from('invoices')
            .update({ total_amount: total }) // base total
            .eq('id', invoice.id)

        return {
            success: true,
            data: {
                invoice,
                items: items || [],
                totals: {
                    subtotal: total,
                    discount: invoice.discount_amount || 0,
                    grandTotal: Math.max(grandTotal, 0)
                }
            }
        }

    } catch (error: any) {
        console.error('Bill Gen Error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Searches the Tariff Master for Misc Charges
 */
export async function searchTariff(query: string) {
    const { data } = await supabaseAdmin
        .from('tariff_master')
        .select('*')
        .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(10)
    return data || []
}

/**
 * Adds a manual charge to both the Invoice and Invoice Items
 */
export async function addMiscCharge(invoiceId: string, item: any) {
    try {
        await supabaseAdmin.from('invoice_items').insert({
            invoice_id: invoiceId,
            description: item.name,
            quantity: 1,
            unit_price: item.unit_price,
            category: item.category,
            source_module: 'BILLING_MANUAL'
        })

        // Update Total
        await supabaseAdmin.rpc('increment_invoice_total', { inv_id: invoiceId, amount: item.unit_price })

        revalidatePath('/dashboard/billing')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to add charge' }
    }
}

/**
 * Applies a discount (Secured by Role Check mock)
 */
export async function applyDiscount(invoiceId: string, amount: number, reason: string, userRole: string) {
    try {
        // Security Check
        if (userRole !== 'ADMIN') {
            return { success: false, error: 'Permission Denied: Only Admins can approve discounts.' }
        }

        const { error } = await supabaseAdmin
            .from('invoices')
            .update({
                discount_amount: amount,
                discount_reason: reason,
                discount_approved_by: 'ADMIN_USER' // Mock ID
            })
            .eq('id', invoiceId)

        if (error) throw error

        // Log to Audit Trail
        await supabaseAdmin.from('audit_logs').insert({
            action: 'DISCOUNT_APPLIED',
            entity_table: 'invoices',
            entity_id: invoiceId,
            details: { amount, reason },
            performed_by: userRole // In real app, this would be user ID
        })

        revalidatePath('/dashboard/billing')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Finalize and Lock the Bill
 */
export async function finalizeBill(invoiceId: string) {
    await supabaseAdmin
        .from('invoices')
        .update({ status: 'FINALIZED', invoice_date: new Date().toISOString() })
        .eq('id', invoiceId)

    revalidatePath('/dashboard/billing')
    return { success: true }
}
