'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateStaffUser } from '@/actions/staff'
import { toast } from 'sonner'

const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency', 'Radiology', 'Pharmacy', 'Administration', 'ICU']
const SPECIALIZATIONS = ['General Physician', 'Cardiologist', 'Neurologist', 'Orthopedic', 'Pediatrician', 'Radiologist', 'Anesthesiologist', 'Surgeon', 'Psychiatrist', 'Dermatologist']

interface EditStaffDialogProps {
    member: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditStaffDialog({ member, open, onOpenChange }: EditStaffDialogProps) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', role: '', specialization: '', department: '' })

    useEffect(() => {
        if (member) {
            setForm({
                firstName: member.first_name || '',
                lastName: member.last_name || '',
                phone: member.phone || '',
                role: member.role || 'DOCTOR',
                specialization: member.specialization || '',
                department: member.department || ''
            })
        }
    }, [member])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!member) return
        setLoading(true)
        const res = await updateStaffUser(member.id, form)
        setLoading(false)
        if (res.success) {
            toast.success('Staff member updated')
            onOpenChange(false)
        } else {
            toast.error(res.error || 'Failed to update')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Staff Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>First Name</Label>
                            <Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Last Name</Label>
                            <Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Email</Label>
                        <Input value={member?.email || ''} disabled className="opacity-60" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <Label>Role</Label>
                            <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                                    <SelectItem value="NURSE">Nurse</SelectItem>
                                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {form.role === 'DOCTOR' && (
                        <div className="space-y-1">
                            <Label>Specialization</Label>
                            <Select value={form.specialization} onValueChange={v => setForm(p => ({ ...p, specialization: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                                <SelectContent>
                                    {SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label>Department</Label>
                        <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                            <SelectContent>
                                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
