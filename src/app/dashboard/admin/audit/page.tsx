import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditList } from '@/components/modules/admin/AuditList'
import { FileText, Activity, Clock, AlertCircle } from 'lucide-react'
import { getAuditLogs } from '@/actions/audit'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

// Helper function to get stats since we separate stats logic for cleaner code
async function getAuditStats() {
  const { data } = await getAuditLogs(100)

  if (!data) return {
    activitiesToday: 0,
    totalEvents: 0,
    userActions: 0,
    criticalAlerts: 0
  }

  const today = new Date().toDateString()
  const activitiesToday = data.filter(log => new Date(log.created_at).toDateString() === today).length
  const userActions = data.filter(log => log.entity === 'USER').length

  return {
    activitiesToday,
    totalEvents: data.length, // Limit implies this is recent events
    userActions,
    criticalAlerts: 0
  }
}

export default async function AuditLogsPage() {
  const stats = await getAuditStats()
  const { data: logs } = await getAuditLogs(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">Track system activities and user actions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities Today</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activitiesToday}</div>
            <p className="text-xs text-muted-foreground">System events logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Monitored events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Actions</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userActions}</div>
            <p className="text-xs text-muted-foreground">Recent user interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Audit List */}
      <AuditList initialLogs={logs || []} />
    </div>
  )
}
