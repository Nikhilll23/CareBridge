'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createReferral, getDoctorsBySpecialization } from '@/actions/referrals'
import { SPECIALIZATIONS } from '@/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ReferralModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    patientId: string
    isDoctor?: boolean
}

export function ReferralRequestModal({ open, onOpenChange, patientId, isDoctor }: ReferralModalProps) {
    const [specialization, setSpecialization] = useState('')
    const [doctors, setDoctors] = useState<any[]>([])
    const [selectedDoctor, setSelectedDoctor] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [fetchingDoctors, setFetchingDoctors] = useState(false)

    useEffect(() => {
        if (specialization) {
            setFetchingDoctors(true)
            getDoctorsBySpecialization(specialization)
                .then(setDoctors)
                .finally(() => setFetchingDoctors(false))
        } else {
            setDoctors([])
        }
    }, [specialization])

    const handleSubmit = async () => {
        if (!specialization || !reason) {
            toast.error('Please fill in required fields')
            return
        }

        setLoading(true)
        try {
            const result = await createReferral({
                patientId,
                targetSpecialization: specialization,
                reason,
                targetDoctorId: selectedDoctor || undefined
            })

            if (result.success) {
                toast.success('Referral request sent successfully')
                onOpenChange(false)
                // Reset form
                setSpecialization('')
                setSelectedDoctor('')
                setReason('')
            } else {
                toast.error(result.error || 'Failed to create referral')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isDoctor ? 'Refer Patient' : 'Request Referral'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Specialization Needed</Label>
                        <Select value={specialization} onValueChange={setSpecialization}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select specialization" />
                            </SelectTrigger>
                            <SelectContent>
                                {SPECIALIZATIONS.map(spec => (
                                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Preferred Doctor (Optional)</Label>
                        <Select value={selectedDoctor} onValueChange={setSelectedDoctor} disabled={!specialization || fetchingDoctors}>
                            <SelectTrigger>
                                <SelectValue placeholder={fetchingDoctors ? "Loading..." : "Select doctor"} />
                            </SelectTrigger>
                            <SelectContent>
                                {doctors.length === 0 ? (
                                    <SelectItem value="none" disabled>No doctors found</SelectItem>
                                ) : (
                                    doctors.map(doc => (
                                        <SelectItem key={doc.id} value={doc.id}>Dr. {doc.first_name} {doc.last_name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason for Referral</Label>
                        <Textarea
                            placeholder="Describe symptoms or reason for referral..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
