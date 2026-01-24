'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { createNursingNote, NursingNoteData } from '@/actions/nursing/nursing-notes'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'

interface NursingNotesEditorProps {
    open: boolean
    onClose: () => void
    patientId: string
    patientName: string
    appointmentId?: string
    onSuccess?: () => void
}

export function NursingNotesEditor({ open, onClose, patientId, patientName, appointmentId, onSuccess }: NursingNotesEditorProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<NursingNoteData>>({
        patientId,
        appointmentId,
        noteType: 'progress',
        isCritical: false
    })

    const handleSubmit = async () => {
        if (!formData.title || !formData.content) {
            toast.error('Please fill in all required fields')
            return
        }

        setLoading(true)

        try {
            const result = await createNursingNote(formData as NursingNoteData)

            if (result.success) {
                toast.success('Nursing note created successfully')
                onSuccess?.()

                // Reset form
                setFormData({
                    patientId,
                    appointmentId,
                    noteType: 'progress',
                    isCritical: false
                })

                onClose()
            } else {
                toast.error(result.error || 'Failed to create nursing note')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Create Nursing Note - {patientName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Note Type */}
                    <div className="space-y-2">
                        <Label>Note Type *</Label>
                        <Select
                            value={formData.noteType}
                            onValueChange={(value: any) => setFormData(prev => ({ ...prev, noteType: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="assessment">Assessment</SelectItem>
                                <SelectItem value="progress">Progress Note</SelectItem>
                                <SelectItem value="incident">Incident Report</SelectItem>
                                <SelectItem value="discharge">Discharge Summary</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                            placeholder="Brief title for this note"
                            value={formData.title || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <Label>Content *</Label>
                        <Textarea
                            placeholder="Detailed nursing note content..."
                            value={formData.content || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            rows={10}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Include patient observations, interventions, and outcomes
                        </p>
                    </div>

                    {/* Critical Flag */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Mark as Critical</Label>
                            <p className="text-sm text-muted-foreground">
                                This will create an alert for immediate attention
                            </p>
                        </div>
                        <Switch
                            checked={formData.isCritical}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isCritical: checked }))}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Note'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
