'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'
import { searchDrugLabel, searchDrugByNDC, type FDADrugLabel } from '@/lib/openfda'
import { logAuditAction } from './audit'

// Validation Schemas
const inventorySchema = z.object({
  itemName: z.string().min(2, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  stockQuantity: z.number().int().min(0, 'Stock must be non-negative'),
  lowStockThreshold: z.number().int().min(0, 'Threshold must be non-negative'),
  unitPrice: z.number().min(0, 'Price must be non-negative'),
  expiryDate: z.string().optional(),
  ndcCode: z.string().optional(),
  manufacturer: z.string().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
})

const dispenseSchema = z.object({
  inventoryId: z.string().uuid('Invalid inventory ID'),
  patientId: z.string().uuid('Invalid patient ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
})

export type InventoryCategory =
  | 'ANTIBIOTICS'
  | 'ANALGESICS'
  | 'ANTIPYRETICS'
  | 'ANTI_INFLAMMATORY'
  | 'ANTACIDS'
  | 'ANTIHISTAMINES'
  | 'CARDIOVASCULAR'
  | 'DIABETES'
  | 'RESPIRATORY'
  | 'VITAMINS'
  | 'SURGICAL_SUPPLIES'
  | 'OTHER'

export interface InventoryItem {
  id: string
  item_name: string
  category: InventoryCategory
  stock_quantity: number
  low_stock_threshold: number
  unit_price: number
  expiry_date: string | null
  ndc_code: string | null
  manufacturer: string | null
  dosage_form: string | null
  strength: string | null
  created_at: string
  updated_at: string
}

export interface DispenseLog {
  id: string
  inventory_id: string
  patient_id: string
  dispensed_by: string
  quantity: number
  notes: string | null
  dispensed_at: string
  inventory?: InventoryItem
  patient?: {
    id: string
    first_name: string
    last_name: string
  }
}

/**
 * Get all inventory items
 */
export async function getInventory() {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .order('item_name', { ascending: true })

    if (error) {
      console.error('Error fetching inventory:', error)
      return { success: false, error: 'Failed to fetch inventory', data: [] }
    }

    return { success: true, data: data as InventoryItem[] }
  } catch (error) {
    console.error('Error in getInventory:', error)
    return { success: false, error: 'Failed to fetch inventory', data: [] }
  }
}

/**
 * Get low stock items
 */
export async function getLowStockItems() {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    // Get items where stock_quantity <= low_stock_threshold
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .lte('stock_quantity', supabaseAdmin.rpc('low_stock_threshold'))
      .order('stock_quantity', { ascending: true })

    if (error) {
      // Fallback: fetch all and filter client-side
      const { data: allData } = await supabaseAdmin
        .from('inventory')
        .select('*')

      const lowStock = allData?.filter(
        item => item.stock_quantity <= item.low_stock_threshold
      ) || []

      return { success: true, data: lowStock as InventoryItem[] }
    }

    return { success: true, data: data as InventoryItem[] }
  } catch (error) {
    console.error('Error in getLowStockItems:', error)
    return { success: false, error: 'Failed to fetch low stock items', data: [] }
  }
}

/**
 * Get expiring items (within 30 days)
 */
export async function getExpiringItems() {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })

    if (error) {
      console.error('Error fetching expiring items:', error)
      return { success: false, error: 'Failed to fetch expiring items', data: [] }
    }

    return { success: true, data: data as InventoryItem[] }
  } catch (error) {
    console.error('Error in getExpiringItems:', error)
    return { success: false, error: 'Failed to fetch expiring items', data: [] }
  }
}

/**
 * Update stock quantity
 */
export async function updateStock(id: string, adjustment: number) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check user role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can update inventory' }
    }

    // Get current stock
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('inventory')
      .select('stock_quantity')
      .eq('id', id)
      .single()

    if (fetchError || !item) {
      return { success: false, error: 'Item not found' }
    }

    const newQuantity = item.stock_quantity + adjustment

    if (newQuantity < 0) {
      return { success: false, error: 'Insufficient stock' }
    }

    const { error } = await supabaseAdmin
      .from('inventory')
      .update({ stock_quantity: newQuantity })
      .eq('id', id)

    if (error) {
      console.error('Error updating stock:', error)
      return { success: false, error: 'Failed to update stock' }
    }

    // Log Audit
    await logAuditAction(
      'UPDATE_STOCK',
      'PHARMACY',
      id,
      {
        adjustment,
        newQuantity,
        updatedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/pharmacy')
    return { success: true, message: 'Stock updated successfully' }
  } catch (error) {
    console.error('Error in updateStock:', error)
    return { success: false, error: 'Failed to update stock' }
  }
}

