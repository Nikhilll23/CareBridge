'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Assets ---

export async function getAssets(query?: string) {
    let q = supabaseAdmin.from('assets').select('*').order('type')

    if (query) {
        q = q.ilike('name', `%${query}%`)
    }

    const { data } = await q
    return data || []
}

export async function assignAsset(assetId: string, locationId: string, userId: string) {
    try {
        // 1. Update Asset
        const { error } = await supabaseAdmin
            .from('assets')
            .update({
                current_location_id: locationId,
                status: 'IN_USE'
            })
            .eq('id', assetId)

        if (error) throw error

        // 2. Audit Trail
        await supabaseAdmin.from('audit_logs').insert({
            action: 'ASSET_MOVED',
            entity_table: 'assets',
            entity_id: assetId,
            details: { location: locationId },
            performed_by: userId
        })

        revalidatePath('/dashboard/resources')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function requestMaintenance(assetId: string, userId: string) {
    await supabaseAdmin
        .from('assets')
        .update({ status: 'MAINTENANCE' })
        .eq('id', assetId)

    await supabaseAdmin.from('audit_logs').insert({
        action: 'MAINTENANCE_REQUESTED',
        entity_table: 'assets',
        entity_id: assetId,
        performed_by: userId
    })

    revalidatePath('/dashboard/resources')
    return { success: true }
}

// --- Staffing ---

export async function createRoster(data: { staffName: string, role: string, ward: string, start: string, end: string }) {
    // 1. Conflict Check
    // Check if staff is already booked in that overlap
    const { data: conflicts } = await supabaseAdmin
        .from('staff_roster')
        .select('id')
        .eq('staff_name', data.staffName)
        .or(`and(shift_start.lte.${data.end},shift_end.gte.${data.start})`)

    if (conflicts && conflicts.length > 0) {
        return { success: false, error: 'Staff member is already rostered for this period.' }
    }

    // 2. Create
    const { error } = await supabaseAdmin.from('staff_roster').insert({
        staff_id: data.staffName,// Simplified: using name as ID for demo
        staff_name: data.staffName,
        role: data.role,
        ward_id: data.ward,
        shift_start: data.start,
        shift_end: data.end
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/resources')
    return { success: true }
}

export async function getRoster() {
    const { data } = await supabaseAdmin.from('staff_roster').select('*').order('shift_start', { ascending: true })
    return data || []
}

// --- Stats ---
export async function getUtilizationStats() {
    // Ventilator Usage
    const { count: ventTotal } = await supabaseAdmin.from('assets').select('*', { count: 'exact', head: true }).ilike('name', '%Ventilator%')
    const { count: ventInUse } = await supabaseAdmin.from('assets').select('*', { count: 'exact', head: true }).ilike('name', '%Ventilator%').eq('status', 'IN_USE')

    return {
        ventilator: {
            total: ventTotal || 0,
            inUse: ventInUse || 0,
            available: (ventTotal || 0) - (ventInUse || 0)
        }
    }
}
