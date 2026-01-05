import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

async function getAnalytics() {
  const supabase = supabaseAdmin
  
  // Get total patients
  const { count: totalPatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
  
  // Get total appointments
  const { count: totalAppointments } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
  
  // Get total revenue
  const { data: revenueData } = await supabase
    .from('invoices')
    .select('amount')
    .eq('status', 'PAID')
  
  const totalRevenue = revenueData?.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0) || 0
  
  // Get staff count
  const { count: totalStaff } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('role', ['ADMIN', 'DOCTOR', 'NURSE'])
  
  return {
    totalPatients: totalPatients || 0,
    totalAppointments: totalAppointments || 0,
    totalRevenue,
    totalStaff: totalStaff || 0
  }
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics()
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">View reports, statistics, and operational insights</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPatients}</div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">Total scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Medical personnel</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hospital Analytics Dashboard</CardTitle>
          <CardDescription>
            Comprehensive reports, statistics, and operational insights from Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg bg-muted/50">
            <div className="text-center space-y-4">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Analytics Platform</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Real-time insights from database:
                  <br />• Patient demographics and trends
                  <br />• Appointment patterns and forecasting
                  <br />• Revenue analysis and financial reports
                  <br />• Department performance metrics
                  <br />• Staff utilization and productivity
                  <br />• Operational efficiency indicators
                  <br /><br />
                  <span className="font-semibold">Current Status:</span>
                  <br />Tracking {analytics.totalPatients} patients, {analytics.totalAppointments} appointments, ${analytics.totalRevenue.toFixed(2)} revenue
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
