'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getTodaysMedications, administerMedication, deleteMedication } from '@/actions/nursing/medication-administration'
import { Plus, Clock, CheckCircle, XCircle, AlertCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MedicationScheduler } from './MedicationScheduler'

export function MedicationsClient() {
    const [medications, setMedications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, pending: 0, administered: 0, missed: 0 })
    const [showScheduler, setShowScheduler] = useState(false)
    const [selectedMedication, setSelectedMedication] = useState<any>(null)

    useEffect(() => {
        loadMedications()
    }, [])

    const loadMedications = async () => {
        try {
            const result = await getTodaysMedications()

            if (!result.success) throw new Error(result.error)

            const data = result.data || []
            setMedications(data)

            // Calculate stats
            const total = data.length
            const pending = data.filter((m: any) => m.status === 'scheduled').length
            const administered = data.filter((m: any) => m.status === 'administered').length
            const missed = data.filter((m: any) => m.status === 'missed').length

            setStats({ total, pending, administered, missed })
        } catch (error: any) {
            console.error('Error loading medications:', error)
            toast.error('Failed to load medications')
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: any = {
            scheduled: { variant: 'secondary', icon: Clock, label: 'Scheduled' },
            administered: { variant: 'default', icon: CheckCircle, label: 'Administered' },
            missed: { variant: 'destructive', icon: XCircle, label: 'Missed' },
            refused: { variant: 'destructive', icon: AlertCircle, label: 'Refused' },
            held: { variant: 'outline', icon: AlertCircle, label: 'Held' }
        }

        const config = variants[status] || variants.scheduled
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Medication Administration Record (MAR)</h1>
                    <p className="text-muted-foreground">Today's medication schedule</p>
                </div>
                <Button onClick={() => setShowScheduler(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Medication
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Administered</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.administered}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Missed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.missed}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Medications Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Today's Medications</CardTitle>
                    <CardDescription>Schedule and track medication administration</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-muted-foreground">Loading medications...</p>
                        </div>
                    ) : medications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No medications scheduled for today</p>
                            <Button variant="outline" className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Schedule First Medication
                            </Button>
                        </div>
                    ) : (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Patient</TableHead>
                                        <TableHead>Medication</TableHead>
                                        <TableHead>Dose</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {medications.map((med) => (
                                        <TableRow key={med.id}>
                                            <TableCell className="font-medium">
                                                {new Date(med.scheduled_time).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                {med.patient?.first_name} {med.patient?.last_name}
                                            </TableCell>
                                            <TableCell className="font-semibold">{med.medication_name}</TableCell>
                                            <TableCell>{med.dosage}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{med.route}</Badge>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(med.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {med.status === 'scheduled' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={async () => {
                                                                try {
                                                                    const result = await administerMedication(med.id)
                                                                    if (result.success) {
                                                                        toast.success('Medication administered')
                                                                        loadMedications()
                                                                    } else {
                                                                        toast.error(result.error)
                                                                    }
                                                                } catch (err) {
                                                                    toast.error('Failed to administer medication')
                                                                }
                                                            }}
                                                        >
                                                            Administer
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedMedication(med)
                                                            setShowScheduler(true)
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4 text-muted-foreground" />
                                                    </Button>

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={async () => {
                                                            if (confirm('Are you sure you want to delete this medication schedule?')) {
                                                                try {
                                                                    const result = await deleteMedication(med.id)
                                                                    if (result.success) {
                                                                        toast.success('Medication deleted')
                                                                        loadMedications()
                                                                    } else {
                                                                        toast.error(result.error)
                                                                    }
                                                                } catch (err) {
                                                                    toast.error('Failed to delete medication')
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Scheduler Modal */}
            {showScheduler && (
                <MedicationScheduler
                    open={showScheduler}
                    onClose={() => {
                        setShowScheduler(false)
                        setSelectedMedication(null)
                    }}
                    patientId=""
                    patientName="Select Patient"
                    editData={selectedMedication}
                    onSuccess={loadMedications}
                />
            )}
        </div>
    )
}
