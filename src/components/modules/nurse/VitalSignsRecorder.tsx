'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { recordVitalSigns, VitalSignsData } from '@/actions/nursing/vital-signs'
import { toast } from 'sonner'
import { AlertTriangle, Activity } from 'lucide-react'

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
    const [formData, setFormData] = useState<Partial<VitalSignsData>>({
        patientId,
        appointmentId
    })
    const [criticalAlerts, setCriticalAlerts] = useState<string[]>([])

    const handleSubmit = async () => {
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
                }

                onSuccess?.()

                // Reset form
                setFormData({ patientId, appointmentId })

                if (!result.isCritical) {
                    onClose()
                }
            } else {
                toast.error(result.error || 'Failed to record vital signs')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const updateField = (field: keyof VitalSignsData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value ? parseFloat(value) : undefined }))
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Record Vital Signs - {patientName}
                    </DialogTitle>
                </DialogHeader>

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

                <div className="grid grid-cols-2 gap-4">
                    {/* Temperature */}
                    <div className="space-y-2">
                        <Label>Temperature (°C)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="36.5"
                            value={formData.temperature || ''}
                            onChange={(e) => updateField('temperature', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Normal: 36.1-37.2°C</p>
                    </div>

                    {/* Blood Pressure */}
                    <div className="space-y-2">
                        <Label>Blood Pressure (mmHg)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder="120"
                                value={formData.bloodPressureSystolic || ''}
                                onChange={(e) => updateField('bloodPressureSystolic', e.target.value)}
                            />
                            <span className="self-center">/</span>
                            <Input
                                type="number"
                                placeholder="80"
                                value={formData.bloodPressureDiastolic || ''}
                                onChange={(e) => updateField('bloodPressureDiastolic', e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Normal: 90-120 / 60-80</p>
                    </div>

                    {/* Heart Rate */}
                    <div className="space-y-2">
                        <Label>Heart Rate (bpm)</Label>
                        <Input
                            type="number"
                            placeholder="72"
                            value={formData.heartRate || ''}
                            onChange={(e) => updateField('heartRate', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Normal: 60-100 bpm</p>
                    </div>

                    {/* Respiratory Rate */}
                    <div className="space-y-2">
                        <Label>Respiratory Rate (breaths/min)</Label>
                        <Input
                            type="number"
                            placeholder="16"
                            value={formData.respiratoryRate || ''}
                            onChange={(e) => updateField('respiratoryRate', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Normal: 12-20 breaths/min</p>
                    </div>

                    {/* Oxygen Saturation */}
                    <div className="space-y-2">
                        <Label>Oxygen Saturation (%)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="98"
                            value={formData.oxygenSaturation || ''}
                            onChange={(e) => updateField('oxygenSaturation', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Normal: ≥95%</p>
                    </div>

                    {/* Weight */}
                    <div className="space-y-2">
                        <Label>Weight (kg)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="70"
                            value={formData.weight || ''}
                            onChange={(e) => updateField('weight', e.target.value)}
                        />
                    </div>

                    {/* Height */}
                    <div className="space-y-2">
                        <Label>Height (cm)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            placeholder="170"
                            value={formData.height || ''}
                            onChange={(e) => updateField('height', e.target.value)}
                        />
                    </div>

                    {/* Pain Scale */}
                    <div className="space-y-2">
                        <Label>Pain Scale (0-10)</Label>
                        <Input
                            type="number"
                            min="0"
                            max="10"
                            placeholder="0"
                            value={formData.painScale || ''}
                            onChange={(e) => updateField('painScale', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">0 = No pain, 10 = Worst pain</p>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                        placeholder="Additional observations or notes..."
                        value={formData.notes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Recording...' : 'Record Vital Signs'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
