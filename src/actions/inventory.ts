'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface InventoryItem {
  id: string
  item_name: string // mapped from drug_name
  drug_name: string
  category: string
  stock_quantity: number // mapped from quantity
  quantity: number
  unit_price: number // mapped
  price_per_unit: number
  expiry_date: string | null
  batch_number: string | null
  low_stock_threshold: number
  strength?: string
  dosage_form?: string
  ndc_code?: string
}

export async function getInventory() {
  const { data } = await supabaseAdmin.from('pharmacy_inventory').select('*').order('drug_name')
  // Map fields for consistency
  return (data || []).map(d => ({
    ...d,
    item_name: d.drug_name,
    stock_quantity: d.quantity,
    unit_price: d.price_per_unit,
    low_stock_threshold: 20 // Default
  }))
}

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
export async function deleteInventoryItem(id: string) {
  try {
    const { error } = await supabaseAdmin.from('pharmacy_inventory').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/dashboard/admin/inventory')
    revalidatePath('/dashboard/pharmacy')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Failed' }
  }
}

export async function addInventoryItem(data: any) {
  try {
    const { error } = await supabaseAdmin.from('pharmacy_inventory').insert({
      drug_name: data.drug_name,
      category: data.category,
      quantity: data.stock_quantity || 0,
      price_per_unit: data.unit_price || 0,
      batch_number: data.batch_number || null,
      expiry_date: data.expiry_date || null
    })
    if (error) {
      console.error('Insert error:', error)
      throw error
    }
    revalidatePath('/dashboard/admin/inventory')
    revalidatePath('/dashboard/pharmacy')
    return { success: true }
  } catch (e) {
    console.error('addInventoryItem failed:', e)
    return { success: false, error: 'Failed to add item' }
  }
}


export async function updateInventoryItem(id: string, data: any) {
  try {
    const { error } = await supabaseAdmin.from('pharmacy_inventory').update(data).eq('id', id)
    if (error) throw error
    revalidatePath('/dashboard/admin/inventory')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update' }
  }
}

export async function dispenseMedication(data: { inventoryId: string, patientId: string, quantity: number, notes?: string }) {
  const { inventoryId, patientId, quantity, notes } = data

  // 1. Get Stock
  const { data: item } = await supabaseAdmin
    .from('pharmacy_inventory')
    .select('*')
    .eq('id', inventoryId)
    .single()

  if (!item || item.quantity < quantity) {
    return { success: false, error: 'Insufficient Stock' }
  }

  // 2. Deduct
  const { error: stockError } = await supabaseAdmin
    .from('pharmacy_inventory')
    .update({ quantity: item.quantity - quantity })
    .eq('id', inventoryId)

  if (stockError) return { success: false, error: 'Stock update failed' }

  // 3. Audit
  const { error: auditError } = await supabaseAdmin.from('inventory_audit').insert({
    drug_id: inventoryId,
    action: 'DISPENSED',
    quantity_change: -quantity,
    performed_by: 'Admin/Nurse',
    notes: notes
  })

  if (auditError) console.error('Audit Log Failed', auditError)

  // 4. Create Sale
  const total = item.price_per_unit * quantity
  await supabaseAdmin.from('pharmacy_sales').insert({
    patient_id: patientId,
    total_amount: total,
    payment_status: 'PENDING'
  })

  revalidatePath('/dashboard/admin/inventory')
  revalidatePath('/dashboard/pharmacy')
  return { success: true, message: 'Dispensed successfully' }
}

import { searchDrugLabel } from '@/lib/openfda'

export async function getDrugInfoFromFDA(query: string) {
  try {
    const result = await searchDrugLabel(query)
    return { success: true, data: result?.results || [] }
  } catch (e) {
    return { success: false, error: 'Failed to fetch from FDA' }
  }
}
