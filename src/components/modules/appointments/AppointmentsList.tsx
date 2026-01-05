'use client'

import { format } from 'date-fns'
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  MoreHorizontal,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Appointment, AppointmentStatus } from '@/actions/appointments'
import { updateAppointmentStatus } from '@/actions/appointments'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AppointmentsListProps {
  appointments: Appointment[]
}

const statusConfig = {
  PENDING: {
    icon: AlertCircle,
    label: 'Pending Approval',
    variant: 'outline' as const,
    color: 'text-amber-600',
  },
  SCHEDULED: {
    icon: Clock,
    label: 'Scheduled',
    variant: 'default' as const,
    color: 'text-blue-600',
  },
  IN_PROGRESS: {
    icon: PlayCircle,
    label: 'In Progress',
    variant: 'default' as const,
    color: 'text-orange-600',
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: 'Completed',
    variant: 'secondary' as const,
    color: 'text-green-600',
  },
  CANCELLED: {
    icon: XCircle,
    label: 'Cancelled',
    variant: 'destructive' as const,
    color: 'text-red-600',
  },
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { deleteAppointment } from '@/actions/appointments'
import { useState } from 'react'

export function AppointmentsList({ appointments }: AppointmentsListProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    const result = await updateAppointmentStatus(id, status)

    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleDelete = async () => {
    if (!appointmentToDelete) return

    toast.loading('Deleting appointment...')
    const result = await deleteAppointment(appointmentToDelete)

    toast.dismiss()
    if (result.success) {
      toast.success('Appointment deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setDeleteDialogOpen(false)
    setAppointmentToDelete(null)
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Appointments Found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Schedule your first appointment to get started with patient consultations.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => {
              const status = statusConfig[appointment.status]
              const StatusIcon = status.icon
              const appointmentDate = new Date(appointment.appointment_date)

              return (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {format(appointmentDate, 'MMM dd, yyyy')}
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(appointmentDate, 'hh:mm a')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {appointment.patient?.first_name} {appointment.patient?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.patient?.contact_number}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{appointment.doctor?.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.doctor?.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={appointment.reason}>
                      {appointment.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {appointment.status === 'PENDING' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(appointment.id, 'SCHEDULED')}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirm Appointment
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(appointment.id, 'CANCELLED')}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject Request
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {appointment.status !== 'IN_PROGRESS' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(appointment.id, 'IN_PROGRESS')}
                            >
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Start Consultation
                            </DropdownMenuItem>
                          )}
                          {appointment.status !== 'COMPLETED' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          {appointment.status !== 'CANCELLED' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(appointment.id, 'CANCELLED')}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Appointment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setAppointmentToDelete(appointment.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the appointment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
