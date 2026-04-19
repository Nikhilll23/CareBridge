import { getPatientPortalData } from '@/actions/patient-portal'
import { QuickBook } from '@/components/modules/patient/QuickBook'
import { SymptomLogger } from '@/components/modules/patient/SymptomLogger'
import { PatientPaymentSection } from '@/components/modules/patient/PatientPaymentSection'
import { PrescriptionCard } from '@/components/modules/patient/PrescriptionCard'
import { safeCurrentUser } from '@/lib/auth-safe'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { safeFormat } from '@/lib/date'
import { Calendar, FileText, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function PatientDashboard() {
    const user = await safeCurrentUser()
    if (!user) redirect('/sign-in')

    const data = await getPatientPortalData()

    if (!data || 'error' in data) {
        return (
            <div className="container mx-auto p-8 max-w-4xl">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg text-center">
                    <h2 className="text-lg font-semibold mb-2">Patient Dashboard Unavailable</h2>
                    <p className="font-medium text-red-600 mb-2">
                        {data?.error || 'Database connection unreachable'}
                    </p>
                    <p className="text-sm">
                        This is usually a temporary issue with your profile synchronization or network.
                    </p>
                    <p className="mt-2 text-xs opacity-70">
                        Technical Hint: Verify SUPABASE_SERVICE_ROLE_KEY and RLS policies.
                    </p>
                    <a href="/dashboard/patient" className="mt-6 inline-block px-4 py-2 bg-yellow-700 text-white rounded-md text-sm hover:bg-yellow-800">
                        Try Again
                    </a>
                </div>
            </div>
        )
    }

    const { 
        patient, 
        todaysAppointments = [], 
        futureAppointments = [], 
        totalDue = 0, 
        availableDoctors = [] as any[], 
        invoices = [] as any[], 
        prescriptions = [] as any[], 
        medicalReports = [] as any[], 
        handwrittenNotes = [] as any[] 
    } = data as any
    
    const nextFutureVisit = (futureAppointments as any[])?.[0]

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
                            All Appointments {todaysAppointments.length > 0 && `(${todaysAppointments.length})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todaysAppointments.length > 0 ? (
                            <div className="space-y-3">
                                {todaysAppointments.map((appt: any) => (
                                    <div key={appt.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                                        <div>
                                            <p className="text-lg font-bold">{safeFormat(appt.appointment_date, 'h:mm a')}</p>
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
                                        <p className="text-2xl font-bold">{safeFormat(nextFutureVisit.appointment_date, 'EEEE, MMMM do')}</p>
                                        <p className="text-lg text-muted-foreground">{safeFormat(nextFutureVisit.appointment_date, 'h:mm a')}</p>
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
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="appointments">My History</TabsTrigger>
                            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                            <TabsTrigger value="overview">Medical Profile</TabsTrigger>
                            <TabsTrigger value="documents">Documents</TabsTrigger>
                        </TabsList>

                        <TabsContent value="appointments" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Past Visits</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {todaysAppointments.filter((a: any) => a.status === 'COMPLETED').length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No past records found.</p>
                                        ) : (
                                            todaysAppointments
                                                .filter((a: any) => a.status === 'COMPLETED')
                                                .map((appt: any) => (
                                                    <div key={appt.id} className="flex justify-between items-center border-b last:border-0 pb-3 last:pb-0">
                                                        <div>
                                                            <p className="font-medium">{safeFormat(appt.appointment_date, 'MMM d, yyyy')}</p>
                                                            <p className="text-sm text-muted-foreground">{appt.reason || 'Routine Visit'}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {appt.doctor ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}` : ''}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="prescriptions" className="mt-4">
                            <PrescriptionCard
                                prescriptions={prescriptions}
                                patientName={`${patient.first_name} ${patient.last_name}`}
                            />
                        </TabsContent>

                        <TabsContent value="overview" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Personal Info</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Full Name</p>
                                            <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Gender</p>
                                            <p className="font-medium">{patient.gender || 'Not set'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Date of Birth</p>
                                            <p className="font-medium">{safeFormat(patient.date_of_birth, 'MMM d, yyyy')}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Contact</p>
                                            <p className="font-medium">{patient.contact_number || 'Not set'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Blood Type</p>
                                            <p className="font-medium">{patient.blood_type || <span className="text-muted-foreground italic">Not recorded</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Allergies</p>
                                            <p className="font-medium">{patient.allergies || <span className="text-muted-foreground italic">None recorded</span>}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-muted-foreground">Chronic Conditions</p>
                                            <p className="font-medium text-amber-600">{patient.chronic_conditions || <span className="text-muted-foreground italic not-italic">None recorded</span>}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-muted-foreground">Address</p>
                                            <p className="font-medium">{patient.address || 'Not set'}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-2 border-t">To update your medical profile, contact hospital administration or visit the Settings page.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents" className="mt-4">
                            <div className="space-y-4">
                                {/* Medical Reports */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FileText className="h-4 w-4" /> Medical Reports
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {medicalReports.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No reports sent yet.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {medicalReports.map((r: any) => (
                                                    <div key={r.id} className="flex justify-between items-center border-b last:border-0 pb-3 last:pb-0">
                                                        <div>
                                                            <p className="font-medium">{r.title || r.report_type}</p>
                                                            <p className="text-xs text-muted-foreground">{safeFormat(r.created_at, 'MMM d, yyyy')}</p>
                                                        </div>
                                                        {r.file_url && (
                                                            <a href={r.file_url} target="_blank" rel="noreferrer">
                                                                <Button size="sm" variant="outline">View</Button>
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Handwritten Notes */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Activity className="h-4 w-4" /> Doctor's Notes
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {handwrittenNotes.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No notes available.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {handwrittenNotes.map((note: any) => (
                                                    <a key={note.id} href={note.image_data} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                                                        <img src={note.image_data} alt={note.title} className="w-full h-28 object-cover" />
                                                        <div className="p-2">
                                                            <p className="text-xs font-medium truncate">{note.title || note.note_type}</p>
                                                            <p className="text-xs text-muted-foreground">{safeFormat(note.created_at, 'MMM d, yyyy')}</p>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
