'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Clock, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { ConsultationManager } from './ConsultationManager'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface DoctorDashboardClientProps {
    stats: any
    appointments: any[]
    doctorName: string
}

export function DoctorDashboardClient({ stats, appointments, doctorName }: DoctorDashboardClientProps) {
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, Dr. {doctorName}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Queue</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.queue}</div>
                        <p className="text-xs text-muted-foreground">Scheduled for today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingReports}</div>
                        <p className="text-xs text-muted-foreground">Radiology reports to review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPatients}</div>
                        <p className="text-xs text-muted-foreground">All time unique visits</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {appointments.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No appointments scheduled for today.</p>
                            ) : (
                                appointments.map((appt) => (
                                    <div key={appt.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                {appt.patients?.first_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium">{appt.patients?.first_name} {appt.patients?.last_name}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>{format(new Date(appt.appointment_date), 'h:mm a')}</span>
                                                    <span>•</span>
                                                    <span>{appt.reason || 'Regular Checkup'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge variant={appt.status === 'COMPLETED' ? 'secondary' : 'default'}>
                                                {appt.status}
                                            </Badge>

                                            {appt.status === 'SCHEDULED' && (
                                                <Button size="sm" onClick={() => setSelectedAppointment(appt)}>
                                                    <PlayCircle className="h-4 w-4 mr-2" />
                                                    Start Consult
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {selectedAppointment && (
                <ConsultationManager
                    isOpen={!!selectedAppointment}
                    onClose={() => setSelectedAppointment(null)}
                    appointment={selectedAppointment}
                />
            )}
        </div>
    )
}
