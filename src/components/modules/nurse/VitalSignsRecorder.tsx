'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { recordVitalSigns, VitalSignsData } from '@/actions/nursing/vital-signs'
import { searchPatients } from '@/actions/patients'
import { toast } from 'sonner'
import { AlertTriangle, Activity, History as HistoryIcon, Search, User, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'

interface VitalSignsRecorderProps {
    open: boolean
    onClose: () => void
    patientId: string
    patientName: string
    appointmentId?: string
    onSuccess?: () => void
}

export function VitalSignsRecorder({ open, onClose, patientId, patientName, appointmentId, onSuccess }: VitalSignsRecorderProps) {
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<any[]>([])
    const [view, setView] = useState<'record' | 'history'>('record')

    // Core State
    const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '')
    const [selectedPatientName, setSelectedPatientName] = useState<string>(patientName || 'Select Patient')

    // Form Data
    const [formData, setFormData] = useState<Partial<VitalSignsData>>({
        patientId: patientId || '',
        appointmentId
    })
    const [criticalAlerts, setCriticalAlerts] = useState<string[]>([])

    // Search State
    const [patientQuery, setPatientQuery] = useState('')
    const [foundPatients, setFoundPatients] = useState<any[]>([])

    // Effects
    useEffect(() => {
        if (open) {
            // Reset state on open if props changed, or just ensure sync
            setSelectedPatientId(patientId || '')
            setSelectedPatientName(patientName || 'Select Patient')
            setFormData(prev => ({ ...prev, patientId: patientId || '', appointmentId }))
            setPatientQuery('')
            setFoundPatients([])

            if (patientId) {
                loadHistory(patientId)
            } else {
                setHistory([])
            }
        }
    }, [open, patientId, patientName, appointmentId])

    const loadHistory = async (id: string) => {
        const supabase = createClient()
        const { data } = await supabase
            .from('vital_signs')
            .select('*')
            .eq('patient_id', id)
            .order('recorded_at', { ascending: true })
            .limit(20)

        if (data) setHistory(data)
    }

    const handleSearchPatients = async (query: string) => {
        setPatientQuery(query)
        if (query.length > 2) {
            const results = await searchPatients(query)
            setFoundPatients(results)
        } else {
            setFoundPatients([])
        }
    }

    const selectPatient = (patient: any) => {
        setSelectedPatientId(patient.id)
        setSelectedPatientName(`${patient.first_name} ${patient.last_name}`)
        setFormData(prev => ({ ...prev, patientId: patient.id }))
        setFoundPatients([])
        setPatientQuery('')
        loadHistory(patient.id)
    }

    const clearPatient = () => {
        setSelectedPatientId('')
        setSelectedPatientName('Select Patient')
        setFormData(prev => ({ ...prev, patientId: '' }))
        setHistory([])
        setPatientQuery('')
    }

    const updateField = (field: keyof VitalSignsData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value ? parseFloat(value) : undefined }))
    }

    const handleSubmit = async () => {
        if (!formData.patientId) {
            toast.error('Please select a patient first')
            return
        }

        setLoading(true)
        setCriticalAlerts([])

        try {
            const result = await recordVitalSigns(formData as VitalSignsData)

            if (result.success) {
                if (result.isCritical && result.alerts) {
                    setCriticalAlerts(result.alerts)
                    toast.warning('Critical vital signs detected!', {
                        description: `${result.alerts.length} alert(s) created`
                    })
                } else {
                    toast.success('Vital signs recorded successfully')
                    onClose()
                }

                onSuccess?.()
                // Reset form values but keep patient
                setFormData(prev => ({
                    ...prev,
                    temperature: undefined,
                    bloodPressureSystolic: undefined,
                    bloodPressureDiastolic: undefined,
                    heartRate: undefined,
                    respiratoryRate: undefined,
                    oxygenSaturation: undefined,
                    weight: undefined,
                    height: undefined,
                    painScale: undefined,
                    notes: undefined
                }))
                // Refresh history
                loadHistory(formData.patientId!)
            } else {
                toast.error(result.error || 'Failed to record vital signs')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    // Chart Data
    const chartData = history.map(h => ({
        time: new Date(h.recorded_at).toLocaleDateString(),
        bp_sys: h.blood_pressure_systolic,
        bp_dia: h.blood_pressure_diastolic,
        hr: h.heart_rate,
        temp: h.temperature
    }))

    const isPatientSelected = !!selectedPatientId && selectedPatientId !== ''

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Vital Signs - {selectedPatientName}
                    </DialogTitle>
                </DialogHeader>

                {/* Patient Selection Section */}
                <div className="space-y-4">
                    {!isPatientSelected ? (
                        <div className="space-y-2 relative border p-4 rounded-lg bg-muted/20">
                            <Label className="text-primary font-semibold">Step 1: Select Patient</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-8 bg-background"
                                    placeholder="Search by name or UHID..."
                                    value={patientQuery}
                                    onChange={(e) => handleSearchPatients(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {foundPatients.length > 0 && (
                                <Card className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto shadow-lg border-2">
                                    <div className="p-1">
                                        {foundPatients.map(patient => (
                                            <div
                                                key={patient.id}
                                                className="p-3 hover:bg-accent rounded cursor-pointer flex items-center gap-3 transition-colors"
                                                onClick={() => selectPatient(patient)}
                                            >
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">UHID: {patient.uhid}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 border-green-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-full">
                                    <User className="h-4 w-4 text-green-700" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-green-900">Selected Patient</p>
                                    <p className="text-sm text-green-700">{selectedPatientName}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={clearPatient} className="text-muted-foreground hover:text-destructive">
                                Change
                            </Button>
                        </div>
                    )}

                    <Tabs value={view} onValueChange={(v: any) => setView(v)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="record">Record New</TabsTrigger>
                            <TabsTrigger value="history" disabled={!isPatientSelected}>History & Trends</TabsTrigger>
                        </TabsList>

                        <TabsContent value="record" className="space-y-4 py-4">
                            {criticalAlerts.length > 0 && (
                                <div className="bg-destructive/10 border border-destructive rounded-lg p-4 space-y-2">
                                    <div className="flex items-center gap-2 font-semibold text-destructive">
                                        <AlertTriangle className="h-5 w-5" />
                                        Critical Values Detected
                                    </div>
                                    {criticalAlerts.map((alert, idx) => (
                                        <p key={idx} className="text-sm text-destructive">{alert}</p>
                                    ))}
                                </div>
                            )}

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${!isPatientSelected ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                {/* Temperature */}
                                <div className="space-y-2 p-4 border rounded-lg bg-card shadow-sm">
                                    <Label className="text-base flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-orange-500" />
                                        Temperature (°C)
                                    </Label>
                                    <div className="flex items-end gap-2">
                                        <Input
                                            className="text-2xl h-12 font-mono"
                                            type="number"
                                            step="0.1"
                                            placeholder="36.5"
                                            value={formData.temperature || ''}
                                            onChange={(e) => updateField('temperature', e.target.value)}
                                        />
                                        <span className="text-muted-foreground mb-3">°C</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Normal: 36.1-37.2°C</p>
                                </div>

                                {/* Blood Pressure */}
                                <div className="space-y-2 p-4 border rounded-lg bg-card shadow-sm">
                                    <Label className="text-base flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-red-500" />
                                        Blood Pressure (mmHg)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            className="text-2xl h-12 font-mono"
                                            type="number"
                                            placeholder="120"
                                            value={formData.bloodPressureSystolic || ''}
                                            onChange={(e) => updateField('bloodPressureSystolic', e.target.value)}
                                        />
                                        <span className="text-2xl text-muted-foreground">/</span>
                                        <Input
                                            className="text-2xl h-12 font-mono"
                                            type="number"
                                            placeholder="80"
                                            value={formData.bloodPressureDiastolic || ''}
                                            onChange={(e) => updateField('bloodPressureDiastolic', e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Normal: 90-120 / 60-80</p>
                                </div>

                                {/* Heart Rate */}
                                <div className="space-y-2 p-4 border rounded-lg bg-card shadow-sm">
                                    <Label className="text-base flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-pink-500" />
                                        Heart Rate (bpm)
                                    </Label>
                                    <div className="flex items-end gap-2">
                                        <Input
                                            className="text-2xl h-12 font-mono"
                                            type="number"
                                            placeholder="72"
                                            value={formData.heartRate || ''}
                                            onChange={(e) => updateField('heartRate', e.target.value)}
                                        />
                                        <span className="text-muted-foreground mb-3">bpm</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Normal: 60-100 bpm</p>
                                </div>

                                {/* SpO2 */}
                                <div className="space-y-2 p-4 border rounded-lg bg-card shadow-sm">
                                    <Label className="text-base flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-blue-500" />
                                        Oxygen Saturation (%)
                                    </Label>
                                    <div className="flex items-end gap-2">
                                        <Input
                                            className="text-2xl h-12 font-mono"
                                            type="number"
                                            step="0.1"
                                            placeholder="98"
                                            value={formData.oxygenSaturation || ''}
                                            onChange={(e) => updateField('oxygenSaturation', e.target.value)}
                                        />
                                        <span className="text-muted-foreground mb-3">%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Normal: ≥95%</p>
                                </div>

                                {/* Other Metrics */}
                                <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Resp. Rate</Label>
                                        <Input
                                            className="font-mono bg-card"
                                            type="number"
                                            placeholder="16"
                                            value={formData.respiratoryRate || ''}
                                            onChange={(e) => updateField('respiratoryRate', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Weight (kg)</Label>
                                        <Input
                                            className="font-mono bg-card"
                                            type="number"
                                            step="0.1"
                                            placeholder="70"
                                            value={formData.weight || ''}
                                            onChange={(e) => updateField('weight', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pain (0-10)</Label>
                                        <Input
                                            className="font-mono bg-card"
                                            type="number"
                                            min="0"
                                            max="10"
                                            placeholder="0"
                                            value={formData.painScale || ''}
                                            onChange={(e) => updateField('painScale', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-6 pt-4 border-t">
                                <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={loading || !isPatientSelected}>
                                    {loading ? 'Recording...' : 'Record Vital Signs'}
                                </Button>
                            </DialogFooter>
                        </TabsContent>

                        <TabsContent value="history" className="h-[400px]">
                            {history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis dataKey="time" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="bp_sys" stroke="#ef4444" name="Systolic BP" strokeWidth={2} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="bp_dia" stroke="#f97316" name="Diastolic BP" strokeWidth={2} />
                                        <Line type="monotone" dataKey="hr" stroke="#3b82f6" name="Heart Rate" strokeWidth={2} />
                                        <Line type="monotone" dataKey="temp" stroke="#10b981" name="Temp" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-8 text-center border-2 border-dashed rounded-lg">
                                    <HistoryIcon className="h-10 w-10 mb-3 opacity-20" />
                                    <p>No history available for this patient.</p>
                                    <p className="text-sm">Record new vitals to see trends here.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
