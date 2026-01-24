'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, DollarSign, AlertCircle, UserPlus, Receipt } from 'lucide-react'
import Link from 'next/link'

interface ReceptionistDashboardClientProps {
    stats: any
}

export function ReceptionistDashboardClient({ stats }: ReceptionistDashboardClientProps) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Receptionist Dashboard</h1>
                <p className="text-muted-foreground">Manage appointments and billing</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.todaysAppointments || 0}</div>
                        <p className="text-xs text-muted-foreground">Scheduled for today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats?.todaysRevenue?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">Collected today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.pendingPayments || 0}</div>
                        <p className="text-xs text-muted-foreground">Awaiting payment</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <Link href="/dashboard/receptionist/appointments">
                        <Button className="w-full h-24" variant="outline">
                            <div className="flex flex-col items-center gap-2">
                                <Calendar className="h-8 w-8" />
                                <span className="text-lg">Schedule Appointment</span>
                            </div>
                        </Button>
                    </Link>

                    <Link href="/dashboard/receptionist/billing">
                        <Button className="w-full h-24" variant="outline">
                            <div className="flex flex-col items-center gap-2">
                                <Receipt className="h-8 w-8" />
                                <span className="text-lg">Billing Counter</span>
                            </div>
                        </Button>
                    </Link>

                    <Link href="/dashboard/patients">
                        <Button className="w-full h-24" variant="outline">
                            <div className="flex flex-col items-center gap-2">
                                <UserPlus className="h-8 w-8" />
                                <span className="text-lg">Register Patient</span>
                            </div>
                        </Button>
                    </Link>

                    <Link href="/dashboard/receptionist/payments">
                        <Button className="w-full h-24" variant="outline">
                            <div className="flex flex-col items-center gap-2">
                                <DollarSign className="h-8 w-8" />
                                <span className="text-lg">View Payments</span>
                            </div>
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
