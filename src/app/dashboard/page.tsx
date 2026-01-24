import { redirect } from 'next/navigation'
import { syncUser } from '@/actions/auth'
import { Activity, Users, Calendar, TrendingUp } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = supabaseAdmin

  // Get total patients
  const { count: totalPatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })

  // Get today's appointments
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { count: appointmentsToday } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('appointment_date', today.toISOString())
    .lt('appointment_date', tomorrow.toISOString())

  const { count: pendingAppts } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'SCHEDULED')
    .gte('appointment_date', today.toISOString())
    .lt('appointment_date', tomorrow.toISOString())

  // Get active staff
  const { count: activeStaff } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('role', ['ADMIN', 'DOCTOR', 'NURSE'])

  // Get this month's revenue
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data: monthlyInvoices } = await supabase
    .from('invoices')
    .select('amount')
    .eq('status', 'PAID')
    .gte('created_at', firstDayOfMonth.toISOString())

  const monthlyRevenue = monthlyInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0

  return {
    totalPatients: totalPatients || 0,
    appointmentsToday: appointmentsToday || 0,
    pendingAppts: pendingAppts || 0,
    activeStaff: activeStaff || 0,
    monthlyRevenue
  }
}

export default async function DashboardPage() {
  const userProfile = await syncUser()

  if (!userProfile) {
    redirect('/sign-in')
  }

  // Role-based redirects
  if (userProfile.role === 'DOCTOR') {
    redirect('/dashboard/doctor')
  }
  if (userProfile.role === 'PATIENT') {
    redirect('/dashboard/patient')
  }
  if (userProfile.role === 'RECEPTIONIST') {
    redirect('/dashboard/receptionist')
  }

  const stats = await getDashboardStats()

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {userProfile.firstName || 'User'}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s what&apos;s happening in your hospital today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Patients
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.totalPatients.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">Registered patients</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Appointments Today
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.appointmentsToday}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{stats.pendingAppts} pending confirmations</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Staff
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.activeStaff}</p>
              <p className="text-xs text-muted-foreground mt-1">Doctors, Nurses & Staff</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Revenue
              </p>
              <p className="text-2xl font-bold text-foreground">${(stats.monthlyRevenue / 1000).toFixed(1)}K</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">This month</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/patients">
          <div className="rounded-lg border border-border bg-card p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              🏥 Patient Management
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Access patient records, admissions, and medical history
            </p>
            <span className="text-sm font-medium text-primary hover:underline">
              View Patients →
            </span>
          </div>
        </Link>

        <Link href="/dashboard/pharmacy">
          <div className="rounded-lg border border-border bg-card p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              💊 Pharmacy System
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manage medications, prescriptions, and inventory
            </p>
            <span className="text-sm font-medium text-primary hover:underline">
              Open Pharmacy →
            </span>
          </div>
        </Link>

        <Link href="/dashboard/admin/analytics">
          <div className="rounded-lg border border-border bg-card p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              📊 Analytics
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              View reports, statistics, and operational insights
            </p>
            <span className="text-sm font-medium text-primary hover:underline">
              View Reports →
            </span>
          </div>
        </Link>
      </div>

      {/* User Role Badge */}
      {userProfile && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground">
            You are signed in as:{' '}
            <span className="font-semibold text-primary">
              {userProfile.role}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
