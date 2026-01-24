'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { reportIncident } from '@/actions/risk'

export default function IncidentReportingPortal() {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({
        type: '',
        location: '',
        severity: '',
        description: '',
        reportedBy: '',
        isAnonymous: false
    })

    const handleSubmit = async () => {
        if (!form.type || !form.description) return toast.error('Please fill required fields')

        const payload = {
            ...form,
            reportedBy: form.isAnonymous ? 'ANONYMOUS' : (form.reportedBy || 'Staff User')
        }

        const res = await reportIncident(payload)
        if (res.success) setStep(2)
        else toast.error('Failed to submit report')
    }

    if (step === 2) {
        return (
            <div className="container max-w-md mx-auto py-12 flex flex-col items-center text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h1 className="text-2xl font-bold">Report Submitted</h1>
                <p className="text-muted-foreground mb-6">
                    Thank you for helping keep our hospital safe. <br />
                    The Quality Team has been notified.
                </p>
                <Button onClick={() => {
                    setForm({ type: '', location: '', severity: '', description: '', reportedBy: '', isAnonymous: false })
                    setStep(1)
                }}>Submit Another</Button>
            </div>
        )
    }

    return (
        <div className="container max-w-lg mx-auto py-8">
            <Card className="border-t-4 border-t-orange-500 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="h-6 w-6 text-orange-500" />
                        Incident Reporting Portal
                    </CardTitle>
                    <CardDescription>
                        Non-punitive reporting for Accidents, Near Misses, or Safety Hazards.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Event Type</label>
                        <Select onValueChange={v => setForm({ ...form, type: v })}>
                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NEAR_MISS">Near Miss (prevented in time)</SelectItem>
                                <SelectItem value="ADVERSE_EVENT">Adverse Event / Accident</SelectItem>
                                <SelectItem value="EQUIPMENT_FAILURE">Equipment Failure</SelectItem>
                                <SelectItem value="MEDICATION_ERROR">Medication Error</SelectItem>
                                <SelectItem value="PATIENT_FALL">Patient Fall</SelectItem>
                                <SelectItem value="SENTINEL_EVENT">Sentinel Event (Critical)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Location</label>
                            <Input placeholder="e.g. Ward A" onChange={e => setForm({ ...form, location: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Severity</label>
                            <Select onValueChange={v => setForm({ ...form, severity: v })}>
                                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            placeholder="Describe what happened, who was involved, and the outcome..."
                            className="h-32"
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center space-x-2 py-2">
                        <input
                            type="checkbox"
                            id="anon"
                            checked={form.isAnonymous}
                            onChange={e => setForm({ ...form, isAnonymous: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor="anon" className="text-sm">Report Anonymously</label>
                    </div>

                    <Button onClick={handleSubmit} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                        Submit Confidential Report
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
