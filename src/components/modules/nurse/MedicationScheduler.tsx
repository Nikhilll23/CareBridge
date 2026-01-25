'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { scheduleMedication, updateMedicationDetails, MedicationData } from '@/actions/nursing/medication-administration'
import { searchPatients } from '@/actions/patients'
import { toast } from 'sonner'
import { Pill, Search, User } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface MedicationSchedulerProps {
    open: boolean
    onClose: () => void
    patientId: string
    patientName: string
    onSuccess?: () => void
    editData?: any // Data for editing
}

export function MedicationScheduler({ open, onClose, patientId: initialPatientId, patientName: initialPatientName, onSuccess, editData }: MedicationSchedulerProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        medication_name: '',
        dosage: '',
        route: 'oral',
        frequency: 'once',
        scheduled_time: '',
        notes: ''
    })

    // Patient Search State
    const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || '')
    const [selectedPatientName, setSelectedPatientName] = useState<string>(initialPatientName || 'Select Patient')
    const [patientQuery, setPatientQuery] = useState('')
    const [foundPatients, setFoundPatients] = useState<any[]>([])

    // Initialize/Reset form state
    useEffect(() => {
        if (open) {
            if (editData) {
                // Edit Mode
                setSelectedPatientId(editData.patient?.id || editData.patient_id)
                setSelectedPatientName(editData.patient ? `${editData.patient.first_name} ${editData.patient.last_name}` : 'Unknown Patient')

                const timeStr = editData.scheduled_time
                    ? new Date(editData.scheduled_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : ''

                setFormData({
                    medication_name: editData.medication_name || '',
                    dosage: editData.dosage || '',
                    route: editData.route || 'oral',
                    frequency: 'once',
                    scheduled_time: timeStr,
                    notes: editData.notes || ''
                })
            } else {
                // Create Mode
                setSelectedPatientId(initialPatientId || '')
                setSelectedPatientName(initialPatientName || 'Select Patient')
                setPatientQuery('')
                setFoundPatients([])
                setFormData({
                    medication_name: '',
                    dosage: '',
                    route: 'oral',
                    frequency: 'once',
                    scheduled_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    notes: ''
                })
            }
        }
    }, [open, initialPatientId, initialPatientName, editData])

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
        setFoundPatients([])
        setPatientQuery('')
    }

    const clearPatient = () => {
        setSelectedPatientId('')
        setSelectedPatientName('Select Patient')
        setPatientQuery('')
    }

    const handleSubmit = async () => {
        if (!selectedPatientId) {
            toast.error('Please select a patient first')
            return
        }

        if (!formData.medication_name || !formData.dosage || !formData.scheduled_time) {
            toast.error('Please fill in all required fields')
            return
        }

        setLoading(true)
        try {
            const scheduledDate = new Date()
            const [hours, minutes] = formData.scheduled_time.split(':')
            scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

            const payload: any = {
                patientId: selectedPatientId,
                medicationName: formData.medication_name,
                dosage: formData.dosage,
                route: formData.route as any,
                scheduledTime: scheduledDate.toISOString(),
                notes: formData.notes
            }

            let result
            if (editData) {
                result = await updateMedicationDetails(editData.id, payload)
            } else {
                result = await scheduleMedication(payload)
            }

            if (result.success) {
                toast.success(editData ? 'Medication updated' : 'Medication scheduled')
                onSuccess?.()
                onClose()
            } else {
                toast.error(result.error || 'Operation failed')
            }

        } catch (error: any) {
            console.error(error)
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const isPatientSelected = !!selectedPatientId && selectedPatientId !== ''
    const isEditMode = !!editData

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] overflow-visible">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pill className="h-5 w-5" />
                        {isEditMode ? 'Edit Medication' : 'Schedule Medication'} - {selectedPatientName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Patient Selection (Disabled in Edit Mode) */}
                    {!isPatientSelected && !isEditMode ? (
                        <div className="space-y-2 relative border p-3 rounded-lg bg-muted/20">
                            <Label className="text-primary font-semibold">Select Patient</Label>
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
                                <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto shadow-lg border-2">
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
                        <div className="flex items-center justify-between p-2 border rounded-lg bg-secondary/50">
                            <span className="text-sm font-medium ml-2">{selectedPatientName}</span>
                            {!isEditMode && (
                                <Button variant="ghost" size="sm" onClick={clearPatient} className="h-8 text-muted-foreground hover:text-destructive">
                                    Change
                                </Button>
                            )}
                        </div>
                    )}

                    <div className={`space-y-4 transition-opacity ${!isPatientSelected ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="space-y-2">
                            <Label>Medication Name *</Label>
                            <Input
                                placeholder="e.g. Amoxicillin"
                                value={formData.medication_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, medication_name: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dosage *</Label>
                                <Input
                                    placeholder="e.g. 500mg"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Route</Label>
                                <Select
                                    value={formData.route}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, route: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="oral">Oral (PO)</SelectItem>
                                        <SelectItem value="iv">Intravenous (IV)</SelectItem>
                                        <SelectItem value="im">Intramuscular (IM)</SelectItem>
                                        <SelectItem value="sc">Subcutaneous (SC)</SelectItem>
                                        <SelectItem value="topical">Topical</SelectItem>
                                        <SelectItem value="inhalation">Inhalation</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Scheduled Time *</Label>
                            <Input
                                type="time"
                                value={formData.scheduled_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !isPatientSelected}>
                        {loading ? 'Saving...' : (isEditMode ? 'Update Medication' : 'Schedule')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
