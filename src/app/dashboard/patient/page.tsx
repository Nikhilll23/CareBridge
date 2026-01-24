import { getPatientPortalData } from '@/actions/patient-portal'
import { QuickBook } from '@/components/modules/patient/QuickBook'
import { SymptomLogger } from '@/components/modules/patient/SymptomLogger'
import { PatientPaymentSection } from '@/components/modules/patient/PatientPaymentSection'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { Calendar, FileText, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function PatientDashboard() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const data = await getPatientPortalData()

    if (!data) {
        return (
            <div className="container mx-auto p-8 max-w-4xl">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg text-center">
                    <h2 className="text-lg font-semibold mb-2">Profile Not Linked</h2>
                    <p>
                        We couldn't find a patient record with the email <strong>{user.emailAddresses[0]?.emailAddress}</strong>.
                    </p>
                    <p className="mt-2 text-sm">
                        Please contact the hospital administration to update your file.
                    </p>
                </div>
            </div>
        )
    }

    const { patient, todaysAppointments, futureAppointments, past, totalDue, availableDoctors, invoices } = data
    const nextFutureVisit = futureAppointments[0]

    console.log('--- Patient Dashboard Debug ---')
    console.log('Patient ID:', patient.id)
    console.log('Total Due:', totalDue)
    console.log('Invoices Count:', invoices?.length)
    console.log('Todays Appointments:', todaysAppointments?.length)
    console.log('-------------------------------')

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Health Portal</h1>
                    <p className="text-muted-foreground">Welcome back, {patient.first_name} {patient.last_name}</p>
                </div>

                <PatientPaymentSection patientId={patient.id} totalDue={totalDue} />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Today's Appointments Card */}
                <Card className="md:col-span-2 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Calendar className="h-5 w-5" />
                            Today's Appointments {todaysAppointments.length > 0 && `(${todaysAppointments.length})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todaysAppointments.length > 0 ? (
                            <div className="space-y-3">
                                {todaysAppointments.map((appt: any) => (
                                    <div key={appt.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                                        <div>
                                            <p className="text-lg font-bold">{format(new Date(appt.appointment_date), 'h:mm a')}</p>
                                            <p className="text-sm text-muted-foreground">{appt.reason || 'General Checkup'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{appt.doctor?.first_name ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}` : 'Doctor Assigned'}</p>
                                            <Badge className="mt-1">{appt.status}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : nextFutureVisit ? (
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">No appointments today. Next appointment:</p>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <p className="text-2xl font-bold">{format(new Date(nextFutureVisit.appointment_date), 'EEEE, MMMM do')}</p>
                                        <p className="text-lg text-muted-foreground">{format(new Date(nextFutureVisit.appointment_date), 'h:mm a')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{nextFutureVisit.doctor?.first_name ? `Dr. ${nextFutureVisit.doctor.first_name} ${nextFutureVisit.doctor.last_name}` : 'Doctor Assigned'}</p>
                                        <p className="text-sm text-muted-foreground">{nextFutureVisit.type || 'General Checkup'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 text-center text-muted-foreground">
                                No upcoming appointments.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Book */}
                <div className="md:row-span-2 space-y-6">
                    <QuickBook doctors={availableDoctors} />
                    <SymptomLogger />
                </div>

                {/* Overview Tabs */}
                <div className="md:col-span-2">
                    <Tabs defaultValue="appointments" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="appointments">My History</TabsTrigger>
                            <TabsTrigger value="overview">Medical Profile</TabsTrigger>
                            <TabsTrigger value="documents">Documents</TabsTrigger>
                        </TabsList>

                        <TabsContent value="appointments" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Recent Visits</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {past.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No past records found.</p>
                                        ) : (
                                            past.map((appt: any) => (
                                                <div key={appt.id} className="flex justify-between items-center border-b last:border-0 pb-3 last:pb-0">
                                                    <div>
                                                        <p className="font-medium">{format(new Date(appt.appointment_date), 'MMM d, yyyy')}</p>
                                                        <p className="text-sm text-muted-foreground">{appt.reason || 'Routine Visit'}</p>
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        {appt.status}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="overview" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Personal Info</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Blood Type</p>
                                            <p className="font-medium">{patient.blood_type || 'Unknown'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Allergies</p>
                                            <p className="font-medium">{patient.allergies || 'None Recorded'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Chronic Conditions</p>
                                            <p className="font-medium text-amber-600">{patient.chronic_conditions || 'None'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents" className="mt-4">
                            <Card>
                                <CardContent className="p-8 text-center text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No documents available yet.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
