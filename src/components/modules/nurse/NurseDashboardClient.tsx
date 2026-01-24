'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, AlertTriangle, Pill, FileText, Users, Clock } from 'lucide-react'
import { getActiveAlerts, getAlertStats } from '@/actions/nursing/alerts'
import { getPendingMedications, getTodaysMedications } from '@/actions/nursing/medication-administration'
import { getCriticalVitalSigns } from '@/actions/nursing/vital-signs'
import { getActiveCarePlans } from '@/actions/nursing/care-plans'
import Link from 'next/link'
import { toast } from 'sonner'

export function NurseDashboardClient() {
    const [stats, setStats] = useState({
        criticalAlerts: 0,
        pendingMeds: 0,
        todaysMeds: 0,
        activeCarePlans: 0,
        criticalVitals: 0
    })
    const [alerts, setAlerts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadDashboardData()
    }, [])

    const loadDashboardData = async () => {
        try {
            setLoading(true)

            // Load all dashboard data in parallel
            const [alertStatsRes, activeAlertsRes, pendingMedsRes, todaysMedsRes, carePlansRes, criticalVitalsRes] = await Promise.all([
                getAlertStats(),
                getActiveAlerts(),
                getPendingMedications(),
                getTodaysMedications(),
                getActiveCarePlans(),
                getCriticalVitalSigns()
            ])

            setStats({
                criticalAlerts: alertStatsRes.data?.critical || 0,
                pendingMeds: pendingMedsRes.data?.length || 0,
                todaysMeds: todaysMedsRes.data?.length || 0,
                activeCarePlans: carePlansRes.data?.length || 0,
                criticalVitals: criticalVitalsRes.data?.length || 0
            })

            setAlerts(activeAlertsRes.data || [])
        } catch (error) {
            console.error('Error loading dashboard data:', error)
            toast.error('Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Nurse Dashboard</h1>
                <p className="text-muted-foreground">Patient care management and monitoring</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.criticalAlerts}</div>
                        <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Medications</CardTitle>
                        <Pill className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingMeds}</div>
                        <p className="text-xs text-muted-foreground">Due for administration</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Medications</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todaysMeds}</div>
                        <p className="text-xs text-muted-foreground">Scheduled for today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Care Plans</CardTitle>
                        <FileText className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeCarePlans}</div>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common nursing tasks</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link href="/dashboard/nurse/vital-signs">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <Activity className="h-6 w-6" />
                            <span>Record Vitals</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/nurse/medications">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <Pill className="h-6 w-6" />
                            <span>MAR</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/nurse/notes">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <FileText className="h-6 w-6" />
                            <span>Nursing Notes</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/nurse/patients">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <Users className="h-6 w-6" />
                            <span>Patients</span>
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {/* Active Alerts */}
            {alerts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Active Alerts ({alerts.length})
                        </CardTitle>
                        <CardDescription>Unacknowledged alerts requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {alerts.slice(0, 5).map((alert: any) => (
                                <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={
                                                alert.severity === 'critical' ? 'destructive' :
                                                    alert.severity === 'high' ? 'default' :
                                                        'secondary'
                                            }>
                                                {alert.severity}
                                            </Badge>
                                            <span className="text-sm font-medium">
                                                {alert.patient?.first_name} {alert.patient?.last_name}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(alert.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="outline">
                                        View
                                    </Button>
                                </div>
                            ))}
                            {alerts.length > 5 && (
                                <Button variant="link" className="w-full">
                                    View all {alerts.length} alerts →
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Critical Vitals */}
            {stats.criticalVitals > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-destructive" />
                            Critical Vital Signs ({stats.criticalVitals})
                        </CardTitle>
                        <CardDescription>Patients with abnormal vital signs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/nurse/vital-signs">
                            <Button variant="outline" className="w-full">
                                View Critical Vitals
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
