import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  UserCheck, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Activity,
  Package,
  FileText,
  BarChart3,
} from 'lucide-react'
import { getAdminStats } from '@/actions/dashboard'
import { AppointmentTrends, DepartmentDistribution } from '@/components/modules/admin/charts'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-150">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied or Data Error</h2>
          <p className="text-muted-foreground">Unable to load dashboard data. This could be because:</p>
          <div className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-2">
            <p>• You don&apos;t have admin permissions</p>
            <p>• The invoices table hasn&apos;t been created yet</p>
            <p>• Database connection issue</p>
          </div>
          <p className="text-sm font-semibold mt-4">
            ✅ Run FINAL-PHASE-12-COMPLETE.sql in Supabase to fix this
          </p>
        </div>
      </div>
    )
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Hospital Command Center
        </h1>
        <p className="text-muted-foreground">
          Real-time overview of hospital operations and key metrics
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Patients */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Activity className="h-3 w-3 text-blue-500" />
              <span className="text-blue-500">Registered in system</span>
            </p>
          </CardContent>
        </Card>

        {/* Appointments Today */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments Today</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointmentsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled for today
            </p>
          </CardContent>
        </Card>

        {/* Active Staff */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStaff}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Doctors, Nurses & Admins
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">{formatter.format(stats.pendingRevenue)} pending</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Appointment Trends - Takes 2 columns */}
        <div className="md:col-span-2">
          <AppointmentTrends data={stats.appointmentTrends} />
        </div>

        {/* Department Distribution - Takes 1 column */}
        <div className="md:col-span-1">
          <DepartmentDistribution data={stats.departmentDistribution} />
        </div>
      </div>

      {/* Quick Actions & Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Action Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Navigate to key modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/patients" className="block">
              <Button variant="outline" className="w-full justify-between group">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Patient Management
                </div>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Link href="/dashboard/appointments" className="block">
              <Button variant="outline" className="w-full justify-between group">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Appointments
                </div>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Link href="/dashboard/pharmacy" className="block">
              <Button variant="outline" className="w-full justify-between group">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Pharmacy System
                </div>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Link href="/admin/analytics" className="block">
              <Button variant="outline" className="w-full justify-between group">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </div>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              System Alerts
            </CardTitle>
            <CardDescription>Critical notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.lowStockItems > 0 ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Low Stock Alert
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {stats.lowStockItems} items are running low. Check inventory.
                  </p>
                  <Link href="/dashboard/pharmacy">
                    <Button variant="link" className="h-auto p-0 text-xs text-amber-600 hover:text-amber-700 mt-1">
                      View Inventory →
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    All Systems Normal
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    No critical alerts at this time.
                  </p>
                </div>
              </div>
            )}

            {stats.pendingRevenue > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <DollarSign className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Pending Payments
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {formatter.format(stats.pendingRevenue)} in pending invoices.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest transactions and appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'invoice' 
                        ? 'bg-emerald-100 dark:bg-emerald-950' 
                        : 'bg-blue-100 dark:bg-blue-950'
                    }`}>
                      {activity.type === 'invoice' ? (
                        <DollarSign className={`h-4 w-4 ${
                          activity.type === 'invoice'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      ) : (
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {activity.amount && (
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatter.format(activity.amount)}
                      </p>
                    )}
                    {activity.status && (
                      <Badge
                        variant={
                          activity.status === 'PAID' || activity.status === 'COMPLETED'
                            ? 'default'
                            : activity.status === 'PENDING' || activity.status === 'SCHEDULED'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
