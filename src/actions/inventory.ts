'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Vendor Management ---
export async function getVendors() {
  const { data } = await supabaseAdmin.from('vendors').select('*')
  return data || []
}

export async function createVendor(data: { name: string, license_no: string, contact: string }) {
  await supabaseAdmin.from('vendors').insert({
    name: data.name,
    license_no: data.license_no,
    contact_details: data.contact
  })
  revalidatePath('/dashboard/admin/inventory')
}

// --- Purchase Orders ---
export async function createPO(vendorId: string, items: { drugName: string, qty: number }[]) {
  // 1. Header
  const { data: po, error } = await supabaseAdmin.from('purchase_orders')
    .insert({ vendor_id: vendorId, status: 'SENT' })
    .select()
    .single()

  if (error) return { success: false }

  // 2. Items
  const poItems = items.map(i => ({
    po_id: po.id,
    drug_name: i.drugName,
    requested_qty: i.qty
  }))

  await supabaseAdmin.from('po_items').insert(poItems)

  revalidatePath('/dashboard/admin/inventory')
  return { success: true, poId: po.id }
}

export async function getPurchaseOrders() {
  const { data } = await supabaseAdmin
    .from('purchase_orders')
    .select(`
            *,
            vendors (name),
            po_items (*)
        `)
    .order('created_at', { ascending: false })
  return data || []
}

// --- GRN (Goods Receipt) ---
export async function receiveGoods(poId: string, receivedItems: { drugName: string, batch: string, expiry: string, qty: number, price: number }[]) {
  // 1. Add to Inventory
  for (const item of receivedItems) {
    // Create new batch entry
    const { data: inventory, error } = await supabaseAdmin.from('pharmacy_inventory').insert({
      drug_name: item.drugName,
      batch_number: item.batch,
      expiry_date: item.expiry,
      quantity: item.qty,
      price_per_unit: item.price
    }).select().single()

    if (!error && inventory) {
      // Audit Log
      await supabaseAdmin.from('inventory_audit').insert({
        drug_id: inventory.id,
        action: 'STOCK_IN',
        quantity_change: item.qty,
        performed_by: 'GRN_System'
      })
    }
  }

  // 2. Close PO
  await supabaseAdmin.from('purchase_orders')
    .update({ status: 'CLOSED' })
    .eq('id', poId)

  // 3. Create GRN Record
  await supabaseAdmin.from('grn_entries').insert({
    po_id: poId,
    received_at: new Date().toISOString()
  })

  revalidatePath('/dashboard/admin/inventory')
  return { success: true }
}

// --- Recall Support ---
export async function recallBatch(batchNumber: string) {
  // Find all sales/dispenses where this batch was used.
  // NOTE: In a real app, pharmacy_sales should link to pharmacy_inventory (batch_id).
  // For now, checking inventory_audit for 'DISPENSED' action on specific batch ID which correlates to batch_number

  // 1. Find Inventory IDs for this batch number
  const { data: batches } = await supabaseAdmin.from('pharmacy_inventory')
    .select('id, drug_name')
    .eq('batch_number', batchNumber)

  if (!batches || batches.length === 0) return { found: false, message: 'Batch not found' }

  const batchIds = batches.map(b => b.id)

  // 2. Find Dispense Logs
  const { data: logs } = await supabaseAdmin.from('inventory_audit')
    .select('*')
    .in('drug_id', batchIds) // drug_id here is the inventory row ID (specific batch)
    .eq('action', 'DISPENSED')

  // In a fully linked system, we'd join 'pharmacy_sales' here to get Patient Names.
  // This serves as the backend logic to identify impact.
  return { found: true, affectedCounts: logs?.length || 0, affectedBatches: batches }
}

// --- Stock Return (to Vendor) ---
export async function returnStock(batchId: string, qty: number, reason: string) {
  const { data: batch } = await supabaseAdmin.from('pharmacy_inventory').select('*').eq('id', batchId).single()
  if (!batch || batch.quantity < qty) return { success: false, error: 'Invalid Qty' }

  // 1. Deduct Stock
  await supabaseAdmin.from('pharmacy_inventory')
    .update({ quantity: batch.quantity - qty })
    .eq('id', batchId)

  // 2. Audit
  await supabaseAdmin.from('inventory_audit').insert({
    drug_id: batchId,
    action: 'EXPIRED_RETURN',
    quantity_change: -qty,
    performed_by: `Return: ${reason}`
  })

  revalidatePath('/dashboard/admin/inventory')
  return { success: true }
}
