'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAllRecentVitalSigns } from '@/actions/nursing/vital-signs'
import { Plus, Activity, Thermometer, Heart, Wind, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { VitalSignsRecorder } from './VitalSignsRecorder'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function VitalSignsClient() {
    const [vitals, setVitals] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showRecorder, setShowRecorder] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<any>(null) // For future filtering

    useEffect(() => {
        loadVitals()
    }, [])

    const loadVitals = async () => {
        try {
            const result = await getAllRecentVitalSigns()

            if (!result.success) throw new Error(result.error)

            setVitals(result.data || [])
        } catch (error: any) {
            console.error('Error loading vitals:', error)
            toast.error('Failed to load vital signs')
        } finally {
            setLoading(false)
        }
    }

    // Format data for a simple overview chart (latest 10)
    const chartData = vitals.slice(0, 10).reverse().map(v => ({
        name: v.patient?.first_name,
        sys: v.blood_pressure_systolic,
        dia: v.blood_pressure_diastolic,
        hr: v.heart_rate
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Vital Signs</h1>
                    <p className="text-muted-foreground">Monitor patient health metrics</p>
                </div>
                <Button onClick={() => setShowRecorder(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Vitals
                </Button>
            </div>

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Heart className="h-4 w-4 text-red-500" />
                            Avg Heart Rate (Today)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {vitals.length > 0
                                ? Math.round(vitals.reduce((acc, curr) => acc + (curr.heart_rate || 0), 0) / vitals.length)
                                : '-'} bpm
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Thermometer className="h-4 w-4 text-orange-500" />
                            Avg Temperature
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {vitals.length > 0
                                ? (vitals.reduce((acc, curr) => acc + (curr.temperature || 0), 0) / vitals.length).toFixed(1)
                                : '-'} °C
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" />
                            Recent Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vitals.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Data View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Feed - Left Side (2 cols) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Observations</CardTitle>
                        <CardDescription>Latest vital sign records from all patients</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : vitals.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No vital signs recorded yet.</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>BP</TableHead>
                                            <TableHead>HR</TableHead>
                                            <TableHead>Temp</TableHead>
                                            <TableHead>O2</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {vitals.map((record) => {
                                            const isCritical = record.is_critical // Assuming this field exists or we calculate it

                                            // Simple critical check if flag not present
                                            const criticalStatus = isCritical ||
                                                (record.blood_pressure_systolic > 140 ||
                                                    record.blood_pressure_systolic < 90 ||
                                                    record.heart_rate > 100 ||
                                                    record.heart_rate < 60 ||
                                                    record.oxygen_saturation < 95)

                                            return (
                                                <TableRow key={record.id}>
                                                    <TableCell suppressHydrationWarning>
                                                        {new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        <div className="text-xs text-muted-foreground">
                                                            {new Date(record.recorded_at).toLocaleDateString()}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {record.patient?.first_name} {record.patient?.last_name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {record.patient?.uhid}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {record.blood_pressure_systolic}/{record.blood_pressure_diastolic}
                                                    </TableCell>
                                                    <TableCell>{record.heart_rate} bpm</TableCell>
                                                    <TableCell>{record.temperature}°C</TableCell>
                                                    <TableCell>{record.oxygen_saturation}%</TableCell>
                                                    <TableCell>
                                                        {criticalStatus ? (
                                                            <Badge variant="destructive">Critical</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                                                                Normal
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Patient Trends - Right Side (1 col) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Overview Trends</CardTitle>
                        <CardDescription>Recent patient vitals snapshot</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} interval={0} />
                                    <YAxis fontSize={10} domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="sys" stroke="#ef4444" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="hr" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex gap-4 justify-center text-xs text-muted-foreground mt-4">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div> BP (Sys)
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Heart Rate
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recorder Dialog */}
            {showRecorder && (
                <VitalSignsRecorder
                    open={showRecorder}
                    onClose={() => setShowRecorder(false)}
                    patientId="" // TODO: Need patient selection logic in real app, dialog handles it for now or accepts empty
                    patientName="Select Patient"
                    onSuccess={loadVitals}
                />
            )}
        </div>
    )
}