/**
 * Dispense medication to patient
 */
export async function dispenseMedication(data: {
  inventoryId: string
  patientId: string
  quantity: number
  notes?: string
}) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = dispenseSchema.parse(data)

    // Check if item has enough stock
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('inventory')
      .select('stock_quantity, item_name')
      .eq('id', validated.inventoryId)
      .single()

    if (fetchError || !item) {
      return { success: false, error: 'Medication not found' }
    }

    if (item.stock_quantity < validated.quantity) {
      return {
        success: false,
        error: `Insufficient stock. Available: ${item.stock_quantity}`,
      }
    }

    // Create dispense log
    const { error: logError } = await supabaseAdmin.from('dispense_log').insert({
      inventory_id: validated.inventoryId,
      patient_id: validated.patientId,
      dispensed_by: user.id,
      quantity: validated.quantity,
      notes: validated.notes || null,
    })

    if (logError) {
      console.error('Error creating dispense log:', logError)
      return { success: false, error: 'Failed to record dispensing' }
    }

    // Update stock
    const newQuantity = item.stock_quantity - validated.quantity
    const { error: updateError } = await supabaseAdmin
      .from('inventory')
      .update({ stock_quantity: newQuantity })
      .eq('id', validated.inventoryId)

    if (updateError) {
      console.error('Error updating stock:', updateError)
      return { success: false, error: 'Failed to update stock' }
    }

    // Log Audit
    await logAuditAction(
      'DISPENSE_MEDICATION',
      'PHARMACY',
      validated.inventoryId,
      {
        patientId: validated.patientId,
        quantity: validated.quantity,
        dispensedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/pharmacy')
    return {
      success: true,
      message: `Successfully dispensed ${validated.quantity} units of ${item.item_name}`,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error('Error in dispenseMedication:', error)
    return { success: false, error: 'Failed to dispense medication' }
  }
}

/**
 * Get dispense history
 */
export async function getDispenseHistory(limit: number = 50) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    const { data, error } = await supabaseAdmin
      .from('dispense_log')
      .select(`
        *,
        patient:patients(id, first_name, last_name)
      `)
      .order('dispensed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching dispense history:', error)
      return { success: false, error: 'Failed to fetch history', data: [] }
    }

    // Fetch inventory items for each log
    if (data && data.length > 0) {
      const inventoryIds = [...new Set(data.map(log => log.inventory_id))]
      const { data: inventoryItems } = await supabaseAdmin
        .from('inventory')
        .select('*')
        .in('id', inventoryIds)

      const logsWithInventory = data.map(log => ({
        ...log,
        inventory: inventoryItems?.find(item => item.id === log.inventory_id) || null,
      }))

      return { success: true, data: logsWithInventory as DispenseLog[] }
    }

    return { success: true, data: data as DispenseLog[] }
  } catch (error) {
    console.error('Error in getDispenseHistory:', error)
    return { success: false, error: 'Failed to fetch history', data: [] }
  }
}

/**
 * Search FDA drug database
 */
export async function getDrugInfoFromFDA(query: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null }
    }

    const result = await searchDrugLabel(query, 5)

    if (!result || !result.results || result.results.length === 0) {
      return { success: false, error: 'No results found', data: null }
    }

    return { success: true, data: result.results }
  } catch (error) {
    console.error('Error in getDrugInfoFromFDA:', error)
    return { success: false, error: 'Failed to search FDA database', data: null }
  }
}

/**
 * Get drug info by NDC
 */
export async function getDrugInfoByNDC(ndc: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null }
    }

    const result = await searchDrugByNDC(ndc)

    if (!result || !result.results || result.results.length === 0) {
      return { success: false, error: 'No results found for this NDC', data: null }
    }

    return { success: true, data: result.results[0] }
  } catch (error) {
    console.error('Error in getDrugInfoByNDC:', error)
    return { success: false, error: 'Failed to fetch drug info', data: null }
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    const user = await currentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check permissions (Admin only)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'ADMIN') {
      return { success: false, error: 'Only admins can delete inventory items' }
    }

    const { error } = await supabaseAdmin
      .from('pharmacy_inventory')
      .delete()
      .eq('id', id)

    if (error) throw error

    await logAuditAction(
      'DELETE_INVENTORY_ITEM',
      'PHARMACY',
      id,
      {
        deletedBy: user.emailAddresses[0]?.emailAddress
      }
    )

    revalidatePath('/dashboard/pharmacy')
    return { success: true }
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return { success: false, error: 'Failed to delete inventory item' }
  }
}
