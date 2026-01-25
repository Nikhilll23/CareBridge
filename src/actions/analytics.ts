'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- Bed Analytics ---
export async function getBedAnalytics() {
    try {
        const { data: beds, error } = await supabaseAdmin
            .from('beds')
            .select('status, type')

        if (error) throw error

        // Count status
        const occupancy = {
            occupied: beds.filter(b => b.status === 'OCCUPIED').length,
            available: beds.filter(b => b.status === 'AVAILABLE').length,
            maintenance: beds.filter(b => b.status === 'MAINTENANCE').length,
            total: beds.length
        }

        // Prepare chart data
        const chartData = [
            { name: 'Occupied', value: occupancy.occupied },
            { name: 'Available', value: occupancy.available },
            { name: 'Maintenance', value: occupancy.maintenance }
        ].filter(d => d.value > 0)

        return { success: true, occupancy, chartData }
    } catch (error: any) {
        console.error('Bed Analytics Error:', error)
        return { success: false, error: error.message }
    }
}

// --- Department Revenue Analytics ---

export async function getDepartmentRevenue() {
    try {
        const { data, error } = await supabaseAdmin
            .from('department_revenue')
            .select('*')
            .order('revenue', { ascending: false })

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function addDepartmentRevenue(name: string, revenue: number, target: number = 0, color: string = '#3b82f6') {
    try {
        const { error } = await supabaseAdmin
            .from('department_revenue')
            .insert({ department_name: name, revenue, target_revenue: target, color })

        if (error) throw error
        revalidatePath('/dashboard/admin/analytics')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateDepartmentRevenue(id: string, updates: { revenue?: number, target?: number, color?: string }) {
    try {
        const { error } = await supabaseAdmin
            .from('department_revenue')
            .update({
                revenue: updates.revenue,
                target_revenue: updates.target,
                color: updates.color,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error
        revalidatePath('/dashboard/admin/analytics')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteDepartmentRevenue(id: string) {
    try {
        const { error } = await supabaseAdmin
            .from('department_revenue')
            .delete()
            .eq('id', id)

        if (error) throw error
        revalidatePath('/dashboard/admin/analytics')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Helper: Seed initial data if empty
export async function seedDepartmentData() {
    const { count } = await supabaseAdmin.from('department_revenue').select('*', { count: 'exact', head: true })

    if (count === 0) {
        const seeds = [
            { department_name: 'Cardiology', revenue: 1250000, color: '#ef4444' },
            { department_name: 'Neurology', revenue: 980000, color: '#8b5cf6' },
            { department_name: 'Pediatrics', revenue: 650000, color: '#f59e0b' },
            { department_name: 'Orthopedics', revenue: 890000, color: '#10b981' },
            { department_name: 'General', revenue: 450000, color: '#3b82f6' }
        ]

        await supabaseAdmin.from('department_revenue').insert(seeds)
    }
}
