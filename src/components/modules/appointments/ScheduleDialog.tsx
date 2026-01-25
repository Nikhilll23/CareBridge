'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock, User, FileText, Stethoscope, Plus } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { createAppointment } from '@/actions/appointments'
import { mapSymptomToSpecialization } from '@/actions/ai'
import { toast } from 'sonner'
import { Loader2, Sparkles, Search } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface Patient {
  id: string
  first_name: string
  last_name: string
}

interface Doctor {
  id: string
  full_name: string
  email: string
  specialization?: string // Added specialization
}

interface ScheduleDialogProps {
  patients: Patient[]
  doctors: Doctor[]
  onSuccess?: () => void
  userRole?: string
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
]

const SPECIALIZATIONS = [
  'General Physician', 'Cardiologist', 'Neurologist', 'Orthopedic',
  'Pediatrician', 'Dermatologist', 'ENT', 'Ophthalmologist',
  'Gynecologist', 'Psychiatrist', 'Urologist'
]

export function ScheduleDialog({ patients, doctors, onSuccess, userRole }: ScheduleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState<Date>()
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all')

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    time: '',
    reason: '',
    notes: '',
  })

  // AI Symptom Search State
  const [symptomQuery, setSymptomQuery] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const debouncedSymptom = useDebounce(symptomQuery, 1000) // 1 second debounce

  // Multi-doctor state
  const [additionalDoctors, setAdditionalDoctors] = useState<{
    id: string; // unique ID for the row
    specialization: string;
    doctorId: string;
    reason: string;
  }[]>([])

  const addDoctorRow = () => {
    setAdditionalDoctors([...additionalDoctors, {
      id: Math.random().toString(36).substr(2, 9),
      specialization: 'all',
      doctorId: '',
      reason: ''
    }])
  }

  const removeDoctorRow = (rowId: string) => {
    setAdditionalDoctors(prev => prev.filter(p => p.id !== rowId))
  }

  const updateDoctorRow = (rowId: string, field: 'specialization' | 'doctorId' | 'reason', value: string) => {
    setAdditionalDoctors(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value }
        // Reset doctor if specialization changes
        if (field === 'specialization') {
          updated.doctorId = ''
        }
        return updated
      }
      return row
    }))
  }

  // Helper to get doctors for a specific row specialization
  const getDoctorsForSpec = (spec: string) => {
    if (!spec || spec === 'all') return doctors
    return doctors.filter(doc =>
      doc.specialization === spec ||
      (!doc.specialization && spec === 'General Physician')
    )
  }

  // Auto-map symptom to specialization
  useEffect(() => {
    const analyzeSymptom = async () => {
      if (!debouncedSymptom || debouncedSymptom.length < 3) return

      setIsAnalyzing(true)
      try {
        const result = await mapSymptomToSpecialization(debouncedSymptom, SPECIALIZATIONS)

        if (result.success && result.specialization) {
          setSelectedSpecialization(result.specialization)
          setFormData(prev => ({ ...prev, doctorId: '' })) // Reset doctor
          toast.success(`Auto-mapped to ${result.specialization}`, {
            icon: <Sparkles className="h-4 w-4 text-yellow-500" />
          })
        }
      } catch (error) {
        console.error('Failed to map symptom', error)
      } finally {
        setIsAnalyzing(false)
      }
    }

    analyzeSymptom()
  }, [debouncedSymptom])

  // Filter doctors based on selection
  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialization || selectedSpecialization === 'all') return doctors
    return doctors.filter(doc =>
      // Match specialization if available, otherwise include all (fallback)
      // Since specialization comes from DB now, we should try to match loosely or strictly
      doc.specialization === selectedSpecialization ||
      (!doc.specialization && selectedSpecialization === 'General Physician') // Assumption
    )
  }, [doctors, selectedSpecialization])

  useEffect(() => {
    if (userRole === 'PATIENT' && patients.length === 1 && !formData.patientId) {
      setFormData(prev => ({ ...prev, patientId: patients[0].id }))
    }
  }, [userRole, patients, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || !formData.patientId || !formData.doctorId || !formData.time || !formData.reason) {
      toast.error('Please fill all required fields for primary appointment')
      return
    }

    // Validate additional doctors
    for (const doc of additionalDoctors) {
      if (!doc.doctorId || !doc.reason) {
        toast.error('Please fill Doctor and Reason for all additional consultations')
        return
      }
    }

    setLoading(true)

    try {
      const [hours, minutes] = formData.time.split(':')
      const appointmentDate = new Date(date)
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      const isoDate = appointmentDate.toISOString()
      const appointmentsToCreate = [
        {
          patientId: formData.patientId,
          doctorId: formData.doctorId,
          appointmentDate: isoDate,
          reason: formData.reason,
          notes: formData.notes
        },
        ...additionalDoctors.map(doc => ({
          patientId: formData.patientId,
          doctorId: doc.doctorId,
          appointmentDate: isoDate, // Same time for now, or could ask for offset
          reason: doc.reason,
          notes: `Additional consultation via Multi-Doctor Initializer. ${formData.notes}`
        }))
      ]

      let successCount = 0

      for (const apt of appointmentsToCreate) {
        const result = await createAppointment(apt)
        if (result.success) successCount++
      }

      if (successCount === appointmentsToCreate.length) {
        toast.success(`Successfully scheduled ${successCount} appointment(s)!`)
        setOpen(false)
        setDate(undefined)
        setSelectedSpecialization('all')
        setFormData({
          patientId: '',
          doctorId: '',
          time: '',
          reason: '',
          notes: '',
        })
        setAdditionalDoctors([])
        onSuccess?.()
      } else {
        toast.warning(`Scheduled ${successCount}/${appointmentsToCreate.length} appointments. Some failed.`)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarIcon className="h-4 w-4 mr-2" />
          Schedule Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create appointment(s) for a patient. Add multiple doctors if needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">
              <User className="h-4 w-4 inline mr-2" />
              Patient *
            </Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              disabled={userRole === 'PATIENT'}
            >
              <SelectTrigger id="patient">
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

          <div className="grid grid-cols-2 gap-4">
            {/* AI Symptom Search */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="symptom-search" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Symptom Matcher
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="symptom-search"
                  placeholder="Auto-select specialist..."
                  className="pl-9 pr-9"
                  value={symptomQuery}
                  onChange={(e) => setSymptomQuery(e.target.value)}
                />
                {isAnalyzing && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal px-2',
                          !date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'dd/MM') : <span>Pick</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>Time</Label>
                  <Select
                    value={formData.time}
                    onValueChange={(value) => setFormData({ ...formData, time: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Consultation */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Primary Consultation
              </h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Specialization</Label>
                <Select
                  value={selectedSpecialization}
                  onValueChange={(value) => {
                    setSelectedSpecialization(value)
                    setFormData(prev => ({ ...prev, doctorId: '' }))
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Specializations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specializations</SelectItem>
                    {SPECIALIZATIONS.map(spec => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Doctor *</Label>
                <Select
                  value={formData.doctorId}
                  onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
                  disabled={filteredDoctors.length === 0}
                >
                  <SelectTrigger className="h-9" id="doctor">
                    <SelectValue placeholder={filteredDoctors.length === 0 ? "No doctors found" : "Select Doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDoctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.full_name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">Reason *</Label>
                <Input
                  placeholder="e.g., Stomach pain"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Additional Consultations */}
          {additionalDoctors.map((row, index) => {
            const rowDoctors = getDoctorsForSpec(row.specialization)
            return (
              <div key={row.id} className="border rounded-lg p-4 bg-muted/30 space-y-4 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="absolute right-2 top-2 h-6 w-6 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeDoctorRow(row.id)}
                >
                  <span className="sr-only">Remove</span>
                  x
                </Button>

                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Plus className="h-4 w-4 text-purple-600" />
                    Additional Consultation #{index + 1}
                  </h4>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Specialization</Label>
                    <Select
                      value={row.specialization}
                      onValueChange={(value) => updateDoctorRow(row.id, 'specialization', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Specializations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Specializations</SelectItem>
                        {SPECIALIZATIONS.map(spec => (
                          <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Doctor *</Label>
                    <Select
                      value={row.doctorId}
                      onValueChange={(value) => updateDoctorRow(row.id, 'doctorId', value)}
                      disabled={rowDoctors.length === 0}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={rowDoctors.length === 0 ? "No doctors found" : "Select Doctor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {rowDoctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.full_name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs">Reason *</Label>
                    <Input
                      placeholder="Reason for this consultation"
                      value={row.reason}
                      onChange={(e) => updateDoctorRow(row.id, 'reason', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={addDoctorRow}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Doctor
          </Button>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Scheduling...' : `Schedule ${additionalDoctors.length + 1} Appointment(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
