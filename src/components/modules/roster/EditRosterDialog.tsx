'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
// removed unused import
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Staff {
    id: string
    first_name: string
    last_name: string
    role: string
}

interface EditRosterDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentRoster: any[]
    staffList: Staff[] // passed from server page
    onSuccess: () => void
}

export function EditRosterDialog({ open, onOpenChange, currentRoster, staffList, onSuccess }: EditRosterDialogProps) {
    const [loading, setLoading] = useState(false)
    const [entries, setEntries] = useState(currentRoster.length > 0 ? currentRoster : [])

    // Basic local state management for adding new entries before saving would be complex
    // For simplicity MVP: We will just have a form to ADD a single entry at a time or manage existing.
    // Actually, let's make it an overview editor.

    const [selectedStaff, setSelectedStaff] = useState('')
    const [shiftType, setShiftType] = useState('MORNING')
    const [department, setDepartment] = useState('General')

    const handleAdd = async () => {
        if (!selectedStaff) return
        setLoading(true)

        // Call server action to add/update
        try {
            const staff = staffList.find(s => s.id === selectedStaff)
            if (!staff) return

            const { addToRoster } = await import('@/actions/roster')
            const result = await addToRoster({
                staffId: selectedStaff,
                shiftType,
                department,
                date: new Date()
            })

            if (result.success) {
                toast.success(`Scheduled ${staff.first_name} for ${shiftType}`)
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(result.error || 'Failed to schedule')
            }
        } catch (e) {
            toast.error('Failed to schedule')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Duty Roster (Today)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Staff Member</Label>
                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select staff..." />
                            </SelectTrigger>
                            <SelectContent>
                                {staffList.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.first_name} {s.last_name} ({s.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Shift</Label>
                            <Select value={shiftType} onValueChange={setShiftType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MORNING">Morning</SelectItem>
                                    <SelectItem value="EVENING">Evening</SelectItem>
                                    <SelectItem value="NIGHT">Night</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select value={department} onValueChange={setDepartment}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Emergency">Emergency</SelectItem>
                                    <SelectItem value="ICU">ICU</SelectItem>
                                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Current Schedule</h4>
                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {currentRoster.map(entry => (
                                <div key={entry.id} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                                    <span>{entry.staff?.first_name} {entry.staff?.last_name}</span>
                                    <span className="text-xs text-muted-foreground">{entry.shift_type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={loading || !selectedStaff}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add to Roster
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
