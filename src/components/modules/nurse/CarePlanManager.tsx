'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    getActiveCarePlans,
    createCarePlan,
    updateCarePlan,
    discontinueCarePlan,
    completeCarePlan,
    CarePlanData
} from '@/actions/nursing/care-plans'
import { searchPatients } from '@/actions/patients'
import { toast } from 'sonner'
import {
    Plus,
    Search,
    Calendar,
    CheckCircle2,
    XCircle,
    Edit,
    FileText,
    Target,
    ActivitySquare,
    User
} from 'lucide-react'

export function CarePlanManager() {
    const [carePlans, setCarePlans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [editingPlan, setEditingPlan] = useState<any>(null)

    // Form State
    const [patientQuery, setPatientQuery] = useState('')
    const [foundPatients, setFoundPatients] = useState<any[]>([])
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [formData, setFormData] = useState<Partial<CarePlanData>>({
        startDate: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        loadPlans()
    }, [])

    const loadPlans = async () => {
        setLoading(true)
        const result = await getActiveCarePlans()
        if (result.success) {
            setCarePlans(result.data || [])
        } else {
            toast.error('Failed to load care plans')
        }
        setLoading(false)
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
        setSelectedPatient(patient)
        setPatientQuery(`${patient.first_name} ${patient.last_name}`)
        setFoundPatients([])
        setFormData(prev => ({ ...prev, patientId: patient.id }))
    }

    const handleSubmit = async () => {
        if (!formData.patientId || !formData.diagnosis || !formData.goals || !formData.interventions) {
            toast.error('Please fill in all required fields')
            return
        }

        try {
            let result
            if (editingPlan) {
                result = await updateCarePlan(editingPlan.id, formData)
            } else {
                result = await createCarePlan(formData as CarePlanData)
            }

            if (result.success) {
                toast.success(`Care plan ${editingPlan ? 'updated' : 'created'} successfully`)
                setShowDialog(false)
                resetForm()
                loadPlans()
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const handleStatusChange = async (id: string, action: 'complete' | 'discontinue') => {
        try {
            let result
            if (action === 'complete') {
                result = await completeCarePlan(id)
            } else {
                // In a real app we might ask for a reason
                result = await discontinueCarePlan(id, 'Discontinued by nurse')
            }

            if (result.success) {
                toast.success(`Care plan marked as ${action}d`)
                loadPlans()
            } else {
                toast.error('Failed to update status')
            }
        } catch (error) {
            toast.error('An error occurred')
        }
    }

    const openEdit = (plan: any) => {
        setEditingPlan(plan)
        setFormData({
            patientId: plan.patient_id,
            diagnosis: plan.diagnosis,
            goals: plan.goals,
            interventions: plan.interventions,
            startDate: plan.start_date.split('T')[0],
            endDate: plan.end_date ? plan.end_date.split('T')[0] : undefined
        })
        setSelectedPatient(plan.patient)
        setPatientQuery(`${plan.patient.first_name} ${plan.patient.last_name}`)
        setShowDialog(true)
    }

    const resetForm = () => {
        setEditingPlan(null)
        setFormData({
            startDate: new Date().toISOString().split('T')[0]
        })
        setSelectedPatient(null)
        setPatientQuery('')
        setFoundPatients([])
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Care Plans</h1>
                    <p className="text-muted-foreground">Manage ongoing patient care strategies</p>
                </div>
                <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Care Plan
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading care plans...</p>
                </div>
            ) : carePlans.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-semibold">No Active Care Plans</h3>
                        <p className="text-muted-foreground mb-4">Start by creating a care plan for a patient.</p>
                        <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Care Plan
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {carePlans.map(plan => (
                        <Card key={plan.id} className="flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            {plan.patient?.first_name} {plan.patient?.last_name}
                                        </CardTitle>
                                        <CardDescription>
                                            Started: {new Date(plan.start_date).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        Active
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div>
                                    <strong className="text-sm font-medium flex items-center gap-2 mb-1">
                                        <ActivitySquare className="h-4 w-4 text-indigo-500" />
                                        Diagnosis
                                    </strong>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{plan.diagnosis}</p>
                                </div>
                                <div>
                                    <strong className="text-sm font-medium flex items-center gap-2 mb-1">
                                        <Target className="h-4 w-4 text-rose-500" />
                                        Goals
                                    </strong>
                                    <p className="text-sm text-muted-foreground line-clamp-3">{plan.goals}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4 flex justify-between bg-muted/20">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleStatusChange(plan.id, 'discontinue')}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-600 hover:text-green-600 hover:bg-green-50"
                                        onClick={() => handleStatusChange(plan.id, 'complete')}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPlan ? 'Edit Care Plan' : 'Create New Care Plan'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Patient Search */}
                        {!editingPlan && (
                            <div className="space-y-2 relative">
                                <Label>Patient *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Search patient name..."
                                        value={patientQuery}
                                        onChange={(e) => handleSearchPatients(e.target.value)}
                                        disabled={!!selectedPatient}
                                    />
                                    {selectedPatient && (
                                        <Button variant="outline" onClick={() => {
                                            setSelectedPatient(null)
                                            setPatientQuery('')
                                            setFormData(prev => ({ ...prev, patientId: undefined }))
                                        }}>
                                            Change
                                        </Button>
                                    )}
                                </div>

                                {foundPatients.length > 0 && !selectedPatient && (
                                    <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                                        <div className="p-1">
                                            {foundPatients.map(patient => (
                                                <div
                                                    key={patient.id}
                                                    className="p-2 hover:bg-accent rounded cursor-pointer"
                                                    onClick={() => selectPatient(patient)}
                                                >
                                                    <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">UHID: {patient.uhid}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date *</Label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Target End Date</Label>
                                <Input
                                    type="date"
                                    value={formData.endDate || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Nursing Diagnosis *</Label>
                            <Input
                                placeholder="e.g. Ineffective Airway Clearance"
                                value={formData.diagnosis || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Goals / Outcomes *</Label>
                            <Textarea
                                placeholder="e.g. Patient will maintain O2 saturation >95%"
                                value={formData.goals || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Interventions *</Label>
                            <Textarea
                                placeholder="e.g. Monitor vitals q4h, elevate head of bed..."
                                value={formData.interventions || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, interventions: e.target.value }))}
                                rows={4}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>
                            {editingPlan ? 'Update Plan' : 'Create Plan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
