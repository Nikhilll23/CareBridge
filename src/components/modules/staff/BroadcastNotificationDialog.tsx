'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell } from 'lucide-react'
import { broadcastNotification } from '@/actions/staff'
import { toast } from 'sonner'

const ROLES = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT']

export function BroadcastNotificationDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [type, setType] = useState<'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'SYSTEM'>('SYSTEM')
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['DOCTOR', 'NURSE'])

    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        )
    }

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return }
        if (selectedRoles.length === 0) { toast.error('Select at least one role'); return }
        setLoading(true)
        const res = await broadcastNotification({ title, message, targetRoles: selectedRoles, type })
        setLoading(false)
        if (res.success) {
            toast.success(`Notification sent to ${res.count} users`)
            setOpen(false)
            setTitle(''); setMessage('')
        } else {
            toast.error(res.error || 'Failed to send')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Broadcast
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Broadcast Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1">
                        <Label>Title *</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. System Maintenance at 10 PM" />
                    </div>
                    <div className="space-y-1">
                        <Label>Message *</Label>
                        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter your message..." rows={3} />
                    </div>
                    <div className="space-y-1">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={v => setType(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INFO">Info</SelectItem>
                                <SelectItem value="WARNING">Warning</SelectItem>
                                <SelectItem value="SUCCESS">Success</SelectItem>
                                <SelectItem value="ERROR">Error</SelectItem>
                                <SelectItem value="SYSTEM">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Send To (Roles)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLES.map(role => (
                                <div key={role} className="flex items-center gap-2">
                                    <Checkbox
                                        id={role}
                                        checked={selectedRoles.includes(role)}
                                        onCheckedChange={() => toggleRole(role)}
                                    />
                                    <label htmlFor={role} className="text-sm cursor-pointer">{role}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={loading}>
                        {loading ? 'Sending...' : `Send to ${selectedRoles.length} role(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
