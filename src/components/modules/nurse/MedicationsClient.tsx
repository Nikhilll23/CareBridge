'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function MedicationsClient() {
    const [medications, setMedications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, pending: 0, administered: 0, missed: 0 })

    useEffect(() => {
        loadMedications()
    }, [])

    const loadMedications = async () => {
        try {
            const supabase = createClient()
            const today = new Date().toISOString().split('T')[0]

            // Get today's medications
            const { data, error } = await supabase
                .from('medication_administration')
                .select(`
                    *,
                    patient:patients(first_name, last_name)
                `)
                .gte('scheduled_time', `${today}T00:00:00`)
                .lte('scheduled_time', `${today}T23:59:59`)
                .order('scheduled_time', { ascending: true })

            if (error) throw error

            setMedications(data || [])

            // Calculate stats
            const total = data?.length || 0
            const pending = data?.filter(m => m.status === 'scheduled').length || 0
            const administered = data?.filter(m => m.status === 'administered').length || 0
            const missed = data?.filter(m => m.status === 'missed').length || 0

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
                <Button>
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
                                                {med.status === 'scheduled' && (
                                                    <Button size="sm" variant="outline">
                                                        Administer
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
