'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { addToRoster, deleteFromRoster } from '@/actions/roster'
import { toast } from 'sonner'
import { Loader2, Trash2, Plus } from 'lucide-react'

interface StaffMember {
    id: string
    first_name: string
    last_name: string
    shifts?: any[]
}

interface UpdateStaffScheduleDialogProps {
    member: StaffMember | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UpdateStaffScheduleDialog({ member, open, onOpenChange }: UpdateStaffScheduleDialogProps) {
    const [loading, setLoading] = useState(false)
    const [shiftType, setShiftType] = useState('MORNING')
    const [department, setDepartment] = useState('General Medicine')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('17:00')

    const handleAddShift = async () => {
        if (!member) return
        setLoading(true)
        try {
            const res = await addToRoster({ staffId: member.id, shiftType, department, date: new Date(), startTime, endTime })
            if (res.success) { toast.success('Shift added'); onOpenChange(false) }
            else toast.error('Failed to add shift')
        } catch { toast.error('Error adding shift') }
        finally { setLoading(false) }
    }

    const handleDeleteShift = async (shiftId: string) => {
        try {
            const res = await deleteFromRoster(shiftId)
            if (res.success) toast.success('Shift removed')
            else toast.error('Failed to remove')
        } catch { toast.error('Error removing') }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Schedule</DialogTitle>
                    <DialogDescription>
                        Manage today's shifts for {member?.first_name} {member?.last_name}.
                    </DialogDescription>
                </DialogHeader>

                {member && (
                    <div className="space-y-4 py-4">
                        {member.shifts && member.shifts.length > 0 && (
                            <div className="space-y-2">
                                <Label>Current Shifts (Today)</Label>
                                <div className="space-y-2">
                                    {member.shifts.map(shift => (
                                        <div key={shift.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                            <div className="text-sm">
                                                <span className="font-semibold">{shift.shift_type}</span>
                                                <span className="mx-2">-</span>
                                                <span>{shift.department}</span>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteShift(shift.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2 border-t pt-4">
                            <Label>Add New Shift</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Select value={shiftType} onValueChange={setShiftType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MORNING">Morning</SelectItem>
                                        <SelectItem value="EVENING">Evening</SelectItem>
                                        <SelectItem value="NIGHT">Night</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General Medicine">General Medicine</SelectItem>
                                        <SelectItem value="Cardiology">Cardiology</SelectItem>
                                        <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                                        <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                                        <SelectItem value="Radiology">Radiology</SelectItem>
                                        <SelectItem value="Emergency">Emergency</SelectItem>
                                        <SelectItem value="ICU">ICU</SelectItem>
                                        <SelectItem value="Surgery">Surgery</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">Start Time</Label>
                                    <input type="time" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">End Time</Label>
                                    <input type="time" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAddShift} disabled={loading || !member}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Shift
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
