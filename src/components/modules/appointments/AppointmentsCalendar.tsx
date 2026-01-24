'use client'

import { useState, useMemo } from 'react'
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isToday, isValid, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Appointment {
  id: string
  appointment_date: string
  status: string
  reason?: string
  notes?: string
  patient?: {
    first_name: string
    last_name: string
    contact_number: string
  }
  doctor?: {
    full_name: string
    email: string
  }
}

interface AppointmentsCalendarProps {
  appointments: Appointment[]
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500',
  SCHEDULED: 'bg-blue-500',
  IN_PROGRESS: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
}

const statusBadgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  SCHEDULED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
}

export function AppointmentsCalendar({ appointments }: AppointmentsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Helper function to safely parse and format dates
  const safeParseDate = (dateValue: string | Date | undefined | null): Date | null => {
    if (!dateValue) return null
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue)
    return isValid(date) ? date : null
  }

  const safeFormatDate = (dateValue: string | Date | undefined | null, formatStr: string): string => {
    const date = safeParseDate(dateValue)
    return date ? format(date, formatStr) : '--:--'
  }

  // Get calendar days for current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {}

    appointments.forEach(apt => {
      // Skip appointments with invalid or missing appointment_date
      if (!apt.appointment_date) return

      const date = typeof apt.appointment_date === 'string'
        ? parseISO(apt.appointment_date)
        : new Date(apt.appointment_date)

      if (!isValid(date)) return

      const dateKey = format(date, 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(apt)
    })

    return grouped
  }, [appointments])

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return appointmentsByDate[dateKey] || []
  }, [selectedDate, appointmentsByDate])

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const dateKey = format(date, 'yyyy-MM-dd')
    if (appointmentsByDate[dateKey]?.length > 0) {
      setDialogOpen(true)
    }
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayAppointments = appointmentsByDate[dateKey] || []
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const hasAppointments = dayAppointments.length > 0

            return (
              <div
                key={idx}
                onClick={() => handleDateClick(day)}
                className={cn(
                  'min-h-[100px] p-2 border-b border-r cursor-pointer transition-colors hover:bg-accent/50',
                  !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                  isSelected && 'bg-primary/10 ring-2 ring-primary ring-inset',
                  isToday(day) && 'bg-accent/30'
                )}
              >
                <div className={cn(
                  'text-sm font-medium mb-1 h-7 w-7 flex items-center justify-center rounded-full',
                  isToday(day) && 'bg-primary text-primary-foreground'
                )}>
                  {format(day, 'd')}
                </div>

                {/* Appointment indicators */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((apt, aptIdx) => (
                    <div
                      key={apt.id}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate text-white',
                        statusColors[apt.status] || 'bg-gray-500'
                      )}
                      title={`${safeFormatDate(apt.appointment_date, 'h:mm a')} - ${apt.patient?.first_name || 'Patient'}`}
                    >
                      {safeFormatDate(apt.appointment_date, 'h:mm a')}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground font-medium pl-1">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-muted-foreground">Cancelled</span>
        </div>
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3 pr-4">
              {selectedDateAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No appointments scheduled for this day
                </p>
              ) : (
                selectedDateAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="p-3 border rounded-lg space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {safeFormatDate(apt.appointment_date, 'h:mm a')}
                        </span>
                      </div>
                      <Badge variant={statusBadgeVariants[apt.status] || 'default'}>
                        {apt.status?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {apt.patient
                          ? `${apt.patient.first_name} ${apt.patient.last_name}`
                          : 'Unknown Patient'
                        }
                      </span>
                    </div>

                    {apt.doctor && (
                      <div className="text-sm text-muted-foreground">
                        Doctor: {apt.doctor.full_name}
                      </div>
                    )}

                    {apt.notes && (
                      <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                        {apt.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
