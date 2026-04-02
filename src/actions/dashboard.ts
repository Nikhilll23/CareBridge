'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'

export interface DashboardStats {
  totalPatients: number
  appointmentsToday: number
  activeStaff: number
  totalRevenue: number
  pendingRevenue: number
  lowStockItems: number
  recentActivity: RecentActivity[]
  appointmentTrends: AppointmentTrend[]
  departmentDistribution: DepartmentStat[]
}

export interface RecentActivity {
  id: string
  type: 'invoice' | 'appointment' | 'patient'
  title: string
  description: string
  amount?: number
  timestamp: string
  status?: string
}

export interface AppointmentTrend {
  date: string
  count: number
  label: string
}

export interface DepartmentStat {
  name: string
  value: number
  color: string
}

/**
 * Get comprehensive admin dashboard statistics
 * @returns Dashboard statistics object or null if error
 */
export async function getAdminDashboardStats(): Promise<DashboardStats | null> {
  try {
    // Verify admin access
    const user = await currentUser()
    if (!user) {
      console.warn('Unauthorized: No user found')
      return null
    }
    
    // This function is deprecated, use getAdminStats() instead
    return await getAdminStats()
  } catch (error) {
    console.warn('Error in getAdminDashboardStats:', error)
    return null
  }
}

/**
 * Phase 12.1: Enhanced real-time admin statistics
 * Optimized parallel queries for maximum performance
 * @returns Dashboard statistics with real Supabase data
 */
export async function getAdminStats(): Promise<DashboardStats | null> {
  try {
    // Verify admin access
    const user = await currentUser()
    if (!user) {
      console.warn('Unauthorized: No user found')
      return null
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'ADMIN') {
      console.warn('Unauthorized: User is not an admin')
      return null
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Fetch all statistics in parallel for performance
    const [
      patientsResult,
      appointmentsTodayResult,
      activeStaffResult,
      revenueResult,
      pendingRevenueResult,
      lowStockResult,
      recentInvoicesResult,
      recentAppointmentsResult,
      appointmentTrendsResult,
    ] = await Promise.all([
      // 1. Total Patients
      supabaseAdmin
        .from('patients')
        .select('*', { count: 'exact', head: true }),

      // 2. Appointments Today
      supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', today)
        .lt('appointment_date', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

      // 3. Active Staff (ADMIN, DOCTOR, NURSE)
      supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('role', ['ADMIN', 'DOCTOR', 'NURSE']),

      // 4. Total Revenue (PAID invoices)
      supabaseAdmin
        .from('invoices')
        .select('amount')
        .eq('status', 'PAID'),

      // 5. Pending Revenue
      supabaseAdmin
        .from('invoices')
        .select('amount')
        .eq('status', 'PENDING'),

      // 6. Low Stock Items
      supabaseAdmin
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .lte('quantity', 50),

      // 7. Recent Invoices (last 5)
      supabaseAdmin
        .from('invoices')
        .select(`
          id,
          amount,
          status,
          description,
          invoice_date,
          created_at,
          patients (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5),

      // 8. Recent Appointments (last 5)
      supabaseAdmin
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          reason,
          patients (first_name, last_name)
        `)
        .order('appointment_date', { ascending: false })
        .limit(5),

      // 9. Appointment Trends (last 7 days)
      supabaseAdmin
        .from('appointments')
        .select('appointment_date, id')
        .gte('appointment_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('appointment_date', { ascending: true }),
    ])

    // Calculate totals
    const totalPatients = patientsResult.count || 0
    const appointmentsToday = appointmentsTodayResult.count || 0
    const activeStaff = activeStaffResult.count || 0
    const lowStockItems = lowStockResult.count || 0

    // Calculate revenue
    const totalRevenue = revenueResult.data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0
    const pendingRevenue = pendingRevenueResult.data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0

    // Process recent activity (combine invoices and appointments)
    const recentActivity: RecentActivity[] = []

    // Add invoices
    if (recentInvoicesResult.data) {
      recentInvoicesResult.data.forEach((invoice: any) => {
        recentActivity.push({
          id: invoice.id,
          type: 'invoice',
          title: `Invoice - ${invoice.patients?.first_name} ${invoice.patients?.last_name}`,
          description: invoice.description || 'Invoice payment',
          amount: Number(invoice.amount),
          timestamp: invoice.invoice_date,
          status: invoice.status,
        })
      })
    }

    // Add appointments
    if (recentAppointmentsResult.data) {
      recentAppointmentsResult.data.slice(0, 3).forEach((apt: any) => {
        const aptDate = new Date(apt.appointment_date)
        const timeStr = aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        
        recentActivity.push({
          id: apt.id,
          type: 'appointment',
          title: `Appointment - ${apt.patients?.first_name} ${apt.patients?.last_name}`,
          description: `${apt.reason || 'Consultation'} at ${timeStr}`,
          timestamp: apt.appointment_date,
          status: apt.status,
        })
      })
    }

    // Sort by timestamp and limit to 5
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    recentActivity.splice(5)

    // Process appointment trends (last 7 days)
    const appointmentTrends: AppointmentTrend[] = []
    const trendMap = new Map<string, number>()

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      trendMap.set(dateStr, 0)
    }

    // Count appointments per day
    appointmentTrendsResult.data?.forEach((apt: any) => {
      const date = apt.appointment_date
      trendMap.set(date, (trendMap.get(date) || 0) + 1)
    })

    // Convert to array
    trendMap.forEach((count, date) => {
      const dateObj = new Date(date)
      appointmentTrends.push({
        date,
        count,
        label: dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      })
    })

    // Department distribution (mock for now - can be enhanced with real departments)
    const departmentDistribution: DepartmentStat[] = [
      { name: 'General Medicine', value: Math.floor(totalPatients * 0.35), color: '#3b82f6' },
      { name: 'Cardiology', value: Math.floor(totalPatients * 0.25), color: '#ef4444' },
      { name: 'Orthopedics', value: Math.floor(totalPatients * 0.20), color: '#10b981' },
      { name: 'Pediatrics', value: Math.floor(totalPatients * 0.15), color: '#f59e0b' },
      { name: 'Emergency', value: Math.floor(totalPatients * 0.05), color: '#8b5cf6' },
    ]

    return {
      totalPatients,
      appointmentsToday,
      activeStaff,
      totalRevenue,
      pendingRevenue,
      lowStockItems,
      recentActivity,
      appointmentTrends,
      departmentDistribution,
    }
  } catch (error) {
    console.warn('Error fetching dashboard stats:', error)
    return null
  }
}
