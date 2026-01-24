'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock, User, FileText, Stethoscope } from 'lucide-react'
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
import { toast } from 'sonner'

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
      toast.error('Please fill all required fields')
      return
    }

    setLoading(true)

    try {
      const [hours, minutes] = formData.time.split(':')
      const appointmentDate = new Date(date)
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      const result = await createAppointment({
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentDate: appointmentDate.toISOString(),
        reason: formData.reason,
        notes: formData.notes,
      })

      if (result.success) {
        toast.success(result.message || 'Appointment scheduled successfully!')
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
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to schedule appointment')
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for a patient
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

          {/* Specialization Filter */}
          <div className="space-y-2">
            <Label>
              <Stethoscope className="h-4 w-4 inline mr-2" />
              Filter by Specialization
            </Label>
            <Select
              value={selectedSpecialization}
              onValueChange={(value) => {
                setSelectedSpecialization(value)
                setFormData(prev => ({ ...prev, doctorId: '' })) // Reset doctor selection
              }}
            >
              <SelectTrigger>
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

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">
              <User className="h-4 w-4 inline mr-2" />
              Doctor *
            </Label>
            <Select
              value={formData.doctorId}
              onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
              disabled={filteredDoctors.length === 0}
            >
              <SelectTrigger id="doctor">
                <SelectValue placeholder={filteredDoctors.length === 0 ? "No doctors found for this specialization" : "Select a doctor"} />
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                <CalendarIcon className="h-4 w-4 inline mr-2" />
                Date *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
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

            <div className="space-y-2">
              <Label htmlFor="time">
                <Clock className="h-4 w-4 inline mr-2" />
                Time *
              </Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData({ ...formData, time: value })}
              >
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select time" />
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

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              <FileText className="h-4 w-4 inline mr-2" />
              Reason for Visit *
            </Label>
            <Input
              id="reason"
              placeholder="e.g., Regular checkup, Follow-up"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
