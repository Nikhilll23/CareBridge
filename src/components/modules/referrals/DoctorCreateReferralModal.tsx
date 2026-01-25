'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createReferral, getDoctorsBySpecialization } from '@/actions/referrals'
import { getAllPatientsForSelect } from '@/actions/patients'
import { SPECIALIZATIONS } from '@/types'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

interface ReferralModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    doctorId: string
}

export function DoctorCreateReferralModal({ open, onOpenChange, doctorId }: ReferralModalProps) {
    const router = useRouter()
    const [specialization, setSpecialization] = useState('')
    const [doctors, setDoctors] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])

    const [selectedPatient, setSelectedPatient] = useState('')
    const [selectedDoctor, setSelectedDoctor] = useState('')
    const [reason, setReason] = useState('')

    const [loading, setLoading] = useState(false)
    const [fetchingDoctors, setFetchingDoctors] = useState(false)
    const [fetchingPatients, setFetchingPatients] = useState(false)

    // Fetch patients on open
    useEffect(() => {
        if (open && patients.length === 0) {
            setFetchingPatients(true)
            getAllPatientsForSelect()
                .then(setPatients)
                .finally(() => setFetchingPatients(false))
        }
    }, [open])

    // Fetch doctors when specialization changes
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
        if (!selectedPatient || !specialization || !reason) {
            toast.error('Please fill in required fields')
            return
        }

        setLoading(true)
        try {
            const result = await createReferral({
                patientId: selectedPatient,
                targetSpecialization: specialization,
                reason,
                targetDoctorId: selectedDoctor || undefined
            })

            if (result.success) {
                toast.success('Referral created successfully')
                onOpenChange(false)
                router.refresh()
                // Reset form
                setSpecialization('')
                setSelectedDoctor('')
                setSelectedPatient('')
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Make a Referral</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Patient Selection */}
                    <div className="space-y-2">
                        <Label>Select Patient</Label>
                        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger>
                                <SelectValue placeholder={fetchingPatients ? "Loading patients..." : "Search or select patient"} />
                            </SelectTrigger>
                            <SelectContent>
                                {patients.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.first_name} {p.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Specialization */}
                    <div className="space-y-2">
                        <Label>Specialization Required</Label>
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

                    {/* Target Doctor (Optional) */}
                    <div className="space-y-2">
                        <Label>Refer to Specific Doctor (Optional)</Label>
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
                            placeholder="Clinical indications for referral..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Referral
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
