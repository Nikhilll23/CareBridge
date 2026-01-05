'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRadiologyReport, getStudyFormData } from '@/actions/radiology'

interface CreateStudyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  currentUserId: string
}

export function CreateStudyDialog({
  open,
  onOpenChange,
  onSuccess,
  currentUserId,
}: CreateStudyDialogProps) {
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: currentUserId,
    modality: 'XRAY' as const,
    studyTitle: '',
    studyUrl: '',
    findings: '',
    impression: '',
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    const result = await getStudyFormData()
    if (result.success && result.data) {
      setPatients(result.data.patients)
      setDoctors(result.data.doctors)
    } else {
      toast.error('Failed to load patients/doctors list')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.patientId || !formData.doctorId || !formData.studyTitle) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

    const result = await createRadiologyReport(formData)

    if (result.success) {
      toast.success('Study created successfully')
      onSuccess()
      onOpenChange(false)
      // Reset form
      setFormData({
        patientId: '',
        doctorId: currentUserId,
        modality: 'XRAY',
        studyTitle: '',
        studyUrl: '',
        findings: '',
        impression: '',
      })
    } else {
      toast.error(result.error || 'Failed to create study')
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle>Create New Imaging Study</DialogTitle>
          <DialogDescription>
            Create a new radiology report or imaging study for a patient
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor">Radiologist *</Label>
              <Select
                value={formData.doctorId}
                onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modality">Modality *</Label>
              <Select
                value={formData.modality}
                onValueChange={(value: any) => setFormData({ ...formData, modality: value })}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XRAY">X-Ray</SelectItem>
                  <SelectItem value="MRI">MRI</SelectItem>
                  <SelectItem value="CT">CT Scan</SelectItem>
                  <SelectItem value="ULTRASOUND">Ultrasound</SelectItem>
                  <SelectItem value="MAMMOGRAPHY">Mammography</SelectItem>
                  <SelectItem value="PET">PET Scan</SelectItem>
                  <SelectItem value="NUCLEAR_MEDICINE">Nuclear Medicine</SelectItem>
                  <SelectItem value="FLUOROSCOPY">Fluoroscopy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studyTitle">Study Title *</Label>
              <Input
                id="studyTitle"
                placeholder="e.g., Chest X-ray PA View"
                value={formData.studyTitle}
                onChange={(e) => setFormData({ ...formData, studyTitle: e.target.value })}
                className="bg-background border-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studyUrl">Image URL (Optional)</Label>
              <Input
                id="studyUrl"
                type="url"
                placeholder="https://..."
                value={formData.studyUrl}
                onChange={(e) => setFormData({ ...formData, studyUrl: e.target.value })}
                className="bg-background border-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="findings">Findings (Optional)</Label>
              <textarea
                id="findings"
                placeholder="Radiological findings..."
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                className="w-full min-h-25 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="impression">Impression (Optional)</Label>
              <textarea
                id="impression"
                placeholder="Clinical impression..."
                value={formData.impression}
                onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
                className="w-full min-h-20 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Study
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
