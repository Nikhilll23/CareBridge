'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClaim } from '@/actions/insurance'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// Mock patients list for now (should pass from parent)
// Actually we will accept patient list as prop or make it a text input for ID for MVP

interface CreateClaimDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    patients: { id: string, name: string }[]
}

export function CreateClaimDialog({ open, onOpenChange, onSuccess, patients }: CreateClaimDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        patient_id: '',
        provider_name: '',
        policy_number: '',
        diagnosis_code: '',
        amount_claimed: '',
        status: 'PENDING'
    })

    // Basic handlers
    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const res = await createClaim({
                ...formData,
                amount_claimed: Number(formData.amount_claimed),
                status: formData.status as any
            })
            if (res.success) {
                toast.success('Claim created')
                onSuccess()
                onOpenChange(false)
                setFormData({
                    patient_id: '', provider_name: '', policy_number: '',
                    diagnosis_code: '', amount_claimed: '', status: 'PENDING'
                })
            } else {
                toast.error('Failed to create claim')
            }
        } catch (e) {
            toast.error('Error submitting form')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Insurance Claim</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Patient</Label>
                        <Select onValueChange={(v) => handleChange('patient_id', v)} value={formData.patient_id}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                            <SelectContent>
                                {patients.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Provider</Label>
                        <Input value={formData.provider_name} onChange={e => handleChange('provider_name', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Policy #</Label>
                        <Input value={formData.policy_number} onChange={e => handleChange('policy_number', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Diagnosis</Label>
                        <Input value={formData.diagnosis_code} onChange={e => handleChange('diagnosis_code', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Amount</Label>
                        <Input type="number" value={formData.amount_claimed} onChange={e => handleChange('amount_claimed', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Status</Label>
                        <Select onValueChange={(v) => handleChange('status', v)} value={formData.status}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Claim
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
