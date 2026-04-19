'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus } from 'lucide-react'
import { createStaffUser } from '@/actions/staff'
import { toast } from 'sonner'

const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency', 'Radiology', 'Pharmacy', 'Administration', 'ICU']
const SPECIALIZATIONS = ['General Physician', 'Cardiologist', 'Neurologist', 'Orthopedic', 'Pediatrician', 'Radiologist', 'Anesthesiologist', 'Surgeon', 'Psychiatrist', 'Dermatologist']

export function CreateStaffDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        role: 'DOCTOR' as 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'ADMIN',
        specialization: '', department: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.firstName || !form.lastName || !form.email) {
            toast.error('First name, last name and email are required')
            return
        }
        setLoading(true)
        const res = await createStaffUser(form)
        setLoading(false)
        if (res.success) {
            toast.success('Staff member created successfully')
            setOpen(false)
            setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'DOCTOR', specialization: '', department: '' })
        } else {
            toast.error(res.error || 'Failed to create staff member')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Staff
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>First Name *</Label>
                            <Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="John" />
                        </div>
                        <div className="space-y-1">
                            <Label>Last Name *</Label>
                            <Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Doe" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Email *</Label>
                        <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john.doe@hospital.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9876543210" />
                        </div>
                        <div className="space-y-1">
                            <Label>Role *</Label>
                            <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as any }))}>
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
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Staff'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
