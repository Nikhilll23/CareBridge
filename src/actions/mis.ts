'use server'

import { supabaseAdmin } from '@/lib/supabase'

// --- Types ---
export interface KPIMetrics {
    totalRevenue: number
    occupancyRate: number
    avgErWaitTime: number
    activePatients: number
}

// --- KPI Aggregation ---
export async function getKeyMetrics(range: '7d' | '30d'): Promise<KPIMetrics> {
    // 1. Revenue
    const { data: rev } = await supabaseAdmin.from('analytics_revenue').select('total_revenue').limit(range === '7d' ? 7 : 30)
    const totalRevenue = rev?.reduce((sum, r) => sum + (r.total_revenue || 0), 0) || 0

    // 2. Occupancy (Global Average)
    const { data: beds } = await supabaseAdmin.from('analytics_bed_occupancy').select('occupancy_rate')
    const occupancyRate = (beds && beds.length > 0)
        ? beds.reduce((sum, b) => sum + (b.occupancy_rate || 0), 0) / beds.length
        : 0

    // 3. ER Wait
    const { data: er } = await supabaseAdmin.from('analytics_er_wait').select('avg_wait_minutes').single()
    const avgErWaitTime = er?.avg_wait_minutes || 0

    // 4. Active Patients (Admitted + ER Triage) (Mocked for now or count rows)
    // Simple count
    const { count } = await supabaseAdmin.from('patients').select('id', { count: 'exact', head: true })

    return {
        totalRevenue,
        occupancyRate: Math.round(occupancyRate),
        avgErWaitTime,
        activePatients: count || 0
    }
}

// --- Chart Data ---
export async function getChartData(type: 'revenue' | 'beds' | 'er' | 'dept') {
    switch (type) {
        case 'revenue':
            const { data: rev } = await supabaseAdmin.from('analytics_revenue').select('*').order('date', { ascending: true })
            return rev?.map(r => ({ name: new Date(r.date).toLocaleDateString(), value: r.total_revenue })) || []

        case 'beds':
            const { data: beds } = await supabaseAdmin.from('analytics_bed_occupancy').select('*')
            return beds?.map(b => ({ name: b.ward, value: b.occupancy_rate })) || []

        case 'dept':
            const { data: depts } = await supabaseAdmin.from('analytics_dept_performance').select('*')
            return depts?.map(d => ({ name: d.department, value: d.appointment_count })) || []

        default:
            return []
    }
}
